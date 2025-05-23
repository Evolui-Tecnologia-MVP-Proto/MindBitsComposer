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
  syncStatus?: 'synced' | 'unsynced' | 'github-only';
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

  // Construir estrutura unificada com status de sincronização
  const buildUnifiedStructure = (): FileItem[] => {
    const processedItems: FileItem[] = [];
    const processedNames = new Set<string>();
    
    console.log("Estruturas do repositório:", repoStructures);

    // Primeiro, processar pastas do GitHub
    data.forEach((item) => {
      if (item.type === 'folder') {
        // Verificar se esta pasta do GitHub existe no banco local
        const localStructure = repoStructures.find((s: any) => s.folderName === item.name);
        
        if (localStructure) {
          // Pasta existe no banco - usar status de sincronização
          const unifiedItem: FileItem = {
            ...item,
            id: localStructure.uid,
            syncStatus: localStructure.isSync ? 'synced' : 'unsynced'
          };
          processedItems.push(unifiedItem);
        } else {
          // Pasta existe no GitHub mas não no banco local
          const unifiedItem: FileItem = {
            ...item,
            syncStatus: 'github-only'
          };
          processedItems.push(unifiedItem);
        }
        processedNames.add(item.name);
      } else {
        // Arquivos sempre são incluídos sem modificação
        processedItems.push(item);
      }
    });

    // Depois, adicionar pastas locais que não existem no GitHub
    const localOnlyFolders: FileItem[] = [];
    repoStructures.forEach((structure: any) => {
      if (!processedNames.has(structure.folderName)) {
        const folderItem: FileItem = {
          id: structure.uid,
          name: structure.folderName,
          type: 'folder',
          path: structure.folderName,
          children: [],
          syncStatus: structure.isSync ? 'synced' : 'unsynced'
        };
        
        if (!structure.linkedTo) {
          // É uma pasta raiz local
          localOnlyFolders.push(folderItem);
        } else {
          // É uma subpasta - encontrar o pai na estrutura processada
          const parent = processedItems.find(item => 
            repoStructures.find((s: any) => s.uid === structure.linkedTo && s.folderName === item.name)
          );
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(folderItem);
          }
        }
      }
    });

    return [...processedItems, ...localOnlyFolders];
  };

  const unifiedData = buildUnifiedStructure();

  const getStatusColor = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'synced':
        return 'text-green-500'; // Verde para sincronizadas
      case 'unsynced':
        return 'text-red-500'; // Vermelho para não sincronizadas
      case 'github-only':
        return 'text-yellow-500'; // Amarelo para GitHub apenas
      default:
        return 'text-blue-500'; // Azul padrão
    }
  };

  const getStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'synced':
        return (
          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
            ✓ Sincronizada
          </Badge>
        );
      case 'unsynced':
        return (
          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Não sincronizada
          </Badge>
        );
      case 'github-only':
        return (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">
            ⚠ Apenas no GitHub
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderFolderWithStatus = (item: FileItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const paddingLeft = `${level * 20 + 8}px`;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-50 rounded cursor-pointer`}
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
            <Folder className={`h-4 w-4 ${getStatusColor(item.syncStatus)}`} />
            <span className="text-sm text-gray-700">{item.name}</span>
            {getStatusBadge(item.syncStatus)}
          </div>
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
        {/* Renderizar estrutura unificada com cores de status */}
        {unifiedData.map((item) => 
          item.type === 'folder' 
            ? renderFolderWithStatus(item)
            : renderFileTree([item])
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