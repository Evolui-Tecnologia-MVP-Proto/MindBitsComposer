import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FileExplorer from "@/components/FileExplorer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  File,
  Clock,
  CircleCheck,
  CircleX,
  AlertCircle,
  Loader2,
  Paperclip,
  Upload,
  Download,
  ChevronUp,
  ChevronDown,
  Database,
} from "lucide-react";
import { type Documento, type InsertDocumento, type DocumentArtifact, type InsertDocumentArtifact } from "@shared/schema";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("incluidos");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteArtifactConfirmOpen, setIsDeleteArtifactConfirmOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Documento | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(null);
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<DocumentArtifact | null>(null);
  const [githubRepoFiles, setGithubRepoFiles] = useState<any[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<any[]>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);
  const [currentCreatedDocumentId, setCurrentCreatedDocumentId] = useState<string | null>(null);
  const [isEscopoExpanded, setIsEscopoExpanded] = useState(false);
  const [isPessoasExpanded, setIsPessoasExpanded] = useState(false);
  const [createModalActiveTab, setCreateModalActiveTab] = useState("dados-gerais");
  const [isLoadingMondayAttachments, setIsLoadingMondayAttachments] = useState(false);
  const [mondayAttachmentsPreview, setMondayAttachmentsPreview] = useState<any[]>([]);
  const [artifactFormData, setArtifactFormData] = useState<InsertDocumentArtifact>({
    documentoId: "",
    name: "",
    fileData: "",
    fileName: "",
    fileSize: "",
    mimeType: "",
    type: "",
  });
  // Função para resetar o formulário
  const resetFormData = () => {
    console.log("🧹 LIMPANDO CAMPOS DO FORMULÁRIO");
    console.log("📋 Dados antes da limpeza:", formData);
    setFormData({
      origem: "CPx", // Sempre CPx para novos documentos
      objeto: "",
      tipo: "",
      cliente: "",
      responsavel: "",
      sistema: "",
      modulo: "",
      descricao: "",
      status: "Incluido", // Sempre "Incluido" para novos documentos
      statusOrigem: "Manual", // Sempre "Manual" para novos documentos
      solicitante: "",
      aprovador: "",
      agente: "",
    });
    setCurrentCreatedDocumentId(null); // Reset do documento criado
    setCreateModalActiveTab("dados-gerais"); // Resetar aba para dados-gerais
    setIsEscopoExpanded(false); // Frames sempre recolhidos
    setIsPessoasExpanded(false); // Frames sempre recolhidos
    console.log("✅ Campos limpos!");
  };

  // Função para verificar se o MIME type é suportado pelo browser para visualização
  const isMimeTypeViewable = (mimeType: string): boolean => {
    const viewableMimeTypes = [
      // Imagens
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // PDFs
      'application/pdf',
      // Texto
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'text/xml',
      'application/json',
      'application/xml',
      // Vídeos (alguns browsers)
      'video/mp4',
      'video/webm',
      'video/ogg',
      // Áudios (alguns browsers)
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ];
    
    return viewableMimeTypes.includes(mimeType.toLowerCase());
  };

  const [formData, setFormData] = useState<InsertDocumento>({
    origem: "CPx", // Sempre CPx para novos documentos
    objeto: "",
    tipo: "",
    cliente: "",
    responsavel: "",
    sistema: "",
    modulo: "",
    descricao: "",
    status: "Incluido", // Sempre "Incluido" para novos documentos
    statusOrigem: "Manual", // Sempre "Manual" para novos documentos
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();



  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar contagem de anexos para todos os documentos
  const { data: artifactCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documentos/artifacts-count"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const documento of documentos) {
        try {
          const response = await fetch(`/api/documentos/${documento.id}/artifacts`);
          if (response.ok) {
            const artifacts = await response.json();
            counts[documento.id] = artifacts.length;
          } else {
            counts[documento.id] = 0;
          }
        } catch {
          counts[documento.id] = 0;
        }
      }
      return counts;
    },
    enabled: documentos.length > 0,
  });

  // Buscar conexões de serviço para obter o repositório GitHub
  const { data: serviceConnections = [] } = useQuery({
    queryKey: ["/api/service-connections"],
  });

  // Buscar estrutura local do repositório
  const { data: repoStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/repo-structure"],
  });

  // Mutation para sincronizar estrutura do GitHub para o banco local
  const syncFromGitHubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/repo-structure/sync-from-github');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída!",
        description: `${data.importedCount || 0} pasta(s) importadas e ${data.updatedCount || 0} pasta(s) atualizadas.`,
      });
      
      // Atualizar dados locais
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });
      
      // Atualizar estrutura do GitHub também
      fetchGithubRepoStructure();
      
      // Forçar re-fetch após um pequeno delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao importar estrutura do GitHub",
        variant: "destructive",
      });
    },
  });

  // Mutation para sincronizar todas as pastas não sincronizadas com GitHub
  const syncAllToGitHubMutation = useMutation({
    mutationFn: async () => {
      console.log("🔄 INICIANDO SINCRONIZAÇÃO - Botão clicado!");
      const unsyncedFolders = repoStructures.filter((folder: any) => 
        !folder.isSync && 
        (!folder.linkedTo || repoStructures.some((parent: any) => parent.uid === folder.linkedTo))
      );
      console.log("📁 Pastas para sincronizar:", unsyncedFolders.map(f => f.folderName));
      const results = [];
      
      for (const folder of unsyncedFolders) {
        console.log(`🚀 Sincronizando pasta: ${folder.folderName} (${folder.uid})`);
        try {
          const res = await apiRequest("POST", `/api/repo-structure/${folder.uid}/sync-github`);
          const result = await res.json();
          console.log(`✅ Sucesso para ${folder.folderName}:`, result);
          results.push({ folder: folder.folderName, success: true, message: result.message });
        } catch (error: any) {
          console.log(`❌ Erro para ${folder.folderName}:`, error);
          results.push({ folder: folder.folderName, success: false, message: error.message });
        }
      }
      
      console.log("🏁 SINCRONIZAÇÃO FINALIZADA - Resultados:", results);
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast({
          title: `${successCount} pasta(s) sincronizada(s)!`,
          description: errorCount > 0 ? `${errorCount} pasta(s) falharam na sincronização.` : "Todas as pastas foram enviadas para o GitHub com sucesso.",
        });
      }
      
      if (errorCount > 0) {
        const failedFolders = results.filter(r => !r.success).map(r => r.folder).join(", ");
        toast({
          title: "Algumas pastas falharam",
          description: `Pastas com erro: ${failedFolders}`,
          variant: "destructive",
        });
      }
      
      // Atualizar imediatamente a estrutura local
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });
      
      // Forçar múltiplas atualizações para garantir sincronização visual
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 500);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1500);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 3500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar pastas com GitHub.",
        variant: "destructive",
      });
    },
  });

  // Função para buscar arquivos de uma pasta específica no GitHub
  const fetchFolderFiles = async (folderPath: string) => {
    if (!folderPath) return;
    
    setIsLoadingFolderFiles(true);
    try {
      const githubConnection = (serviceConnections as any[])?.find(
        (conn: any) => conn.serviceName === 'github'
      );
      
      if (!githubConnection) return;
      
      const repo = githubConnection.parameters?.[0];
      if (!repo) return;
      
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/${folderPath}`, {
        headers: {
          'Authorization': `token ${githubConnection.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EVO-MindBits-Composer',
        },
      });
      
      if (response.ok) {
        const files = await response.json();
        // Filtrar arquivos, excluindo .gitkeep que são apenas para sincronização
        const fileList = Array.isArray(files) ? 
          files.filter((item: any) => item.type === 'file' && item.name !== '.gitkeep') : [];
        setSelectedFolderFiles(fileList);
      } else if (response.status === 404) {
        // Pasta vazia ou não existe - mostrar mensagem apropriada
        console.log('Pasta vazia ou não encontrada:', folderPath);
        setSelectedFolderFiles([]);
      } else {
        console.error('Erro ao buscar arquivos da pasta:', response.status);
        setSelectedFolderFiles([]);
      }
    } catch (error) {
      console.error('Erro ao buscar arquivos da pasta:', error);
      setSelectedFolderFiles([]);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  // Função para carregar visualização da estrutura do repositório
  const fetchGithubRepoStructure = async () => {
    const githubConnection = serviceConnections.find((conn: any) => conn.serviceName === 'github');
    
    if (!githubConnection || !githubConnection.token) {
      console.log('Conexão GitHub não encontrada');
      return [];
    }

    const repoParam = githubConnection.parameters?.[0];
    if (!repoParam) {
      console.log('Repositório não configurado');
      return [];
    }

    const [owner, repo] = repoParam.split('/');
    console.log('Carregando visualização do repositório:', repoParam);
    
    setIsLoadingRepo(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
        headers: {
          'Authorization': `Bearer ${githubConnection.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EVO-MindBits-Composer',
        },
      });

      if (response.ok) {
        const contents = await response.json();
        const fileStructure = await buildSimpleFileTree(contents);
        setGithubRepoFiles(fileStructure);
        return fileStructure;
      } else {
        console.error('Erro ao carregar repositório:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      return [];
    } finally {
      setIsLoadingRepo(false);
    }
  };

  // Função simples para criar estrutura de visualização
  const buildSimpleFileTree = async (items: any[]) => {
    return items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type === 'dir' ? 'folder' : 'file',
      size: item.size || 0,
      children: []
    }));
  };

  // Função para construir estrutura hierárquica
  const buildFileTree = async (items: any[], token: string, owner: string, repo: string, path: string = '') => {
    const tree: any[] = [];
    
    for (const item of items) {
      if (item.type === 'dir') {
        // Para pastas, buscar conteúdo recursivamente
        try {
          const subResponse = await fetch(item.url, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          
          if (subResponse.ok) {
            const subContents = await subResponse.json();
            const children = await buildFileTree(subContents, token, owner, repo, item.path);
            
            tree.push({
              id: item.path,
              name: item.name,
              type: 'folder',
              path: item.path,
              children: children
            });
          }
        } catch (error) {
          // Se falhar, adicionar pasta vazia
          tree.push({
            id: item.path,
            name: item.name,
            type: 'folder',
            path: item.path,
            children: []
          });
        }
      } else {
        // Para arquivos
        tree.push({
          id: item.path,
          name: item.name,
          type: 'file',
          path: item.path,
          size: formatFileSize(item.size),
          modified: new Date(item.sha).toLocaleDateString('pt-BR')
        });
      }
    }
    
    return tree;
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Função para criar arquivo README.md no repositório
  const createReadmeFile = async (token: string, owner: string, repo: string) => {
    const readmeContent = `# ${repo}

Este repositório foi criado para armazenar documentação técnica e empresarial do sistema ${repo}.

## Estrutura

- \`docs/\` - Documentação técnica
- \`specs/\` - Especificações e requisitos
- \`templates/\` - Templates de documentos

## EVO-MindBits Composer

Este repositório está integrado com o EVO-MindBits Composer para gestão automatizada de documentação.
`;

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EVO-MindBits-Composer',
        },
        body: JSON.stringify({
          message: 'Criar README.md inicial via EVO-MindBits Composer',
          content: btoa(readmeContent), // Base64 encode
        }),
      });

      if (response.ok) {
        console.log('README.md criado com sucesso!');
        return true;
      } else {
        const errorText = await response.text();
        console.error('Erro ao criar README.md:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('Erro na criação do README.md:', error);
      return false;
    }
  };

  // Carregar estrutura do repositório quando houver conexão GitHub
  useEffect(() => {
    if (serviceConnections && serviceConnections.length > 0 && activeTab === 'repositorio') {
      fetchGithubRepoStructure();
    }
  }, [serviceConnections, activeTab]);

  // Buscar artefatos do documento selecionado (para visualização ou edição)
  const currentDocumentId = selectedDocument?.id || editingDocument?.id;
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery<DocumentArtifact[]>({
    queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
    queryFn: async () => {
      if (!currentDocumentId) return [];
      const response = await fetch(`/api/documentos/${currentDocumentId}/artifacts`);
      if (!response.ok) throw new Error("Erro ao buscar anexos");
      return response.json();
    },
    enabled: !!currentDocumentId,
  });

  // Buscar anexos para o documento criado no modal (modal de criação)
  const { data: createdDocumentArtifacts = [] } = useQuery<DocumentArtifact[]>({
    queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
    queryFn: async () => {
      if (!currentCreatedDocumentId) return [];
      const response = await fetch(`/api/documentos/${currentCreatedDocumentId}/artifacts`);
      if (!response.ok) throw new Error("Erro ao buscar anexos");
      return response.json();
    },
    enabled: !!currentCreatedDocumentId,
  });

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: async (data: InsertDocumento) => {
      // Sempre define origem como "CPx" para novos documentos
      const documentoData = { ...data, origem: "CPx" };
      const response = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentoData),
      });
      if (!response.ok) throw new Error("Erro ao criar documento");
      return response.json();
    },
    onSuccess: (createdDocument) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      // Armazenar o ID do documento criado e NÃO fechar o modal
      setCurrentCreatedDocumentId(createdDocument.id);
      // Mudar automaticamente para a aba de anexos
      setCreateModalActiveTab("anexos");
      // Manter os dados do formulário para permitir edições
      toast({
        title: "Documento criado!",
        description: "Agora você pode adicionar anexos.",
      });
    },
  });

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertDocumento }) => {
      console.log("Atualizando documento:", id, data);
      try {
        const response = await fetch(`/api/documentos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        
        console.log("Status da resposta:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro na atualização:", response.status, errorText);
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Documento atualizado com sucesso:", result);
        return result;
      } catch (error) {
        console.error("Erro completo na mutação:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("OnSuccess disparado:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos/artifacts-count"] });
      
      // Se está salvando um documento criado no modal de criação, fechar o modal de criação
      if (currentCreatedDocumentId && variables.id === currentCreatedDocumentId) {
        setIsCreateModalOpen(false);
        setCurrentCreatedDocumentId(null);
        resetFormData();
        toast({
          title: "Documento salvo!",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        // Modal de edição normal
        setIsEditModalOpen(false);
        setEditingDocument(null);
        setFormData({
          origem: "",
          objeto: "",
          cliente: "",
          responsavel: "",
          sistema: "",
          modulo: "",
          descricao: "",
          status: "Integrado",
          statusOrigem: "Incluido",
        });
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso!",
        });
      }
      console.log("Modal deve estar fechada agora");
    },
    onError: (error) => {
      console.error("Erro na mutação:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar documento",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir documento");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setIsDeleteConfirmOpen(false);
      setDocumentToDelete(null);
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    },
  });

  // Mutation para criar artefato
  const createArtifactMutation = useMutation({
    mutationFn: async (data: InsertDocumentArtifact) => {
      const response = await fetch(`/api/documentos/${data.documentoId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar artefato");
      return response.json();
    },
    onSuccess: (newArtifact, variables) => {
      // Invalidar cache para o documento atual (edição)
      if (currentDocumentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentDocumentId, "artifacts"] });
      }
      // Invalidar cache para o documento criado (modal de criação)
      if (currentCreatedDocumentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"] });
      }
      // Invalidar contagem de anexos
      queryClient.invalidateQueries({ queryKey: ["/api/documentos/artifacts-count"] });
      setIsAddArtifactModalOpen(false);
      resetArtifactForm();
      toast({
        title: "Anexo adicionado!",
        description: "O anexo foi criado com sucesso.",
      });
    },
  });

  // Mutation para atualizar artefato
  const updateArtifactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentArtifact> }) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar artefato");
      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache para todos os possíveis documentos
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentDocumentId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] });
      
      setIsEditArtifactModalOpen(false);
      resetArtifactForm();
      
      toast({
        title: "Anexo atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações do anexo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir artefato
  const deleteArtifactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir artefato");
    },
    onSuccess: () => {
      // Invalidar cache para todos os possíveis documentos
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentDocumentId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", editingDocument?.id, "artifacts"] });
      
      setIsDeleteArtifactConfirmOpen(false);
      setArtifactToDelete(null);
      
      toast({
        title: "Anexo excluído!",
        description: "O anexo foi removido com sucesso.",
      });
    },
  });

  // Filtrar documentos por status
  const documentosIntegrados = useMemo(() => 
    documentos.filter(doc => doc.status === "Integrado"), [documentos]);
  const documentosProcessando = useMemo(() => 
    documentos.filter(doc => doc.status === "Processando"), [documentos]);
  const documentosConcluidos = useMemo(() => 
    documentos.filter(doc => doc.status === "Concluido"), [documentos]);

  const handleCreateDocument = () => {
    createDocumentoMutation.mutate(formData);
  };

  const openEditModal = (documento: Documento) => {
    setEditingDocument(documento);
    setFormData({
      origem: documento.origem,
      objeto: documento.objeto,
      tipo: documento.tipo || "",
      cliente: documento.cliente,
      responsavel: documento.responsavel,
      sistema: documento.sistema,
      modulo: documento.modulo,
      descricao: documento.descricao,
      status: documento.status,
      statusOrigem: documento.statusOrigem,
      solicitante: documento.solicitante || "",
      aprovador: documento.aprovador || "",
      agente: documento.agente || "",
    });
    setIsEscopoExpanded(false); // Frames sempre recolhidos
    setIsPessoasExpanded(false); // Frames sempre recolhidos
    setIsEditModalOpen(true);
  };

  const handleUpdateDocument = () => {
    if (editingDocument) {
      updateDocumentoMutation.mutate({
        id: editingDocument.id,
        data: formData,
      });
    }
  };

  // Funções auxiliares para artefatos
  const resetArtifactForm = () => {
    setArtifactFormData({
      documentoId: "",
      name: "",
      fileData: "",
      fileName: "",
      fileSize: "",
      mimeType: "",
      type: "",
    });
    setSelectedArtifact(null);
  };

  const openAddArtifactModal = () => {
    resetArtifactForm();
    setArtifactFormData(prev => ({ ...prev, documentoId: selectedDocument?.id || "" }));
    setIsAddArtifactModalOpen(true);
  };

  const openEditArtifactModal = (artifact: DocumentArtifact) => {
    setSelectedArtifact(artifact);
    setArtifactFormData({
      documentoId: artifact.documentoId,
      name: artifact.name,
      fileData: artifact.fileData,
      fileName: artifact.fileName,
      fileSize: artifact.fileSize || "",
      mimeType: artifact.mimeType,
      type: artifact.type,
    });
    setIsEditArtifactModalOpen(true);
  };

  const handleCreateArtifact = () => {
    createArtifactMutation.mutate(artifactFormData);
  };

  const handleUpdateArtifact = () => {
    if (selectedArtifact) {
      updateArtifactMutation.mutate({
        id: selectedArtifact.id,
        data: artifactFormData,
      });
    }
  };

  const handleDeleteArtifact = (artifactId: string) => {
    setArtifactToDelete(artifactId);
    setIsDeleteArtifactConfirmOpen(true);
  };

  const confirmDeleteArtifact = () => {
    console.log("🗑️ CONFIRMANDO EXCLUSÃO DE ANEXO:", artifactToDelete);
    if (artifactToDelete) {
      console.log("✅ Executando exclusão via mutation...");
      deleteArtifactMutation.mutate(artifactToDelete);
    } else {
      console.log("❌ Nenhum anexo selecionado para exclusão");
    }
  };

  const cancelDeleteArtifact = () => {
    console.log("❌ CANCELANDO EXCLUSÃO DE ANEXO");
    setIsDeleteArtifactConfirmOpen(false);
    setArtifactToDelete(null);
  };

  const getFileTypeIcon = (type: string) => {
    if (!type) return <File className="h-4 w-4 text-gray-400" />;
    
    switch (type.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "doc":
      case "docx":
        return <File className="h-4 w-4 text-blue-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <File className="h-4 w-4 text-green-500" />;
      case "txt":
        return <File className="h-4 w-4 text-gray-500" />;
      case "json":
        return <File className="h-4 w-4 text-orange-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Integrado":
        return <CircleCheck className="h-3 w-3" />;
      case "Processando":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "Concluido":
        return <CircleCheck className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Integrado":
        return "default";
      case "Processando":
        return "secondary";
      case "Concluido":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getStatusOrigemBadgeVariant = (statusOrigem: string) => {
    switch (statusOrigem) {
      case "Incluido":
        return "default";
      case "Em CRP":
        return "secondary";
      case "Em Aprovação":
        return "outline";
      case "Em DRP":
        return "secondary";
      case "Concluido":
        return "default";
      default:
        return "destructive";
    }
  };

  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
  };

  const handleDeleteDocument = (documento: Documento) => {
    toast({
      title: "⚠️ Confirmar Exclusão",
      description: `Tem certeza que deseja excluir "${documento.objeto}"? Esta ação não pode ser desfeita.`,
      action: (
        <div className="flex gap-2">
          <button
            onClick={() => deleteDocumentoMutation.mutate(documento.id)}
            disabled={deleteDocumentoMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            {deleteDocumentoMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3" />
                Excluir
              </>
            )}
          </button>
        </div>
      ),
      duration: 8000,
    });
  };



  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocumentoMutation.mutate(documentToDelete.id);
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setDocumentToDelete(null);
  };

  // Função para converter arquivo em Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:tipo/mime;base64," para armazenar apenas o Base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Função para processar upload de arquivo
  const handleFileUpload = async (file: File) => {
    try {
      const base64Data = await convertFileToBase64(file);
      const fileSizeInBytes = file.size.toString();
      
      setArtifactFormData({
        ...artifactFormData,
        fileData: base64Data,
        fileName: file.name,
        fileSize: fileSizeInBytes,
        mimeType: file.type,
        type: getFileTypeFromMime(file.type),
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar o arquivo');
    }
  };

  // Função para determinar tipo do arquivo baseado no MIME type
  const getFileTypeFromMime = (mimeType: string): string => {
    // PDFs
    if (mimeType.includes('pdf')) return 'pdf';
    
    // Documentos Word
    if (mimeType.includes('word') || 
        mimeType.includes('document') || 
        mimeType.includes('ms-word') ||
        mimeType.includes('officedocument.wordprocessingml')) return 'docx';
    
    // Planilhas Excel
    if (mimeType.includes('excel') || 
        mimeType.includes('spreadsheet') ||
        mimeType.includes('officedocument.spreadsheetml')) return 'xlsx';
    
    // Imagens
    if (mimeType.startsWith('image/jpeg') || mimeType.startsWith('image/jpg')) return 'jpg';
    if (mimeType.startsWith('image/png')) return 'png';
    if (mimeType.startsWith('image/')) return 'img';
    
    // Texto
    if (mimeType.includes('text/plain')) return 'txt';
    if (mimeType.includes('json')) return 'json';
    if (mimeType.includes('xml')) return 'xml';
    
    // Compactados
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip';
    
    // Outros documentos
    if (mimeType.includes('rtf')) return 'doc';
    
    return 'outros';
  };

  const renderDocumentosTable = (documentos: Documento[]) => {
    if (activeTab === "integrados") {
      return (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="bg-gray-50 border-b">Origem</TableHead>
                  <TableHead className="bg-gray-50 border-b">Nome</TableHead>
                  <TableHead className="bg-gray-50 border-b">Status</TableHead>
                  <TableHead className="bg-gray-50 border-b">Data Origem</TableHead>
                  <TableHead className="bg-gray-50 border-b">Data Integração</TableHead>
                  <TableHead className="bg-gray-50 border-b">Status Origem</TableHead>
                  <TableHead className="bg-gray-50 border-b">Anexos</TableHead>
                  <TableHead className="bg-gray-50 border-b text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {documento.origem === "Monday" ? (
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Monday</div>
                        ) : (
                          <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">{documento.origem}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{documento.objeto}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(documento.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {getStatusIcon(documento.status)}
                        {documento.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(documento.createdAt)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(documento.updatedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusOrigemBadgeVariant(documento.statusOrigem) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {documento.statusOrigem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Verificar se monday_item_values tem conteúdo
                        const hasMonValues = documento.mondayItemValues && 
                                            Array.isArray(documento.mondayItemValues) && 
                                            documento.mondayItemValues.length > 0;
                        
                        if (!hasMonValues) {
                          // Badge cinza com "none" para monday_item_values vazio
                          return (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">
                              none
                            </Badge>
                          );
                        } else {
                          // Badge amarelo com "files" quando tem conteúdo
                          return (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                              files
                            </Badge>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openViewModal(documento)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {documentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                      Nenhum documento encontrado nesta categoria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
              <TableCell>
                <div className="flex items-center">
                  <File className="h-5 w-5 text-blue-500" />
                  <span className="ml-2 text-xs text-gray-500">DOC</span>
                </div>
              </TableCell>
              <TableCell className="font-medium">{documento.objeto}</TableCell>
              <TableCell>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatDate(documento.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(documento.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                  {getStatusIcon(documento.status)}
                  {documento.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => openViewModal(documento)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {activeTab !== "integrados" && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditModal(documento)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDeleteDocument(documento)}
                      disabled={deleteDocumentoMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {documentos.length === 0 && (
          <TableRow>
            <TableCell colSpan={activeTab === "integrados" ? 8 : 5} className="text-center py-6 text-gray-500">
              Nenhum documento encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
        </TableBody>
      </Table>
    );
  };

  // Função para verificar se monday_item_values tem conteúdo JSON válido
  const hasMondayItemValues = (documento: Documento): boolean => {
    if (!documento.mondayItemValues) return false;
    
    try {
      const parsed = Array.isArray(documento.mondayItemValues) 
        ? documento.mondayItemValues 
        : JSON.parse(JSON.stringify(documento.mondayItemValues));
      
      return Array.isArray(parsed) && parsed.length > 0 && 
             parsed.some(item => item.value && item.value.trim() !== '');
    } catch {
      return false;
    }
  };

  const renderViewModal = () => {
    if (!selectedDocument) return null;
    
    const showAnexosTab = hasMondayItemValues(selectedDocument);
    const gridCols = showAnexosTab ? "grid-cols-3" : "grid-cols-2";
    
    return (
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5 text-blue-500" />
              <span>{selectedDocument.objeto}</span>
            </DialogTitle>
            <DialogDescription>
              Detalhes e anexos do documento
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="dados-gerais" className="w-full">
            <TabsList className={`grid w-full ${gridCols}`}>
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="general-fields">General Fields</TabsTrigger>
              {showAnexosTab && (
                <TabsTrigger value="anexos">
                  Anexos ({artifacts.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="dados-gerais" className="mt-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Origem</p>
                    <p className="text-sm">{selectedDocument.origem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Cliente</p>
                    <p className="text-sm">{selectedDocument.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Responsável</p>
                    <p className="text-sm">{selectedDocument.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Sistema</p>
                    <p className="text-sm">{selectedDocument.sistema}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Módulo</p>
                    <p className="text-sm">{selectedDocument.modulo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                    <div>
                      <Badge variant={getStatusBadgeVariant(selectedDocument.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {getStatusIcon(selectedDocument.status)}
                        {selectedDocument.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status Origem</p>
                    <div>
                      <Badge variant={getStatusOrigemBadgeVariant(selectedDocument.statusOrigem) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {selectedDocument.statusOrigem}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Data Criação</p>
                    <p className="text-sm">{formatDate(selectedDocument.createdAt)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 min-h-[80px]">
                    {selectedDocument.descricao}
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="general-fields" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">Campos Gerais</h3>
                  <Badge variant="outline" className="text-xs">
                    {selectedDocument.generalColumns ? 'JSON' : 'Vazio'}
                  </Badge>
                </div>
                
                {selectedDocument.generalColumns && Object.keys(selectedDocument.generalColumns).length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(selectedDocument.generalColumns).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-4 items-center">
                        <div className="bg-gray-50 p-2 rounded border">
                          <p className="text-xs font-medium text-gray-500 mb-1">Campo</p>
                          <p className="text-sm font-mono text-gray-800">{key}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Valor</p>
                          <div className="bg-white border rounded p-2 min-h-[40px] flex items-center">
                            <p className="text-sm text-gray-700 break-words">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Database className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum campo geral encontrado</p>
                    <p className="text-xs text-gray-400 mt-1">Os campos gerais são armazenados no formato JSON</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {showAnexosTab && (
              <TabsContent value="anexos" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Anexos do Documento</h3>
                    {/* Botão para carregar anexos do Monday.com para documentos integrados */}
                  {(() => {
                    const hasIdOrigemTxt = selectedDocument?.idOrigemTxt && selectedDocument.idOrigemTxt.trim() !== '';
                    console.log("🔍 Verificando idOrigemTxt:", {
                      documento: selectedDocument?.objeto,
                      idOrigemTxt: selectedDocument?.idOrigemTxt,
                      hasIdOrigemTxt: hasIdOrigemTxt
                    });
                    return hasIdOrigemTxt;
                  })() && (
                    <Button 
                      onClick={async () => {
                        try {
                          setIsLoadingMondayAttachments(true);
                          
                          // Buscar mapeamentos Monday ativos
                          const mappingsResponse = await fetch('/api/monday/mappings');
                          if (!mappingsResponse.ok) {
                            throw new Error('Erro ao buscar mapeamentos');
                          }
                          
                          const mappings = await mappingsResponse.json();
                          const activeMappings = mappings.filter((m: any) => 
                            m.lastSync && new Date(m.lastSync) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          );
                          
                          if (activeMappings.length === 0) {
                            toast({
                              title: "Nenhum mapeamento ativo",
                              description: "É necessário ter um mapeamento Monday ativo com Assets Map configurado",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Priorizar mapeamentos que tenham Assets Map configurado
                          const mappingsWithAssets = activeMappings.filter((m: any) => 
                            m.assetsMappings && m.assetsMappings.length > 0
                          );
                          
                          let mapping;
                          if (mappingsWithAssets.length > 0) {
                            mapping = mappingsWithAssets[0]; // Usar o primeiro com Assets Map
                          } else {
                            mapping = activeMappings[0]; // Fallback para o primeiro ativo
                          }
                          console.log("🔧 Mapeamento selecionado:", {
                            nome: mapping.name,
                            id: mapping.id,
                            assetsMappings: mapping.assetsMappings,
                            hasAssetsMappings: mapping.assetsMappings && mapping.assetsMappings.length > 0
                          });
                          
                          if (!mapping.assetsMappings || mapping.assetsMappings.length === 0) {
                            toast({
                              title: "Assets Map não configurado",
                              description: `O mapeamento "${mapping.name}" não possui configuração de Assets Map para colunas de arquivo`,
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Buscar anexos das colunas específicas do Assets Map
                          console.log("📤 Enviando request para Monday:", {
                            columnIds: mapping.assetsMappings.map((am: any) => am.columnId),
                            boardId: mapping.boardId
                          });
                          
                          const response = await fetch(`/api/monday/assets-map/${selectedDocument.idOrigemTxt}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              columnIds: mapping.assetsMappings.map((am: any) => am.columnId),
                              boardId: mapping.boardId 
                            })
                          });
                          
                          console.log("🔍 Response status:", response.status, response.ok);
                          
                          if (response.ok) {
                            let attachmentsData;
                            try {
                              attachmentsData = await response.json();
                              console.log("📥 Anexos recebidos do Monday:", attachmentsData);
                            } catch (parseError) {
                              console.error("❌ Erro ao fazer parse do JSON:", parseError);
                              throw new Error("Erro ao processar resposta do servidor");
                            }
                            
                            if (attachmentsData.success && attachmentsData.attachments && attachmentsData.attachments.length > 0) {
                              // Armazenar dados dos arquivos encontrados para exibir na tabela
                              setMondayAttachmentsPreview(attachmentsData.attachments);
                              
                              toast({
                                title: "Arquivos encontrados",
                                description: `${attachmentsData.attachments.length} arquivo(s) encontrado(s) nas colunas do Assets Map. Veja a tabela abaixo.`,
                              });
                            } else {
                              setMondayAttachmentsPreview([]);
                              toast({
                                title: "Nenhum arquivo encontrado",
                                description: "Este item não possui arquivos nas colunas configuradas no Assets Map",
                              });
                            }
                          } else {
                            const errorData = await response.text();
                            toast({
                              title: "Erro ao carregar anexos",
                              description: errorData || "Não foi possível buscar anexos das colunas do Assets Map",
                              variant: "destructive"
                            });
                          }
                        } catch (error) {
                          console.error("Erro ao carregar anexos:", error);
                          toast({
                            title: "Erro",
                            description: "Erro interno ao carregar anexos",
                            variant: "destructive"
                          });
                        } finally {
                          setIsLoadingMondayAttachments(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                      disabled={isLoadingMondayAttachments}
                    >
                      {isLoadingMondayAttachments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Carregar Anexos
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Tabela de arquivos encontrados no Monday.com */}
                {mondayAttachmentsPreview.length > 0 && (
                  <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                    <h4 className="text-md font-medium mb-3 text-blue-800">
                      📋 Arquivos encontrados no Monday.com
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coluna</TableHead>
                          <TableHead>Nome do Arquivo</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data de Criação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mondayAttachmentsPreview.map((file, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {file.columnTitle}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {file.columnId}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {file.isImage && (
                                  <span className="mr-2 text-green-600">🖼️</span>
                                )}
                                <span className="font-medium">{file.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <a 
                                href={file.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                              >
                                Ver arquivo 🔗
                              </a>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {file.fileType}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {file.createdAt || 'N/A'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">
                        💡 <strong>Próximo passo:</strong> Implemente uma funcionalidade para baixar e salvar esses arquivos como anexos do documento.
                      </div>
                      <Button 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/monday/saved-json-files');
                            if (response.ok) {
                              const data = await response.json();
                              if (data.files && data.files.length > 0) {
                                const fileInfo = data.files.map((f: any) => 
                                  `${f.name} (${f.size} bytes, ${new Date(f.created).toLocaleString('pt-BR')})`
                                ).join('\n');
                                alert(`Arquivos JSON salvos (${data.files.length}):\n\n${fileInfo}`);
                              } else {
                                alert('Nenhum arquivo JSON foi salvo ainda.');
                              }
                            }
                          } catch (error) {
                            console.error('Erro ao listar arquivos:', error);
                            alert('Erro ao listar arquivos JSON salvos.');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        📄 Ver Arquivos JSON Salvos
                      </Button>
                    </div>
                  </div>
                )}
                
                {isLoadingArtifacts ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Carregando anexos...</p>
                  </div>
                ) : artifacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artifacts.map((artifact) => (
                        <TableRow key={artifact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileTypeIcon(artifact.type)}
                              <span className="text-xs font-medium uppercase text-gray-500">
                                {artifact.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{artifact.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{artifact.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(artifact.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `data:${artifact.mimeType};base64,${artifact.fileData}`;
                                  link.download = artifact.fileName;
                                  link.click();
                                }}
                                title="Baixar cópia"
                              >
                                <Download className="h-4 w-4 text-blue-500" />
                              </Button>
                              {isMimeTypeViewable(artifact.mimeType) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    try {
                                      // Converter base64 para blob
                                      const byteCharacters = atob(artifact.fileData);
                                      const byteNumbers = new Array(byteCharacters.length);
                                      for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                      }
                                      const byteArray = new Uint8Array(byteNumbers);
                                      const blob = new Blob([byteArray], { type: artifact.mimeType });
                                      
                                      // Criar URL temporária e abrir em nova aba
                                      const blobUrl = URL.createObjectURL(blob);
                                      const newWindow = window.open(blobUrl, '_blank');
                                      
                                      // Limpar URL após um tempo para liberar memória
                                      setTimeout(() => {
                                        URL.revokeObjectURL(blobUrl);
                                      }, 5000);
                                    } catch (error) {
                                      console.error('Erro ao visualizar arquivo:', error);
                                      toast({
                                        title: "Erro",
                                        description: "Não foi possível visualizar o arquivo",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}

                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum anexo encontrado</p>
                  </div>
                )}

                {/* Seção de dados do Monday.com */}
                <div className="mt-8 border-t pt-6">
                  <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    Dados do Monday.com
                  </h4>
                  
                  {(() => {
                    try {
                      const mondayData = selectedDocument?.mondayItemValues ? JSON.parse(selectedDocument.mondayItemValues) : null;
                      
                      if (!mondayData || !Array.isArray(mondayData) || mondayData.length === 0) {
                        return (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                            <Database className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Nenhum dado do Monday.com encontrado</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID da Coluna</TableHead>
                                <TableHead>Nome do Arquivo</TableHead>
                                <TableHead>ID do Asset</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Extensão</TableHead>
                                <TableHead>Criado em</TableHead>
                                <TableHead>Criado por</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mondayData.map((item: any, index: number) => {
                                const value = item.value ? JSON.parse(item.value) : {};
                                return (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                      {item.columnid || 'N/A'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {value.name || 'N/A'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {value.assetId || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {value.isImage ? (
                                          <Image className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <FileText className="h-4 w-4 text-gray-500" />
                                        )}
                                        <span className="text-xs">
                                          {value.isImage ? 'Imagem' : value.fileType || 'Arquivo'}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs uppercase">
                                      {value.extension || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                      {value.createdAt ? new Date(value.createdAt).toLocaleString('pt-BR') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {value.createdBy ? JSON.stringify(value.createdBy) : 'N/A'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">Dados Brutos (JSON)</h5>
                            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto text-gray-700">
                              {JSON.stringify(mondayData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      return (
                        <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600">Erro ao processar dados do Monday.com</p>
                          <p className="text-xs text-red-500 mt-1">Verifique o formato dos dados armazenados</p>
                        </div>
                      );
                    }
                  })()}
                </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal para criar novo documento
  const renderCreateModal = () => (
    <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
      if (!open) {
        resetFormData();
      }
      setIsCreateModalOpen(open);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            {currentCreatedDocumentId ? "Criar Novo Documento" : "Criar Novo Documento"}
          </DialogTitle>
          <DialogDescription>
            {currentCreatedDocumentId 
              ? "Documento criado com sucesso! Gerencie os dados e anexos"
              : "Preencha os dados do novo documento"
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={createModalActiveTab} onValueChange={setCreateModalActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
            <TabsTrigger 
              value="anexos" 
              disabled={!currentCreatedDocumentId}
              className={!currentCreatedDocumentId ? "opacity-50 cursor-not-allowed" : ""}
            >
              Anexos {currentCreatedDocumentId ? "✅" : "🔒"}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dados-gerais" className="mt-6">
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="objeto">Objeto da Task</Label>
                  <Input
                    id="objeto"
                    value={formData.objeto}
                    onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                    placeholder="Nome do documento"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRP-Req.Cliente">CRP-Req.Cliente</SelectItem>
                      <SelectItem value="RRP-Impl.Roadmap">RRP-Impl.Roadmap</SelectItem>
                      <SelectItem value="ODI-Instr.Oper.">ODI-Instr.Oper.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-700">Escopo</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEscopoExpanded(!isEscopoExpanded)}
                    className="h-6 w-6 p-0 hover:bg-blue-100"
                  >
                    {isEscopoExpanded ? (
                      <ChevronUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    )}
                  </Button>
                </div>
                {isEscopoExpanded && (
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="cliente">Cliente</Label>
                      <Input
                        id="cliente"
                        value={formData.cliente}
                        onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sistema">Sistema</Label>
                        <Input
                          id="sistema"
                          value={formData.sistema}
                          onChange={(e) => setFormData({ ...formData, sistema: e.target.value })}
                          placeholder="Sistema"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modulo">Módulo</Label>
                        <Input
                          id="modulo"
                          value={formData.modulo}
                          onChange={(e) => setFormData({ ...formData, modulo: e.target.value })}
                          placeholder="Módulo"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Pessoas</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPessoasExpanded(!isPessoasExpanded)}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    {isPessoasExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>
                {isPessoasExpanded && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input
                        id="responsavel"
                        value={formData.responsavel}
                        onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                        placeholder="Responsável"
                      />
                    </div>
                    <div>
                      <Label htmlFor="solicitante">Solicitante</Label>
                      <Input
                        id="solicitante"
                        value={formData.solicitante}
                        onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                        placeholder="Solicitante"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aprovador">Aprovador</Label>
                      <Input
                        id="aprovador"
                        value={formData.aprovador}
                        onChange={(e) => setFormData({ ...formData, aprovador: e.target.value })}
                        placeholder="Aprovador"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agente">Agente</Label>
                      <Input
                        id="agente"
                        value={formData.agente}
                        onChange={(e) => setFormData({ ...formData, agente: e.target.value })}
                        placeholder="Agente"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="descricao">Detalhamento</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhamento completo do documento..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="anexos" className="mt-6">
            <div className="space-y-4">
              {currentCreatedDocumentId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Anexos do Documento</h3>
                    <Button 
                      onClick={() => {
                        setArtifactFormData({
                          documentoId: currentCreatedDocumentId,
                          name: "",
                          fileData: "",
                          fileName: "",
                          fileSize: "",
                          mimeType: "",
                          type: "",
                        });
                        setIsAddArtifactModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Anexo
                    </Button>
                  </div>
                  
                  {/* Lista de anexos */}
                  {createdDocumentArtifacts && createdDocumentArtifacts.length > 0 ? (
                    <div className="space-y-2">
                      {createdDocumentArtifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <File className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{artifact.name}</p>
                              <p className="text-xs text-gray-500">
                                {artifact.fileName} • {artifact.mimeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditArtifactModal(artifact)}
                              title="Editar anexo"
                            >
                              <Pencil className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log("🗑️ EXCLUINDO ANEXO DIRETAMENTE:", artifact.id);
                                deleteArtifactMutation.mutate(artifact.id);
                              }}
                              title="Excluir anexo"
                              disabled={deleteArtifactMutation.isPending}
                            >
                              {deleteArtifactMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>

                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <Paperclip className="h-8 w-8 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-green-700 mb-3">✅ Documento criado com sucesso!</p>
                      <p className="text-xs text-green-600">Adicione anexos clicando no botão acima</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">Adicione anexos após criar o documento</p>
                  <p className="text-xs text-gray-400">Os anexos poderão ser gerenciados após a criação</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            {currentCreatedDocumentId ? "Fechar" : "Cancelar"}
          </Button>
          {!currentCreatedDocumentId ? (
            <Button 
              onClick={handleCreateDocument} 
              disabled={createDocumentoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Documento
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                // Salvar alterações no documento existente
                if (currentCreatedDocumentId) {
                  updateDocumentoMutation.mutate({
                    id: currentCreatedDocumentId,
                    data: formData,
                  });
                }
              }} 
              disabled={updateDocumentoMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
          <Button 
            onClick={() => {
              resetFormData();
              setIsCreateModalOpen(true);
            }} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Incluir Documento
          </Button>
        </div>
        
        <Tabs 
          defaultValue="incluidos" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="incluidos">Incluídos</TabsTrigger>
            <TabsTrigger value="integrados">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo">Em Processo</TabsTrigger>
            <TabsTrigger value="repositorio">Repositório</TabsTrigger>
          </TabsList>
          
          <TabsContent value="incluidos" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Status Origem</TableHead>
                    <TableHead>Anexos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos?.filter(doc => doc.status === "Incluido").map((documento) => (
                    <TableRow key={documento.id}>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="bg-purple-100 text-purple-800 border-purple-200"
                        >
                          {documento.origem}
                        </Badge>
                      </TableCell>
                      <TableCell>{documento.objeto}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          {documento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {documento.statusOrigem}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {artifactCounts[documento.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>{documento.createdAt ? new Date(documento.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openViewModal(documento)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(documento)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteDocument(documento)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {documentos?.filter(doc => doc.status === "Incluido").length === 0 && !isLoading && (
              <div className="text-center py-12">
                <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento incluído</h3>
                <p className="text-gray-500">Documentos com status "Incluído" aparecerão aqui.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="integrados" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosIntegrados)
            )}
          </TabsContent>
          
          <TabsContent value="em-processo" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosProcessando)
            )}
          </TabsContent>
          
          <TabsContent value="distribuidos" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosConcluidos)
            )}
          </TabsContent>
          
          <TabsContent value="repositorio" className="slide-in">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Integração com Repositório GitHub</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gerencie documentos sincronizados com o repositório configurado
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => syncFromGitHubMutation.mutate()}
                      disabled={syncFromGitHubMutation.isPending}
                    >
                      {syncFromGitHubMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700" 
                      size="sm"
                      onClick={() => syncAllToGitHubMutation.mutate()}
                      disabled={syncAllToGitHubMutation.isPending || repoStructures.filter((folder: any) => !folder.isSync && (!folder.linkedTo || repoStructures.some((parent: any) => parent.uid === folder.linkedTo))).length === 0}
                    >
                      {syncAllToGitHubMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {syncAllToGitHubMutation.isPending ? 'Enviando...' : `Enviar para GitHub (${repoStructures.filter((folder: any) => !folder.isSync && (!folder.linkedTo || repoStructures.some((parent: any) => parent.uid === folder.linkedTo))).length})`}
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Estrutura do Repositório</h4>
                        {isLoadingRepo && (
                          <div className="flex items-center text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Carregando...
                          </div>
                        )}
                        {!isLoadingRepo && githubRepoFiles.length === 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchGithubRepoStructure}
                          >
                            Atualizar
                          </Button>
                        )}
                      </div>
                      
                      <div className="min-h-[400px]">
                        {githubRepoFiles.length > 0 ? (
                          <FileExplorer 
                            data={githubRepoFiles}
                            onFileSelect={(file) => {
                              console.log('Arquivo selecionado:', file);
                            }}
                            onFolderToggle={(folder, isExpanded) => {
                              console.log('Pasta:', folder.name, 'Expandida:', isExpanded);
                              if (isExpanded && folder.type === 'folder') {
                                const buildFullPath = (folderName: string) => {
                                  const structure = repoStructures.find((s: any) => s.folderName === folderName);
                                  if (!structure) return `/${folderName}/`;
                                  
                                  let path = structure.folderName;
                                  let current = structure;
                                  
                                  while (current.linkedTo) {
                                    const parent = repoStructures.find((s: any) => s.uid === current.linkedTo);
                                    if (parent) {
                                      path = `${parent.folderName}/${path}`;
                                      current = parent;
                                    } else {
                                      break;
                                    }
                                  }
                                  
                                  return `/${path}/`;
                                };
                                
                                const fullPath = buildFullPath(folder.name);
                                setSelectedFolderPath(fullPath);
                                fetchFolderFiles(folder.path);
                              }
                            }}
                          />
                        ) : !isLoadingRepo ? (
                          <div className="border rounded-lg bg-gray-50 p-6 text-center">
                            <div className="text-gray-500 mb-2">
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">Nenhum repositório conectado</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              Configure uma conexão GitHub nas configurações para ver a estrutura do repositório aqui.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={fetchGithubRepoStructure}
                            >
                              Tentar Conectar
                            </Button>
                          </div>
                        ) : (
                          <div className="border rounded-lg bg-white p-6">
                            <div className="animate-pulse space-y-3">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">
                        {selectedFolderPath ? (
                          <span>
                            Arquivos em: <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{selectedFolderPath}</code>
                          </span>
                        ) : (
                          'Arquivos na pasta'
                        )}
                      </h4>
                      <div className="min-h-[400px] space-y-3">
                        {isLoadingFolderFiles ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-500">Carregando arquivos...</span>
                          </div>
                        ) : selectedFolderFiles.length > 0 ? (
                          selectedFolderFiles.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <div>
                                  <div className="font-medium text-sm">{file.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Tamanho: {(file.size / 1024).toFixed(1)}KB
                                  </div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">GitHub</Badge>
                            </div>
                          ))
                        ) : selectedFolderPath ? (
                          <div className="text-center py-8">
                            <div className="text-gray-500 text-sm">
                              📁 Pasta vazia
                              <br />
                              <span className="text-xs">Esta pasta foi criada para organização mas ainda não contém arquivos</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-500 text-sm">Clique em uma pasta para ver seus arquivos</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {renderViewModal()}
      {renderCreateModal()}
      {renderEditModal()}
      {renderAddArtifactModal()}
      {renderEditArtifactModal()}
    </div>
  );

  // Modal para editar documento
  function renderEditModal() {
    if (!editingDocument) return null;
    
    return (
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              {currentCreatedDocumentId ? "Criar Novo Documento" : `Editar Documento: ${editingDocument.objeto}`}
            </DialogTitle>
            <DialogDescription>
              {currentCreatedDocumentId 
                ? "Complete os dados do documento e adicione anexos conforme necessário" 
                : "Edite os dados do documento e gerencie seus anexos"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="dados-gerais" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados-gerais" className="mt-6">
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-objeto">Objeto da Task</Label>
                    <Input
                      id="edit-objeto"
                      value={formData.objeto}
                      onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                      placeholder="Nome do documento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-tipo">Tipo</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRP-Req.Cliente">CRP-Req.Cliente</SelectItem>
                        <SelectItem value="RRP-Impl.Roadmap">RRP-Impl.Roadmap</SelectItem>
                        <SelectItem value="ODI-Instr.Oper.">ODI-Instr.Oper.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-blue-700">Escopo</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEscopoExpanded(!isEscopoExpanded)}
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                    >
                      {isEscopoExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      )}
                    </Button>
                  </div>
                  {isEscopoExpanded && (
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="edit-cliente">Cliente</Label>
                        <Input
                          id="edit-cliente"
                          value={formData.cliente}
                          onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                          placeholder="Nome do cliente"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-sistema">Sistema</Label>
                          <Input
                            id="edit-sistema"
                            value={formData.sistema}
                            onChange={(e) => setFormData({ ...formData, sistema: e.target.value })}
                            placeholder="Sistema"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-modulo">Módulo</Label>
                          <Input
                            id="edit-modulo"
                            value={formData.modulo}
                            onChange={(e) => setFormData({ ...formData, modulo: e.target.value })}
                            placeholder="Módulo"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Pessoas</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPessoasExpanded(!isPessoasExpanded)}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      {isPessoasExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  </div>
                  {isPessoasExpanded && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-responsavel">Responsável</Label>
                        <Input
                          id="edit-responsavel"
                          value={formData.responsavel}
                          onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                          placeholder="Responsável"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-solicitante">Solicitante</Label>
                        <Input
                          id="edit-solicitante"
                          value={formData.solicitante}
                          onChange={(e) => setFormData({ ...formData, solicitante: e.target.value })}
                          placeholder="Solicitante"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-aprovador">Aprovador</Label>
                        <Input
                          id="edit-aprovador"
                          value={formData.aprovador}
                          onChange={(e) => setFormData({ ...formData, aprovador: e.target.value })}
                          placeholder="Aprovador"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-agente">Agente</Label>
                        <Input
                          id="edit-agente"
                          value={formData.agente}
                          onChange={(e) => setFormData({ ...formData, agente: e.target.value })}
                          placeholder="Agente"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="edit-descricao">Detalhamento</Label>
                  <Textarea
                    id="edit-descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Detalhamento completo do documento..."
                    rows={4}
                    className="resize-none"
                  />
                </div>


              </div>
            </TabsContent>
            
            <TabsContent value="anexos" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Anexos do Documento</h3>
                  <Button 
                    onClick={() => {
                      setArtifactFormData({
                        documentoId: editingDocument.id,
                        name: "",
                        fileData: "",
                        fileName: "",
                        fileSize: "",
                        mimeType: "",
                        type: "",
                      });
                      setIsAddArtifactModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Anexo
                  </Button>
                </div>
                
                {isLoadingArtifacts ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Carregando anexos...</p>
                  </div>
                ) : artifacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artifacts.map((artifact) => (
                        <TableRow key={artifact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileTypeIcon(artifact.type)}
                              <span className="text-xs font-medium uppercase">{artifact.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{artifact.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 truncate max-w-[200px]" title={artifact.fileName}>
                                {artifact.fileName}
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => openEditArtifactModal(artifact)}
                              >
                                <Pencil className="h-3 w-3 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  console.log("🗑️ EXCLUINDO ANEXO DIRETAMENTE NO MODAL DE EDIÇÃO:", artifact.id);
                                  deleteArtifactMutation.mutate(artifact.id);
                                }}
                                title="Excluir anexo"
                                disabled={deleteArtifactMutation.isPending}
                              >
                                {deleteArtifactMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3">Nenhum anexo encontrado</p>
                    <Button 
                      onClick={() => {
                        setArtifactFormData({
                          documentoId: editingDocument.id,
                          name: "",
                          file: "",
                          type: "",
                        });
                        setIsAddArtifactModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar primeiro anexo
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateDocument} 
              disabled={updateDocumentoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para adicionar artefato
  function renderAddArtifactModal() {
    return (
      <Dialog open={isAddArtifactModalOpen} onOpenChange={setIsAddArtifactModalOpen}>
        <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-500" />
              Adicionar Anexo
            </DialogTitle>
            <DialogDescription>
              Adicione um novo anexo ao documento
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="artifact-name">Nome do Anexo</Label>
              <Input
                id="artifact-name"
                value={artifactFormData.name}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, name: e.target.value })}
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>
            
            <div>
              <Label>Arquivo</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="file"
                    id="artifact-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('artifact-file')?.click()}
                    className="px-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                
                {/* Mostrar informações do arquivo selecionado */}
                {artifactFormData.fileName && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">Arquivo selecionado:</p>
                    <p className="text-sm text-gray-600">{artifactFormData.fileName}</p>
                    <p className="text-xs text-gray-500">
                      Tipo detectado: {artifactFormData.type.toUpperCase()} | Tamanho: {(parseInt(artifactFormData.fileSize || "0") / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateArtifact}
              disabled={createArtifactMutation.isPending || !artifactFormData.name || !artifactFormData.fileData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createArtifactMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Anexo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para editar artefato
  function renderEditArtifactModal() {
    return (
      <Dialog open={isEditArtifactModalOpen} onOpenChange={setIsEditArtifactModalOpen}>
        <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              Editar Anexo
            </DialogTitle>
            <DialogDescription>
              Edite as informações do anexo
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-artifact-name">Nome do Anexo</Label>
              <Input
                id="edit-artifact-name"
                value={artifactFormData.name}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, name: e.target.value })}
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>
            
            <div>
              <Label>Arquivo/URL</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="edit-artifact-file"
                    value={artifactFormData.file}
                    onChange={(e) => setArtifactFormData({ ...artifactFormData, file: e.target.value })}
                    placeholder="Ex: /uploads/manual.pdf, https://exemplo.com/doc.pdf"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('edit-file-upload')?.click()}
                    className="px-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <input
                  id="edit-file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.json,.xml,.xlsx,.zip"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const response = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData,
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          setArtifactFormData({ 
                            ...artifactFormData, 
                            file: result.path,
                            type: file.name.split('.').pop()?.toLowerCase() || ''
                          });
                        } else {
                          alert('Erro ao fazer upload do arquivo');
                        }
                      } catch (error) {
                        alert('Erro ao fazer upload do arquivo');
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  Você pode inserir uma URL ou fazer upload de um arquivo local
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-artifact-type">Tipo do Arquivo</Label>
              <Select
                value={artifactFormData.type}
                onValueChange={(value) => setArtifactFormData({ ...artifactFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateArtifact}
              disabled={updateArtifactMutation.isPending || !artifactFormData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateArtifactMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho da página */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <Button 
          onClick={() => {
            console.log("🔥 BOTÃO INCLUIR CLICADO!");
            resetFormData();
            setIsCreateModalOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />
          🆕 INCLUIR
        </Button>
      </div>

      {/* Abas de navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrados">Integrados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="integrados">
          {isLoading ? (
            <div className="text-center py-6">Carregando documentos...</div>
          ) : (
            renderDocumentosTable(filteredDocumentos)
          )}
        </TabsContent>

        <TabsContent value="todos">
          {isLoading ? (
            <div className="text-center py-6">Carregando documentos...</div>
          ) : (
            renderDocumentosTable(documentos)
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de visualização */}
      {renderViewModal()}

      {/* Modal de criação */}
      {renderCreateModal()}

      {/* Modal de edição */}
      {renderEditModal()}

      {/* Modal de adição de artefato */}
      {renderAddArtifactModal()}

      {/* Modal de edição de artefato */}
      {renderEditArtifactModal()}

      {/* Modal de confirmação de exclusão simples */}
      {isDeleteConfirmOpen && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <Trash2 className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja excluir o documento{" "}
              <span className="font-semibold text-gray-900">
                "{documentToDelete.objeto}"
              </span>
              ?
              <br />
              <br />
              <span className="text-red-600 font-medium">
                Esta ação não pode ser desfeita.
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={deleteDocumentoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteDocumentoMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteDocumentoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}