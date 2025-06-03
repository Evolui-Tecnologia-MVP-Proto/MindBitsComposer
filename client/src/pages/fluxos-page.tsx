import { useState, useCallback, useRef, memo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Panel,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
  Node,
  Edge,
  Connection,
  NodeTypes,
  ConnectionLineType,
  MarkerType,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Download, Upload, Play, FileText, GitBranch, Zap, Square, Settings, Save, PlusCircle, RotateCcw, Eye, EyeOff, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { NodeInspector } from '@/components/fluxos/NodeInspector';
import { FlowDiagram } from '@/components/fluxos/FlowDiagram';

const initialNodes: Node[] = [];

const FlowCanvas = ({ onFlowInfoChange }: { onFlowInfoChange: (info: {code: string, name: string} | null) => void }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState<boolean>(false);

  // Dados dos flows salvos e templates
  const { data: savedFlows } = useQuery({ queryKey: ['/api/documents-flows'] });
  const { data: templatesData } = useQuery({ queryKey: ['/api/templates/struct'] });
  const { data: flowTypes } = useQuery({ queryKey: ['/api/flow-types'] });
  
  // Estado para o fluxo atual
  const [currentFlow, setCurrentFlow] = useState<any>(null);

  const getSelectedNode = () => {
    return nodes.find(node => node.id === selectedNodeId) || null;
  };

  const getNodeMetadata = (nodeType: string) => {
    if (!flowTypes || !Array.isArray(flowTypes)) return null;
    
    // Usar o primeiro flow type disponível se não houver currentFlow definido
    const flowTypeToUse = currentFlow?.flowTypeId 
      ? flowTypes.find((ft: any) => ft.id === currentFlow.flowTypeId)
      : flowTypes[0];
      
    if (!flowTypeToUse?.nodeMetadata?.nodeTypes) return null;
    
    return flowTypeToUse.nodeMetadata.nodeTypes[nodeType] || null;
  };

  const applyInspectorChanges = () => {
    console.log('Aplicando alterações do inspetor...');
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setShowInspector(true);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setShowInspector(false);
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: any) => {
    setEdges((els) => els.filter((e) => e.id !== oldEdge.id).concat({ ...newConnection, id: oldEdge.id }));
  }, [setEdges]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNodeId = `${type}-${nodes.length + 1}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: { 
          label: type.charAt(0).toUpperCase() + type.slice(1),
          configured: false,
          showLabel: false
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, nodes, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm space-y-3">
        {/* Primeira linha - Seleção de fluxo e botões principais */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-800">Editor de Fluxos</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowInspector(!showInspector)}
              variant="outline"
              size="sm"
            >
              {showInspector ? <EyeOff className="h-4 w-4 mr-2" /> : <PanelRightOpen className="h-4 w-4 mr-2" />}
              {showInspector ? 'Ocultar' : 'Mostrar'} Inspetor
            </Button>
          </div>
        </div>

        {/* Segunda linha - Biblioteca de nós */}
        <div className="border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Arraste para o diagrama:</span>
            </div>
            
            {[
              { type: 'startNode', label: 'Início', icon: Play, color: 'text-green-600' },
              { type: 'actionNode', label: 'Ação', icon: Settings, color: 'text-purple-600' },
              { type: 'documentNode', label: 'Documento', icon: FileText, color: 'text-blue-600' },
              { type: 'switchNode', label: 'Switch', icon: GitBranch, color: 'text-yellow-600' },
              { type: 'integrationNode', label: 'Integração', icon: Zap, color: 'text-orange-600' },
              { type: 'endNode', label: 'Fim', icon: Square, color: 'text-red-600' },
            ].map(({ type, label, icon: Icon, color }) => (
              <div
                key={type}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md cursor-grab hover:bg-gray-100 transition-colors"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow', type);
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Área principal do diagrama */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border relative overflow-hidden">
        {showInspector ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={70} minSize={50} maxSize={80}>
              <FlowDiagram
                nodes={nodes}
                edges={edges}
                setNodes={setNodes}
                setEdges={setEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onEdgeUpdate={onEdgeUpdate}
                reactFlowWrapper={reactFlowWrapper}
                reactFlowInstance={reactFlowInstance}
                setReactFlowInstance={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                selectedNode={getSelectedNode()}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <NodeInspector
                selectedNode={getSelectedNode()}
                nodes={nodes}
                setNodes={setNodes}
                getNodeMetadata={getNodeMetadata}
                savedFlows={savedFlows as any[] || []}
                templatesData={templatesData as any[] || []}
                applyInspectorChanges={applyInspectorChanges}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <FlowDiagram
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onEdgeUpdate={onEdgeUpdate}
            reactFlowWrapper={reactFlowWrapper}
            reactFlowInstance={reactFlowInstance}
            setReactFlowInstance={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            selectedNode={getSelectedNode()}
          />
        )}
      </div>
    </div>
  );
};

export default function FluxosPage() {
  const [currentFlowInfo, setCurrentFlowInfo] = useState<{code: string, name: string} | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Área do título e descrição */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fluxos de Trabalho</h1>
            <p className="text-gray-600 mt-1">
              Gerencie e configure fluxos de trabalho para automatizar processos de documentos
            </p>
          </div>
          {currentFlowInfo && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Fluxo Atual</div>
              <div className="font-semibold text-gray-900">[{currentFlowInfo.code}] {currentFlowInfo.name}</div>
            </div>
          )}
        </div>
      </div>

      {/* Área principal do FlowCanvas */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <ReactFlowProvider>
          <FlowCanvas onFlowInfoChange={setCurrentFlowInfo} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}