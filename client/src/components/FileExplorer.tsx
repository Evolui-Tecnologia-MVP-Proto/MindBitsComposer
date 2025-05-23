import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, FileText, Image, Archive, Code, FolderPlus, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateFolderModal } from './CreateFolderModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: string;
  modified?: string;
  children?: FileItem[];
}

interface RepoStructure {
  uid: string;
  folderName: string;
  linkedTo: string | null;
  isSync: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar estrutura local do repositório
  const { data: repoStructures = [] } = useQuery<RepoStructure[]>({
    queryKey: ["/api/repo-structure"],
  });

  // Mutation para sincronizar pasta com GitHub
  const syncWithGitHubMutation = useMutation({
    mutationFn: async (uid: string) => {
      const res = await apiRequest("POST", `/api/repo-structure/${uid}/sync-github`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pasta sincronizada!",
        description: data.message || "Pasta criada no GitHub com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar pasta com GitHub.",
        variant: "destructive",
      });
    },
  });

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

  // Construir estrutura hierárquica das pastas locais
  const buildLocalHierarchy = (): FileItem[] => {
    const rootFolders: FileItem[] = [];
    const folderMap = new Map<string, FileItem>();

    // Primeiro, criar todos os itens de pasta
    repoStructures.forEach((structure) => {
      const folderItem: FileItem = {
        id: structure.uid,
        name: structure.folderName,
        type: 'folder',
        path: structure.folderName,
        children: []
      };
      folderMap.set(structure.uid, folderItem);
    });

    // Depois, organizar hierarquicamente
    repoStructures.forEach((structure) => {
      const folderItem = folderMap.get(structure.uid)!;
      
      if (structure.linkedTo) {
        // É uma subpasta
        const parent = folderMap.get(structure.linkedTo);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(folderItem);
        }
      } else {
        // É uma pasta raiz
        rootFolders.push(folderItem);
      }
    });

    return rootFolders;
  };

  const localFolders = buildLocalHierarchy();
  
  // Combinar dados do GitHub com estrutura local hierárquica
  const combinedData = [...data, ...localFolders];

  const renderFolderWithStatus = (item: FileItem, level: number = 0) => {
    // Encontrar a estrutura correspondente para mostrar o status
    const structure = repoStructures.find(s => s.uid === item.id);
    const isExpanded = expandedFolders.has(item.id);
    const paddingLeft = `${level * 20 + 8}px`;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded cursor-pointer group`}
          style={{ paddingLeft }}
          onClick={() => toggleFolder(item.id, item)}
        >
          <div className="flex items-center gap-2 flex-1">
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
            <Folder className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-700">{item.name}</span>
            
            {structure && !structure.isSync && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Não sincronizada
              </Badge>
            )}
            {structure && structure.isSync && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                ✓ Sincronizada
              </Badge>
            )}
          </div>
          
          {structure && !structure.isSync && (
            <Button
              size="sm"
              variant="outline"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                syncWithGitHubMutation.mutate(structure.uid);
              }}
              disabled={syncWithGitHubMutation.isPending}
            >
              <Upload className="h-3 w-3 mr-1" />
              Enviar para GitHub
            </Button>
          )}
        </div>
        
        {isExpanded && item.children && item.children.length > 0 && (
          <div>
            {item.children.map((child) => 
              child.type === 'folder' 
                ? renderFolderWithStatus(child, level + 1)
                : renderFileTree([child], level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <h4 className="font-medium text-sm text-gray-900">Estrutura do Repositório</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateModal(true)}
          className="text-xs"
        >
          <FolderPlus className="h-3 w-3 mr-1" />
          Criar Pasta
        </Button>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        {/* Renderizar arquivos/pastas do GitHub */}
        {renderFileTree(data)}
        
        {/* Renderizar pastas locais hierárquicas */}
        {localFolders.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2 px-2 font-medium">
              Pastas criadas localmente:
            </div>
            {localFolders.map((folder) => renderFolderWithStatus(folder))}
          </div>
        )}
      </div>

      {/* Modal de criação de pasta */}
      <CreateFolderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
};

export default FileExplorer;