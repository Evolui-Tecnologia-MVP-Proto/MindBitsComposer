import { useState } from "react";

interface FlowDiagramModalState {
  isOpen: boolean;
  flowData: any;
  documentTitle: string;
  documentObject?: string;
}

export function useFlowDiagramModal() {
  const [flowDiagramModal, setFlowDiagramModal] = useState<FlowDiagramModalState>({
    isOpen: false,
    flowData: null,
    documentTitle: "",
    documentObject: "",
  });

  const [showFlowInspector, setShowFlowInspector] = useState(false);
  const [selectedFlowNode, setSelectedFlowNode] = useState<any>(null);
  const [isFlowInspectorPinned, setIsFlowInspectorPinned] = useState(false);
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);

  const openModal = (execution: any, documentos: any[]) => {
    if (!execution) return;

    // Buscar o documento correspondente na lista de documentos
    const documento = documentos?.find(doc => doc.id === execution.documentId);
    const documentObject = documento?.objeto || execution.document?.objeto || "";
    
    // Garantir que o documentId e edges estão incluídos nos dados do fluxo
    const baseFlowData = execution.flowTasks || execution;
    const flowDataWithDocumentId = {
      ...baseFlowData,
      documentId: execution.documentId || execution.document_id || execution.id,
      edges: baseFlowData.edges || execution.edges || [],
      nodes: baseFlowData.nodes || execution.nodes || [],
      viewport: baseFlowData.viewport || execution.viewport || { x: 0, y: 0, zoom: 1 }
    };
    
    setFlowDiagramModal({
      isOpen: true,
      flowData: flowDataWithDocumentId,
      documentTitle: `Fluxo de Documentação - ${documentObject}`,
      documentObject: documentObject
    });
  };

  const closeModal = () => {
    setFlowDiagramModal(prev => ({ ...prev, isOpen: false }));
    setShowFlowInspector(false);
    setSelectedFlowNode(null);
  };

  return {
    flowDiagramModal,
    setFlowDiagramModal,
    showFlowInspector,
    setShowFlowInspector,
    selectedFlowNode,
    setSelectedFlowNode,
    isFlowInspectorPinned,
    setIsFlowInspectorPinned,
    showApprovalAlert,
    setShowApprovalAlert,
    openModal,
    closeModal,
  };
}