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

interface DocumentosEmbedComponentProps {
  className?: string;
  showFilters?: boolean;
  activeTab?: string;
}

export function DocumentosEmbedComponent({ 
  className = "",
  showFilters = true,
  activeTab = "em-processo"
}: DocumentosEmbedComponentProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Estados para modais
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  // Estados para artefatos
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<DocumentArtifact | null>(null);
  const [artifactFormData, setArtifactFormData] = useState<Partial<InsertDocumentArtifact>>({});

  // Estados para confirmação de exclusão
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteArtifactConfirmOpen, setIsDeleteArtifactConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(null);
  const [artifactToDelete, setArtifactToDelete] = useState<DocumentArtifact | null>(null);

  // Estados para o formulário de criação
  const [formData, setFormData] = useState<Partial<InsertDocumento>>({});
  const [createModalActiveTab, setCreateModalActiveTab] = useState("dados");
  const [currentCreatedDocumentId, setCurrentCreatedDocumentId] = useState<string | null>(null);
  const [isEscopoExpanded, setIsEscopoExpanded] = useState(false);
  const [isPessoasExpanded, setIsPessoasExpanded] = useState(false);
  const [createdDocumentArtifacts, setCreatedDocumentArtifacts] = useState<DocumentArtifact[]>([]);

  // Estados para fluxos e diagramas
  const [flowDiagramModal, setFlowDiagramModal] = useState<{
    isOpen: boolean;
    flowExecution: any | null;
    flowData: any | null;
  }>({
    isOpen: false,
    flowExecution: null,
    flowData: null,
  });
  const [showFlowInspector, setShowFlowInspector] = useState(false);
  const [selectedFlowNode, setSelectedFlowNode] = useState<any>(null);
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const [isFlowInspectorPinned, setIsFlowInspectorPinned] = useState(false);

  // Estados para sincronia otimista
  const [optimisticSyncState, setOptimisticSyncState] = useState<{
    [key: string]: "syncing" | "success" | "error";
  }>({});

  // Queries
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  const { data: user } = useQuery({ queryKey: ["/api/user"] });

  // Filtrar documentos para mostrar apenas "Em Processo"
  const documentosProcessando = useMemo(() => {
    if (!documentos) return [];
    return documentos.filter((doc) => doc.status === "Em Processo");
  }, [documentos]);

  // Buscar execuções de fluxo para os documentos
  const { data: flowExecutions = [] } = useQuery({
    queryKey: ["/api/document-flow-executions"],
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
      for (const mapping of mondayMappings as any[]) {
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
    enabled: (mondayMappings as any[]).length > 0,
  });

  // Criar um mapa de columnId para title para lookup rápido
  const columnTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    allMondayColumns.forEach((column: any) => {
      map[column.id] = column.title;
    });
    return map;
  }, [allMondayColumns]);

  // Buscar documentos flows para o modal de documentação
  const { data: documentsFlows = [] } = useQuery({
    queryKey: ["/api/document-flows"],
  });

  // Buscar valores Monday para verificar se há item values
  const { data: mondayItemValues = [] } = useQuery({
    queryKey: ["/api/monday/item-values"],
  });

  const hasMondayItemValues = mondayItemValues.length > 0;

  // Mutations
  const createDocumentoMutation = useMutation({
    mutationFn: (data: InsertDocumento) => apiRequest("/api/documentos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setCurrentCreatedDocumentId(newDocument.id);
      toast({
        title: "Sucesso",
        description: "Documento criado com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao criar documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar documento",
        variant: "destructive",
      });
    },
  });

  const updateDocumentoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertDocumento> }) =>
      apiRequest(`/api/documentos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({
        title: "Sucesso",
        description: "Documento atualizado com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar documento",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentoMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/documentos/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir documento:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir documento",
        variant: "destructive",
      });
    },
  });

  // Mutations para artefatos
  const createArtifactMutation = useMutation({
    mutationFn: (data: InsertDocumentArtifact) => apiRequest("/api/document-artifacts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-artifacts"] });
      toast({
        title: "Sucesso",
        description: "Artefato criado com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao criar artefato:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar artefato",
        variant: "destructive",
      });
    },
  });

  const updateArtifactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertDocumentArtifact> }) =>
      apiRequest(`/api/document-artifacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-artifacts"] });
      toast({
        title: "Sucesso",
        description: "Artefato atualizado com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar artefato:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar artefato",
        variant: "destructive",
      });
    },
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/document-artifacts/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-artifacts"] });
      toast({
        title: "Sucesso",
        description: "Artefato excluído com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao excluir artefato:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir artefato",
        variant: "destructive",
      });
    },
  });

  // Mutations para iniciar documentação
  const startDocumentationMutation = useMutation({
    mutationFn: (data: { documentId: string; flowId: string }) =>
      apiRequest("/api/start-documentation", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({
        title: "Sucesso",
        description: "Documentação iniciada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao iniciar documentação:", error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar documentação",
        variant: "destructive",
      });
    },
  });

  // Mutations para integrar anexos
  const integrateAttachmentsMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiRequest(`/api/documentos/${documentId}/integrate-attachments`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({
        title: "Sucesso",
        description: "Anexos integrados com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao integrar anexos:", error);
      toast({
        title: "Erro",
        description: "Erro ao integrar anexos",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
  };

  const openEditModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setFormData(documento);
    setIsEditModalOpen(true);
  };

  const handleDeleteDocument = (documento: Documento) => {
    setDocumentToDelete(documento);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteDocument = () => {
    if (documentToDelete) {
      deleteDocumentoMutation.mutate(documentToDelete.id);
      setIsDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setDocumentToDelete(null);
  };

  const handleDeleteArtifact = (artifact: DocumentArtifact) => {
    setArtifactToDelete(artifact);
    setIsDeleteArtifactConfirmOpen(true);
  };

  const confirmDeleteArtifact = () => {
    if (artifactToDelete) {
      deleteArtifactMutation.mutate(artifactToDelete.id);
      setIsDeleteArtifactConfirmOpen(false);
      setArtifactToDelete(null);
    }
  };

  const closeDeleteArtifactConfirm = () => {
    setIsDeleteArtifactConfirmOpen(false);
    setArtifactToDelete(null);
  };

  const handleCreateDocument = (data: InsertDocumento) => {
    createDocumentoMutation.mutate(data);
  };

  const handleUpdateDocument = (id: string, data: Partial<InsertDocumento>) => {
    updateDocumentoMutation.mutate({ id, data });
  };

  const handleCreateArtifact = (data: InsertDocumentArtifact) => {
    createArtifactMutation.mutate(data);
  };

  const handleUpdateArtifact = (id: string, data: Partial<InsertDocumentArtifact>) => {
    updateArtifactMutation.mutate({ id, data });
  };

  const handleFileUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCloseDocumentationModal = () => {
    setIsDocumentationModalOpen(false);
    setSelectedDocument(null);
    setSelectedFlowId(null);
  };

  // Funções auxiliares
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Em Processo":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Concluído":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Pausado":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "Bloqueado":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Em Processo":
        return <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
      case "Concluído":
        return <CircleCheck className="h-3 w-3 mr-1" />;
      case "Pausado":
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case "Bloqueado":
        return <AlertCircle className="h-3 w-3 mr-1" />;
      default:
        return <File className="h-3 w-3 mr-1" />;
    }
  };

  const getStatusOrigemBadgeVariant = (statusOrigem: string) => {
    switch (statusOrigem) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Funções para gerenciar fluxos
  const getActiveFlow = (documentId: string) => {
    return (flowExecutions as any[]).find(
      (execution: any) => execution.documentId === documentId && execution.status === "ACTIVE"
    );
  };

  const getConcludedFlow = (documentId: string) => {
    return (flowExecutions as any[]).find(
      (execution: any) => execution.documentId === documentId && execution.status === "CONCLUDED"
    );
  };

  const openFlowDiagramModal = (execution: any) => {
    setFlowDiagramModal({
      isOpen: true,
      flowExecution: execution,
      flowData: execution.flowData || null,
    });
  };

  // Função auxiliar para obter extensão do arquivo baseada no mimeType
  const getFileExtensionFromMimeType = (mimeType: string): string => {
    // PDFs
    if (mimeType.includes("pdf")) return "pdf";

    // Documentos Word
    if (
      mimeType.includes("wordprocessingml") ||
      mimeType.includes("msword")
    )
      return "doc";

    // Planilhas Excel
    if (
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

  return (
    <div className={className}>
      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        renderDocumentosTable(documentosProcessando)
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
            originAssetId: undefined,
            isImage: false,
          });
          setIsAddArtifactModalOpen(true);
        }}
        onCreateArtifact={handleCreateArtifact}
        createArtifactMutation={createArtifactMutation}
        onFileUpload={handleFileUpload}
        getFileExtensionFromMimeType={getFileExtensionFromMimeType}
        onDeleteArtifact={handleDeleteArtifact}
      />
      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedDocument={selectedDocument}
        formData={formData}
        setFormData={setFormData}
        onUpdateDocument={handleUpdateDocument}
        updateDocumentoMutation={updateDocumentoMutation}
        onOpenAddArtifactModal={(documentId) => {
          setArtifactFormData({
            documentoId: documentId,
            name: "",
            fileData: "",
            fileName: "",
            fileSize: "",
            mimeType: "",
            type: "",
            originAssetId: undefined,
            isImage: false,
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
        onConfirm={confirmDeleteDocument}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o documento "${documentToDelete?.objeto}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteDocumentoMutation.isPending}
      />
      <DeleteArtifactConfirmDialog
        isOpen={isDeleteArtifactConfirmOpen}
        onClose={closeDeleteArtifactConfirm}
        onConfirm={confirmDeleteArtifact}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir o artefato "${artifactToDelete?.name}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteArtifactMutation.isPending}
      />
    </div>
  );
}

// Flow component definition (copied from original file)
function FlowWithAutoFitView({ 
  flowDiagramModal,
  setFlowDiagramModal,
  queryClient,
  toast,
  isFlowInspectorPinned,
  setIsFlowInspectorPinned,
  getTemplateInfo,
  ...props 
}: any) {
  const { fitView } = useReactFlow();
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const [selectedFlowNode, setSelectedFlowNode] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.1 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, flowDiagramModal.flowData]);

  const nodeTypes = {
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent,
  };

  const onNodeClick = useCallback((event: any, node: any) => {
    console.log('Clique no nó:', node);
    setSelectedFlowNode(node);
    setShowApprovalAlert(false);
    
    if (node.data.isAproved && node.data.isAproved !== 'UNDEF') {
      setShowApprovalAlert(true);
    }
  }, []);

  const saveChangesToDatabase = useCallback(async () => {
    if (!selectedFlowNode || !flowDiagramModal.flowExecution) return;

    try {
      const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowExecution.id}/node-data`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: selectedFlowNode.id,
          nodeData: selectedFlowNode.data
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar alterações');
      }

      toast({
        title: "Sucesso",
        description: "Alterações salvas com sucesso!",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });

    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
    }
  }, [selectedFlowNode, flowDiagramModal.flowExecution, toast, queryClient]);

  const areAllFieldsFilled = useCallback(() => {
    if (!selectedFlowNode?.data?.headerFields) return false;
    
    return selectedFlowNode.data.headerFields.every((field: any) => {
      if (field.required === false) return true;
      return field.nodeValue && field.nodeValue.trim() !== '';
    });
  }, [selectedFlowNode]);

  if (!flowDiagramModal.flowData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Carregando diagrama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      <ReactFlow
        nodes={flowDiagramModal.flowData.nodes || []}
        edges={flowDiagramModal.flowData.edges || []}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        {...props}
      >
        <Controls position="top-left" />
        <Background />
      </ReactFlow>

      {/* Flow Inspector - versão simplificada para o componente */}
      {selectedFlowNode && (
        <div className="absolute top-4 right-4 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedFlowNode.data.label || 'Nó selecionado'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFlowNode(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            ID: {selectedFlowNode.id}
          </div>
          
          {selectedFlowNode.data.headerFields && selectedFlowNode.data.headerFields.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Campos:</h4>
              {selectedFlowNode.data.headerFields.map((field: any, index: number) => (
                <div key={index} className="text-xs">
                  <div className="text-gray-600 dark:text-gray-400">{field.label}:</div>
                  <div className="text-gray-900 dark:text-gray-100 ml-2">
                    {field.nodeValue || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão de salvar alterações */}
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
  );
}