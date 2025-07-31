import { Loader2 } from "lucide-react";
import { DocumentosTable } from "./DocumentosTable";
import { type Documento } from "@shared/schema";
import { useProcessingDocuments } from "../hooks/useProcessingDocuments";

interface ProcessingDocumentsTableProps {
  // Dados base
  documentos: Documento[] | undefined;
  artifactCounts: Record<string, number>;
  flowExecutionCounts: Record<string, number>;
  flowExecutions: any[];
  
  // Estados
  activeTab: string;
  isLoading: boolean;
  showFilters?: boolean;
  
  // Filtros
  filtros: {
    responsavel: string;
    modulo: string;
    cliente: string;
    origem: string;
    nome: string;
  };
  
  // Funções auxiliares
  getStatusBadgeVariant: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusOrigemBadgeVariant: (statusOrigem: string) => string;
  formatDate: (date: Date | null) => string;
  getActiveFlow: (documentId: string) => any;
  getConcludedFlow: (documentId: string) => any;
  
  // Callbacks
  openViewModal: (documento: Documento) => void;
  openEditModal: (documento: Documento) => void;
  handleDeleteDocument: (documentId: string) => void;
  setSelectedDocument: (documento: Documento | null) => void;
  setIsDocumentationModalOpen: (isOpen: boolean) => void;
  openFlowDiagramModal: (execution: any) => void;
  
  // Mutations
  deleteDocumentoMutation: any;
}

export function ProcessingDocumentsTable({
  documentos,
  artifactCounts,
  flowExecutionCounts,
  flowExecutions,
  activeTab,
  isLoading,
  showFilters = true,
  filtros,
  getStatusBadgeVariant,
  getStatusIcon,
  getStatusOrigemBadgeVariant,
  formatDate,
  getActiveFlow,
  getConcludedFlow,
  openViewModal,
  openEditModal,
  handleDeleteDocument,
  setSelectedDocument,
  setIsDocumentationModalOpen,
  openFlowDiagramModal,
  deleteDocumentoMutation,
}: ProcessingDocumentsTableProps) {
  // Usar o hook para obter documentos processados
  const { documentosProcessando } = useProcessingDocuments(documentos, artifactCounts, filtros);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
      </div>
    );
  }

  return (
    <DocumentosTable
      documentos={documentosProcessando}
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
      isDocumentationModalOpen={false}
      deleteDocumentoMutation={deleteDocumentoMutation}
      getActiveFlow={getActiveFlow}
      getConcludedFlow={getConcludedFlow}
      openFlowDiagramModal={openFlowDiagramModal}
      flowExecutions={flowExecutions}
      showFilters={showFilters}
    />
  );
}