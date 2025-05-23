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

  // Combinar dados do GitHub com estrutura local
  const combinedData = [...data];
  
  // Adicionar pastas criadas localmente que ainda não estão no GitHub
  repoStructures.forEach((structure) => {
    const existsInGithub = data.some(item => item.name === structure.folderName && item.type === 'folder');
    if (!existsInGithub) {
      combinedData.push({
        id: structure.uid,
        name: structure.folderName,
        type: 'folder' as const,
        path: structure.folderName,
        children: []
      });
    }
  });

  const renderLocalFolder = (structure: RepoStructure, level: number = 0) => {
    return (
      <div
        key={structure.uid}
        className={`flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded cursor-pointer group`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <Folder className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-gray-700">{structure.folderName}</span>
          {!structure.isSync && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Não sincronizada
            </Badge>
          )}
          {structure.isSync && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
              ✓ Sincronizada
            </Badge>
          )}
        </div>
        
        {!structure.isSync && (
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
        
        {/* Renderizar pastas criadas localmente não sincronizadas */}
        {repoStructures.filter(s => !s.isSync).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2 px-2 font-medium">
              Pastas criadas localmente:
            </div>
            {repoStructures
              .filter(s => !s.linkedTo) // Apenas pastas raiz para simplificar
              .map(structure => renderLocalFolder(structure))}
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