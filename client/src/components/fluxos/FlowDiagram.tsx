import React, { RefObject } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnEdgeUpdateFunc,
  type ReactFlowInstance,
  type NodeTypes
} from 'reactflow';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { NodeInspector } from './NodeInspector';
import { Network } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface FlowDiagramProps {
  // Flow state
  nodes: Node[];
  styledEdges: Edge[];
  
  // Event handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onEdgeUpdate: OnEdgeUpdateFunc;
  onInit: (instance: ReactFlowInstance) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  
  // Configuration
  nodeTypes: NodeTypes;
  reactFlowWrapper: RefObject<HTMLDivElement>;
  
  // Inspector
  showInspector: boolean;
  getSelectedNode: () => Node | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  getNodeMetadata: (nodeType: string) => any;
  savedFlows: any[];
  templatesData: any[];
  applyInspectorChanges: () => void;
  onNodeChange?: () => void;
  
  // Flow state
  isFlowLocked?: boolean;
  
  // MiniMap
  showMiniMap?: boolean;
  
  // Grid
  showGrid?: boolean;
}

export const FlowDiagram = ({
  nodes,
  styledEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeUpdate,
  onInit,
  onDrop,
  onDragOver,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  nodeTypes,
  reactFlowWrapper,
  showInspector,
  getSelectedNode,
  setNodes,
  getNodeMetadata,
  savedFlows,
  templatesData,
  applyInspectorChanges,
  onNodeChange,
  isFlowLocked = false,
  showMiniMap = false,
  showGrid = true
}: FlowDiagramProps) => {
  const hasNodes = nodes.length > 0;
  const { isDark } = useTheme();

  // Componente de estado vazio
  const EmptyState = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
      <Network 
        size={100} 
        className="text-gray-300 mb-4"
      />
      <p className="text-gray-500 text-lg font-medium">
        Selecione um fluxo para começar a editar...
      </p>
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-md">
      {showInspector ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={70} minSize={50}>
            <div className="h-full relative" ref={reactFlowWrapper}>
              {!hasNodes && <EmptyState />}
              <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={isFlowLocked ? undefined : onNodesChange}
                onEdgesChange={isFlowLocked ? undefined : onEdgesChange}
                onConnect={isFlowLocked ? undefined : onConnect}
                onEdgeUpdate={isFlowLocked ? undefined : onEdgeUpdate}
                onInit={onInit}
                onDrop={isFlowLocked ? undefined : onDrop}
                onDragOver={isFlowLocked ? undefined : onDragOver}
                onNodeClick={isFlowLocked ? undefined : onNodeClick}
                onEdgeClick={isFlowLocked ? undefined : onEdgeClick}
                onPaneClick={isFlowLocked ? undefined : onPaneClick}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                  },
                  updatable: !isFlowLocked,
                }}
                edgesUpdatable={!isFlowLocked}
                edgesFocusable={!isFlowLocked}
                nodesDraggable={!isFlowLocked}
                nodesConnectable={!isFlowLocked}
                elementsSelectable={!isFlowLocked}
                fitView
                minZoom={0.1}
                maxZoom={2}
                connectionLineType={ConnectionLineType.SmoothStep}
              >
                <Controls />
                {showGrid && <Background color={isDark ? "#ffffff" : "#6b7280"} gap={12} size={1} />}
                {showMiniMap && <MiniMap />}
              </ReactFlow>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <NodeInspector
              selectedNode={getSelectedNode()}
              nodes={nodes}
              setNodes={setNodes}
              getNodeMetadata={getNodeMetadata}
              savedFlows={savedFlows}
              templatesData={templatesData}
              applyInspectorChanges={applyInspectorChanges}
              onNodeChange={onNodeChange}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          {!hasNodes && <EmptyState />}
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={isFlowLocked ? undefined : onNodesChange}
            onEdgesChange={isFlowLocked ? undefined : onEdgesChange}
            onConnect={isFlowLocked ? undefined : onConnect}
            onEdgeUpdate={isFlowLocked ? undefined : onEdgeUpdate}
            onInit={onInit}
            onDrop={isFlowLocked ? undefined : onDrop}
            onDragOver={isFlowLocked ? undefined : onDragOver}
            onNodeClick={isFlowLocked ? undefined : onNodeClick}
            onEdgeClick={isFlowLocked ? undefined : onEdgeClick}
            onPaneClick={isFlowLocked ? undefined : onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              updatable: !isFlowLocked,
            }}
            edgesUpdatable={!isFlowLocked}
            edgesFocusable={!isFlowLocked}
            nodesDraggable={!isFlowLocked}
            nodesConnectable={!isFlowLocked}
            elementsSelectable={!isFlowLocked}
            fitView
            minZoom={0.1}
            maxZoom={2}
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Controls />
            {showGrid && <Background color={isDark ? "#ffffff" : "#6b7280"} gap={12} size={1} />}
            {showMiniMap && <MiniMap />}
          </ReactFlow>
        </div>
      )}
    </div>
  );
};