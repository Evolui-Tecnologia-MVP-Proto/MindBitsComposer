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
import { PlusCircle, Save, RotateCcw, BookOpen, Edit, Trash2, Undo2, Redo2, Settings, Play, GitBranch, Zap, FileText, Link, Square } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Definição dos componentes de nós personalizados
const StartNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.FromType === 'Init') {
      return 'bg-[#22c55e]'; // Verde para início direto
    } else if (data.FromType) {
      return 'bg-[#3b82f6]'; // Azul para outros tipos
    }
    return 'bg-white'; // Estado padrão: fundo branco
  };

  const getTextColor = () => {
    if (data.FromType === 'Init' || data.FromType) {
      return 'text-white'; // Texto branco para fundos coloridos
    }
    return 'text-black'; // Texto preto para fundo branco
  };

  return (
  <div className={`relative px-4 py-2 rounded-full shadow-md min-w-[100px] text-center transition-all duration-200 ${
    getBackgroundColor()
  } ${
    getTextColor()
  } ${
    selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300 scale-105 border-4' : 'border-black border-2'
  }`}>
    <Play className="absolute -top-4 -left-3 h-6 w-6 text-green-600" />
    {data.showLabel !== false && (
      <div className="font-medium font-mono">{data.label}</div>
    )}
    {data.configured && data.showLabel === false && (
      <div className="text-xs font-medium font-mono">
        {data.FromType && (
          <div className={`px-2 py-1 rounded font-mono ${
            data.FromType === 'Init' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {data.FromType === 'Init' ? 'Início Direto' : 
             data.FromType === 'flow_init' ? 'Transferência de Fluxo' : data.FromType}
          </div>
        )}
        {data.integrType && <div className="font-mono">{data.integrType}</div>}
        {data.service && <div className="font-mono">{data.service}</div>}
        {data.actionType && <div className="font-mono">{data.actionType}</div>}
        {data.docType && <div className="font-mono">{data.docType}</div>}
        {!data.FromType && !data.integrType && !data.service && !data.actionType && !data.docType && <div className="font-mono">✓ Início</div>}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
  );
});

const EndNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.FromType === 'Init') {
      return 'bg-[#ef4444]'; // Vermelho para encerramento direto
    } else if (data.FromType) {
      return 'bg-[#3b82f6]'; // Azul para outros tipos
    }
    return 'bg-white'; // Estado padrão: fundo branco
  };

  const getTextColor = () => {
    if (data.FromType === 'Init' || data.FromType) {
      return 'text-white'; // Texto branco para fundos coloridos
    }
    return 'text-black'; // Texto preto para fundo branco
  };

  return (
  <div className={`relative px-4 py-2 rounded-full shadow-md min-w-[100px] text-center transition-all duration-200 ${
    getBackgroundColor()
  } ${
    getTextColor()
  } ${
    selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300 scale-105 border-4' : 'border-black border-2'
  }`}>
    <Square className="absolute -top-4 -left-5 h-6 w-6 text-red-600" />
    {data.showLabel !== false && (
      <div className="font-medium font-mono">{data.label}</div>
    )}
    {data.configured && data.showLabel === false && (
      <div className="text-xs font-medium font-mono">
        {data.FromType && (
          <div className={`px-2 py-1 rounded font-mono ${
            data.FromType === 'Init' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {data.FromType === 'Init' ? 'Encerramento Direto' : 
             data.FromType === 'flow_init' ? 'Transferência para Fluxo' : data.FromType}
          </div>
        )}
        {data.To_Flow_id && (
          <div className="mt-1 px-2 py-1 rounded bg-gray-100 text-gray-800 font-mono">
            Fluxo: {data.To_Flow_id}
          </div>
        )}
        {!data.FromType && !data.To_Flow_id && <div className="font-mono">✓ Configurado</div>}
      </div>
    )}
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
  </div>
  );
});



const SwitchNode = memo(({ data, selected }: NodeProps) => {
  // Calcular tamanho dinâmico baseado no texto
  const hasText = data.switchField && data.switchField.length > 0;
  const textLength = hasText ? data.switchField.length : 0;
  
  // Tamanho mínimo de 100px, aumenta conforme o texto
  const dynamicWidth = Math.max(100, Math.min(200, 100 + (textLength * 8)));
  const dynamicHeight = hasText && textLength > 12 ? 120 : 100; // Aumenta altura para textos longos
  
  return (
    <div className="relative" style={{ width: `${dynamicWidth}px`, height: `${dynamicHeight}px` }}>
    <GitBranch className="absolute top-1 left-1 h-6 w-6 text-blue-600 z-20" />
    <div
      className={`absolute transition-all duration-200 ${selected ? 'scale-105' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: data.configured ? '#dcfce7' : 'white', // Verde claro quando configurado
        border: selected ? '4px solid orange' : '2px solid black',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateZ(45deg)',
        boxShadow: selected ? '0 8px 12px -2px rgba(255, 165, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        filter: selected ? 'drop-shadow(0 0 8px rgba(255, 165, 0, 0.4))' : 'none'
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
      {data.showLabel !== false && (
        <div className="font-medium font-mono text-black text-sm">{data.label}</div>
      )}
      {data.configured && data.showLabel === false && data.switchField && (
        <div className="text-xs text-green-800 font-medium font-mono text-center">
          <div>{data.switchField}</div>
        </div>
      )}
    </div>
    
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-4 h-4 bg-white border-2 border-blue-500" 
      style={{ top: '2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Right} 
      className="w-4 h-4 bg-white border-4 border-red-500" 
      id="a"
      style={{ top: '50%', right: '-33px', transform: 'translateY(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Left} 
      className="w-4 h-4 bg-white border-4 border-green-500" 
      id="c"
      style={{ top: '50%', left: '-33px', transform: 'translateY(-50%)' }}
    />
  </div>
  );
});

const ActionNode = memo(({ data, selected }: NodeProps) => (
  <div className={`relative px-4 py-2 rounded-lg shadow-md min-w-[120px] text-center transition-all duration-200 ${
    data.configured ? 'bg-green-200 text-green-800' : 'bg-white text-black'
  } ${
    selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300 scale-105 border-4' : 'border-black border-2'
  }`}>
    <Zap className="absolute top-1 left-0 h-6 w-6 text-yellow-600" />
    {data.showLabel !== false && (
      <div className="font-medium font-mono">{data.label}</div>
    )}
    {data.configured && data.showLabel === false && (
      <div className="text-xs font-medium font-mono">
        {data.actionType && <div className="font-mono">{data.actionType}</div>}
        {!data.actionType && <div className="font-mono">✓ Ação</div>}
      </div>
    )}
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
));



const DocumentNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '80px' }}>
    {/* SVG para contorno do documento com base ondulada */}
    <svg 
      className="absolute inset-0 pointer-events-none"
      width="140" 
      height="80" 
      viewBox="0 0 140 80"
    >
      <polygon
        points="0,0 140,0 140,64 112,80 28,64 0,64"
        fill={data.configured ? "#dcfce7" : "white"}
        stroke={selected ? "orange" : "black"}
        strokeWidth={selected ? "4" : "2"}
        style={{
          filter: selected ? 'drop-shadow(0 4px 8px rgba(255, 165, 0, 0.4))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
    </svg>
    {/* Ícone no canto superior esquerdo */}
    <FileText className="absolute top-1 left-1 h-6 w-6 text-purple-600 z-10" />
    {/* Conteúdo do nó */}
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        pointerEvents: 'none'
      }}
    >
      <div className="text-center pt-2">
        {data.showLabel !== false && (
          <div className={`font-medium font-mono text-sm ${data.configured ? 'text-green-800' : 'text-black'}`}>{data.label}</div>
        )}
        {data.configured && data.showLabel === false && (
          <div className="text-xs text-green-800 font-medium font-mono">
            {data.docType && <div className="font-mono">{data.docType}</div>}
            {!data.docType && <div className="font-mono">✓ Documento</div>}
          </div>
        )}
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
));

const IntegrationNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '80px' }}>
    {/* SVG para contorno do paralelogramo */}
    <svg 
      className="absolute inset-0 pointer-events-none"
      width="140" 
      height="80" 
      viewBox="0 0 140 80"
    >
      <polygon
        points="28,0 140,0 112,80 0,80"
        fill={data.configured ? "#dcfce7" : "white"}
        stroke={selected ? "orange" : "black"}
        strokeWidth={selected ? "4" : "2"}
        style={{
          filter: selected ? 'drop-shadow(0 4px 8px rgba(255, 165, 0, 0.4))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
    </svg>
    {/* Ícone no canto superior esquerdo */}
    <Link className="absolute top-1 right-3 h-6 w-6 text-orange-600 z-10" />
    {/* Conteúdo do nó */}
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
        pointerEvents: 'none'
      }}
    >
      <div className="text-center">
        {data.showLabel !== false && (
          <div className={`font-medium font-mono text-sm ${data.configured ? 'text-green-800' : 'text-black'}`}>{data.label}</div>
        )}
        {data.configured && data.showLabel === false && (
          <div className="text-xs text-green-800 font-medium font-mono">
            {data.integrType && <div className="font-mono">{data.integrType}</div>}
            {data.service && <div className="font-mono">{data.service}</div>}
            {!data.integrType && !data.service && <div className="font-mono">✓ Integração</div>}
          </div>
        )}
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
));

const initialNodes: Node[] = [];

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  switchNode: SwitchNode,
  actionNode: ActionNode,
  documentNode: DocumentNode,
  integrationNode: IntegrationNode,
};

const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  
  // Aplicar estilo de seleção às edges
  const styledEdges = edges.map((edge: Edge) => {
    // Detectar se a conexão parte de um SwitchNode e de qual conector
    const sourceNode = nodes.find(node => node.id === edge.source);
    let edgeColor = '#6b7280'; // Cor padrão (cinza)
    
    if (sourceNode?.type === 'switchNode') {
      // Verificar qual handle está sendo usado baseado no sourceHandle
      if (edge.sourceHandle === 'a') {
        edgeColor = '#dc2626'; // Vermelho para conector direito (id="a")
      } else if (edge.sourceHandle === 'c') {
        edgeColor = '#16a34a'; // Verde para conector esquerdo (id="c")
      }
    }
    
    // Se a edge está selecionada, usar laranja
    if (edge.id === selectedEdgeId) {
      edgeColor = '#f97316';
    }
    
    return {
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: edgeColor,
        strokeWidth: edge.id === selectedEdgeId ? 4 : 3,
        strokeDasharray: 'none'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColor,
      },
      animated: false,
      updatable: true,
      focusable: true,
      interactionWidth: 20
    };
  });
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const [newFlowCode, setNewFlowCode] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFlowName, setEditFlowName] = useState('');
  const [editFlowDescription, setEditFlowDescription] = useState('');
  const [editFlowCode, setEditFlowCode] = useState('');
  
  // Estados para desfazer/refazer
  const [history, setHistory] = useState<Array<{ nodes: any[], edges: any[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const queryClient = useQueryClient();
  
  // Função para adicionar estado ao histórico
  const addToHistory = useCallback((currentNodes: any[], currentEdges: any[]) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push({ nodes: [...currentNodes], edges: [...currentEdges] });
      // Limita o histórico a 50 estados para não consumir muita memória
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prevIndex => Math.min(prevIndex + 1, 49));
  }, [historyIndex]);

  // Inicializa o histórico quando o editor é carregado
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ nodes: [...nodes], edges: [...edges] }]);
      setHistoryIndex(0);
    }
  }, []);

  // Reset do histórico quando um novo fluxo é carregado
  const resetHistory = useCallback((newNodes: any[], newEdges: any[]) => {
    setHistory([{ nodes: [...newNodes], edges: [...newEdges] }]);
    setHistoryIndex(0);
  }, []);

  // Função para desfazer
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
      
      toast({
        title: 'Ação desfeita',
        description: 'Estado anterior restaurado',
      });
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Função para refazer
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      
      toast({
        title: 'Ação refeita',
        description: 'Estado posterior restaurado',
      });
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Handlers personalizados para capturar mudanças
  const handleNodesChange = useCallback((changes: any[]) => {
    // Verifica se é uma mudança significativa (não apenas posição)
    const hasSignificantChange = changes.some(change => 
      change.type === 'remove' || change.type === 'add' || change.type === 'reset'
    );
    
    if (hasSignificantChange) {
      addToHistory(nodes, edges);
    }
    
    onNodesChange(changes);
  }, [nodes, edges, onNodesChange, addToHistory]);

  const handleEdgesChange = useCallback((changes: any[]) => {
    // Verifica se é uma mudança significativa
    const hasSignificantChange = changes.some(change => 
      change.type === 'remove' || change.type === 'add' || change.type === 'reset'
    );
    
    if (hasSignificantChange) {
      addToHistory(nodes, edges);
    }
    
    onEdgesChange(changes);
  }, [nodes, edges, onEdgesChange, addToHistory]);

  // Event listener para atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);
  
  // Query para buscar fluxos salvos
  const { data: savedFlows } = useQuery({
    queryKey: ['/api/documents-flows'],
    enabled: true
  });

  // Query para buscar tipos de fluxo
  const { data: flowTypes } = useQuery({
    queryKey: ['/api/flow-types'],
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

  // Mutation para editar metadados do fluxo
  const editFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await fetch(`/api/documents-flows/${currentFlowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao editar fluxo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents-flows'] });
      setIsEditModalOpen(false);
      toast({
        title: "Sucesso",
        description: "Metadados do fluxo atualizados com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao editar fluxo",
        variant: "destructive"
      });
    }
  });

  // Mutation para excluir fluxo
  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await fetch(`/api/documents-flows/${flowId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir fluxo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents-flows'] });
      setCurrentFlowId(null);
      setNodes([]);
      setEdges([]);
      toast({
        title: "Sucesso",
        description: "Fluxo excluído com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir fluxo",
        variant: "destructive"
      });
    }
  });

  const onConnect = useCallback((params: any) => {
    // Salvar estado atual no histórico antes de adicionar nova conexão
    addToHistory(nodes, edges);
    
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#6b7280',
            strokeWidth: 3,
            strokeDasharray: 'none'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
          },
        },
        eds
      )
    );
  }, [setEdges, nodes, edges, addToHistory]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null); // Desseleciona edge quando nó é selecionado
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null); // Desseleciona nó quando edge é selecionado
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: any) => {
    // Salvar estado atual no histórico antes de atualizar edge
    addToHistory(nodes, edges);
    setEdges((eds) => eds.map((edge) => (edge.id === oldEdge.id ? { ...edge, ...newConnection } : edge)));
  }, [setEdges, nodes, edges, addToHistory]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete') {
      if (selectedNodeId) {
        // Salvar estado atual no histórico antes de remover nó
        addToHistory(nodes, edges);
        setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
        setSelectedNodeId(null);
      } else if (selectedEdgeId) {
        // Salvar estado atual no histórico antes de remover edge
        addToHistory(nodes, edges);
        setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
        setSelectedEdgeId(null);
      }
    }
  }, [selectedNodeId, selectedEdgeId, setNodes, setEdges, nodes, edges, addToHistory]);

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
      code: newFlowCode || `FLX-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
      description: `Fluxo criado em ${new Date().toLocaleString('pt-BR')}`,
      flowData: processedFlowData
    });
  }, [reactFlowInstance, flowName, saveFlowMutation]);

  // Função para carregar fluxo
  const loadFlow = useCallback((flow: any) => {
    if (!reactFlowInstance || !flow.flowData) return;
    
    const { nodes: flowNodes, edges: flowEdges, viewport } = flow.flowData;
    
    // Aplicar estilo sólido cinza às edges carregadas
    const styledEdges = (flowEdges || []).map((edge: any) => ({
      ...edge,
      style: {
        stroke: '#6b7280',
        strokeWidth: 3,
        strokeDasharray: 'none'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7280',
      },
      animated: false
    }));
    
    setNodes(flowNodes || []);
    setEdges(styledEdges);
    setFlowName(flow.name);
    setCurrentFlowId(flow.id);
    
    // Reset do histórico com o novo estado
    resetHistory(flowNodes || [], styledEdges);
    
    if (viewport) {
      reactFlowInstance.setViewport(viewport);
    }

    toast({
      title: "Sucesso",
      description: `Fluxo "${flow.name}" carregado com sucesso!`
    });
  }, [reactFlowInstance, setNodes, setEdges, resetHistory]);

  // Função para criar novo fluxo
  const newFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFlowName('Novo Fluxo');
    setCurrentFlowId(null);
    
    // Reset do histórico para novo fluxo
    resetHistory([], []);
    
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [setNodes, setEdges, reactFlowInstance, resetHistory]);

  // Função para aplicar máscara no código XXX-99
  const applyCodeMask = useCallback((value: string) => {
    // Remove tudo que não é letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length <= 3) {
      // Apenas letras para os primeiros 3 caracteres
      return cleaned.replace(/[^A-Z]/g, '');
    } else {
      // Primeiros 3 caracteres como letras + hífen + até 2 números
      const letters = cleaned.slice(0, 3).replace(/[^A-Z]/g, '');
      const numbers = cleaned.slice(3, 5).replace(/[^0-9]/g, '');
      return letters + (numbers ? '-' + numbers : '');
    }
  }, []);

  // Função para validar código XXX-99
  const validateCode = useCallback((code: string) => {
    const codeRegex = /^[A-Z]{3}-[0-9]{2}$/;
    return codeRegex.test(code);
  }, []);

  // Função para obter o nó selecionado
  const getSelectedNode = useCallback(() => {
    if (!selectedNodeId) return null;
    return nodes.find(node => node.id === selectedNodeId);
  }, [selectedNodeId, nodes]);

  // Função para obter metadados do tipo de nó atual
  const getNodeMetadata = useCallback((nodeType: string) => {
    console.log('getNodeMetadata chamada:', { nodeType, flowTypes, currentFlowId, savedFlows });
    
    if (!flowTypes || !currentFlowId || !savedFlows) {
      console.log('Dados faltando:', { flowTypes: !!flowTypes, currentFlowId: !!currentFlowId, savedFlows: !!savedFlows });
      return null;
    }
    
    const currentFlow = savedFlows.find((flow: any) => flow.id === currentFlowId);
    console.log('currentFlow encontrado:', currentFlow);
    
    if (!currentFlow?.flowTypeId && !currentFlow?.flow_type_id) {
      console.log('flow_type_id não encontrado:', { flowTypeId: currentFlow?.flowTypeId, flow_type_id: currentFlow?.flow_type_id });
      return null;
    }
    
    const flowTypeId = currentFlow?.flowTypeId || currentFlow?.flow_type_id;
    
    const flowType = flowTypes.find((type: any) => type.id === flowTypeId);
    console.log('flowType encontrado:', flowType);
    
    const nodeMetadataObj = flowType?.nodeMetadata || flowType?.node_metadata;
    if (!nodeMetadataObj?.nodeTypes) {
      console.log('nodeMetadata ou nodeTypes não encontrado:', { nodeMetadata: flowType?.nodeMetadata, node_metadata: flowType?.node_metadata });
      return null;
    }
    
    const nodeMetadata = nodeMetadataObj.nodeTypes[nodeType];
    console.log('nodeMetadata para', nodeType, ':', nodeMetadata);
    
    return nodeMetadata;
  }, [flowTypes, currentFlowId, savedFlows]);

  // Função para abrir modal de edição
  const openEditModal = useCallback(() => {
    if (!currentFlowId || !savedFlows) return;
    
    const currentFlow = savedFlows.find((flow: any) => flow.id === currentFlowId);
    if (currentFlow) {
      setEditFlowName(currentFlow.name);
      setEditFlowCode(currentFlow.code);
      setEditFlowDescription(currentFlow.description || '');
      setIsEditModalOpen(true);
    }
  }, [currentFlowId, savedFlows]);

  // Função para editar metadados do fluxo
  const handleEditFlow = useCallback(() => {
    if (!editFlowName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do fluxo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Preservar os dados do fluxo atual
    const currentFlow = savedFlows?.find((flow: any) => flow.id === currentFlowId);
    
    editFlowMutation.mutate({
      name: editFlowName,
      code: editFlowCode, // Mantém o código original
      description: editFlowDescription,
      flowData: currentFlow?.flowData || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    });
  }, [editFlowName, editFlowCode, editFlowDescription, editFlowMutation, savedFlows, currentFlowId]);

  // Função para excluir fluxo
  const handleDeleteFlow = useCallback(() => {
    if (!currentFlowId) {
      toast({
        title: "Erro",
        description: "Nenhum fluxo selecionado para excluir",
        variant: "destructive"
      });
      return;
    }

    const currentFlow = savedFlows?.find((flow: any) => flow.id === currentFlowId);
    
    toast({
      title: "Confirmar Exclusão",
      description: `Tem certeza que deseja excluir o fluxo "${currentFlow?.code} - ${currentFlow?.name}"? Esta ação não pode ser desfeita.`,
      variant: "destructive",
      action: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => deleteFlowMutation.mutate(currentFlowId)}
        >
          Confirmar
        </Button>
      )
    });
  }, [currentFlowId, deleteFlowMutation, savedFlows]);

  // Função para tratar mudança no campo code
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyCodeMask(e.target.value);
    setNewFlowCode(maskedValue);
  }, [applyCodeMask]);

  // Função para criar novo fluxo com nome personalizado
  const createNewFlow = useCallback(() => {
    if (!newFlowName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do fluxo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!newFlowCode.trim()) {
      toast({
        title: "Erro",
        description: "Código do fluxo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!validateCode(newFlowCode)) {
      toast({
        title: "Erro",
        description: "Código deve ter o formato XXX-99 (3 letras maiúsculas + hífen + 2 números)",
        variant: "destructive"
      });
      return;
    }

    // Criar um novo fluxo e salvá-lo no banco de dados
    const newFlowData = {
      name: newFlowName,
      code: newFlowCode,
      description: newFlowDescription,
      flowData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      userId: 1 // Placeholder - deveria vir do contexto de autenticação
    };
    


    saveFlowMutation.mutate(newFlowData, {
      onSuccess: (data) => {
        setNodes([]);
        setEdges([]);
        setFlowName(newFlowName);
        setCurrentFlowId(data.id);
        setIsNewFlowModalOpen(false);
        setNewFlowName('');
        setNewFlowDescription('');
        setNewFlowCode('');
        
        if (reactFlowInstance) {
          reactFlowInstance.fitView();
        }

        toast({
          title: "Sucesso",
          description: `Novo fluxo "${newFlowName}" criado e salvo!`
        });
      }
    });
  }, [newFlowName, newFlowCode, newFlowDescription, validateCode, setNodes, setEdges, reactFlowInstance]);

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
    if (nodes.length === 0) {
      toast({
        title: 'Fluxo vazio',
        description: 'Adicione pelo menos um nó para salvar o fluxo',
        variant: 'destructive',
      });
      return;
    }

    if (!currentFlowId) {
      toast({
        title: 'Nenhum fluxo selecionado',
        description: 'Crie um novo fluxo ou selecione um existente para salvar',
        variant: 'destructive',
      });
      return;
    }

    if (!reactFlowInstance) {
      toast({
        title: 'Erro',
        description: 'Editor não inicializado corretamente',
        variant: 'destructive',
      });
      return;
    }

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

    // Buscar dados do fluxo atual para preservar nome e código
    const currentFlow = savedFlows?.find(flow => flow.id === currentFlowId);
    
    saveFlowMutation.mutate({
      name: currentFlow?.name || flowName,
      code: currentFlow?.code || `FLX-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
      description: currentFlow?.description || `Fluxo atualizado em ${new Date().toLocaleString('pt-BR')}`,
      flowData: processedFlowData
    });
  };

  const handleReset = () => {
    toast({
      title: "ATENÇÃO",
      description: "Esta ação apagará todos os elementos do diagrama e reiniciará em um canvas vazio. Caso salve estas alterações, estas não poderão ser desfeitas. Confirma?",
      variant: "destructive",
      action: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // Salva estado atual no histórico antes de limpar
            addToHistory(nodes, edges);
            
            // Apenas limpa o canvas, mantém a seleção do fluxo atual
            setNodes([]);
            setEdges([]);
            
            // Centraliza a visualização
            if (reactFlowInstance) {
              reactFlowInstance.fitView();
            }
            
            toast({
              title: 'Canvas limpo',
              description: 'Todos os elementos foram removidos. Use o botão SALVAR para persistir as alterações.',
            });
          }}
        >
          Confirmar
        </Button>
      )
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
      'startNode': 'Start',
      'switchNode': 'Switch',
      'actionNode': 'Action',
      'documentNode': 'Document',
      'integrationNode': 'Integration',
      'endNode': 'Finish'
    };

    const newNode = {
      id: `${selectedNodeType}-${nodes.length + 1}`,
      type: selectedNodeType,
      position: { x: 250, y: 100 + (nodes.length * 50) },
      data: { label: labelMap[selectedNodeType] || 'Novo Nó' },
    };

    setNodes((nds) => {
      const newNodes = nds.concat(newNode);
      // Adiciona ao histórico após adicionar o nó
      addToHistory(nodes, edges);
      return newNodes;
    });
    
    toast({
      title: 'Nó adicionado',
      description: `${labelMap[selectedNodeType]} foi adicionado ao fluxo`,
    });
  };

  // Função para aplicar as alterações do inspector
  const applyInspectorChanges = useCallback(() => {
    const selectedNode = getSelectedNode();
    if (!selectedNode) return;

    setNodes(nds => nds.map(node => 
      node.id === selectedNode.id 
        ? { 
            ...node, 
            data: { 
              ...node.data, 
              configured: true,
              showLabel: false
            }
          }
        : node
    ));

    toast({
      title: 'Propriedades aplicadas',
      description: 'As configurações do nó foram aplicadas com sucesso',
    });
  }, [getSelectedNode, setNodes]);

  // Função para renderizar o inspector de propriedades
  const renderInspector = () => {
    if (!showInspector) return null;
    
    const selectedNode = getSelectedNode();
    
    if (!selectedNode) {
      return (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-lg font-semibold">Inspector de Propriedades</h3>
              <p className="text-sm text-gray-600">
                Selecione um nó para configurar suas propriedades
              </p>
            </div>
          </div>
        </div>
      );
    }

    const nodeMetadata = getNodeMetadata(selectedNode.type);
    
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold">Inspector de Propriedades</h3>
            <p className="text-sm text-gray-600 font-mono">
              {nodeMetadata?.label || selectedNode.type} - {selectedNode.id}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Rótulo do Nó</Label>
              <Input 
                value={selectedNode.data.label || nodeMetadata?.label || ''}
                readOnly
                className="mt-1 bg-gray-50 font-mono"
                placeholder={nodeMetadata?.label || 'Rótulo do nó'}
              />
            </div>

            {nodeMetadata?.metadata && Object.entries(nodeMetadata.metadata).map(([key, value]) => {
              console.log('Processando campo:', key, 'valor:', value, 'tipo:', typeof value);
              
              // Verificar se é uma string vazia - criar campo de input
              if (typeof value === 'string' && value === '') {
                return (
                  <div key={key}>
                    <Label className="text-sm font-medium capitalize font-mono">
                      {key === 'switchField' ? 'Campo de Decisão' : key}
                    </Label>
                    <Input 
                      value={selectedNode.data[key] || ''} 
                      onChange={(e) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: e.target.value } }
                            : node
                        ));
                      }}
                      className="mt-1 font-mono"
                      placeholder={`Digite o valor para ${key === 'switchField' ? 'campo de decisão' : key}`}
                    />
                  </div>
                );
              }
              
              // Verificar se é um campo de referência com marcadores {{ }}
              if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
                console.log('Campo com marcadores detectado:', key, value);
                
                // Para campos que referenciam documents_flows
                if (value.includes('documents_flows')) {
                  return (
                    <div key={key}>
                      <Label className="text-sm font-medium capitalize">
                        {key === 'To_Flow_id' ? 'Fluxo de Destino' : key}
                      </Label>
                      <Select 
                        value={selectedNode.data[key] || ''} 
                        onValueChange={(newValue) => {
                          setNodes(nds => nds.map(node => 
                            node.id === selectedNode.id 
                              ? { 
                                  ...node, 
                                  data: { 
                                    ...node.data, 
                                    [key]: newValue,
                                    // Se for EndNode e FromType = 'Init' (Encerramento Direto), limpar To_Flow_id
                                    ...(selectedNode.type === 'endNode' && key === 'FromType' && newValue === 'Init' 
                                      ? { To_Flow_id: '' } 
                                      : {})
                                  }
                                }
                              : node
                          ));
                        }}
                      >
                        <SelectTrigger className="mt-1 text-left font-mono">
                          <SelectValue placeholder="Selecione o fluxo de destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedFlows && savedFlows.map((flow: any) => (
                            <SelectItem key={flow.id} value={flow.id}>
                              {flow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
              }
              
              // Verificar se é um objeto com opções (como FromType)
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const options = Object.entries(value);
                if (options.length > 0) {
                  return (
                    <div key={key}>
                      <Label className="text-sm font-medium capitalize">
                        {key === 'FromType' ? 'Tipo de Início' : key}
                      </Label>
                      <Select 
                        value={selectedNode.data[key] || ''} 
                        onValueChange={(newValue) => {
                          setNodes(nds => nds.map(node => 
                            node.id === selectedNode.id 
                              ? { 
                                  ...node, 
                                  data: { 
                                    ...node.data, 
                                    [key]: newValue, 
                                    configured: true, 
                                    showLabel: false,
                                    // Se for EndNode e FromType = 'Init' (Encerramento Direto), limpar To_Flow_id
                                    ...(selectedNode.type === 'endNode' && key === 'FromType' && newValue === 'Init' 
                                      ? { To_Flow_id: '' } 
                                      : {})
                                  }
                                }
                              : node
                          ));
                        }}
                      >
                        <SelectTrigger className="mt-1 text-left font-mono">
                          <SelectValue placeholder={`Selecione ${key === 'FromType' ? 'tipo de início' : key}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map(([optionKey, optionValue]) => (
                            <SelectItem 
                              key={optionKey} 
                              value={optionKey}
                              className={key === 'FromType' && optionKey === 'Init' ? 
                                'bg-green-50 text-green-800 hover:bg-green-100' : 
                                key === 'FromType' ? 'bg-blue-50 text-blue-800 hover:bg-blue-100' : ''
                              }
                            >
                              {String(optionValue)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
              }
              
              if (Array.isArray(value)) {
                // Renderizar como Select para arrays simples
                return (
                  <div key={key}>
                    <Label className="text-sm font-medium capitalize">
                      {key === 'integrType' ? 'Tipo de Integração' : 
                       key === 'service' ? 'Serviço' :
                       key === 'actionType' ? 'Tipo de Ação' :
                       key === 'docType' ? 'Tipo de Documento' : key}
                    </Label>
                    <Select 
                      value={selectedNode.data[key] || ''} 
                      onValueChange={(newValue) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: newValue } }
                            : node
                        ));
                      }}
                    >
                      <SelectTrigger className="mt-1 text-left font-mono">
                        <SelectValue placeholder={`Selecione ${key === 'integrType' ? 'tipo de integração' : 
                                                                key === 'service' ? 'serviço' :
                                                                key === 'actionType' ? 'tipo de ação' :
                                                                key === 'docType' ? 'tipo de documento' : key}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {value.map((option: any, index: number) => {
                          if (typeof option === 'string') {
                            return (
                              <SelectItem key={index} value={option}>
                                {option}
                              </SelectItem>
                            );
                          } else if (option.type && option.name) {
                            // Para docType que tem estrutura {type, name, template}
                            return (
                              <SelectItem key={index} value={option.type}>
                                {option.name} ({option.type})
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                );
              } else if (typeof value === 'object' && value !== null) {
                // Renderizar como Select para objetos (chave-valor)
                return (
                  <div key={key}>
                    <Label className="text-sm font-medium capitalize">
                      {key === 'actionType' ? 'Tipo de Ação' : key}
                    </Label>
                    <Select 
                      value={selectedNode.data[key] || ''} 
                      onValueChange={(newValue) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: newValue } }
                            : node
                        ));
                      }}
                    >
                      <SelectTrigger className="mt-1 text-left font-mono">
                        <SelectValue placeholder={`Selecione ${key === 'actionType' ? 'tipo de ação' : key}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(value as Record<string, any>).map(([optKey, optValue]) => (
                          <SelectItem key={optKey} value={optKey}>
                            {String(optValue)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              return null;
            })}

            {/* Informações adicionais quando uma propriedade é selecionada */}
            {selectedNode.data.docType && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-600 font-medium">Tipo de Documento Selecionado</p>
                <p className="text-sm text-blue-800 font-mono">{selectedNode.data.docType}</p>
              </div>
            )}

            {selectedNode.data.service && (
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-xs text-green-600 font-medium">Serviço Selecionado</p>
                <p className="text-sm text-green-800 font-mono">{selectedNode.data.service}</p>
              </div>
            )}

            {selectedNode.data.actionType && (
              <div className="p-3 bg-purple-50 rounded-md">
                <p className="text-xs text-purple-600 font-medium">Tipo de Ação Selecionado</p>
                <p className="text-sm text-purple-800 font-mono">{selectedNode.data.actionType}</p>
              </div>
            )}

            {/* Botão para aplicar alterações */}
            <div className="pt-4 border-t">
              <Button 
                onClick={applyInspectorChanges}
                className="w-full"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Aplicar Alterações
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm space-y-3">
        {/* Primeira linha - Seleção de fluxo e botões principais */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <Select value={currentFlowId || ""} onValueChange={(value) => {
                if (value && savedFlows) {
                  const selectedFlow = savedFlows.find(flow => flow.id === value);
                  if (selectedFlow) {
                    loadFlow(selectedFlow);
                  }
                }
              }}>
                <SelectTrigger id="flow-select" className="text-left font-mono">
                  <SelectValue placeholder="Carregar fluxo existente" />
                </SelectTrigger>
                <SelectContent>
                  {savedFlows?.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id} className="font-mono">
                      {flow.code} - {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant={showInspector ? "default" : "outline"}
              size="sm"
              onClick={() => setShowInspector(!showInspector)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Exibir Inspector
            </Button>
            
            <Dialog open={isNewFlowModalOpen} onOpenChange={setIsNewFlowModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-1 h-4 w-4" />
                  + Novo Fluxo
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Fluxo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código do Fluxo</Label>
                  <Input
                    id="code"
                    value={newFlowCode}
                    onChange={handleCodeChange}
                    placeholder="XXX-99"
                    className="w-full"
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-500">
                    Formato: 3 letras maiúsculas + hífen + 2 números (ex: ABC-12)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Fluxo</Label>
                  <Input
                    id="name"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="Digite o nome do fluxo"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={newFlowDescription}
                    onChange={(e) => setNewFlowDescription(e.target.value)}
                    placeholder="Descreva o propósito deste fluxo"
                    rows={4}
                    className="w-full resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsNewFlowModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={createNewFlow}>
                  Criar Fluxo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Modal para editar metadados do fluxo */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  Editar Metadados do Fluxo - [{editFlowCode}]
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Fluxo</Label>
                  <Input
                    id="edit-name"
                    value={editFlowName}
                    onChange={(e) => setEditFlowName(e.target.value)}
                    placeholder="Digite o nome do fluxo"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição (opcional)</Label>
                  <Textarea
                    id="edit-description"
                    value={editFlowDescription}
                    onChange={(e) => setEditFlowDescription(e.target.value)}
                    placeholder="Descreva o propósito deste fluxo"
                    rows={4}
                    className="w-full resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleEditFlow}>
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
            <Button 
              onClick={openEditModal} 
              variant="outline" 
              size="sm"
              disabled={!currentFlowId}
            >
              <Edit className="mr-1 h-4 w-4" />
              Editar Metadados
            </Button>
            <Button 
              onClick={handleDeleteFlow} 
              variant="destructive" 
              size="sm"
              disabled={!currentFlowId}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Excluir
            </Button>
            <Button onClick={handleSave} size="sm">
              <Save className="mr-1 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
        
        {/* Segunda linha - Seleção de nós e controles de histórico */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-64">
                <Select onValueChange={setSelectedNodeType}>
                  <SelectTrigger id="node-type">
                    <SelectValue placeholder="Selecione um nó" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startNode">
                      <div className="flex items-center space-x-2">
                        <Play className="h-4 w-4 text-green-600" />
                        <span>Start</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="switchNode">
                      <div className="flex items-center space-x-2">
                        <GitBranch className="h-4 w-4 text-blue-600" />
                        <span>Switch</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="actionNode">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span>Action</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="documentNode">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span>Document</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="integrationNode">
                      <div className="flex items-center space-x-2">
                        <Link className="h-4 w-4 text-orange-600" />
                        <span>Integration</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="endNode">
                      <div className="flex items-center space-x-2">
                        <Square className="h-4 w-4 text-red-600" />
                        <span>Finish</span>
                      </div>
                    </SelectItem>
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
            <Button 
              onClick={handleUndo} 
              variant="outline" 
              size="sm"
              disabled={historyIndex <= 0}
              title="Desfazer última ação"
            >
              <Undo2 className="mr-1 h-4 w-4" />
              Desfazer
            </Button>
            <Button 
              onClick={handleRedo} 
              variant="outline" 
              size="sm"
              disabled={historyIndex >= history.length - 1}
              title="Refazer última ação"
            >
              <Redo2 className="mr-1 h-4 w-4" />
              Refazer
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="mr-1 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-md">
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              updatable: true,
            }}
            edgesUpdatable={true}
            edgesFocusable={true}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Controls />
            <Background color="#f0f0f0" gap={12} size={1} />
          </ReactFlow>
        </div>
        {renderInspector()}
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