import { useState, useCallback, useRef, memo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  NodeTypes,
  Node,
  Edge,
  Position,
  Handle,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Save, RotateCcw, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// Definição dos componentes de nós personalizados
const StartNode = memo(({ data }: NodeProps) => (
  <div className="px-4 py-2 rounded-full bg-blue-100 border-2 border-blue-500 text-blue-700 shadow-md min-w-[100px] text-center">
    <div className="font-medium">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
  </div>
));

const EndNode = memo(({ data }: NodeProps) => (
  <div className="px-4 py-2 rounded-full bg-slate-100 border-2 border-slate-500 text-slate-700 shadow-md min-w-[100px] text-center">
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-500" />
  </div>
));

const ElaboreNode = memo(({ data }: NodeProps) => (
  <div className="px-4 py-2 rounded-lg bg-green-100 border-2 border-green-500 text-green-700 shadow-md min-w-[120px] text-center">
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-green-500" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-green-500" />
  </div>
));

const ApproveNode = memo(({ data }: NodeProps) => (
  <div className="px-4 py-2 rounded-lg bg-indigo-100 border-2 border-indigo-500 text-indigo-700 shadow-md min-w-[120px] text-center">
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-indigo-500" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-indigo-500" />
  </div>
));

const DecisionNode = memo(({ data }: NodeProps) => (
  <div className="w-32 h-32 rotate-45 flex items-center justify-center bg-amber-100 border-2 border-amber-500 text-amber-700 shadow-md">
    <div className="font-medium text-center -rotate-45 w-full">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-amber-500 -rotate-45" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-amber-500 -rotate-45" id="a" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-amber-500 -rotate-45" id="b" />
    <Handle type="source" position={Position.Left} className="w-2 h-2 bg-amber-500 -rotate-45" id="c" />
  </div>
));

const ReviseNode = memo(({ data }: NodeProps) => (
  <div className="px-4 py-2 rounded-lg bg-rose-100 border-2 border-rose-500 text-rose-700 shadow-md min-w-[120px] text-center">
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-rose-500" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-rose-500" />
  </div>
));

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'startNode',
    position: { x: 250, y: 50 },
    data: { label: 'Início' },
  },
];

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  elaboreNode: ElaboreNode,
  approveNode: ApproveNode,
  decisionNode: DecisionNode,
  reviseNode: ReviseNode,
};

const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');

  const onConnect = useCallback((params: any) => {
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        },
        eds
      )
    );
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (reactFlowWrapper.current && reactFlowInstance) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        const label = event.dataTransfer.getData('application/reactflow/label');

        // Verificar se o tipo é válido
        if (!type || !nodeTypes[type as keyof NodeTypes]) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: `${type}-${nodes.length + 1}`,
          type,
          position,
          data: { label },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes, nodes.length]
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSave = () => {
    if (nodes.length <= 1) {
      toast({
        title: 'Fluxo incompleto',
        description: 'Adicione pelo menos um nó de término para salvar o fluxo',
        variant: 'destructive',
      });
      return;
    }

    // Aqui você pode implementar a lógica para salvar o fluxo
    const flow = {
      name: flowName,
      nodes,
      edges,
    };

    console.log('Salvando fluxo:', flow);
    
    toast({
      title: 'Fluxo salvo',
      description: `O fluxo "${flowName}" foi salvo com sucesso!`,
    });
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges([]);
    setFlowName('Novo Fluxo');
    
    toast({
      title: 'Fluxo reiniciado',
      description: 'Todas as alterações foram descartadas',
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <Label htmlFor="flow-name">Nome do Fluxo</Label>
            <Input 
              id="flow-name" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="w-48">
            <Label htmlFor="flow-type">Tipo de Documento</Label>
            <Select>
              <SelectTrigger id="flow-type" className="mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crp">CRP</SelectItem>
                <SelectItem value="crs">CRS</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={handleReset} variant="outline" size="sm">
            <RotateCcw className="mr-1 h-4 w-4" />
            Reiniciar
          </Button>
          <Button onClick={handleSave} size="sm">
            <Save className="mr-1 h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-md">
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-medium text-sm mb-2 text-gray-500">NÓDULOS DISPONÍVEIS</h3>
          
          <div className="grid grid-cols-1 gap-2">
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-blue-50 hover:bg-blue-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'startNode', 'Início')}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </div>
              <span>Início</span>
            </div>
            
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-green-50 hover:bg-green-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'elaboreNode', 'Elaborar')}
            >
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </div>
              <span>Elaborar</span>
            </div>
            
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-indigo-50 hover:bg-indigo-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'approveNode', 'Aprovar')}
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <span>Aprovar</span>
            </div>
            
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-amber-50 hover:bg-amber-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'decisionNode', 'Decisão')}
            >
              <div className="h-8 w-8 rounded-none transform rotate-45 bg-amber-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-45"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <span>Decisão</span>
            </div>
            
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-rose-50 hover:bg-rose-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'reviseNode', 'Revisar')}
            >
              <div className="h-8 w-8 rounded-lg bg-rose-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M21.5 22v-6h-6"></path><path d="M22 11.5A10 10 0 0 0 3 9"></path><path d="M2 13a10 10 0 0 0 19 2.5"></path></svg>
              </div>
              <span>Revisar</span>
            </div>
            
            <div 
              className="border border-gray-200 p-2 rounded cursor-move bg-slate-50 hover:bg-slate-100 flex items-center"
              draggable
              onDragStart={(event) => onDragStart(event, 'endNode', 'Fim')}
            >
              <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <span>Fim</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Controls />
            <MiniMap />
            <Background color="#f0f0f0" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default function FluxosPage() {
  return (
    <div className="p-6 h-full">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Fluxos de Documentos</CardTitle>
              <CardDescription>
                Defina e gerencie fluxos de trabalho para seus documentos
              </CardDescription>
            </div>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Fluxo
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      <div className="h-[calc(100vh-260px)]">
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}