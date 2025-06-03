import React, { RefObject } from 'react';
import ReactFlow, {
  Controls,
  Background,
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
  
  // Flow state
  isFlowLocked?: boolean;
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
  isFlowLocked = false
}: FlowDiagramProps) => {
  return (
    <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-md">
      {showInspector ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={70} minSize={50}>
            <div className="h-full" ref={reactFlowWrapper}>
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
                <Background color="#f0f0f0" gap={12} size={1} />
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
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
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
            <Background color="#f0f0f0" gap={12} size={1} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};