import { memo, useCallback, useRef, KeyboardEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeTypes,
  addEdge,
  ReactFlowInstance,
  NodeProps,
  ConnectionLineType,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Square, GitBranch, FileText, Zap, Settings } from 'lucide-react';

interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeUpdate: (oldEdge: Edge, newConnection: any) => void;
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  selectedNode: Node | null;
}

// Definição dos componentes de nós personalizados
const StartNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.isExecuted === 'TRUE') return 'bg-green-100 border-green-400';
    if (data.configured) return 'bg-blue-50 border-blue-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-md ${getBackgroundColor()} border-2 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
      <div className="flex items-center justify-center">
        <Play className="h-4 w-4 text-green-600 mr-2" />
        <div className="text-sm font-medium text-gray-800">
          {data.showLabel ? data.label : 'Início'}
        </div>
      </div>
      {data.isExecuted === 'TRUE' && (
        <div className="text-xs text-green-700 font-semibold mt-1">EXECUTADO</div>
      )}
    </div>
  );
});

const EndNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.isExecuted === 'TRUE') return 'bg-green-100 border-green-400';
    if (data.configured) return 'bg-red-50 border-red-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-md ${getBackgroundColor()} border-2 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
      <div className="flex items-center justify-center">
        <Square className="h-4 w-4 text-red-600 mr-2" />
        <div className="text-sm font-medium text-gray-800">
          {data.showLabel ? data.label : 'Fim'}
        </div>
      </div>
      {data.isExecuted === 'TRUE' && (
        <div className="text-xs text-green-700 font-semibold mt-1">EXECUTADO</div>
      )}
    </div>
  );
});

const SwitchNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.isExecuted === 'TRUE') return 'bg-green-100 border-green-400';
    if (data.configured) return 'bg-yellow-50 border-yellow-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-md ${getBackgroundColor()} border-2 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
      <div className="flex items-center justify-center">
        <GitBranch className="h-4 w-4 text-yellow-600 mr-2" />
        <div className="text-sm font-medium text-gray-800">
          {data.showLabel ? data.label : 'Switch'}
        </div>
      </div>
      {data.isExecuted === 'TRUE' && (
        <div className="text-xs text-green-700 font-semibold mt-1">EXECUTADO</div>
      )}
    </div>
  );
});

const ActionNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.isExecuted === 'TRUE') return 'bg-green-100 border-green-400';
    if (data.configured) return 'bg-purple-50 border-purple-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-md ${getBackgroundColor()} border-2 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
      <div className="flex items-center justify-center">
        <Settings className="h-4 w-4 text-purple-600 mr-2" />
        <div className="text-sm font-medium text-gray-800">
          {data.showLabel ? data.label : 'Ação'}
        </div>
      </div>
      {data.isExecuted === 'TRUE' && (
        <div className="text-xs text-green-700 font-semibold mt-1">EXECUTADO</div>
      )}
    </div>
  );
});

const DocumentNode = memo(({ data, selected, ...nodeProps }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.isExecuted === 'TRUE') return 'bg-green-100 border-green-400';
    if (data.configured) return 'bg-blue-50 border-blue-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-md ${getBackgroundColor()} border-2 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
      <div className="flex items-center justify-center">
        <FileText className="h-4 w-4 text-blue-600 mr-2" />
        <div className="text-sm font-medium text-gray-800">
          {data.showLabel ? data.label : 'Documento'}
        </div>
      </div>
      {data.isExecuted === 'TRUE' && (
        <div className="text-xs text-green-700 font-semibold mt-1">EXECUTADO</div>
      )}
    </div>
  );
});

const IntegrationNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-3 shadow-md rounded-md bg-orange-50 border-2 border-orange-300 ${selected ? 'ring-2 ring-blue-500' : ''} min-w-[120px] text-center`}>
    <div className="flex items-center justify-center">
      <Zap className="h-4 w-4 text-orange-600 mr-2" />
      <div className="text-sm font-medium text-gray-800">
        {data.showLabel ? data.label : 'Integração'}
      </div>
    </div>
  </div>
));

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  switchNode: SwitchNode,
  actionNode: ActionNode,
  documentNode: DocumentNode,
  integrationNode: IntegrationNode,
};

export function FlowDiagram({
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onEdgeClick,
  onEdgeUpdate,
  reactFlowWrapper,
  reactFlowInstance,
  setReactFlowInstance,
  onDrop,
  onDragOver,
  selectedNode,
}: FlowDiagramProps) {
  // Estilizar arestas com base no estado dos nós
  const styledEdges = edges.map((edge: Edge) => {
    const sourceNode = nodes.find(node => node.id === edge.source);
    const targetNode = nodes.find(node => node.id === edge.target);
    
    let strokeColor = '#94a3b8'; // Cor padrão (cinza)
    let strokeWidth = 2;
    
    if (sourceNode?.data.isExecuted === 'TRUE' && targetNode?.data.isExecuted === 'TRUE') {
      strokeColor = '#22c55e'; // Verde se ambos os nós foram executados
      strokeWidth = 3;
    } else if (sourceNode?.data.isExecuted === 'TRUE') {
      strokeColor = '#f59e0b'; // Laranja se apenas o nó de origem foi executado
      strokeWidth = 2.5;
    }
    
    return {
      ...edge,
      style: {
        ...edge.style,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
      },
    };
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    }
  };

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgeUpdate={onEdgeUpdate}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.data.isExecuted === 'TRUE') return '#22c55e';
            if (n.data.configured) return '#3b82f6';
            return '#6b7280';
          }}
          nodeColor={(n) => {
            if (n.data.isExecuted === 'TRUE') return '#dcfce7';
            if (n.data.configured) return '#dbeafe';
            return '#f3f4f6';
          }}
        />
      </ReactFlow>
    </div>
  );
}