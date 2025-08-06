import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactFlow, { 
  useReactFlow, 
  Controls, 
  Background
} from 'reactflow';

// Importing icons for custom nodes
import { Pin, X, History } from 'lucide-react';
import 'reactflow/dist/style.css';


import {
  Plus,
  File,
  CircleCheck,
  AlertCircle,
  Loader2,
  BookOpen,
  Zap,
  RefreshCw,

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
} from "@/components/documentos/flow/FlowNodes";

import { ViewDocumentModal } from "@/components/documentos/modals/ViewDocumentModal";
import { EditDocumentModal } from "@/components/documentos/modals/EditDocumentModal";
import { FlowDiagramModal } from "@/components/documentos/modals/FlowDiagramModal";
import { CreateDocumentModal } from "@/components/documentos/modals/CreateDocumentModal";
import { AddArtifactModal } from "@/components/documentos/modals/AddArtifactModal";
import { EditArtifactModal } from "@/components/documentos/modals/EditArtifactModal";
import { DocumentationModal } from "@/components/documentos/modals/DocumentationModal";
import { DeleteConfirmDialog } from "@/components/documentos/modals/DeleteConfirmDialog";
import { DeleteArtifactConfirmDialog } from "@/components/documentos/modals/DeleteArtifactConfirmDialog";
import { DocumentosTable } from "@/components/documentos/tables/DocumentosTable";

interface DocsProcessEmbedProps {
  className?: string;
  showFilters?: boolean;
  activeTab?: string;
  hideStatusColumn?: boolean;
  statusFilter?: string; // NOVA PROP
  showResetButton?: boolean; // Controla se o botão Reset deve aparecer
}

export function DocsProcessEmbed({ 
  className = "",
  showFilters = true,
  activeTab = "em-processo",
  hideStatusColumn = false,
  statusFilter,
  showResetButton
}: DocsProcessEmbedProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(
    null,
  );
  const [editingArtifact, setEditingArtifact] = useState<DocumentArtifact | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
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
  const [documentToReset, setDocumentToReset] = useState<Documento | null>(
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

  // Função para obter informações do template
  const getTemplateInfo = (templateId: string) => {
    const template = templatesList.find((t: any) => t.id === templateId);
    if (template) {
      return {
        code: template.code,
        name: template.name,
        description: template.description
      };
    }
    return null;
  };

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

  // Mutation para resetar documento
  const resetDocumentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documentos/${id}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao resetar documento");
      }
      return response.json();
    },
    onSuccess: (data, documentId) => {
      // Invalidar todas as queries relacionadas aos documentos
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      
      // Invalidar queries relacionadas a fluxos
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      
      // Invalidar queries relacionadas a edições e artefatos
      queryClient.invalidateQueries({ queryKey: ["/api/document-editions-in-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos/artifacts-count"] });
      
      // Invalidar artefatos específicos do documento resetado
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documentos", documentId, "artifacts"] 
      });
      
      // Invalidar todas as queries de artefatos que possam estar sendo usadas
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documentos", currentDocumentId, "artifacts"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/documentos", editingDocument?.id, "artifacts"] 
      });
      
      setIsResetConfirmOpen(false);
      setDocumentToReset(null);
      
      toast({
        title: "Documento resetado",
        description: "O documento foi resetado ao estado inicial com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resetar documento",
        description: error.message || "Falha ao resetar o documento",
        variant: "destructive",
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

  // Filtrar documentos em processo
  const documentosProcessando = useMemo(
    () => filteredAndSortedDocumentos.filter((doc) => doc.status === (statusFilter || "Em Processo")),
    [filteredAndSortedDocumentos, statusFilter],
  );

  // Extrair valores únicos para os filtros
  const responsaveisUnicos = useMemo(() => {
    const responsaveis = new Set<string>();
    documentos.forEach((doc) => {
      if (doc.responsavel) responsaveis.add(doc.responsavel);
    });
    return Array.from(responsaveis).sort((a, b) => a.localeCompare(b));
  }, [documentos]);

  const modulosUnicos = useMemo(() => {
    const modulos = new Set<string>();
    documentos.forEach((doc) => {
      if (doc.modulo) modulos.add(doc.modulo);
    });
    return Array.from(modulos).sort((a, b) => a.localeCompare(b));
  }, [documentos]);

  const clientesUnicos = useMemo(() => {
    const clientes = new Set<string>();
    documentos.forEach((doc) => {
      if (doc.cliente) clientes.add(doc.cliente);
    });
    return Array.from(clientes).sort((a, b) => a.localeCompare(b));
  }, [documentos]);

  const origensUnicas = useMemo(() => {
    const origens = new Set<string>();
    documentos.forEach((doc) => {
      if (doc.origem) origens.add(doc.origem);
    });
    return Array.from(origens).sort((a, b) => a.localeCompare(b));
  }, [documentos]);

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

  const handleResetDocument = (documento: Documento) => {
    setDocumentToReset(documento);
    setIsResetConfirmOpen(true);
  };

  const confirmResetDocument = (documento: Documento) => {
    resetDocumentoMutation.mutate(documento.id);
  };

  const closeResetConfirm = () => {
    setIsResetConfirmOpen(false);
    setDocumentToReset(null);
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

  const renderDocumentosTable = (documentos: Documento[]) => {
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
        handleResetDocument={showResetButton !== false && activeTab === "em-processo" ? handleResetDocument : undefined}
        setSelectedDocument={setSelectedDocument}
        setIsDocumentationModalOpen={setIsDocumentationModalOpen}
        isDocumentationModalOpen={isDocumentationModalOpen}
        deleteDocumentoMutation={deleteDocumentoMutation}
        getActiveFlow={getActiveFlow}
        getConcludedFlow={getConcludedFlow}
        openFlowDiagramModal={openFlowDiagramModal}
        flowExecutions={flowExecutions}
        showFilters={showFilters}
        hideStatusColumn={hideStatusColumn}
      />
    );
  };



  return (
    <div className={`${className} flex flex-col h-full`}>
      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        <>
          {/* Filtros */}
          {showFilters && (
            <div className="mb-6 py-3 px-4 bg-gray-50 dark:bg-[#0F172A] rounded-lg border dark:border-[#374151]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Filtro por Nome */}
                <div>
                  <Label htmlFor="filtro-nome" className="text-xs dark:text-gray-200">
                    Nome
                  </Label>
                  <Input
                    id="filtro-nome"
                    placeholder="Filtrar por nome..."
                    value={filtros.nome}
                    onChange={(e) =>
                      setFiltros((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200"
                  />
                </div>

                {/* Filtro por Responsável */}
                <div>
                  <Label htmlFor="filtro-responsavel" className="text-xs dark:text-gray-200">
                    Responsável
                  </Label>
                  <Select
                    value={filtros.responsavel}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, responsavel: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {responsaveisUnicos.map((responsavel) => (
                        <SelectItem key={responsavel} value={responsavel}>
                          {responsavel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Módulo */}
                <div>
                  <Label htmlFor="filtro-modulo" className="text-xs dark:text-gray-200">
                    Módulo
                  </Label>
                  <Select
                    value={filtros.modulo}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, modulo: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {modulosUnicos.map((modulo) => (
                        <SelectItem key={modulo} value={modulo}>
                          {modulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Cliente */}
                <div>
                  <Label htmlFor="filtro-cliente" className="text-xs dark:text-gray-200">
                    Cliente
                  </Label>
                  <Select
                    value={filtros.cliente}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, cliente: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {clientesUnicos.map((cliente) => (
                        <SelectItem key={cliente} value={cliente}>
                          {cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Origem */}
                <div>
                  <Label htmlFor="filtro-origem" className="text-xs dark:text-gray-200">
                    Origem
                  </Label>
                  <Select
                    value={filtros.origem}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, origem: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {origensUnicas.map((origem) => (
                        <SelectItem key={origem} value={origem}>
                          {origem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão Limpar Filtros */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFiltros({
                        responsavel: "",
                        modulo: "",
                        cliente: "",
                        origem: "",
                        nome: "",
                      })
                    }
                    className="h-8 text-xs dark:border-gray-600 dark:hover:bg-[#1F2937] dark:text-gray-200"
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 min-h-0">
            {renderDocumentosTable(documentosProcessando)}
          </div>
        </>
      )}

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
        onClose={() => {
          // Invalidar queries para atualizar a tabela quando modal for fechada
          queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
          queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions/count"] });
        }}
        FlowWithAutoFitView={(props: any) => (
          <FlowWithAutoFitView 
            {...props}
            flowDiagramModal={flowDiagramModal}
            setFlowDiagramModal={setFlowDiagramModal}
            queryClient={queryClient}
            toast={toast}
            isFlowInspectorPinned={isFlowInspectorPinned}
            setIsFlowInspectorPinned={setIsFlowInspectorPinned}
            getTemplateInfo={getTemplateInfo}
          />
        )}
      />
      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={closeDeleteConfirm}
        documentToDelete={documentToDelete}
        onConfirmDelete={confirmDeleteDocument}
        isDeleting={deleteDocumentoMutation.isPending}
      />
      <DeleteConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={closeResetConfirm}
        documentToDelete={documentToReset}
        onConfirmDelete={confirmResetDocument}
        isDeleting={resetDocumentoMutation.isPending}
        title="Confirmar Reset do Documento"
        message="Tem certeza de que deseja resetar este documento? Esta ação irá remover todo o histórico de processamento, fluxos executados e edições, retornando o documento ao estado inicial 'Integrado'. Esta operação não pode ser desfeita."
        confirmText="Reset"
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

// Componente interno que usa useReactFlow para fit view automático
function FlowWithAutoFitView({ 
  flowData, 
  showFlowInspector, 
  setShowFlowInspector, 
  setSelectedFlowNode, 
  selectedFlowNode, 
  showApprovalAlert, 
  setShowApprovalAlert, 
  isPinned,
  flowDiagramModal,
  setFlowDiagramModal,
  queryClient,
  toast,
  isFlowInspectorPinned,
  setIsFlowInspectorPinned,
  getTemplateInfo
}: any) {
    const { fitView, getNodes, setNodes } = useReactFlow();
    
    // Estado para controlar os valores dos campos do formulário
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    
    // Estado para controlar resultado da execução de integração
    const [integrationResult, setIntegrationResult] = useState<{
      status: 'success' | 'error' | null;
      message: string;
    }>({ status: null, message: '' });
    
    // Estado para controlar modal de histórico de execuções
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [flowActionsHistory, setFlowActionsHistory] = useState<any[]>([]);
    
    // Função para buscar histórico de execuções
    const fetchFlowActionsHistory = async (nodeId: string) => {
      try {
        // Buscar execução de fluxo para este documento
        const documentId = flowDiagramModal.flowData?.documentId || flowDiagramModal.documentId;
        if (!documentId) {
          console.log('❌ Erro: documentId não encontrado no flowDiagramModal');
          return;
        }
        
        console.log('📋 Buscando histórico para:', { documentId, nodeId });
        const response = await fetch(`/api/flow-actions/history?documentId=${documentId}&flowNode=${nodeId}`);
        if (response.ok) {
          const history = await response.json();
          setFlowActionsHistory(history);
        } else {
          setFlowActionsHistory([]);
        }
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        setFlowActionsHistory([]);
      }
    };
    
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
                {/* Botão de histórico de execuções */}
                <button
                  onClick={() => {
                    fetchFlowActionsHistory(selectedFlowNode.id);
                    setIsHistoryModalOpen(true);
                  }}
                  className="absolute top-0 right-8 p-1 rounded transition-colors text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1F2937]"
                  title="Histórico de execuções"
                >
                  <History className="w-4 h-4" />
                </button>
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
              
              <div className="space-y-3">
                {/* Status Exec./Tipo apenas para ActionNode */}
                {selectedFlowNode.type === 'actionNode' && (
                  <table className="w-full text-xs execution-form-table">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo Ação</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Aprovação</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1.5 text-center">
                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                          }`}>
                            {selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'Executado' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'Pendente'
                              : 'N.Exec.'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.actionType && (
                            <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                              {selectedFlowNode.data.actionType}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.isAproved && (
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isAproved === 'TRUE' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : selectedFlowNode.data.isAproved === 'FALSE'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                            }`}>
                              {selectedFlowNode.data.isAproved === 'TRUE' 
                                ? 'SIM' 
                                : selectedFlowNode.data.isAproved === 'FALSE'
                                ? 'NÃO'
                                : 'UNDEF'}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedFlowNode.data.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Descrição</p>
                    <p className="text-xs text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-[#1F2937] p-2 rounded border dark:border-[#374151] font-mono">
                      {selectedFlowNode.data.description}
                    </p>
                  </div>
                )}

                {/* Formulário dinâmico baseado no attached_Form */}
                {selectedFlowNode.type === 'actionNode' && (selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form) && (
                  <div>
                    {(() => {
                      try {
                        // Verifica tanto attached_Form (maiúsculo) quanto attached_form (minúsculo)
                        let attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                        console.log('🔍 Dados brutos do formulário:', attachedFormData);
                        
                        // Corrige formato malformado do JSON se necessário
                        if (typeof attachedFormData === 'string' && attachedFormData.includes('"Motivo de Recusa":') && attachedFormData.includes('"Detalhamento":')) {
                          // Converte o formato específico manualmente
                          const fixedJson = {
                            "Show_Condition": "FALSE",
                            "Fields": {
                              "Motivo de Recusa": ["Incompatível com processo", "Forma de operação", "Configuração de Sistema"],
                              "Detalhamento": ["default:", "type:longText"]
                            }
                          };
                          attachedFormData = JSON.stringify(fixedJson);
                        }
                        
                        console.log('🔍 Dados corrigidos:', attachedFormData);
                        const formData = JSON.parse(attachedFormData);
                        console.log('🔍 Dados parseados:', formData);
                        
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
                          
                          if (!shouldShowForm) {
                            return null;
                          }
                          
                          // Converte Fields para objeto se for array - só processa se vai mostrar
                          let fieldsData = formData.Fields;
                          if (Array.isArray(formData.Fields)) {
                            fieldsData = {};
                            // Trata diferentes formatos de array
                            formData.Fields.forEach((item, index) => {
                              if (typeof item === 'string') {
                                // Formato: [fieldName1, fieldValue1, fieldName2, fieldValue2, ...]
                                const nextItem = formData.Fields[index + 1];
                                if (nextItem !== undefined && index % 2 === 0) {
                                  fieldsData[item] = nextItem;
                                }
                              } else if (typeof item === 'object' && item !== null) {
                                // Formato: [{fieldName: fieldValue}, ...]
                                Object.assign(fieldsData, item);
                              }
                            });
                          }
                          
                          console.log('🟡 Dados do formulário processados:', fieldsData);
                          
                          return (
                            <div className="bg-gray-50 dark:bg-[#1F2937] p-4 rounded border dark:border-[#374151] space-y-4">
                              {Object.entries(fieldsData).map(([fieldName, fieldValue]) => {
                              // Verifica se é um array de configuração com default e type
                              if (Array.isArray(fieldValue) && fieldValue.length === 2 && 
                                  typeof fieldValue[0] === 'string' && fieldValue[0].startsWith('default:') &&
                                  typeof fieldValue[1] === 'string' && fieldValue[1].startsWith('type:')) {
                                
                                const defaultValue = fieldValue[0].replace('default:', '');
                                const fieldType = fieldValue[1].replace('type:', '');
                                const isReadonly = !selectedFlowNode.data.isPendingConnected;
                                const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                                const readonlyClasses = isReadonly 
                                  ? "bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-600 dark:text-gray-300 cursor-not-allowed" 
                                  : "border-gray-300 dark:border-[#374151] dark:bg-[#0F172A] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                                
                                return (
                                  <div key={fieldName} className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{fieldName}</label>
                                    {fieldType === 'longText' ? (
                                      <textarea
                                        rows={4}
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses} resize-vertical`}
                                      />
                                    ) : fieldType.startsWith('char(') ? (
                                      <input
                                        type="text"
                                        maxLength={parseInt(fieldType.match(/\d+/)?.[0] || '255')}
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : fieldType === 'int' ? (
                                      <input
                                        type="number"
                                        step="1"
                                        placeholder={defaultValue || `Digite um número inteiro`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : fieldType.startsWith('number(') ? (
                                      <input
                                        type="number"
                                        step={Math.pow(10, -parseInt(fieldType.match(/\d+/)?.[0] || '2'))}
                                        placeholder={defaultValue || `Digite um número`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    )}
                                  </div>
                                );
                              }
                              
                              // Comportamento original para arrays simples ou strings
                              const isReadonly = !selectedFlowNode.data.isPendingConnected;
                              const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                              const readonlyClasses = isReadonly 
                                ? "bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-600 dark:text-gray-300 cursor-not-allowed" 
                                : "border-gray-300 dark:border-[#374151] dark:bg-[#0F172A] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                              
                              return (
                                <div key={fieldName} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{fieldName}</label>
                                  {Array.isArray(fieldValue) ? (
                                    <select 
                                      disabled={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    >
                                      <option value="">Selecione uma opção</option>
                                      {fieldValue.map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                        }
                        
                        // Comportamento legado para formulários sem condição
                        return (
                          <div className="bg-gray-50 dark:bg-[#1F2937] p-4 rounded border dark:border-[#374151] space-y-4">
                            {Object.entries(formData).map(([fieldName, fieldValue]) => {
                              const isReadonly = !selectedFlowNode.data.isPendingConnected;
                              const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                              const readonlyClasses = isReadonly 
                                ? "bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-600 dark:text-gray-300 cursor-not-allowed" 
                                : "border-gray-300 dark:border-[#374151] dark:bg-[#0F172A] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                              
                              return (
                                <div key={fieldName} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{fieldName}</label>
                                  {Array.isArray(fieldValue) ? (
                                    <select 
                                      disabled={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    >
                                      <option value="">Selecione uma opção</option>
                                      {fieldValue.map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch (e) {
                        const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                        return (
                          <div className="text-sm text-red-600">
                            Erro ao processar formulário: {attachedFormData}
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Layout tabular para DocumentNode - 2 colunas */}
                {selectedFlowNode.type === 'documentNode' && (
                  <div className="space-y-4">
                    <table className="w-full text-xs execution-form-table">
                      <thead>
                        <tr>
                          <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-xs">ID Template</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1.5 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {selectedFlowNode.data.docType ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 font-mono">
                                {selectedFlowNode.data.docType}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-300 text-xs font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Mensagem e botão para iniciar edição quando isExecuted = FALSE e isInProcess = FALSE */}
                    {selectedFlowNode.data.isExecuted === 'FALSE' && selectedFlowNode.data.isInProcess === 'FALSE' && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                              Iniciar Documentação
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mb-3 leading-relaxed">
                              Selecione o botão de iniciar edição para enviar este documento para início de documentação no editor. 
                              Ao selecionar este elemento do fluxo indicará modo "In Progress", acesse o editor e selecione o documento 
                              para dar prosseguimento ao processo de edição da documentação. O documento a ser editado será o{' '}
                              <span className="font-mono font-medium text-xs">
                                {(() => {
                                  if (selectedFlowNode.data.docType) {
                                    const templateInfo = getTemplateInfo(selectedFlowNode.data.docType);
                                    if (templateInfo) {
                                      return `${templateInfo.code} - ${templateInfo.name}`;
                                    }
                                    // Fallback: tentar extrair do formato já processado
                                    const parts = selectedFlowNode.data.docType.split('-');
                                    return parts.length >= 2 ? `${parts[0]} - ${parts[1]}` : selectedFlowNode.data.docType;
                                  }
                                  return 'Documento não definido';
                                })()}
                              </span>
                            </p>
                            <Button
                              onClick={async () => {
                                try {
                                  // Atualizar o nó para marcar como em processo
                                  const currentNodes = getNodes();
                                  const updatedNodes = currentNodes.map(node => {
                                    if (node.id === selectedFlowNode.id) {
                                      return {
                                        ...node,
                                        data: {
                                          ...node.data,
                                          isInProcess: 'TRUE'
                                        }
                                      };
                                    }
                                    return node;
                                  });
                                  setNodes(updatedNodes);
                                  
                                  // Atualizar também o nó selecionado para refletir a mudança no painel
                                  setSelectedFlowNode({
                                    ...selectedFlowNode,
                                    data: {
                                      ...selectedFlowNode.data,
                                      isInProcess: 'TRUE'
                                    }
                                  });

                                  // Salvar alterações no banco de dados imediatamente
                                  // Obter edges do modal atual - garantir que não são perdidas
                                  const currentEdges = flowDiagramModal.flowData?.edges || 
                                                      flowDiagramModal.flowData?.flowTasks?.edges || [];
                                  
                                  console.log('🔗 Edges encontradas no modal:', currentEdges.length);
                                  console.log('🔗 Estrutura completa do flowData:', flowDiagramModal.flowData);
                                  
                                  const updatedFlowTasks = {
                                    nodes: updatedNodes,
                                    edges: currentEdges,
                                    viewport: flowDiagramModal.flowData?.viewport || 
                                             flowDiagramModal.flowData?.flowTasks?.viewport || 
                                             { x: 0, y: 0, zoom: 1 }
                                  };
                                  
                                  console.log('🔗 Dados enviados para salvamento:', {
                                    nodes: updatedFlowTasks.nodes.length,
                                    edges: updatedFlowTasks.edges.length,
                                    viewport: updatedFlowTasks.viewport
                                  });

                                  // Verificar se documentId está disponível
                                  const documentId = flowDiagramModal.flowData?.documentId;
                                  if (!documentId) {
                                    console.error('❌ DocumentId não encontrado no flowData:', flowDiagramModal.flowData);
                                    throw new Error('ID do documento não encontrado');
                                  }

                                  console.log('🔄 Salvando alterações para documento:', documentId);
                                  
                                  const response = await fetch(`/api/document-flow-executions/${documentId}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      flowTasks: updatedFlowTasks
                                    }),
                                  });

                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('❌ Erro na resposta:', response.status, errorText);
                                    throw new Error(`Erro ao salvar alterações: ${response.status}`);
                                  }

                                  // Atualizar estado local
                                  setFlowDiagramModal(prev => ({
                                    ...prev,
                                    flowData: {
                                      ...prev.flowData,
                                      flowTasks: updatedFlowTasks
                                    }
                                  }));

                                  // Criar registro em document_editions e atualizar task_state
                                  try {
                                    const templateId = selectedFlowNode.data.docType; // Este é o ID do template
                                    const documentId = flowDiagramModal.flowData?.documentId;
                                    
                                    if (templateId && documentId) {
                                      const editionResponse = await fetch('/api/document-editions', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          documentId: documentId,
                                          templateId: templateId,
                                          status: 'in_progress',
                                          init: new Date().toISOString(),
                                          fluxNodeId: selectedFlowNode.id
                                        }),
                                      });
                                      
                                      if (editionResponse.ok) {
                                        const editionData = await editionResponse.json();
                                        console.log('✅ Registro criado em document_editions:', editionData);
                                        console.log('✅ Task state atualizado para "in_doc" automaticamente');
                                        
                                        // Criar registro em flow_actions para rastrear o início da edição
                                        try {
                                          const flowActionResponse = await fetch('/api/flow-actions/create', {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                              documentId: documentId,
                                              flowNode: selectedFlowNode.id,
                                              actionDescription: 'Edição de documento iniciada'
                                            }),
                                          });
                                          
                                          if (flowActionResponse.ok) {
                                            const flowActionData = await flowActionResponse.json();
                                            console.log('✅ Flow action registrada:', flowActionData);
                                          } else {
                                            console.error('❌ Erro ao registrar flow action:', await flowActionResponse.text());
                                          }
                                        } catch (flowActionError) {
                                          console.error('❌ Erro ao criar flow action:', flowActionError);
                                        }
                                      } else {
                                        console.error('❌ Erro ao criar registro em document_editions:', await editionResponse.text());
                                      }
                                    }
                                  } catch (editionError) {
                                    console.error('❌ Erro ao criar edição de documento:', editionError);
                                  }

                                  // Recarregar dados
                                  queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });

                                  toast({
                                    title: "Documentação iniciada",
                                    description: "O documento foi marcado como 'In Progress' e registro de edição criado no banco de dados.",
                                  });
                                } catch (error) {
                                  console.error('Erro ao salvar alterações:', error);
                                  toast({
                                    title: "Erro",
                                    description: "Falha ao salvar as alterações no banco de dados.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <BookOpen className="mr-1.5 h-3 w-3" />
                              Iniciar Edição
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mensagem informativa quando está em processo */}
                    {selectedFlowNode.data.isInProcess === 'TRUE' && selectedFlowNode.data.isExecuted === 'FALSE' && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                              Documentação em Progresso
                            </h4>
                            <p className="text-xs text-purple-700 dark:text-purple-400">
                              Este documento está sendo editado no editor. Acesse a página de fluxos para continuar o processo de documentação do{' '}
                              <span className="font-mono font-medium text-xs">
                                {(() => {
                                  if (selectedFlowNode.data.docType) {
                                    const templateInfo = getTemplateInfo(selectedFlowNode.data.docType);
                                    if (templateInfo) {
                                      return `${templateInfo.code} - ${templateInfo.name}`;
                                    }
                                    // Fallback: tentar extrair do formato já processado
                                    const parts = selectedFlowNode.data.docType.split('-');
                                    return parts.length >= 2 ? `${parts[0]} - ${parts[1]}` : selectedFlowNode.data.docType;
                                  }
                                  return 'Documento não definido';
                                })()}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(selectedFlowNode.data.integrType || selectedFlowNode.type === 'integrationNode') && (
                  <table className="w-full text-xs execution-form-table">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Dir.Integr.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo Integr.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1.5 text-center">
                          <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                          }`}>
                            {selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'Executado' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'Pendente'
                              : 'N.Exec.'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.integrType ? (
                            <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400">
                              {selectedFlowNode.data.integrType}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.callType ? (
                            <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                              {selectedFlowNode.data.callType}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {selectedFlowNode.data.service && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-700 dark:text-gray-200">Serviço:</span> {selectedFlowNode.data.service}
                    </p>
                  </div>
                )}

                {(selectedFlowNode.data.callType?.toLowerCase() === 'automatico' || selectedFlowNode.data.callType?.toLowerCase() === 'automático') && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Esta integração é feita automaticamente por um processo agendado, o ID deste processo é:
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-400 font-mono mt-1">
                      {selectedFlowNode.data.jobId || 'N/A'}
                    </p>
                  </div>
                )}

                {selectedFlowNode.data.callType?.toLowerCase() === 'manual' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-600 rounded-lg">
                    <div className="mb-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-2">
                        {(() => {
                          // Extrair informações do jobId
                          let functionCaption = selectedFlowNode.data.callType || 'callJob';
                          let functionName = '';
                          
                          if (selectedFlowNode.data.jobId) {
                            try {
                              const jobData = JSON.parse(selectedFlowNode.data.jobId);
                              const firstKey = Object.keys(jobData)[0];
                              if (firstKey) {
                                functionCaption = firstKey;
                                functionName = jobData[firstKey];
                              }
                            } catch (e) {
                              console.log('Erro ao fazer parse do jobId:', e);
                            }
                          }
                          
                          const displayName = functionName ? `${functionCaption} [${functionName}]` : functionCaption;
                          
                          return (
                            <>
                              Ao clicar no botão você executará a função{' '}
                              <span className="font-mono font-semibold bg-yellow-100 dark:bg-yellow-800/50 px-1 py-0.5 rounded text-yellow-900 dark:text-yellow-200">
                                {displayName}
                              </span>
                              {' '}que {selectedFlowNode.data.integrType || 'Atualiza Dados'} com o serviço {selectedFlowNode.data.service || 'externo'}. Pressione para continuar.
                            </>
                          );
                        })()}
                      </p>
                    </div>

                    {integrationResult.status && (
                      <div className={`mb-3 p-3 rounded-md ${
                        integrationResult.status === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                          : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                      }`}>
                        <p className={`text-sm ${
                          integrationResult.status === 'success' 
                            ? 'text-green-800 dark:text-green-300' 
                            : 'text-red-800 dark:text-red-300'
                        }`}>
                          {integrationResult.message}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={executeManualIntegration}
                      disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedFlowNode.data.isExecuted === 'TRUE'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                      }`}
                    >
                      {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Executado' : 'Executar'}
                    </button>
                  </div>
                )}

                {/* Layout tabular para StartNode - 2 colunas */}
                {selectedFlowNode.type === 'startNode' && (
                  <table className="w-full text-xs execution-form-table">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1.5 text-center">
                          <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                          }`}>
                            {selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'Executado' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'Pendente'
                              : 'N.Exec.'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            Início Direto
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Layout tabular para EndNode - 2 colunas */}
                {selectedFlowNode.type === 'endNode' && (
                  <div>
                    <table className="w-full text-xs execution-form-table">
                      <thead>
                        <tr>
                          <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1.5 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {selectedFlowNode.data.To_Type ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                {selectedFlowNode.data.To_Type === 'Direct_finish' ? 'Encerramento Direto' : 
                                 selectedFlowNode.data.To_Type === 'flow_Finish' ? 'Transferência para Fluxo' : selectedFlowNode.data.To_Type}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Exibição do fluxo destino para EndNode de Transferência */}
                    {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (
                      <div className="mt-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-3">
                          <div className="mb-2">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Fluxo Destino:</p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-mono bg-white dark:bg-[#0F172A] px-2 py-1 rounded border dark:border-[#374151]">
                              {selectedFlowNode.data.To_Flow_id}
                            </p>
                          </div>
                          {(selectedFlowNode.data.To_Flow_code || selectedFlowNode.data.To_Flow_name) && (
                            <div>
                              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Detalhes:</p>
                              <p className="text-xs text-blue-700 dark:text-blue-400 font-mono bg-white dark:bg-[#0F172A] px-2 py-1 rounded border dark:border-[#374151]">
                                [{selectedFlowNode.data.To_Flow_code}] - {selectedFlowNode.data.To_Flow_name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Manual execution form para EndNode de Transferência para Fluxo */}
                    {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg">
                        <div className="mb-3">
                          <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                            Ao pressionar o botão você confirma o encerramento deste fluxo e a abertura do novo fluxo vinculado. Ao confirmar, o sistema: 1- Encerra o fluxo corrente, 2- Cria uma nova instância com o fluxo indicado vinculado ao presente documento, 3- Inicia o fluxo no novo documento. Confirma estas ações?
                          </p>
                        </div>

                        {integrationResult.status && (
                          <div className={`mb-3 p-3 rounded-md ${
                            integrationResult.status === 'success' 
                              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                          }`}>
                            <p className={`text-sm ${
                              integrationResult.status === 'success' 
                                ? 'text-green-800 dark:text-green-300' 
                                : 'text-red-800 dark:text-red-300'
                            }`}>
                              {integrationResult.message}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={executeFlowTransfer}
                          disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                          className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedFlowNode.data.isExecuted === 'TRUE'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                          }`}
                        >
                          {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Transferência Concluída' : 'Transferir Fluxo'}
                        </button>
                      </div>
                    )}

                    {/* Manual execution form para EndNode de Encerramento Direto */}
                    {selectedFlowNode.data.FromType === 'Init' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-lg">
                        <div className="mb-3">
                          <p className="text-xs text-red-800 dark:text-red-300 mb-2">
                            Ao pressionar o botão você encerrará este fluxo vinculado ao documento, bem como marcará o documento como encerrado e o enviará para a tab [Concluídos] da página [Documentos]. Pressione para continuar.
                          </p>
                        </div>

                        {integrationResult.status && (
                          <div className={`mb-3 p-3 rounded-md ${
                            integrationResult.status === 'success' 
                              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                          }`}>
                            <p className={`text-sm ${
                              integrationResult.status === 'success' 
                                ? 'text-green-800 dark:text-green-300' 
                                : 'text-red-800 dark:text-red-300'
                            }`}>
                              {integrationResult.message}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={executeDirectFlowConclusion}
                          disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                          className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedFlowNode.data.isExecuted === 'TRUE'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                          }`}
                        >
                          {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Concluído' : 'Concluir Fluxo'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Layout tabular 3x2 para SwitchNode */}
                {selectedFlowNode.type === 'switchNode' && (
                  <table className="w-full text-xs execution-form-table">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Campo Switch</th>
                        <th className="px-2 py-1.5 text-center font-medium text-xs">Input Switch</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1.5 text-center">
                          <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                          }`}>
                            {selectedFlowNode.data.isExecuted === 'TRUE' 
                              ? 'Executado' 
                              : selectedFlowNode.data.isPendingConnected
                              ? 'Pendente'
                              : 'N.Exec.'}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.switchField ? (
                            <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                              {selectedFlowNode.data.switchField}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {selectedFlowNode.data.inputSwitch ? (
                            <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400">
                              {selectedFlowNode.data.inputSwitch}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}



                {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && selectedFlowNode.data.isAproved !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status de Aprovação</p>
                    <div className="flex space-x-2 mb-2">
                      <button
                        onClick={() => {
                          if (selectedFlowNode.data.isPendingConnected) {
                            updateApprovalStatus(selectedFlowNode.id, 'TRUE');
                          }
                        }}
                        disabled={!selectedFlowNode.data.isPendingConnected}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                          selectedFlowNode.data.isAproved === 'TRUE'
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-400'
                            : selectedFlowNode.data.isPendingConnected
                            ? 'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151] text-gray-600 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 cursor-pointer'
                            : 'bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <CircleCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">SIM</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          if (selectedFlowNode.data.isPendingConnected) {
                            updateApprovalStatus(selectedFlowNode.id, 'FALSE');
                          }
                        }}
                        disabled={!selectedFlowNode.data.isPendingConnected}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                          selectedFlowNode.data.isAproved === 'FALSE'
                            ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-400'
                            : selectedFlowNode.data.isPendingConnected
                            ? 'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151] text-gray-600 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 cursor-pointer'
                            : 'bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">NÃO</span>
                      </button>
                    </div>
                    
                    {/* Caixa de alerta para confirmação */}
                    {showApprovalAlert && selectedFlowNode.data.isAproved !== 'UNDEF' && (
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-600 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">ATENÇÃO</h4>
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
                              Ao executar esta ação o fluxo passará automaticamente para o próximo estágio definido conforme o diagrama, esta ação pode ser irreversível caso ações posteriores no workflow sejam executadas.
                            </p>
                            <div className="flex space-x-2">
                              <button
                                onClick={saveChangesToDatabase}
                                disabled={!areAllFieldsFilled()}
                                className={`px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                  areAllFieldsFilled()
                                    ? 'bg-orange-600 dark:bg-[#1E40AF] hover:bg-orange-700 dark:hover:bg-[#1E3A8A]'
                                    : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                }`}
                              >
                                Salvar Alterações
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Histórico de Execuções */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsHistoryModalOpen(false)}>
            <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b dark:border-[#374151]">
                <div>
                  <h2 className="text-lg font-semibold dark:text-gray-200">Histórico de Execuções</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Nó: {selectedFlowNode?.id} | Tipo: {(() => {
                      const typeMap: { [key: string]: string } = {
                        'startNode': 'Início',
                        'endNode': 'Fim',
                        'actionNode': 'Ação',
                        'documentNode': 'Documento',
                        'integrationNode': 'Integração',
                        'switchNode': 'Condição'
                      };
                      return typeMap[selectedFlowNode?.type] || selectedFlowNode?.type;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
                {flowActionsHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum histórico de execução encontrado para este nó.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-[#374151]">
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A]">Ação</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A]">Por</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A]">Iniciado em</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0F172A]">Finalizado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowActionsHistory.map((action, index) => (
                          <tr key={index} className="border-b dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1F2937]">
                            <td className="p-3 text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-[#0F172A]">
                              {action.action_description || 'Ação'}
                            </td>
                            <td className="p-3 text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-[#0F172A]">
                              {action.actor || '-'}
                            </td>
                            <td className="p-3 text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-[#0F172A]">
                              {action.started_at ? new Date(action.started_at).toLocaleString('pt-BR') : '-'}
                            </td>
                            <td className="p-3 text-sm text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-[#0F172A]">
                              {action.end_at ? new Date(action.end_at).toLocaleString('pt-BR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


