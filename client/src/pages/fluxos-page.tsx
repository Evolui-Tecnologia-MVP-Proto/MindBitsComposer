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
import { PlusCircle, Save, RotateCcw, BookOpen, Edit, Trash2, Undo2, Redo2, Settings, Play, GitBranch, Zap, FileText, Link, Square, Copy, AlignCenter } from 'lucide-react';
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { NodeInspector } from '@/components/fluxos/NodeInspector';
import { FlowMetadataModal } from '@/components/fluxos/FlowMetadataModal';
import { NewFlowModal } from '@/components/fluxos/NewFlowModal';
import { FlowToolbar } from '@/components/fluxos/FlowToolbar';
import { FlowDiagram } from '@/components/fluxos/FlowDiagram';
import { BibliotecaFluxos } from '@/components/fluxos/BibliotecaFluxos';
import { 
  StartNode, 
  EndNode, 
  SwitchNode, 
  ActionNode, 
  DocumentNode, 
  IntegrationNode 
} from '@/components/fluxos/nodes';

// Componentes de nós personalizados já extraídos para arquivos separados

const initialNodes: Node[] = [];

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  switchNode: SwitchNode,
  actionNode: ActionNode,
  documentNode: DocumentNode,
  integrationNode: IntegrationNode,
};

const FlowCanvas = ({ onFlowInfoChange }: { onFlowInfoChange: (info: {code: string, name: string} | null) => void }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  
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
  const [currentFlowLocked, setCurrentFlowLocked] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const [newFlowCode, setNewFlowCode] = useState('');
  const [newFlowTypeId, setNewFlowTypeId] = useState('');
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

  // Função para auto alinhar/organizar nós
  const handleAutoAlign = useCallback(() => {
    if (!reactFlowInstance) return;
    
    // Salvar estado atual no histórico antes de auto alinhar
    addToHistory(nodes, edges);
    
    // Algoritmo simples de auto alinhamento em grid
    const nodeSpacing = 200;
    const startX = 100;
    const startY = 100;
    
    // Separar nós por tipo para melhor organização
    const startNodes = nodes.filter(node => node.type === 'startNode');
    const actionNodes = nodes.filter(node => node.type === 'actionNode');
    const documentNodes = nodes.filter(node => node.type === 'documentNode');
    const switchNodes = nodes.filter(node => node.type === 'switchNode');
    const integrationNodes = nodes.filter(node => node.type === 'integrationNode');
    const endNodes = nodes.filter(node => node.type === 'endNode');
    
    let currentX = startX;
    let currentY = startY;
    
    const organizedNodes = [];
    
    // Posicionar nós de início
    startNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    currentX += nodeSpacing;
    
    // Posicionar nós de documento
    documentNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    currentX += nodeSpacing;
    
    // Posicionar nós de integração
    integrationNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    currentX += nodeSpacing;
    
    // Posicionar nós de ação
    actionNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    currentX += nodeSpacing;
    
    // Posicionar nós de switch
    switchNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    currentX += nodeSpacing;
    
    // Posicionar nós de fim
    endNodes.forEach((node, index) => {
      organizedNodes.push({
        ...node,
        position: { x: currentX, y: currentY + (index * nodeSpacing) }
      });
    });
    
    setNodes(organizedNodes);
    
    toast({
      title: 'Nós organizados',
      description: 'Os nós foram automaticamente alinhados em grid',
    });
  }, [reactFlowInstance, nodes, edges, addToHistory, setNodes]);

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
  
  // Query para buscar usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    enabled: true
  });

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

  // Query para buscar templates
  const { data: templatesData } = useQuery({
    queryKey: ['/api/templates/struct'],
    enabled: true
  });

  // Mutation para criar novo fluxo
  const createFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await fetch('/api/documents-flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar fluxo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentFlowId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/documents-flows'] });
      toast({
        title: "Sucesso",
        description: "Fluxo criado com sucesso!"
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar fluxo",
        variant: "destructive"
      });
    }
  });

  // Mutation para salvar fluxo existente
  const saveFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const response = await fetch(`/api/documents-flows/${currentFlowId}`, {
        method: 'PUT',
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
    
    // Verificar se o fluxo está bloqueado
    const isLocked = flow.isLocked === true;
    setCurrentFlowLocked(isLocked);
    
    // Se o fluxo está bloqueado, mostrar aviso e fechar inspetor
    if (isLocked) {
      setShowInspector(false); // Fechar inspetor se estiver aberto
      toast({
        title: "Fluxo Bloqueado",
        description: "Este fluxo está bloqueado para edição. Apenas visualização é permitida.",
        variant: "destructive"
      });
    }
    
    const { nodes: flowNodes, edges: flowEdges, viewport } = flow.flowData;
    
    // Atualizar nós EndNode que têm To_Flow_id mas não têm To_Flow_code/To_Flow_name
    const updatedNodes = (flowNodes || []).map((node: any) => {
      if (node.type === 'endNode' && node.data.To_Flow_id && (!node.data.To_Flow_code || !node.data.To_Flow_name)) {
        const targetFlow = savedFlows?.find((f: any) => f.id === node.data.To_Flow_id);
        if (targetFlow) {
          return {
            ...node,
            data: {
              ...node.data,
              To_Flow_code: targetFlow.code,
              To_Flow_name: targetFlow.name
            }
          };
        }
      }
      return node;
    });
    
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
    
    setNodes(updatedNodes);
    setEdges(styledEdges);
    setFlowName(flow.name);
    setCurrentFlowId(flow.id);
    
    // Notificar o componente pai sobre o fluxo carregado
    onFlowInfoChange({ code: flow.code, name: flow.name });
    
    // Reset do histórico com o novo estado
    resetHistory(flowNodes || [], styledEdges);
    
    if (viewport) {
      reactFlowInstance.setViewport(viewport);
    }

    toast({
      title: "Sucesso",
      description: `Fluxo "${flow.name}" carregado com sucesso!`
    });
  }, [reactFlowInstance, setNodes, setEdges, resetHistory, onFlowInfoChange, savedFlows]);

  // Função para criar novo fluxo
  const newFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFlowName('Novo Fluxo');
    setCurrentFlowId(null);
    
    // Limpar informações do título
    onFlowInfoChange(null);
    
    // Reset do histórico para novo fluxo
    resetHistory([], []);
    
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [setNodes, setEdges, reactFlowInstance, resetHistory, onFlowInfoChange]);

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

    if (!newFlowTypeId.trim()) {
      toast({
        title: "Erro",
        description: "Tipo de fluxo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Criar um novo fluxo e salvá-lo no banco de dados
    const newFlowData = {
      name: newFlowName,
      code: newFlowCode,
      description: newFlowDescription,
      flowTypeId: newFlowTypeId,
      flowData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      userId: currentUser?.id || 1
    };
    


    createFlowMutation.mutate(newFlowData, {
      onSuccess: (data) => {
        setNodes([]);
        setEdges([]);
        setFlowName(newFlowName);
        setCurrentFlowId(data.id);
        setIsNewFlowModalOpen(false);
        
        // Atualizar informações do título
        onFlowInfoChange({ code: newFlowCode, name: newFlowName });
        
        setNewFlowName('');
        setNewFlowDescription('');
        setNewFlowCode('');
        setNewFlowTypeId('');
        
        if (reactFlowInstance) {
          reactFlowInstance.fitView();
        }

        toast({
          title: "Sucesso",
          description: `Novo fluxo "${newFlowName}" criado e salvo!`
        });
      }
    });
  }, [newFlowName, newFlowCode, newFlowDescription, newFlowTypeId, validateCode, setNodes, setEdges, reactFlowInstance, onFlowInfoChange, saveFlowMutation]);

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

  return (
    <div className="flex flex-col h-full">
      <FlowToolbar
        currentFlowId={currentFlowId}
        savedFlows={savedFlows || []}
        onFlowSelect={(flowId) => {
          if (savedFlows) {
            const selectedFlow = savedFlows.find(flow => flow.id === flowId);
            if (selectedFlow) {
              loadFlow(selectedFlow);
            }
          }
        }}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector(!showInspector)}
        isFlowLocked={savedFlows?.find(flow => flow.id === currentFlowId)?.isLocked || false}
        isNewFlowModalOpen={isNewFlowModalOpen}
        onOpenNewFlowModal={setIsNewFlowModalOpen}
        isEditModalOpen={isEditModalOpen}
        onOpenEditModal={openEditModal}
        newFlowTypeId={newFlowTypeId}
        newFlowCode={newFlowCode}
        newFlowName={newFlowName}
        newFlowDescription={newFlowDescription}
        flowTypes={flowTypes || []}
        onFlowTypeChange={setNewFlowTypeId}
        onCodeChange={handleCodeChange}
        onNameChange={setNewFlowName}
        onDescriptionChange={setNewFlowDescription}
        onCreateFlow={createNewFlow}
        onCancelNewFlow={() => setIsNewFlowModalOpen(false)}
        editFlowCode={editFlowCode}
        editFlowName={editFlowName}
        editFlowDescription={editFlowDescription}
        onEditNameChange={setEditFlowName}
        onEditDescriptionChange={setEditFlowDescription}
        onSaveEdit={handleEditFlow}
        onCancelEdit={() => setIsEditModalOpen(false)}
        onDeleteFlow={handleDeleteFlow}
        onSaveFlow={handleSave}
        selectedNodeType={selectedNodeType}
        onNodeTypeChange={setSelectedNodeType}
        onAddNode={handleAddNode}
        historyIndex={historyIndex}
        historyLength={history.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        onAutoAlign={handleAutoAlign}
        nodeCount={nodes.length}
      />
      
      <FlowDiagram
        nodes={nodes}
        styledEdges={styledEdges}
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
        reactFlowWrapper={reactFlowWrapper}
        showInspector={showInspector}
        getSelectedNode={getSelectedNode}
        setNodes={setNodes}
        getNodeMetadata={getNodeMetadata}
        savedFlows={savedFlows || []}
        templatesData={templatesData || []}
        applyInspectorChanges={applyInspectorChanges}
        isFlowLocked={savedFlows?.find(flow => flow.id === currentFlowId)?.isLocked || false}
      />
    </div>
  );
};



export default function FluxosPage() {
  const [currentFlowInfo, setCurrentFlowInfo] = useState<{code: string, name: string} | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Área do título e descrição */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Fluxos de Documentos
          {currentFlowInfo && (
            <span className="text-xl font-normal text-blue-600 ml-2">
              - [{currentFlowInfo.code}] - {currentFlowInfo.name} (Editando)
            </span>
          )}
        </h1>
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
              <FlowCanvas onFlowInfoChange={setCurrentFlowInfo} />
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