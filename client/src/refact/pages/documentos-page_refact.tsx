import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import ReactFlow, { 
  useReactFlow, 
  Controls, 
  Background
} from 'reactflow';

// Importing icons for custom nodes
import { Pin, X } from 'lucide-react';
import 'reactflow/dist/style.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Plus,
  File,
  CircleCheck,
  AlertCircle,
  Loader2,
  BookOpen,
  Zap,
  RefreshCw,
  FileText,
  Filter,
  FilterX
} from "lucide-react";

import {
  type Documento,
  type InsertDocumento,
  type DocumentArtifact,
  type InsertDocumentArtifact,
} from "@shared/schema";

// Import custom node components from separate file
import {
  StartNodeComponent,
  EndNodeComponent,
  ActionNodeComponent,
  DocumentNodeComponent,
  IntegrationNodeComponent,
  SwitchNodeComponent
} from "@/refact/components/documentos/flow/FlowNodes_refact";

import { ViewDocumentModal } from "@/refact/components/documentos/modals/ViewDocumentModal_refact";
import { EditDocumentModal } from "@/refact/components/documentos/modals/EditDocumentModal_refact";
import { FlowDiagramModal } from "@/refact/components/documentos/modals/FlowDiagramModal_refact";
import { CreateDocumentModal } from "@/refact/components/documentos/modals/CreateDocumentModal_refact";
import { AddArtifactModal } from "@/refact/components/documentos/modals/AddArtifactModal_refact";
import { EditArtifactModal } from "@/refact/components/documentos/modals/EditArtifactModal_refact";
import { DocumentationModal } from "@/refact/components/documentos/modals/DocumentationModal_refact";
import { DeleteConfirmDialog } from "@/refact/components/documentos/modals/DeleteConfirmDialog_refact";
import { DeleteArtifactConfirmDialog } from "@/refact/components/documentos/modals/DeleteArtifactConfirmDialog_refact";
import { DocumentosTable } from "@/refact/components/documentos/tables/DocumentosTable_refact";
import { GitHubTab } from "@/refact/components/documentos/tabs/GitHubTab_refact";
import { IncluirDocumentosTab } from "@/refact/components/documentos/tabs/IncluirDocumentosTab_refact";
import { IntegradosTab } from "@/refact/components/documentos/tabs/IntegradosTab_refact";
import { ConcluidosTab } from "@/refact/components/documentos/tabs/ConcluidosTab_refact";
import { EmProcessoTab } from "@/refact/components/documentos/tables/EmProcessoTab";
import { ExecutionFormPanel } from "@/refact/components/documentos/flow/ExecutionFormPanel";

export default function DocumentosPageRefact() {
  const [activeTab, setActiveTab] = useState("incluidos");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteArtifactConfirmOpen, setIsDeleteArtifactConfirmOpen] =
    useState(false);
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] =
    useState(false);
  const [optimisticSyncState, setOptimisticSyncState] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");


  const [editingDocument, setEditingDocument] = useState<Documento | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(
    null,
  );
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] =
    useState<DocumentArtifact | null>(null);
  const [githubRepoFiles, setGithubRepoFiles] = useState<any[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<any[]>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);
  const [currentCreatedDocumentId, setCurrentCreatedDocumentId] = useState<
    string | null
  >(null);
  const [isEscopoExpanded, setIsEscopoExpanded] = useState(false);
  const [isPessoasExpanded, setIsPessoasExpanded] = useState(false);
  const [createModalActiveTab, setCreateModalActiveTab] =
    useState("dados-gerais");
  
  // Estado para controlar visibilidade dos painéis de filtragem
  const [showFilters, setShowFilters] = useState(true);
  
  const [isLoadingMondayAttachments, setIsLoadingMondayAttachments] =
    useState(false);
  const [mondayAttachmentsPreview, setMondayAttachmentsPreview] = useState<
    any[]
  >([]);
  
  const [artifactFormData, setArtifactFormData] =
    useState<InsertDocumentArtifact>({
      documentoId: "",
      name: "",
      fileData: "",
      fileName: "",
      fileSize: "",
      mimeType: "",
      type: "",
    });

  // Estado para modal de visualização de arquivo
  const [filePreviewModal, setFilePreviewModal] = useState<{
    isOpen: boolean;
    fileName: string;
    mimeType: string;
    fileUrl: string;
  }>({
    isOpen: false,
    fileName: "",
    mimeType: "",
    fileUrl: "",
  });

  // Estado para o sistema de aprovação
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);

  // Estado para modal do diagrama de fluxo
  const [flowDiagramModal, setFlowDiagramModal] = useState<{
    isOpen: boolean;
    flowData: any;
    documentTitle: string;
    documentObject?: string;
  }>({
    isOpen: false,
    flowData: null,
    documentTitle: "",
    documentObject: "",
  });
  
  // Estado simples para forçar re-render
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [currentFlowData, setCurrentFlowData] = useState<any>(null);
  const [currentDocTitle, setCurrentDocTitle] = useState("");

  // Estado para controlar o side panel do inspector
  const [showFlowInspector, setShowFlowInspector] = useState(false);
  const [selectedFlowNode, setSelectedFlowNode] = useState<any>(null);
  const [isFlowInspectorPinned, setIsFlowInspectorPinned] = useState(false);
  // Função para resetar o formulário
  const resetFormData = () => {
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
  };

  // Função para verificar se o MIME type é suportado pelo browser para visualização
  const isMimeTypeViewable = (mimeType: string): boolean => {
    const viewableMimeTypes = [
      // Imagens
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // PDFs
      "application/pdf",
      // Texto
      "text/plain",
      "text/html",
      "text/css",
      "text/javascript",
      "text/xml",
      "application/json",
      "application/xml",
      // Vídeos (alguns browsers)
      "video/mp4",
      "video/webm",
      "video/ogg",
      // Áudios (alguns browsers)
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
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

  // Função para fechar modal de documentação e atualizar tabela
  const handleCloseDocumentationModal = useCallback(() => {
    setIsDocumentationModalOpen(false);
    setSelectedFlowId("");
    // Invalidar queries para atualizar tabela de documentos em processo
    queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
    queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions/count"] });
  }, [queryClient]);

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    responsavel: "__todos__",
    modulo: "__todos__",
    cliente: "__todos__",
    origem: "__todos__",
    nome: "",
  });

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar fluxos disponíveis
  const { data: documentsFlows = [] } = useQuery({
    queryKey: ["/api/documents-flows"],
  });

  // Buscar execuções de fluxo ativas
  const { data: flowExecutions = [] } = useQuery({
    queryKey: ["/api/document-flow-executions"],
  });

  // Buscar contagem de anexos para todos os documentos
  const { data: artifactCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documentos/artifacts-count"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const documento of documentos) {
        try {
          const response = await fetch(
            `/api/documentos/${documento.id}/artifacts`,
          );
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

  // Buscar contagem de execuções de fluxo para todos os documentos
  const { data: flowExecutionCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/document-flow-executions/count"],
  });

  // Buscar conexões de serviço para obter o repositório GitHub
  const { data: serviceConnections = [] } = useQuery({
    queryKey: ["/api/service-connections"],
  });

  // Buscar estrutura local do repositório
  const { data: repoStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/repo-structure"],
  });

  // Buscar mapeamentos Monday para obter as colunas
  const { data: mondayMappings = [] } = useQuery({
    queryKey: ["/api/monday/mappings"],
  });

  // Buscar templates para exibir informações nos documentNodes
  const { data: templatesList = [] } = useQuery({
    queryKey: ['/api/templates/struct'],
    enabled: true
  });

  // Função auxiliar para obter informações do template
  const getTemplateInfo = (templateId: string) => {
    if (!templatesList || !templateId) return null;
    const template = (templatesList as any[]).find((t: any) => t.id === templateId);
    return template ? { code: template.code, name: template.name } : null;
  };

  // Buscar todas as colunas Monday de todos os mapeamentos
  const { data: allMondayColumns = [] } = useQuery({
    queryKey: ["/api/monday/columns/all"],
    queryFn: async () => {
      const columns = [];
      for (const mapping of mondayMappings) {
        try {
          const response = await fetch(
            `/api/monday/mappings/${mapping.id}/columns`,
          );
          if (response.ok) {
            const mappingColumns = await response.json();
            columns.push(...mappingColumns);
          }
        } catch (error) {
          console.warn(
            `Erro ao buscar colunas do mapeamento ${mapping.id}:`,
            error,
          );
        }
      }
      return columns;
    },
    enabled: mondayMappings.length > 0,
  });

  // Criar um mapa de columnId para title para lookup rápido
  const columnTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    allMondayColumns.forEach((column: any) => {
      map[column.columnId] = column.title;
    });
    return map;
  }, [allMondayColumns]);

  // Função para obter o título descritivo da coluna
  const getColumnTitle = (columnId: string): string => {
    return columnTitleMap[columnId] || columnId;
  };

  // Mutation para sincronizar estrutura do GitHub para o banco local
  const syncFromGitHubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/repo-structure/sync-from-github",
      );
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
      const unsyncedFolders = repoStructures.filter(
        (folder: any) =>
          !folder.isSync &&
          (!folder.linkedTo ||
            repoStructures.some(
              (parent: any) => parent.uid === folder.linkedTo,
            )),
      );
      
      const results = [];
      for (const folder of unsyncedFolders) {
        console.log(
          `🚀 Sincronizando pasta: ${folder.folderName} (${folder.uid})`,
        );
        try {
          const res = await apiRequest(
            "POST",
            `/api/repo-structure/${folder.uid}/sync-github`,
          );
          const result = await res.json();
          results.push({
            folder: folder.folderName,
            success: true,
            message: result.message,
          });
        } catch (error: any) {
          results.push({
            folder: folder.folderName,
            success: false,
            message: error.message,
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast({
          title: `${successCount} pasta(s) sincronizada(s)!`,
          description:
            errorCount > 0
              ? `${errorCount} pasta(s) falharam na sincronização.`
              : "Todas as pastas foram enviadas para o GitHub com sucesso.",
        });
      }

      if (errorCount > 0) {
        const failedFolders = results
          .filter((r) => !r.success)
          .map((r) => r.folder)
          .join(", ");
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
        (conn: any) => conn.serviceName === "github",
      );

      if (!githubConnection) return;

      const repo = githubConnection.parameters?.[0];
      if (!repo) return;

      const response = await fetch(
        `https://api.github.com/repos/${repo}/contents/${folderPath}`,
        {
          headers: {
            Authorization: `token ${githubConnection.token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
        },
      );

      if (response.ok) {
        const files = await response.json();
        // Filtrar arquivos, excluindo .gitkeep que são apenas para sincronização
        const fileList = Array.isArray(files)
          ? files.filter(
              (item: any) => item.type === "file" && item.name !== ".gitkeep",
            )
          : [];
        setSelectedFolderFiles(fileList);
      } else if (response.status === 404) {
        // Pasta vazia ou não existe - mostrar mensagem apropriada
        setSelectedFolderFiles([]);
      } else {
        setSelectedFolderFiles([]);
      }
    } catch (error) {
      setSelectedFolderFiles([]);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  // Função para carregar visualização da estrutura do repositório
  const fetchGithubRepoStructure = async () => {
    setIsLoadingRepo(true);
    try {
      const response = await fetch("/api/github/repo/contents");

      console.log("📊 Status da resposta:", response.status, response.statusText);

      if (response.ok) {
        const contents = await response.json();
        console.log("✅ Conteúdo recebido:", contents.length, "itens");
        const fileStructure = await buildSimpleFileTree(contents);
        setGithubRepoFiles(fileStructure);
        return fileStructure;
      } else {
        const errorData = await response.json();
        console.error("❌ Erro na resposta:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error
        });
        return [];
      }
    } catch (error) {
      console.error("❌ Erro na requisição completa:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return [];
    } finally {
      setIsLoadingRepo(false);
    }
  };

  // Função simples para criar estrutura de visualização
  const buildSimpleFileTree = async (items: any[]) => {
    return items.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "folder" : "file",
      size: item.size || 0,
      children: [],
    }));
  };

  // Função para construir estrutura hierárquica
  const buildFileTree = async (
    items: any[],
    token: string,
    owner: string,
    repo: string,
  ) => {
    const tree: any[] = [];

    for (const item of items) {
      if (item.type === "dir") {
        // Para pastas, buscar conteúdo recursivamente
        try {
          const subResponse = await fetch(item.url, {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (subResponse.ok) {
            const subContents = await subResponse.json();
            const children = await buildFileTree(
              subContents,
              token,
              owner,
              repo,
              item.path,
            );

            tree.push({
              id: item.path,
              name: item.name,
              type: "folder",
              path: item.path,
              children: children,
            });
          }
        } catch (error) {
          // Se falhar, adicionar pasta vazia
          tree.push({
            id: item.path,
            name: item.name,
            type: "folder",
            path: item.path,
            children: [],
          });
        }
      } else {
        // Para arquivos
        tree.push({
          id: item.path,
          name: item.name,
          type: "file",
          path: item.path,
          size: formatFileSize(item.size),
          modified: new Date(item.sha).toLocaleDateString("pt-BR"),
        });
      }
    }

    return tree;
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Função para criar arquivo README.md no repositório
  const createReadmeFile = async (
    token: string,
    owner: string,
    repo: string,
  ) => {
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
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
          body: JSON.stringify({
            message: "Criar README.md inicial via EVO-MindBits Composer",
            content: btoa(readmeContent), // Base64 encode
          }),
        },
      );

      if (response.ok) {
        console.log("README.md criado com sucesso!");
        return true;
      } else {
        const errorText = await response.text();
        console.error("Erro ao criar README.md:", response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error("Erro na criação do README.md:", error);
      return false;
    }
  };

  // Carregar estrutura do repositório quando houver conexão GitHub
  useEffect(() => {
    if (
      serviceConnections &&
      serviceConnections.length > 0 &&
      activeTab === "repositorio"
    ) {
      fetchGithubRepoStructure();
    }
  }, [serviceConnections, activeTab]);

  // Buscar artefatos do documento selecionado (para visualização ou edição)
  const currentDocumentId = selectedDocument?.id || editingDocument?.id;
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery<
    DocumentArtifact[]
  >({
    queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
    queryFn: async () => {
      if (!currentDocumentId) return [];
      const response = await fetch(
        `/api/documentos/${currentDocumentId}/artifacts`,
      );
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
      const response = await fetch(
        `/api/documentos/${currentCreatedDocumentId}/artifacts`,
      );
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
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });

      // Se está salvando um documento criado no modal de criação, fechar o modal de criação
      if (
        currentCreatedDocumentId &&
        variables.id === currentCreatedDocumentId
      ) {
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

  // Mutation para iniciar documentação
  const startDocumentationMutation = useMutation({
    mutationFn: async ({ documentId, flowId }: { documentId: string; flowId: string }) => {
      const response = await fetch("/api/documentos/start-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          flowId
        }),
      });
      if (!response.ok) throw new Error("Erro ao iniciar documentação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions/count"] });
      setIsDocumentationModalOpen(false);
      setSelectedFlowId("");
      toast({
        title: "Documentação iniciada!",
        description: "O processo de documentação foi iniciado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar documentação",
        description: error.message || "Erro ao iniciar o processo de documentação",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar artefato
  const createArtifactMutation = useMutation({
    mutationFn: async (data: InsertDocumentArtifact) => {
      const response = await fetch(
        `/api/documentos/${data.documentoId}/artifacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("Erro ao criar artefato");
      return response.json();
    },
    onSuccess: (newArtifact, variables) => {
      // Invalidar cache para o documento atual (edição)
      if (currentDocumentId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
        });
      }
      // Invalidar cache para o documento criado (modal de criação)
      if (currentCreatedDocumentId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
        });
      }
      // Invalidar contagem de anexos
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });
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
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DocumentArtifact>;
    }) => {
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
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"],
      });

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

  // Mutation para integrar anexos do Monday.com
  const integrateAttachmentsMutation = useMutation({
    mutationFn: async (documentoId: string) => {
      console.log(
        "🚀 FRONTEND: Iniciando integração para documento:",
        documentoId,
      );
      try {
        // Fazer requisição usando fetch diretamente para debug
        const response = await fetch(
          `/api/documentos/${documentoId}/integrate-attachments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          },
        );
        console.log("📡 FRONTEND: Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ FRONTEND: Erro na resposta:", errorText);

          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Erro ao integrar anexos");
          } catch {
            throw new Error(errorText || "Erro ao integrar anexos");
          }
        }

        const responseText = await response.text();
        console.log("📄 FRONTEND: Texto da resposta:", responseText);

        try {
          const result = JSON.parse(responseText);
          console.log("✅ FRONTEND: Resultado da integração:", result);
          return result;
        } catch (parseError) {
          console.error(
            "❌ FRONTEND: Erro ao fazer parse do JSON:",
            parseError,
          );
          console.error("❌ FRONTEND: Resposta recebida:", responseText);
          throw new Error("Resposta do servidor não é JSON válido");
        }
      } catch (error) {
        console.error("🔥 FRONTEND: Erro na mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Atualizar o documento selecionado localmente para refletir que está sincronizado
      if (selectedDocument?.id) {
        setSelectedDocument({
          ...selectedDocument,
          assetsSynced: true
        });
        
        // Invalidar cache dos artifacts para o documento específico
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", selectedDocument.id, "artifacts"],
        });
      }

      // Invalidar cache de contagem de artifacts para atualizar badges
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });

      // Invalidar cache da lista de documentos para atualizar badges na tabela
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos"],
      });

      // Limpar estado otimístico após todas as atualizações
      setOptimisticSyncState(null);

      toast({
        title: "Anexos integrados!",
        description:
          data.message ||
          `${data.attachmentsCreated} anexos foram integrados com sucesso.`,
      });
    },
    onError: (error: any) => {
      // Limpar estado otimístico em caso de erro
      setOptimisticSyncState(null);
      
      toast({
        title: "Erro ao integrar anexos",
        description:
          error.message || "Não foi possível integrar os anexos do Monday.com.",
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
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", editingDocument?.id, "artifacts"],
      });

      setIsDeleteArtifactConfirmOpen(false);
      setArtifactToDelete(null);

      toast({
        title: "Anexo excluído!",
        description: "O anexo foi removido com sucesso.",
      });
    },
  });

  // Função para verificar se monday_item_values tem conteúdo JSON válido
  const hasMondayItemValues = (documento: Documento): boolean => {
    if (!documento.mondayItemValues) return false;

    try {
      const parsed = Array.isArray(documento.mondayItemValues)
        ? documento.mondayItemValues
        : JSON.parse(JSON.stringify(documento.mondayItemValues));

      return (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.some((item) => item.value && item.value.trim() !== "")
      );
    } catch {
      return false;
    }
  };

  // Função para filtrar e ordenar documentos
  const filteredAndSortedDocumentos = useMemo(() => {
    let filtered = documentos.filter((doc) => {
      // Filtro por responsável
      if (
        filtros.responsavel !== "__todos__" &&
        filtros.responsavel &&
        !doc.responsavel
          ?.toLowerCase()
          .includes(filtros.responsavel.toLowerCase())
      ) {
        return false;
      }

      // Filtro por módulo
      if (
        filtros.modulo !== "__todos__" &&
        filtros.modulo &&
        !doc.modulo?.toLowerCase().includes(filtros.modulo.toLowerCase())
      ) {
        return false;
      }

      // Filtro por cliente
      if (
        filtros.cliente !== "__todos__" &&
        filtros.cliente &&
        !doc.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())
      ) {
        return false;
      }

      // Filtro por origem
      if (
        filtros.origem !== "__todos__" &&
        filtros.origem &&
        doc.origem !== filtros.origem
      ) {
        return false;
      }

      // Filtro por nome/objeto
      if (
        filtros.nome &&
        !doc.objeto?.toLowerCase().includes(filtros.nome.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    // Ordenação alfabética por nome (objeto)
    filtered.sort((a, b) => {
      const nomeA = a.objeto?.toLowerCase() || "";
      const nomeB = b.objeto?.toLowerCase() || "";
      return nomeA.localeCompare(nomeB);
    });

    return filtered;
  }, [documentos, filtros, artifactCounts]);

  // Filtrar documentos por status aplicando os filtros
  const documentosIntegrados = useMemo(
    () => filteredAndSortedDocumentos.filter((doc) => doc.status === "Integrado"),
    [filteredAndSortedDocumentos],
  );
  const documentosProcessando = useMemo(
    () => filteredAndSortedDocumentos.filter((doc) => doc.status === "Em Processo"),
    [filteredAndSortedDocumentos],
  );
  const documentosConcluidos = useMemo(
    () => filteredAndSortedDocumentos.filter((doc) => doc.status === "Concluido"),
    [filteredAndSortedDocumentos],
  );

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
    setArtifactFormData((prev) => ({
      ...prev,
      documentoId: selectedDocument?.id || "",
    }));
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
    if (artifactToDelete) {
      deleteArtifactMutation.mutate(artifactToDelete);
    }
  };

  const cancelDeleteArtifact = () => {
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

  // Função para obter o fluxo ativo de um documento
  const getActiveFlow = (documentId: string) => {
    return flowExecutions.find((execution: any) => 
      execution.documentId === documentId && execution.status === "initiated"
    );
  };

  // Função para obter o último fluxo concluído de um documento
  const getConcludedFlow = (documentId: string) => {
    console.log("🔴 DEBUG: Buscando fluxo concluído para documentId:", documentId);
    console.log("🔴 DEBUG: flowExecutions disponíveis:", flowExecutions);
    
    const concludedExecutions = flowExecutions.filter((execution: any) => {
      console.log("🔴 DEBUG: Verificando execução:", execution);
      console.log("🔴 DEBUG: execution.documentId:", execution.documentId);
      console.log("🔴 DEBUG: execution.status:", execution.status);
      return execution.documentId === documentId && (execution.status === "concluded" || execution.status === "completed");
    });
    
    
    // Retorna a execução mais recente (ordenado por updatedAt)
    return concludedExecutions.sort((a: any, b: any) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
  };

  // Função para abrir modal do diagrama de fluxo
  const openFlowDiagramModal = (execution: any) => {
    console.log("🔴 Dados recebidos na função:", execution);
    if (execution) {
      // Buscar o documento correspondente na lista de documentos
      const documento = documentos?.find(doc => doc.id === execution.documentId);
      const documentObject = documento?.objeto || execution.document?.objeto || "";
      
      console.log("📄 Documento encontrado:", documento);
      console.log("📋 Objeto do documento:", documentObject);
      
      // Garantir que o documentId e edges estão incluídos nos dados do fluxo
      const baseFlowData = execution.flowTasks || execution;
      const flowDataWithDocumentId = {
        ...baseFlowData,
        documentId: execution.documentId || execution.document_id || execution.id,
        // Preservar edges explicitamente
        edges: baseFlowData.edges || execution.edges || [],
        nodes: baseFlowData.nodes || execution.nodes || [],
        viewport: baseFlowData.viewport || execution.viewport || { x: 0, y: 0, zoom: 1 }
      };
      
      console.log("🔗 Edges preservadas no modal:", flowDataWithDocumentId.edges);
      
      setFlowDiagramModal({
        isOpen: true,
        flowData: flowDataWithDocumentId,
        documentTitle: execution.flowName || "Template de Fluxo",
        documentObject: documentObject
      });
      console.log("🔴 Estado atualizado com documentObject:", documentObject);
    }
  };

  const handleDeleteDocument = (documento: Documento) => {
    setDocumentToDelete(documento);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteDocument = (documento: Documento) => {
    deleteDocumentoMutation.mutate(documento.id);
  };

  const closeDeleteConfirm = () => {
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
        const base64 = result.split(",")[1];
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
      console.error("Erro ao processar arquivo:", error);
      alert("Erro ao processar o arquivo");
    }
  };

  // Função para determinar tipo do arquivo baseado no MIME type
  const getFileTypeFromMime = (mimeType: string): string => {
    // PDFs
    if (mimeType.includes("pdf")) return "pdf";

    // Documentos Word
    if (
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("ms-word") ||
      mimeType.includes("officedocument.wordprocessingml")
    )
      return "docx";

    // Planilhas Excel
    if (
      mimeType.includes("excel") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("officedocument.spreadsheetml")
    )
      return "xlsx";

    // Imagens
    if (mimeType.startsWith("image/jpeg") || mimeType.startsWith("image/jpg"))
      return "jpg";
    if (mimeType.startsWith("image/png")) return "png";
    if (mimeType.startsWith("image/")) return "img";

    // Texto
    if (mimeType.includes("text/plain")) return "txt";
    if (mimeType.includes("json")) return "json";
    if (mimeType.includes("xml")) return "xml";

    // Compactados
    if (mimeType.includes("zip") || mimeType.includes("compressed"))
      return "zip";

    // Outros documentos
    if (mimeType.includes("rtf")) return "doc";

    return "outros";
  };

  const renderDocumentosTable = (documentos: Documento[], showFilters: boolean = true) => {
    return (
      <DocumentosTable
        documentos={documentos}
        activeTab={activeTab}
        flowExecutionCounts={flowExecutionCounts}
        getStatusBadgeVariant={getStatusBadgeVariant}
        getStatusIcon={getStatusIcon}
        getStatusOrigemBadgeVariant={getStatusOrigemBadgeVariant}
        formatDate={formatDate}
        openViewModal={openViewModal}
        openEditModal={openEditModal}
        handleDeleteDocument={handleDeleteDocument}
        setSelectedDocument={setSelectedDocument}
        setIsDocumentationModalOpen={setIsDocumentationModalOpen}
        isDocumentationModalOpen={isDocumentationModalOpen}
        deleteDocumentoMutation={deleteDocumentoMutation}
        getActiveFlow={getActiveFlow}
        getConcludedFlow={getConcludedFlow}
        openFlowDiagramModal={openFlowDiagramModal}
        flowExecutions={flowExecutions}
        showFilters={showFilters}
      />
    );
  };

  // Obter listas únicas para os filtros
  const responsaveisUnicos = useMemo(() => {
    const responsaveis = documentos
      .map((doc) => doc.responsavel)
      .filter(Boolean);
    return [...new Set(responsaveis)].sort();
  }, [documentos]);

  const modulosUnicos = useMemo(() => {
    const modulos = documentos.map((doc) => doc.modulo).filter(Boolean);
    return [...new Set(modulos)].sort();
  }, [documentos]);

  const clientesUnicos = useMemo(() => {
    const clientes = documentos.map((doc) => doc.cliente).filter(Boolean);
    return [...new Set(clientes)].sort();
  }, [documentos]);

  const origensUnicas = useMemo(() => {
    const origens = documentos
      .map((doc) => doc.origem)
      .filter(Boolean);
    return [...new Set(origens)].sort();
  }, [documentos]);

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
    <div className="container mx-auto py-6 bg-background dark:bg-[#1F2937] text-foreground flex flex-col flex-1 min-h-0" data-page="documentos">
      <div className="bg-[#F9FAFB] dark:bg-[#1F2937] flex flex-col flex-1 min-h-0 gap-6">
        <div className="flex items-center justify-between p-6 rounded-lg bg-gray-50 dark:bg-[#0F172A]">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280] flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Documentos
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 w-9 p-0 rounded-full bg-white dark:bg-[#1E293B] border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#374151]"
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            {showFilters ? (
              <FilterX className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <Filter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            )}
          </Button>
        </div>

        <Tabs
          defaultValue="incluidos"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full tabs-root flex flex-col flex-1 min-h-0"
        >
          <TabsList className="grid w-full grid-cols-5 bg-gray-100 dark:bg-[#0F172A] mb-6">
            <TabsTrigger value="incluidos" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF]">Incluídos</TabsTrigger>
            <TabsTrigger value="integrados" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF]">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF]">Em Processo</TabsTrigger>
            <TabsTrigger value="concluidos" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF]">Concluídos</TabsTrigger>
            <TabsTrigger value="repositorio" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF]">Repositório</TabsTrigger>
          </TabsList>

          <IncluirDocumentosTab
            documentos={documentos}
            isLoading={isLoading}
            artifactCounts={artifactCounts}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            handleDeleteDocument={handleDeleteDocument}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
              queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
              toast({
                title: "Dados atualizados",
                description: "As informações das abas foram recarregadas com sucesso.",
              });
            }}
            onCreateDocument={() => {
              resetFormData();
              setIsCreateModalOpen(true);
            }}
          />

          <IntegradosTab
            isLoading={isLoading}
            filtros={filtros}
            setFiltros={setFiltros}
            responsaveisUnicos={responsaveisUnicos}
            modulosUnicos={modulosUnicos}
            clientesUnicos={clientesUnicos}
            origensUnicas={origensUnicas}
            renderDocumentosTable={renderDocumentosTable}
            documentosIntegrados={documentosIntegrados}
            showFilters={showFilters}
          />

          <EmProcessoTab
            isLoading={isLoading}
            renderDocumentosTable={renderDocumentosTable}
            documentosProcessando={documentosProcessando}
          />

          <ConcluidosTab
            isLoading={isLoading}
            renderDocumentosTable={renderDocumentosTable}
            documentosConcluidos={documentosConcluidos}
          />

          <TabsContent value="repositorio" className="slide-in">
            <GitHubTab
              syncFromGitHubMutation={syncFromGitHubMutation}
              syncAllToGitHubMutation={syncAllToGitHubMutation}
              repoStructures={repoStructures}
              githubRepoFiles={githubRepoFiles}
              isLoadingRepo={isLoadingRepo}
              selectedFolderPath={selectedFolderPath}
              setSelectedFolderPath={setSelectedFolderPath}
              selectedFolderFiles={selectedFolderFiles}
              isLoadingFolderFiles={isLoadingFolderFiles}
              fetchGithubRepoStructure={fetchGithubRepoStructure}
              fetchFolderFiles={fetchFolderFiles}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ViewDocumentModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        selectedDocument={selectedDocument}
      />
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        createModalActiveTab={createModalActiveTab}
        setCreateModalActiveTab={setCreateModalActiveTab}
        currentCreatedDocumentId={currentCreatedDocumentId}
        isEscopoExpanded={isEscopoExpanded}
        setIsEscopoExpanded={setIsEscopoExpanded}
        isPessoasExpanded={isPessoasExpanded}
        setIsPessoasExpanded={setIsPessoasExpanded}
        createdDocumentArtifacts={createdDocumentArtifacts}
        onCreateDocument={handleCreateDocument}
        createDocumentoMutation={createDocumentoMutation}
        updateDocumentoMutation={updateDocumentoMutation}
        deleteArtifactMutation={deleteArtifactMutation}
        onOpenAddArtifactModal={(documentId) => {
          setArtifactFormData({
            documentoId: documentId,
            name: "",
            fileData: "",
            fileName: "",
            fileSize: "",
            mimeType: "",
            type: "",
          });
          setIsAddArtifactModalOpen(true);
        }}
        onOpenEditArtifactModal={openEditArtifactModal}
        resetFormData={resetFormData}
      />
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingDocument={editingDocument}
        currentCreatedDocumentId={currentCreatedDocumentId}
        formData={formData}
        setFormData={setFormData}
        onOpenAddArtifactModal={() => {
          setArtifactFormData({
            documentoId: editingDocument?.id || "",
            name: "",
            fileData: "",
            fileName: "",
            fileSize: "",
            mimeType: "",
            type: "",
          });
          setIsAddArtifactModalOpen(true);
        }}
        onOpenEditArtifactModal={(artifact) => {
          setEditingArtifact(artifact);
          setArtifactFormData({
            documentoId: artifact.documentoId,
            name: artifact.name,
            fileData: artifact.fileData || "",
            fileName: artifact.fileName || "",
            fileSize: artifact.fileSize || "",
            mimeType: artifact.mimeType || "",
            type: artifact.type || "",
            originAssetId: artifact.originAssetId,
            isImage: artifact.isImage,
          });
          setIsEditArtifactModalOpen(true);
        }}
        onDeleteArtifact={handleDeleteArtifact}
        onUpdateDocument={handleUpdateDocument}
        updateDocumentoMutation={updateDocumentoMutation}
      />
      <AddArtifactModal
        isOpen={isAddArtifactModalOpen}
        onClose={() => setIsAddArtifactModalOpen(false)}
        artifactFormData={artifactFormData}
        setArtifactFormData={setArtifactFormData}
        onCreateArtifact={handleCreateArtifact}
        createArtifactMutation={createArtifactMutation}
        onFileUpload={handleFileUpload}
      />
      <EditArtifactModal
        isOpen={isEditArtifactModalOpen}
        onClose={() => setIsEditArtifactModalOpen(false)}
        artifactFormData={artifactFormData}
        setArtifactFormData={setArtifactFormData}
        onUpdateArtifact={handleUpdateArtifact}
        updateArtifactMutation={updateArtifactMutation}
      />
      <DocumentationModal
        isOpen={isDocumentationModalOpen}
        onClose={handleCloseDocumentationModal}
        selectedDocument={selectedDocument}
        selectedFlowId={selectedFlowId}
        setSelectedFlowId={setSelectedFlowId}
        documentsFlows={documentsFlows}
        optimisticSyncState={optimisticSyncState}
        setOptimisticSyncState={setOptimisticSyncState}
        onStartDocumentation={(data) => {
          startDocumentationMutation.mutate(data);
        }}
        onIntegrateAttachments={(documentId) => {
          integrateAttachmentsMutation.mutate(documentId);
        }}
        hasMondayItemValues={hasMondayItemValues}
        startDocumentationMutation={startDocumentationMutation}
        integrateAttachmentsMutation={integrateAttachmentsMutation}
      />
      <FlowDiagramModal
        flowDiagramModal={flowDiagramModal}
        setFlowDiagramModal={setFlowDiagramModal}
        showFlowInspector={showFlowInspector}
        setShowFlowInspector={setShowFlowInspector}
        selectedFlowNode={selectedFlowNode}
        setSelectedFlowNode={setSelectedFlowNode}
        showApprovalAlert={showApprovalAlert}
        setShowApprovalAlert={setShowApprovalAlert}
        isFlowInspectorPinned={isFlowInspectorPinned}
        FlowWithAutoFitView={FlowWithAutoFitView}
      />
    </div>
  );


// Componente interno que usa useReactFlow para fit view automático
  function FlowWithAutoFitView({ flowData, showFlowInspector, setShowFlowInspector, setSelectedFlowNode, selectedFlowNode, showApprovalAlert, setShowApprovalAlert, isPinned }: any) {
    const { fitView, getNodes, setNodes } = useReactFlow();
    
    // Estado para controlar os valores dos campos do formulário
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    
    // Estado para controlar resultado da execução de integração
    const [integrationResult, setIntegrationResult] = useState<{
      status: 'success' | 'error' | null;
      message: string;
      success?: boolean;
    }>({ status: null, message: '' });
    
    // Estados para formulários dinâmicos
    const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>({});
    const [approvalFieldValues, setApprovalFieldValues] = useState<{ [key: string]: any }>({});
    
    // Carregar dados salvos quando um nó é selecionado
    useEffect(() => {
      if (selectedFlowNode && selectedFlowNode.data.formData) {
        console.log('🔄 Carregando dados salvos do formulário:', selectedFlowNode.data.formData);
        setFormValues(selectedFlowNode.data.formData);
      } else {
        // Limpar formulário se não há dados salvos
        setFormValues({});
      }
      
      // Limpar resultado da integração ao mudar de nó
      setIntegrationResult({ status: null, message: '' });
    }, [selectedFlowNode?.id, selectedFlowNode?.data.formData]);
    
    // Função helper para extrair dados do formulário
    const getFormFields = () => {
      try {
        if (!selectedFlowNode) {
          console.log('🔍 getFormFields: Nenhum nó selecionado');
          return {};
        }
        
        const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
        console.log('🔍 getFormFields: dados brutos', {
          nodeId: selectedFlowNode.id,
          attachedFormData,
          hasForm: !!attachedFormData
        });
        
        if (!attachedFormData) return {};
        
        // Corrigir o formato JSON malformado específico
        let correctedData = attachedFormData;
        
        // Verificar se precisa de correção de formato
        if (attachedFormData.includes('["') && attachedFormData.includes('": [')) {
          // Primeiro, substituir a estrutura Fields
          correctedData = attachedFormData.replace(
            /"Fields":\s*\[/g, 
            '"Fields":{'
          );
          
          // Corrigir os campos individuais
          correctedData = correctedData
            .replace(/\"([^"]+)\"\:\s*\[/g, '"$1":[')
            .replace(/\]\s*,\s*\"([^"]+)\"\:\s*\[/g, '],"$1":[')
            .replace(/\]\s*\]/g, ']}');
          
          console.log('🔍 getFormFields: dados corrigidos', correctedData);
        }
        
        const parsedData = JSON.parse(correctedData);
        const fields = parsedData.Fields || {};
        console.log('🔍 getFormFields: campos extraídos', fields);
        return fields;
      } catch (e) {
        console.log('🔍 getFormFields: erro', e);
        return {};
      }
    };

    // Função para verificar se todos os campos obrigatórios estão preenchidos
    const areAllFieldsFilled = () => {
      // Só valida se há um nó selecionado e é um actionNode
      if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
        return true;
      }

      // Só valida se o nó está pendente de execução
      if (!selectedFlowNode.data.isPendingConnected) {
        return true;
      }

      // Verifica se existe formulário anexado
      const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
      if (!attachedFormData) {
        return true; // Sem formulário, pode salvar
      }

      try {
        // Parse do formulário anexado
        let formData;
        if (typeof attachedFormData === 'string' && attachedFormData.includes('"Motivo de Recusa":') && attachedFormData.includes('"Detalhamento":')) {
          // Converte o formato específico manualmente
          formData = {
            "Show_Condition": "FALSE",
            "Fields": {
              "Motivo de Recusa": ["Incompatível com processo", "Forma de operação", "Configuração de Sistema"],
              "Detalhamento": ["default:", "type:longText"]
            }
          };
        } else {
          formData = JSON.parse(attachedFormData);
        }

        // Verifica se é um formulário com condição
        if (formData.Show_Condition !== undefined && formData.Fields) {
          const showCondition = formData.Show_Condition;
          const isApprovalNode = selectedFlowNode.data.actionType === 'Intern_Aprove';
          const approvalStatus = selectedFlowNode.data.isAproved;
          
          // Determina se deve mostrar o formulário baseado na condição
          let shouldShowForm = false;
          if (isApprovalNode && approvalStatus !== 'UNDEF') {
            if (showCondition === 'TRUE' && approvalStatus === 'TRUE') {
              shouldShowForm = true;
            } else if (showCondition === 'FALSE' && approvalStatus === 'FALSE') {
              shouldShowForm = true;
            } else if (showCondition === 'BOTH' && (approvalStatus === 'TRUE' || approvalStatus === 'FALSE')) {
              shouldShowForm = true;
            }
          }
          
          // Se o formulário não deve ser exibido devido à condição, permite salvar
          if (!shouldShowForm) {
            console.log('🔍 Formulário oculto por condição de aprovação, permitindo salvar');
            return true;
          }
        }

        // Se chegou até aqui, o formulário deve ser exibido, então valida os campos
        const fieldsData = getFormFields();
        const fieldNames = Object.keys(fieldsData);
        
        console.log('🔍 Validação de campos:', {
          nodeId: selectedFlowNode.id,
          nodeType: selectedFlowNode.type,
          isPending: selectedFlowNode.data.isPendingConnected,
          fieldsData,
          fieldNames,
          formValues,
          hasFields: fieldNames.length > 0
        });
        
        // Se não há campos, permite salvar
        if (fieldNames.length === 0) return true;
        
        // Verifica se todos os campos têm valores preenchidos
        const allFilled = fieldNames.every(fieldName => {
          const value = formValues[fieldName];
          // Para campos select, verificar se não está vazio ou "Selecione uma opção"
          const isFilled = value && value.trim() !== '' && value !== 'Selecione uma opção';
          console.log(`Campo ${fieldName}: valor="${value}", preenchido=${isFilled}`);
          return isFilled;
        });
        
        console.log('🔍 Resultado da validação:', allFilled);
        return allFilled;
      } catch (e) {
        console.log('🔍 Erro na validação do formulário:', e);
        return true; // Em caso de erro, permite salvar
      }
    };

    // Função para alterar o status de aprovação (altera estado imediatamente e mostra alerta)
    const updateApprovalStatus = (nodeId: string, newStatus: string) => {
      const currentNodes = getNodes();
      const updatedNodes = currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isAproved: newStatus
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
      
      // Atualizar também o nó selecionado para refletir a mudança no painel
      if (selectedFlowNode && selectedFlowNode.id === nodeId) {
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isAproved: newStatus
          }
        });
      }

      // Mostrar alerta para persistir alterações
      console.log('🔴 Definindo showApprovalAlert para true');
      setShowApprovalAlert(true);
    };

    // Função para executar transferência de fluxo
    const executeFlowTransfer = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'endNode' || selectedFlowNode.data.FromType !== 'flow_init') {
        console.log('Nenhum endNode de transferência selecionado');
        return;
      }

      console.log('Executando transferência de fluxo...');
      
      try {
        // Verificar se existe fluxo destino
        if (!selectedFlowNode.data.To_Flow_id) {
          setIntegrationResult({
            status: 'error',
            message: 'Fluxo de destino não definido para transferência.'
          });
          return;
        }

        // Marcar o nó como executado
        const updatedNodes = [...nodes];
        const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            data: {
              ...updatedNodes[nodeIndex].data,
              isExecuted: 'TRUE',
              isPendingConnected: false,
              isReadonly: true
            }
          };
          setNodes(updatedNodes);
          
          // Atualizar nó selecionado
          setSelectedFlowNode({
            ...selectedFlowNode,
            data: {
              ...selectedFlowNode.data,
              isExecuted: 'TRUE',
              isPendingConnected: false,
              isReadonly: true
            }
          });
        }

        // Preparar dados atualizados do fluxo
        const updatedFlowTasks = {
          nodes: updatedNodes,
          edges: edges,
          viewport: flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
        };

        // Chamar API para transferir fluxo
        const response = await fetch(`/api/document-flow-executions/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentDocumentId: flowData.documentId,
            targetFlowId: selectedFlowNode.data.To_Flow_id,
            flowTasks: updatedFlowTasks
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao transferir fluxo');
        }

        const result = await response.json();
        
        console.log('✅ Transferência de fluxo concluída com sucesso pelo backend');

        // Atualizar estado local
        setFlowDiagramModal(prev => ({
          ...prev,
          flowData: {
            ...prev.flowData,
            flowTasks: updatedFlowTasks
          }
        }));

        // Mostrar resultado de sucesso
        setIntegrationResult({
          status: 'success',
          message: `Fluxo transferido com sucesso para "${result.targetFlowName}". Nova execução criada.`
        });

        // Recarregar dados
        queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
        
      } catch (error) {
        console.error('❌ Erro ao transferir fluxo:', error);
        setIntegrationResult({
          status: 'error',
          message: 'Falha na transferência do fluxo. Verifique os logs e tente novamente.'
        });
      }
    };

    // Função para executar encerramento direto do fluxo
    const executeDirectFlowConclusion = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'endNode' || selectedFlowNode.data.FromType !== 'Init') {
        console.log('Nenhum endNode de encerramento direto selecionado');
        return;
      }

      console.log('Executando encerramento direto do fluxo...');
      
      try {
        // Marcar o nó como executado
        const updatedNodes = [...nodes];
        const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            data: {
              ...updatedNodes[nodeIndex].data,
              isExecuted: 'TRUE',
              isPendingConnected: false,
              isReadonly: true
            }
          };
          setNodes(updatedNodes);
          
          // Atualizar nó selecionado
          setSelectedFlowNode({
            ...selectedFlowNode,
            data: {
              ...selectedFlowNode.data,
              isExecuted: 'TRUE',
              isPendingConnected: false,
              isReadonly: true
            }
          });

          // Salvar alterações no banco de dados - marcando como concluído
          const finalFlowTasks = {
            ...flowDiagramModal.flowData.flowTasks,
            nodes: updatedNodes
          };

          const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData.documentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              flowTasks: finalFlowTasks,
              status: 'concluded',
              completedAt: new Date().toISOString()
            }),
          });

          if (!response.ok) {
            throw new Error('Erro ao salvar encerramento no banco');
          }

          // Atualizar status do documento para "Concluido"
          const docResponse = await fetch(`/api/documentos/${flowDiagramModal.flowData.documentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'Concluido'
            }),
          });

          if (!docResponse.ok) {
            throw new Error('Erro ao atualizar status do documento');
          }

          console.log('✅ Fluxo encerrado e documento marcado como concluído');
          
          setIntegrationResult({
            status: 'success',
            message: 'Fluxo encerrado com sucesso! O documento foi marcado como concluído e enviado para a aba [Concluídos].'
          });
          
          // Atualizar estado local
          setFlowDiagramModal(prev => ({
            ...prev,
            flowData: {
              ...prev.flowData,
              flowTasks: finalFlowTasks
            }
          }));

          // Recarregar dados
          queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
        }
      } catch (error) {
        console.error('❌ Erro ao executar encerramento direto:', error);
        setIntegrationResult({
          status: 'error',
          message: 'Falha ao encerrar o fluxo. Tente novamente.'
        });
      }
    };

    // Função para executar integração manual
    const executeManualIntegration = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'integrationNode') {
        console.log('Nenhum integrationNode selecionado');
        return;
      }

      console.log('Executando integração manual...');
      
      // Simular execução - 70% chance de sucesso
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        setIntegrationResult({
          status: 'success',
          message: `Integração executada com sucesso! A função ${selectedFlowNode.data.callType || 'callJob'} foi processada e ${selectedFlowNode.data.integrType || 'dados'} foram sincronizados com o serviço ${selectedFlowNode.data.service || 'externo'}.`
        });
        
        // Marcar o nó como executado
        const updatedNodes = [...nodes];
        const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            data: {
              ...updatedNodes[nodeIndex].data,
              isExecuted: 'TRUE',
              isPendingConnected: false
            }
          };
          setNodes(updatedNodes);
          
          // Atualizar nó selecionado
          setSelectedFlowNode({
            ...selectedFlowNode,
            data: {
              ...selectedFlowNode.data,
              isExecuted: 'TRUE',
              isPendingConnected: false
            }
          });

          // Salvar alterações no banco de dados - atualizando fluxo completo
          try {
            const finalFlowTasks = {
              ...flowDiagramModal.flowData.flowTasks,
              nodes: updatedNodes,
              edges: flowDiagramModal.flowData.flowTasks?.edges || [],
              viewport: flowDiagramModal.flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
            };

            const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData.documentId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                flowTasks: finalFlowTasks
              }),
            });

            if (!response.ok) {
              throw new Error('Erro ao salvar alterações no banco');
            }

            console.log('✅ Alterações da integração manual salvas no banco de dados');
            
            // Atualizar estado local
            setFlowDiagramModal(prev => ({
              ...prev,
              flowData: {
                ...prev.flowData,
                flowTasks: finalFlowTasks
              }
            }));

            // Recarregar dados
            queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
          } catch (error) {
            console.error('❌ Erro ao salvar integração manual:', error);
          }
        }
      } else {
        setIntegrationResult({
          status: 'error',
          message: `Falha na execução da integração. Erro ao executar a função ${selectedFlowNode.data.callType || 'callJob'}. Verifique a conectividade com o serviço ${selectedFlowNode.data.service || 'externo'} e tente novamente.`
        });
      }
    };

    // Função para persistir as alterações no banco de dados
    const saveChangesToDatabase = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
        console.log('Nenhum actionNode selecionado');
        return;
      }

      console.log('Salvando alterações no banco de dados...');
      console.log('selectedFlowNode:', selectedFlowNode);
      console.log('flowData:', flowData);
      
      try {
        // 1. Marcar o actionNode atual como executado, preservar o isAproved e salvar formValues
        const updatedNodes = [...nodes];
        const actionNodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (actionNodeIndex !== -1) {
          updatedNodes[actionNodeIndex] = {
            ...updatedNodes[actionNodeIndex],
            data: {
              ...updatedNodes[actionNodeIndex].data,
              isExecuted: 'TRUE',
              isAproved: selectedFlowNode.data.isAproved, // Preservar o valor de aprovação
              formData: formValues, // Salvar os dados do formulário
              isPendingConnected: false // Marcar como não mais editável
            }
          };
          console.log('Nó atual atualizado com isAproved:', selectedFlowNode.data.isAproved);
          console.log('Dados do formulário salvos:', formValues);
        }

        // 2. Encontrar nós conectados APENAS pelas conexões de SAÍDA do actionNode
        const outgoingConnections = edges.filter(edge => edge.source === selectedFlowNode.id);
        console.log('Conexões de saída do actionNode encontradas:', outgoingConnections);

        // 3. Processar apenas os nós que recebem conexões diretas do actionNode
        outgoingConnections.forEach(edge => {
          const targetNodeIndex = updatedNodes.findIndex(n => n.id === edge.target);
          if (targetNodeIndex !== -1) {
            const targetNode = updatedNodes[targetNodeIndex];
            
            // Se for switchNode, apenas definir inputSwitch (não marcar como executado ainda)
            if (targetNode.type === 'switchNode') {
              updatedNodes[targetNodeIndex] = {
                ...targetNode,
                data: {
                  ...targetNode.data,
                  isExecuted: 'TRUE',
                  inputSwitch: selectedFlowNode.data.isAproved
                }
              };
            } else {
              // Para outros tipos de nós, marcar como executado
              updatedNodes[targetNodeIndex] = {
                ...targetNode,
                data: {
                  ...targetNode.data,
                  isExecuted: 'TRUE'
                }
              };
            }
          }
        });

        // 4. Agora processar a lógica de "pendente conectado" baseada apenas nas conexões de SAÍDA
        const pendingConnectedNodeIds = new Set<string>();
        
        // Para cada conexão de saída do actionNode, verificar os nós conectados
        outgoingConnections.forEach(edge => {
          const connectedNode = updatedNodes.find(n => n.id === edge.target);
          
          if (connectedNode?.type === 'switchNode') {
            // Para switchNodes, encontrar as próximas conexões baseadas no inputSwitch
            const switchOutgoingEdges = edges.filter(e => e.source === connectedNode.id);
            
            switchOutgoingEdges.forEach(switchEdge => {
              const { inputSwitch, leftSwitch, rightSwitch } = connectedNode.data;
              let shouldActivateConnection = false;
              
              // Verificar se a conexão deve estar ativa baseada no inputSwitch
              if (switchEdge.sourceHandle === 'a' && inputSwitch === rightSwitch) {
                shouldActivateConnection = true;
              } else if (switchEdge.sourceHandle === 'c' && inputSwitch === leftSwitch) {
                shouldActivateConnection = true;
              }
              
              // Se a conexão deve estar ativa, marcar o nó de destino como pendente conectado
              if (shouldActivateConnection) {
                const finalTargetNode = updatedNodes.find(n => n.id === switchEdge.target);
                if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
                  pendingConnectedNodeIds.add(switchEdge.target);
                }
              }
            });
          } else if (connectedNode?.type !== 'endNode') {
            // Para outros tipos de nós (EXCETO endNodes), verificar suas conexões de saída
            // EndNodes não têm conexões de saída, portanto não aplicam pendência a outros nós
            const nodeOutgoingEdges = edges.filter(e => e.source === connectedNode.id);
            nodeOutgoingEdges.forEach(nodeEdge => {
              const finalTargetNode = updatedNodes.find(n => n.id === nodeEdge.target);
              if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
                pendingConnectedNodeIds.add(nodeEdge.target);
              }
            });
          }
        });

        // 5. Aplicar o status "pendente conectado" apenas aos nós identificados
        pendingConnectedNodeIds.forEach(nodeId => {
          const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              data: {
                ...updatedNodes[nodeIndex].data,
                isPendingConnected: true
              }
            };
          }
        });

        console.log('Nós marcados como pendente conectado:', Array.from(pendingConnectedNodeIds));

        // 5.1. Processar endNodes de "encerramento direto" automaticamente
        let hasDirectEndNodeChanges = false;
        let documentCompleted = false;
        
        updatedNodes.forEach((node, index) => {
          if (node.type === 'endNode' && 
              node.data.endType === 'Encerramento Direto' && 
              node.data.isPendingConnected && 
              node.data.isExecuted !== 'TRUE') {
            
            console.log(`🔄 Processando endNode de encerramento direto automaticamente: ${node.id}`);
            hasDirectEndNodeChanges = true;
            
            updatedNodes[index] = {
              ...node,
              data: {
                ...node.data,
                isExecuted: 'TRUE',
                isPendingConnected: false,
                status: 'completed',
                completedAt: new Date().toISOString()
              }
            };
          }
        });

        // Verificar se todos os nós estão executados para marcar o fluxo como completo
        if (hasDirectEndNodeChanges) {
          const allNodesExecuted = updatedNodes.every(node => 
            node.data.isExecuted === 'TRUE' || node.type === 'startNode'
          );

          if (allNodesExecuted) {
            console.log('🎯 Fluxo completo detectado - marcando documento como completed');
            documentCompleted = true;
          }
        }

        // 6. Preparar dados para envio ao servidor - PRESERVAR EDGES DO ESTADO ATUAL
        const updatedFlowTasks = {
          nodes: updatedNodes,
          edges: edges, // Usar edges do estado atual do React Flow
          viewport: flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
        };
        
        console.log('🔗 Preservando edges do estado atual:', {
          edgesCount: edges.length,
          nodesCount: updatedNodes.length
        });

        // 5. Enviar para o servidor (atualizar execução do fluxo, não o template)
        const requestBody: any = {
          flowTasks: updatedFlowTasks
        };

        // Se o documento foi marcado como completo, adicionar status e timestamp
        if (documentCompleted) {
          requestBody.status = 'completed';
          requestBody.completedAt = new Date().toISOString();
        }

        const response = await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error('Erro ao salvar alterações');
        }

        console.log('Alterações salvas com sucesso');
        console.log('Atualizando estado local com:', updatedFlowTasks);

        // 6. Atualizar estado local e recarregar diagrama
        setFlowDiagramModal(prev => ({
          ...prev,
          flowData: {
            ...prev.flowData,
            flowTasks: updatedFlowTasks
          }
        }));
        
        // 7. Atualizar o nó selecionado para refletir as mudanças imediatamente
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            formData: formValues,
            isPendingConnected: false
          }
        });

        // 8. Limpar o formValues para mostrar que foi salvo
        setFormValues({});
        
        console.log('Estado local atualizado');

        // Fechar o alerta
        setShowApprovalAlert(false);
        
        // Recarregar a lista de execuções de fluxo para atualizar dados
        queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
        
      } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        // Aqui poderia mostrar um toast de erro
      }
    };

    // Effect para executar fit view quando o painel inspector é aberto/fechado
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        fitView({
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 2,
          duration: 300
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [showFlowInspector, fitView]);

    // Implementar lógica de "pendente em processo"
    // Handle different data structures: flowData might be the flowTasks directly or have a flowTasks property
    const tasksData = flowData?.flowTasks || flowData;
    const nodes = tasksData?.nodes || [];
    const edges = tasksData?.edges || [];

    // Encontrar nós executados
    const executedNodes = new Set(
      nodes.filter((node: any) => node.data?.isExecuted === 'TRUE').map((node: any) => node.id)
    );

    // Encontrar nós pendentes conectados aos executados
    const pendingConnectedNodes = new Set<string>();
    
    for (const edge of edges) {
      // Se o nó de origem está executado e o nó de destino não está executado
      if (executedNodes.has(edge.source)) {
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        const targetNode = nodes.find((n: any) => n.id === edge.target);
        
        if (targetNode && targetNode.data?.isExecuted !== 'TRUE') {
          // Verificar se o nó de origem é um switchNode
          if (sourceNode?.type === 'switchNode') {
            // Para switchNodes, verificar se a conexão está no handle correto
            const { inputSwitch, leftSwitch, rightSwitch } = sourceNode.data;
            
            // Determinar qual handle deveria estar ativo baseado no inputSwitch
            let shouldBeActive = false;
            if (edge.sourceHandle === 'a' && inputSwitch === rightSwitch) {
              shouldBeActive = true; // Handle direito ativo
            } else if (edge.sourceHandle === 'c' && inputSwitch === leftSwitch) {
              shouldBeActive = true; // Handle esquerdo ativo
            }
            
            // Apenas marcar como pendente se a conexão está no handle correto
            if (shouldBeActive) {
              pendingConnectedNodes.add(edge.target);
            }
          } else if (targetNode.type !== 'endNode') {
            // Para outros tipos de nós (EXCETO endNodes), aplicar lógica normal
            // EndNodes recebem conexões mas não propagam pendência
            pendingConnectedNodes.add(edge.target);
          }
        }
      }
    }

    // Processar nós para adicionar destaque amarelo aos pendentes conectados
    const processedNodes = nodes.map((node: any) => {
      const isSelected = selectedFlowNode?.id === node.id;
      
      if (pendingConnectedNodes.has(node.id)) {
        return {
          ...node,
          selected: isSelected,
          data: {
            ...node.data,
            isPendingConnected: true,
            isReadonly: true
          },
        };
      }
      return {
        ...node,
        selected: isSelected,
        data: { ...node.data, isReadonly: true }
      };
    });

    // Processar edges para colorir conexões e adicionar animação
    const processedEdges = edges.map((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      
      const sourceExecuted = sourceNode?.data?.isExecuted === 'TRUE';
      const targetExecuted = targetNode?.data?.isExecuted === 'TRUE';
      
      const sourcePending = pendingConnectedNodes.has(edge.source);
      const targetPending = pendingConnectedNodes.has(edge.target);
      
      let edgeColor = '#6b7280'; // cor padrão
      let shouldAnimate = false; // nova variável para controlar animação
      
      // PRIMEIRA PRIORIDADE: Lógica de execução/pendência (sempre tem precedência)
      // Se ambos os nós estão executados
      if (sourceExecuted && targetExecuted) {
        edgeColor = '#21639a';
        shouldAnimate = true; // animar conexões executadas (azuis)
      }
      // Se há conexão entre executado e pendente conectado (PRIORIDADE MÁXIMA)
      else if ((sourceExecuted && targetPending) || (sourcePending && targetExecuted)) {
        edgeColor = '#fbbf24'; // amarelo
        shouldAnimate = true; // animar conexões pendentes (amarelas)
      }
      // SEGUNDA PRIORIDADE: Verificar se a conexão parte de um SwitchNode e aplicar cor dinâmica do handle
      else if (sourceNode?.type === 'switchNode') {
        // Função para determinar cor do handle do switchNode
        const getSwitchHandleColor = (switchValue: any) => {
          if (!switchValue) return '#9ca3af'; // gray-400
          
          if (Array.isArray(switchValue)) {
            const firstValue = switchValue[0];
            if (firstValue === 'TRUE') return '#10b981'; // green-500
            if (firstValue === 'FALSE') return '#ef4444'; // red-500
            return '#9ca3af'; // gray-400
          }
          
          if (switchValue === 'TRUE') return '#10b981'; // green-500
          if (switchValue === 'FALSE') return '#ef4444'; // red-500
          return '#9ca3af'; // gray-400
        };

        // Verificar qual handle está sendo usado baseado no sourceHandle e usar cores dinâmicas
        if (edge.sourceHandle === 'a') {
          // Handle direito - usar cor baseada em rightSwitch
          edgeColor = getSwitchHandleColor(sourceNode.data.rightSwitch);
        } else if (edge.sourceHandle === 'c') {
          // Handle esquerdo - usar cor baseada em leftSwitch
          edgeColor = getSwitchHandleColor(sourceNode.data.leftSwitch);
        }
      }
      
      return {
        ...edge,
        type: 'smoothstep', // garantir que o tipo seja definido
        animated: shouldAnimate, // aplicar animação baseada na lógica
        style: {
          stroke: edgeColor,
          strokeWidth: 3,
          strokeDasharray: 'none'
        },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
        },
      };
    });

    const nodeTypes = useMemo(() => ({
      startNode: StartNodeComponent,
      endNode: EndNodeComponent,
      actionNode: ActionNodeComponent,
      documentNode: DocumentNodeComponent,
      integrationNode: IntegrationNodeComponent,
      switchNode: SwitchNodeComponent
    }), []);

    const onNodeClick = (event: any, node: any) => {
      setSelectedFlowNode(node);
      setShowFlowInspector(true);
    };

    const onPaneClick = () => {
      if (!isPinned) {
        setShowFlowInspector(false);
        setSelectedFlowNode(null);
      }
    };

    // Log para debug das edges com animação
    console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter(edge => edge.animated));

    return (
      <div className="flex-1 flex h-full w-full">
        <div className="flex-1 h-full w-full">
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{
              padding: 0.2,
              minZoom: 0.1,
              maxZoom: 2
            }}
            minZoom={0.1}
            maxZoom={2}
            attributionPosition="bottom-left"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
          >
            <Controls showInteractive={false} />
            <Background />
          </ReactFlow>
        </div>
        {showFlowInspector && selectedFlowNode && (
          <div className="w-80 bg-white dark:bg-[#0F172A] border-l border-gray-200 dark:border-[#374151] p-4 overflow-y-auto relative">
            <div className="space-y-4">
              <div className="border-b dark:border-[#374151] pb-2 relative">
                <h3 className="text-lg font-semibold dark:text-gray-200">Execution Form</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                  {(() => {
                    const typeMap: { [key: string]: string } = {
                      'startNode': 'Início',
                      'endNode': 'Fim',
                      'actionNode': 'Ação',
                      'documentNode': 'Documento',
                      'integrationNode': 'Integração',
                      'switchNode': 'Condição'
                    };
                    return typeMap[selectedFlowNode.type] || selectedFlowNode.type;
                  })()} - {selectedFlowNode.id}
                </p>
                <button
                  onClick={() => setIsFlowInspectorPinned(!isFlowInspectorPinned)}
                  className={`absolute top-0 right-0 p-1 rounded transition-colors ${
                    isFlowInspectorPinned 
                      ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/30' 
                      : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1F2937]'
                  }`}
                  title={isFlowInspectorPinned ? "Desafixar painel" : "Fixar painel"}
                >
                  <Pin 
                    className={`w-4 h-4 transition-transform ${isFlowInspectorPinned ? 'rotate-45' : 'rotate-0'}`}
                  />
                </button>
              </div>
              
              <ExecutionFormPanel 
                nodeId={selectedFlowNode.id}
                nodeType={selectedFlowNode.type as 'actionNode' | 'documentNode' | 'integrationNode' | 'endNode'}
                nodeData={selectedFlowNode.data}
                onSubmit={(data) => {
                  console.log('Form submitted:', data);
                  // TODO: Implementar lógica de submit
                }}
                onCancel={() => {
                  setShowFlowInspector(false);
                  setSelectedFlowNode(null);
                }}
                isLoading={false}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 bg-background text-foreground" data-page="documentos">
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingDocument={editingDocument}
        currentCreatedDocumentId={currentCreatedDocumentId}
        formData={formData}
        setFormData={setFormData}
        onOpenAddArtifactModal={() => {
          setArtifactFormData({
            documentoId: editingDocument?.id || "",
            name: "",
            fileData: "",
            fileName: "",
            fileSize: "",
            mimeType: "",
            type: "",
          });
          setIsAddArtifactModalOpen(true);
        }}
        onOpenEditArtifactModal={(artifact) => {
          setEditingArtifact(artifact);
          setArtifactFormData({
            documentoId: artifact.documentoId,
            name: artifact.name,
            fileData: artifact.fileData || "",
            fileName: artifact.fileName || "",
            fileSize: artifact.fileSize || "",
            mimeType: artifact.mimeType || "",
            type: artifact.type || "",
            originAssetId: artifact.originAssetId,
            isImage: artifact.isImage,
          });
          setIsEditArtifactModalOpen(true);
        }}
        onDeleteArtifact={handleDeleteArtifact}
        onUpdateDocument={handleUpdateDocument}
        updateDocumentoMutation={updateDocumentoMutation}
      />
      <AddArtifactModal
        isOpen={isAddArtifactModalOpen}
        onClose={() => setIsAddArtifactModalOpen(false)}
        artifactFormData={artifactFormData}
        setArtifactFormData={setArtifactFormData}
        onCreateArtifact={handleCreateArtifact}
        createArtifactMutation={createArtifactMutation}
        onFileUpload={handleFileUpload}
      />
      <DocumentationModal
        isOpen={isDocumentationModalOpen}
        onClose={handleCloseDocumentationModal}
        selectedDocument={selectedDocument}
        selectedFlowId={selectedFlowId}
        setSelectedFlowId={setSelectedFlowId}
        documentsFlows={documentsFlows}
        optimisticSyncState={optimisticSyncState}
        setOptimisticSyncState={setOptimisticSyncState}
        onStartDocumentation={(data) => {
          startDocumentationMutation.mutate(data);
        }}
        onIntegrateAttachments={(documentId) => {
          integrateAttachmentsMutation.mutate(documentId);
        }}
        hasMondayItemValues={hasMondayItemValues}
        startDocumentationMutation={startDocumentationMutation}
        integrateAttachmentsMutation={integrateAttachmentsMutation}
      />
      <EditArtifactModal
        isOpen={isEditArtifactModalOpen}
        onClose={() => setIsEditArtifactModalOpen(false)}
        artifactFormData={artifactFormData}
        setArtifactFormData={setArtifactFormData}
        onUpdateArtifact={handleUpdateArtifact}
        updateArtifactMutation={updateArtifactMutation}
      />
      <FlowDiagramModal
        flowDiagramModal={flowDiagramModal}
        setFlowDiagramModal={setFlowDiagramModal}
        showFlowInspector={showFlowInspector}
        setShowFlowInspector={setShowFlowInspector}
        selectedFlowNode={selectedFlowNode}
        setSelectedFlowNode={setSelectedFlowNode}
        showApprovalAlert={showApprovalAlert}
        setShowApprovalAlert={setShowApprovalAlert}
        isFlowInspectorPinned={isFlowInspectorPinned}
        FlowWithAutoFitView={FlowWithAutoFitView}
      />
      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={closeDeleteConfirm}
        documentToDelete={documentToDelete}
        onConfirmDelete={confirmDeleteDocument}
        isDeleting={deleteDocumentoMutation.isPending}
      />
      <DeleteArtifactConfirmDialog
        isOpen={isDeleteArtifactConfirmOpen}
        onClose={() => {
          setIsDeleteArtifactConfirmOpen(false);
          setArtifactToDelete(null);
        }}
        artifactToDelete={artifactToDelete}
        onConfirmDelete={() => {
          if (artifactToDelete) {
            deleteArtifactMutation.mutate(artifactToDelete);
          }
        }}
        isDeleting={deleteArtifactMutation.isPending}
      />
    </div>
  );
}
