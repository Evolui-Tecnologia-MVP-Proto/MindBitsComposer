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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Save, RotateCcw, BookOpen, Edit } from 'lucide-react';
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
  <div className="relative" style={{ width: '100px', height: '100px' }}>
    <div
      className="absolute"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FEF3C7',
        border: '2px solid #D97706',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateZ(45deg)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
        className="absolute inset-0 flex flex-col justify-between"
        style={{ opacity: 0.3, padding: '5px' }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-full h-px bg-amber-500" />
        ))}
      </div>
    </div>
    
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="font-medium text-amber-800 text-sm">{data.label}</div>
    </div>
    
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-2 h-2 bg-amber-500" 
      style={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Right} 
      className="w-2 h-2 bg-amber-500" 
      id="a"
      style={{ top: '50%', right: '-25px', transform: 'translateY(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Bottom} 
      className="w-2 h-2 bg-amber-500" 
      id="b"
      style={{ bottom: '10px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Left} 
      className="w-2 h-2 bg-amber-500" 
      id="c"
      style={{ top: '50%', left: '-25px', transform: 'translateY(-50%)' }}
    />
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

  const handleSave = () => {
    if (nodes.length <= 1) {
      toast({
        title: 'Fluxo incompleto',
        description: 'Adicione pelo menos um nó de término para salvar o fluxo',
        variant: 'destructive',
      });
      return;
    }

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
          <div className="flex items-center space-x-2">
            <div className="w-64">
              <Select>
                <SelectTrigger id="node-type">
                  <SelectValue placeholder="Selecione um nó" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startNode">Início</SelectItem>
                  <SelectItem value="elaboreNode">Elaborar</SelectItem>
                  <SelectItem value="approveNode">Aprovar</SelectItem>
                  <SelectItem value="decisionNode">Decisão</SelectItem>
                  <SelectItem value="reviseNode">Revisar</SelectItem>
                  <SelectItem value="endNode">Fim</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

// Componente da Biblioteca de Fluxos
const BibliotecaFluxos = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Aprovação Simples</CardTitle>
            <CardDescription>
              Processo básico de elaboração, revisão e aprovação de documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                5 etapas • 3 decisões
              </div>
              <Button size="sm" variant="outline">
                Usar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo Completo com Revisão</CardTitle>
            <CardDescription>
              Processo avançado com múltiplas etapas de revisão e aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                8 etapas • 5 decisões
              </div>
              <Button size="sm" variant="outline">
                Usar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Emergência</CardTitle>
            <CardDescription>
              Processo simplificado para documentos urgentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                3 etapas • 1 decisão
              </div>
              <Button size="sm" variant="outline">
                Usar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo Colaborativo</CardTitle>
            <CardDescription>
              Processo para documentos com múltiplos colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                6 etapas • 4 decisões
              </div>
              <Button size="sm" variant="outline">
                Usar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Qualidade</CardTitle>
            <CardDescription>
              Processo com controle rigoroso de qualidade e conformidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                10 etapas • 6 decisões
              </div>
              <Button size="sm" variant="outline">
                Usar Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg">Fluxo Personalizado</CardTitle>
            <CardDescription>
              Crie um fluxo completamente personalizado do zero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Começar do zero
              </div>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function FluxosPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Área do título e descrição */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Fluxos de Documentos</h1>
        <p className="text-muted-foreground">
          Defina e gerencie fluxos de trabalho para seus documentos
        </p>
      </div>
      
      {/* Área das abas - ocupa todo o espaço restante */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <Tabs defaultValue="editor" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="editor" className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Editor</span>
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Biblioteca</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="editor" className="flex-1 mt-4 min-h-0">
            <ReactFlowProvider>
              <FlowCanvas />
            </ReactFlowProvider>
          </TabsContent>
          
          <TabsContent value="biblioteca" className="flex-1 mt-4 min-h-0 overflow-y-auto">
            <BibliotecaFluxos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}