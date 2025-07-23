import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReactFlowProvider } from "reactflow";
import { Network } from "lucide-react";
import {
  StartNodeComponent,
  EndNodeComponent,
  ActionNodeComponent,
  DocumentNodeComponent,
  IntegrationNodeComponent,
  SwitchNodeComponent
} from "@/components/documentos/flow/FlowNodes";

interface FlowDiagramModalData {
  isOpen: boolean;
  flowData: any | null;
  documentTitle: string;
  documentObject?: string;
}

interface FlowDiagramModalProps {
  flowDiagramModal: FlowDiagramModalData;
  setFlowDiagramModal: (data: FlowDiagramModalData) => void;
  showFlowInspector: boolean;
  setShowFlowInspector: (show: boolean) => void;
  selectedFlowNode: any;
  setSelectedFlowNode: (node: any) => void;
  showApprovalAlert: boolean;
  setShowApprovalAlert: (show: boolean) => void;
  isFlowInspectorPinned: boolean;
  FlowWithAutoFitView: any;
}

export function FlowDiagramModal({
  flowDiagramModal,
  setFlowDiagramModal,
  showFlowInspector,
  setShowFlowInspector,
  selectedFlowNode,
  setSelectedFlowNode,
  showApprovalAlert,
  setShowApprovalAlert,
  isFlowInspectorPinned,
  FlowWithAutoFitView,
}: FlowDiagramModalProps) {
  console.log("🔴 RENDERIZANDO MODAL:", flowDiagramModal);
  
  if (!flowDiagramModal.isOpen || !flowDiagramModal.flowData) {
    console.log("🔴 Modal fechada ou sem dados, não renderizando");
    return null;
  }
  
  console.log("🔴 Modal ABERTA, renderizando...");

  // Node types definition
  const nodeTypes = {
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent,
  };

  // Convert flow data function
  const convertFlowDataToReactFlow = (flowData: any) => {
    // Try to access flow_tasks first, then fall back to direct flowData
    const tasksData = flowData?.flowTasks || flowData;
    
    if (!tasksData?.nodes) {
      console.log("🔴 Nenhum node encontrado nos dados:", tasksData);
      return { nodes: [], edges: [] };
    }

    const nodes = tasksData.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        isReadonly: true,
      },
    }));

    console.log("🔴 Nodes convertidos:", nodes);
    console.log("🔴 Edges encontradas:", tasksData.edges || []);

    return {
      nodes,
      edges: tasksData.edges || [],
    };
  };

  const { nodes, edges } = convertFlowDataToReactFlow(flowDiagramModal.flowData);
  
  // Handler para clique em nós
  const onNodeClick = (event: React.MouseEvent, node: any) => {
    setSelectedFlowNode(node);
    setShowFlowInspector(true);
  };

  // Handler para clique no painel (fechar inspector apenas se não estiver pinado)
  const onPaneClick = () => {
    if (!isFlowInspectorPinned) {
      setShowFlowInspector(false);
      setSelectedFlowNode(null);
    }
  };

  return (
    <Dialog 
      open={flowDiagramModal.isOpen} 
      onOpenChange={(open) => {
        console.log("🔴 onOpenChange chamado:", open);
        if (!open) {
          setFlowDiagramModal({
            isOpen: false,
            flowData: null,
            documentTitle: "",
          });
        }
      }}
    >
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] overflow-hidden flex flex-col dark:bg-[#111827] dark:border-[#374151]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 dark:text-gray-200">
            <Network className="h-5 w-5 dark:text-blue-400" />
            Diagrama do Fluxo - {flowDiagramModal.documentTitle}
          </DialogTitle>
          <DialogDescription>
            {flowDiagramModal.documentObject && (
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Documento: {flowDiagramModal.documentObject}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 w-full border rounded-lg overflow-hidden dark:border-[#374151] dark:bg-[#0F172A]">
          <ReactFlowProvider>
            <FlowWithAutoFitView 
              flowData={flowDiagramModal.flowData}
              showFlowInspector={showFlowInspector}
              setShowFlowInspector={setShowFlowInspector}
              setSelectedFlowNode={setSelectedFlowNode}
              selectedFlowNode={selectedFlowNode}
              showApprovalAlert={showApprovalAlert}
              setShowApprovalAlert={setShowApprovalAlert}
              isPinned={isFlowInspectorPinned}
            />
          </ReactFlowProvider>
        </div>
        
        <div className="flex-shrink-0 border-t bg-white p-4 mt-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                console.log("🔴 Botão fechar clicado");
                setFlowDiagramModal({
                  isOpen: false,
                  flowData: null,
                  documentTitle: "",
                });
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}