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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Definição dos componentes de nós personalizados
const StartNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-full bg-white border-2 text-black shadow-md min-w-[100px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const EndNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-full bg-white border-2 text-black shadow-md min-w-[100px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
  </div>
));

const ElaboreNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-lg bg-white border-2 text-black shadow-md min-w-[120px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const ApproveNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-lg bg-white border-2 text-black shadow-md min-w-[120px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const DecisionNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '100px', height: '100px' }}>
    <div
      className={`absolute transition-all duration-200 ${selected ? 'scale-105' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        border: selected ? '3px solid black' : '2px solid black',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateZ(45deg)',
        boxShadow: selected ? '0 8px 12px -2px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        filter: selected ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.4))' : 'none'
      }}
    >
      <div 
        className="absolute inset-0 flex flex-col justify-between"
        style={{ opacity: 0.2, padding: '5px' }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-full h-px bg-black" />
        ))}
      </div>
    </div>
    
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="font-medium text-black text-sm">{data.label}</div>
    </div>
    
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-2 h-2 bg-black" 
      style={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Right} 
      className="w-2 h-2 bg-black" 
      id="a"
      style={{ top: '50%', right: '-25px', transform: 'translateY(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Bottom} 
      className="w-2 h-2 bg-black" 
      id="b"
      style={{ bottom: '10px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Left} 
      className="w-2 h-2 bg-black" 
      id="c"
      style={{ top: '50%', left: '-25px', transform: 'translateY(-50%)' }}
    />
  </div>
));

const ReviseNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-lg bg-white border-2 text-black shadow-md min-w-[120px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const RawDocumentNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-lg bg-white border-2 text-black shadow-md min-w-[140px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <div className="text-xs mt-1 opacity-75">Documento Bruto</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const DocumentNode = memo(({ data, selected }: NodeProps) => (
  <div className={`px-4 py-2 rounded-lg bg-white border-2 text-black shadow-md min-w-[140px] text-center transition-all duration-200 ${
    selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
  }`}>
    <div className="font-medium">{data.label}</div>
    <div className="text-xs mt-1 opacity-75">Documento Final</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const MondayNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '80px' }}>
    {/* Hexágono para Monday.com */}
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        backgroundColor: 'white',
        border: selected ? '3px solid black' : '2px solid black',
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        boxShadow: selected ? '0 8px 12px -2px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        filter: selected ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.4))' : 'none'
      }}
    >
      <div className="text-center">
        <div className="font-medium text-black text-sm">{data.label}</div>
        <div className="text-xs opacity-75 text-black">Plataforma</div>
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const GitHubNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '140px' }}>
    {/* Octógono para GitHub */}
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        backgroundColor: 'white',
        border: selected ? '3px solid black' : '2px solid black',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
        boxShadow: selected ? '0 8px 12px -2px rgba(0, 0, 0, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        filter: selected ? 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.4))' : 'none'
      }}
    >
      <div className="text-center">
        <div className="font-medium text-black text-sm">{data.label}</div>
        <div className="text-xs opacity-75 text-black">Repositório</div>
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const MindBitsNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '100px' }}>
    {/* Elipse para MindBits */}
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-full bg-white border-2 shadow-md transition-all duration-200 ${
        selected ? 'border-black shadow-lg ring-2 ring-gray-400 scale-105' : 'border-black'
      }`}
    >
      <div className="text-center">
        <div className="font-medium text-black text-sm">{data.label}</div>
        <div className="text-xs opacity-75 text-black">IA Platform</div>
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-black" />
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-black" />
  </div>
));

const initialNodes: Node[] = [];

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  elaboreNode: ElaboreNode,
  approveNode: ApproveNode,
  decisionNode: DecisionNode,
  reviseNode: ReviseNode,
  rawDocumentNode: RawDocumentNode,
  documentNode: DocumentNode,
  mondayNode: MondayNode,
  githubNode: GitHubNode,
  mindbitsNode: MindBitsNode,
};

const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Query para buscar fluxos salvos
  const { data: savedFlows } = useQuery({
    queryKey: ['/api/documents-flows'],
    enabled: true
  });

  // Mutation para salvar fluxo
  const saveFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await fetch(currentFlowId ? `/api/documents-flows/${currentFlowId}` : '/api/documents-flows', {
        method: currentFlowId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao salvar fluxo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentFlowId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/documents-flows'] });
      toast({
        title: "Sucesso",
        description: "Fluxo salvo com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar fluxo",
        variant: "destructive"
      });
    }
  });

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

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedNodeId) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, setNodes]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // Função para salvar fluxo
  const saveFlow = useCallback(() => {
    if (!reactFlowInstance) return;
    
    const flowData = reactFlowInstance.toObject();
    
    // Garantir que nodes e edges tenham UUIDs
    const processedFlowData = {
      ...flowData,
      nodes: flowData.nodes.map((node: any) => ({
        ...node,
        id: node.id || crypto.randomUUID()
      })),
      edges: flowData.edges.map((edge: any) => ({
        ...edge,
        id: edge.id || crypto.randomUUID()
      }))
    };

    saveFlowMutation.mutate({
      name: flowName,
      description: `Fluxo criado em ${new Date().toLocaleString('pt-BR')}`,
      flowData: processedFlowData
    });
  }, [reactFlowInstance, flowName, saveFlowMutation]);

  // Função para carregar fluxo
  const loadFlow = useCallback((flow: any) => {
    if (!reactFlowInstance || !flow.flowData) return;
    
    const { nodes: flowNodes, edges: flowEdges, viewport } = flow.flowData;
    
    setNodes(flowNodes || []);
    setEdges(flowEdges || []);
    setFlowName(flow.name);
    setCurrentFlowId(flow.id);
    
    if (viewport) {
      reactFlowInstance.setViewport(viewport);
    }

    toast({
      title: "Sucesso",
      description: `Fluxo "${flow.name}" carregado com sucesso!`
    });
  }, [reactFlowInstance, setNodes, setEdges]);

  // Função para criar novo fluxo
  const newFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFlowName('Novo Fluxo');
    setCurrentFlowId(null);
    
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [setNodes, setEdges, reactFlowInstance]);

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

  const handleAddNode = () => {
    if (!selectedNodeType) {
      toast({
        title: 'Selecione um tipo de nó',
        description: 'Escolha um tipo de nó na lista antes de adicionar',
        variant: 'destructive',
      });
      return;
    }

    const labelMap: Record<string, string> = {
      'startNode': 'Início',
      'elaboreNode': 'Elaborar',
      'approveNode': 'Aprovar',
      'decisionNode': 'Decisão',
      'reviseNode': 'Revisar',
      'rawDocumentNode': 'RAW-Document',
      'documentNode': 'Document',
      'mondayNode': 'Monday.com',
      'githubNode': 'GitHub',
      'mindbitsNode': 'MindBits CTx',
      'endNode': 'Fim'
    };

    const newNode = {
      id: `${selectedNodeType}-${nodes.length + 1}`,
      type: selectedNodeType,
      position: { x: 250, y: 100 + (nodes.length * 50) },
      data: { label: labelMap[selectedNodeType] || 'Novo Nó' },
    };

    setNodes((nds) => nds.concat(newNode));
    
    toast({
      title: 'Nó adicionado',
      description: `${labelMap[selectedNodeType]} foi adicionado ao fluxo`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-64">
              <Select onValueChange={setSelectedNodeType}>
                <SelectTrigger id="node-type">
                  <SelectValue placeholder="Selecione um nó" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startNode">Início</SelectItem>
                  <SelectItem value="elaboreNode">Elaborar</SelectItem>
                  <SelectItem value="approveNode">Aprovar</SelectItem>
                  <SelectItem value="decisionNode">Decisão</SelectItem>
                  <SelectItem value="reviseNode">Revisar</SelectItem>
                  <SelectItem value="rawDocumentNode">RAW-Document</SelectItem>
                  <SelectItem value="documentNode">Document</SelectItem>
                  <SelectItem value="mondayNode">Monday.com</SelectItem>
                  <SelectItem value="githubNode">GitHub</SelectItem>
                  <SelectItem value="mindbitsNode">MindBits CTx</SelectItem>
                  <SelectItem value="endNode">Fim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddNode} size="sm" disabled={!selectedNodeType}>
              <PlusCircle className="mr-1 h-4 w-4" />
              Adicionar Nó
            </Button>
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
    <div className="flex flex-col h-full overflow-hidden">
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