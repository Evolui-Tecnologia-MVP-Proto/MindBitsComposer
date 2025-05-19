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
          
          {/* Combo de Nódulos */}
          <div className="w-64">
            <Label htmlFor="node-type">Adicionar Nódulo</Label>
            <Select onValueChange={(value) => {
              if (!value) return;
              
              const nodeData = {
                'startNode': { type: 'startNode', label: 'Início' },
                'elaboreNode': { type: 'elaboreNode', label: 'Elaborar' },
                'approveNode': { type: 'approveNode', label: 'Aprovar' },
                'decisionNode': { type: 'decisionNode', label: 'Decisão' },
                'reviseNode': { type: 'reviseNode', label: 'Revisar' },
                'endNode': { type: 'endNode', label: 'Fim' }
              }[value];
              
              if (!nodeData) return;
              
              // Adicionar o nó ao centro da visualização
              if (reactFlowInstance) {
                const centerPosition = reactFlowInstance.screenToFlowPosition({
                  x: reactFlowWrapper.current!.clientWidth / 2,
                  y: reactFlowWrapper.current!.clientHeight / 2,
                });
                
                const newNode = {
                  id: `${nodeData.type}-${nodes.length + 1}`,
                  type: nodeData.type,
                  position: centerPosition,
                  data: { label: nodeData.label },
                };
                
                setNodes((nds) => nds.concat(newNode));
              }
            }}>
              <SelectTrigger id="node-type" className="mt-1">
                <SelectValue placeholder="Adicionar nódulo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startNode" className="flex items-center">
                  <div className="h-4 w-4 rounded-full bg-blue-600 mr-2 flex-shrink-0"></div>
                  <span>Início</span>
                </SelectItem>
                <SelectItem value="elaboreNode" className="flex items-center">
                  <div className="h-4 w-4 rounded bg-green-600 mr-2 flex-shrink-0"></div>
                  <span>Elaborar</span>
                </SelectItem>
                <SelectItem value="approveNode" className="flex items-center">
                  <div className="h-4 w-4 rounded bg-indigo-600 mr-2 flex-shrink-0"></div>
                  <span>Aprovar</span>
                </SelectItem>
                <SelectItem value="decisionNode" className="flex items-center">
                  <div className="h-4 w-4 rotate-45 bg-amber-600 mr-2 flex-shrink-0"></div>
                  <span>Decisão</span>
                </SelectItem>
                <SelectItem value="reviseNode" className="flex items-center">
                  <div className="h-4 w-4 rounded bg-rose-600 mr-2 flex-shrink-0"></div>
                  <span>Revisar</span>
                </SelectItem>
                <SelectItem value="endNode" className="flex items-center">
                  <div className="h-4 w-4 rounded-full bg-slate-600 mr-2 flex-shrink-0"></div>
                  <span>Fim</span>
                </SelectItem>
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
        {/* Nódulos agora como combo na barra superior */}
        
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