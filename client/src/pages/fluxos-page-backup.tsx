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
import { PlusCircle, Save, RotateCcw, Share2, BookOpen, Edit } from 'lucide-react';
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
    {/* Losango isométrico usando CSS */}
    <div
      className="absolute"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#FEF3C7', // bg-amber-100
        border: '2px solid #D97706', // border-amber-500
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateZ(45deg)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Linhas horizontais para efeito similar à imagem */}
      <div 
        className="absolute inset-0 flex flex-col justify-between"
        style={{ opacity: 0.3, padding: '5px' }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-full h-px bg-amber-500" />
        ))}
      </div>
    </div>
    
    {/* Texto centralizado acima do losango */}
    <div 
      className="absolute inset-0 flex items-center justify-center z-10"
    >
      <div className="font-medium text-amber-800 text-sm">{data.label}</div>
    </div>
    
    {/* Pontos de conexão ajustados para ficarem exatamente na borda do losango */}
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
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);

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
          {/* Combo de Nódulos e Botão de Criação */}
          <div className="flex items-center space-x-2">
            <div className="w-64">
              <Select onValueChange={(value) => {
                // Apenas armazena o tipo selecionado, sem criar o nó
                if (value) {
                  setSelectedNodeType(value as string);
                }
              }}>
                <SelectTrigger id="node-type">
                  <SelectValue placeholder="Selecione um nó" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="startNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    </div>
                    <span className="ml-3">Início</span>
                  </div>
                </SelectItem>
                <SelectItem value="elaboreNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rounded-lg bg-green-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </div>
                    <span className="ml-3">Elaborar</span>
                  </div>
                </SelectItem>
                <SelectItem value="approveNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                    </div>
                    <span className="ml-3">Aprovar</span>
                  </div>
                </SelectItem>
                <SelectItem value="decisionNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rotate-45 bg-amber-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform -rotate-45"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <span className="ml-3">Decisão</span>
                  </div>
                </SelectItem>
                <SelectItem value="reviseNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rounded-lg bg-rose-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M21.5 22v-6h-6"></path><path d="M22 11.5A10 10 0 0 0 3 9"></path><path d="M2 13a10 10 0 0 0 19 2.5"></path></svg>
                    </div>
                    <span className="ml-3">Revisar</span>
                  </div>
                </SelectItem>
                <SelectItem value="endNode" className="flex items-center">
                  <div className="flex-1 flex items-center">
                    <div className="h-5 w-5 rounded-full bg-slate-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </div>
                    <span className="ml-3">Fim</span>
                  </div>
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

// Componente da Biblioteca de Fluxos
const BibliotecaFluxos = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de template de fluxo */}
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
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="editor" className="h-[calc(100vh-260px)]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor" className="flex items-center space-x-2">
            <Edit className="h-4 w-4" />
            <span>Editor</span>
          </TabsTrigger>
          <TabsTrigger value="biblioteca" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Biblioteca</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="h-full mt-4">
          <ReactFlowProvider>
            <FlowCanvas />
          </ReactFlowProvider>
        </TabsContent>
        
        <TabsContent value="biblioteca" className="h-full mt-4 overflow-y-auto">
          <BibliotecaFluxos />
        </TabsContent>
      </Tabs>
    </div>
  );
}