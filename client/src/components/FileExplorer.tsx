import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, FileText, Image, Archive, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: string;
  modified?: string;
  children?: FileItem[];
}

interface FileExplorerProps {
  data: FileItem[];
  onFileSelect?: (file: FileItem) => void;
  onFolderToggle?: (folder: FileItem, isExpanded: boolean) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  data, 
  onFileSelect, 
  onFolderToggle 
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const getFileIcon = (fileName: string, type: string) => {
    if (type === 'folder') {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'md':
      case 'txt':
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'json':
      case 'html':
      case 'css':
        return <Code className="h-4 w-4 text-green-600" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="h-4 w-4 text-purple-600" />;
      case 'zip':
      case 'rar':
      case 'tar':
        return <Archive className="h-4 w-4 text-orange-600" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const toggleFolder = (folderId: string, folder: FileItem) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
      onFolderToggle?.(folder, false);
    } else {
      newExpanded.add(folderId);
      onFolderToggle?.(folder, true);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (items: FileItem[], level: number = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.id);
      const paddingLeft = `${level * 20 + 8}px`;

      return (
        <div key={item.id} className="select-none">
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer transition-colors ${
              item.type === 'file' ? 'hover:bg-blue-50' : ''
            }`}
            style={{ paddingLeft }}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.id, item);
              } else {
                onFileSelect?.(item);
              }
            }}
          >
            {item.type === 'folder' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.id, item);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {item.type === 'file' && <div className="w-4 mr-1" />}
            
            <div className="mr-2">
              {getFileIcon(item.name, item.type)}
            </div>
            
            <span className="text-sm flex-1 truncate">{item.name}</span>
            
            {item.type === 'file' && item.size && (
              <span className="text-xs text-gray-500 ml-2">{item.size}</span>
            )}
          </div>

          {item.type === 'folder' && isExpanded && item.children && (
            <div>{renderFileTree(item.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h4 className="font-medium text-sm text-gray-900">Estrutura do Repositório</h4>
      </div>
      <div className="p-2 max-h-96 overflow-y-auto">
        {renderFileTree(data)}
      </div>
    </div>
  );
};

export default FileExplorer;