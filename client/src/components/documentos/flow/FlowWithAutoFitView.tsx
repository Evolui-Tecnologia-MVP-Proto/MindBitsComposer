import { useState, useEffect, useMemo } from "react";
import ReactFlow, { useReactFlow, Controls, Background } from "reactflow";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CircleCheck, X, Pin } from "lucide-react";
import {
  StartNodeComponent,
  EndNodeComponent,
  ActionNodeComponent,
  DocumentNodeComponent,
  IntegrationNodeComponent,
  SwitchNodeComponent
} from "@/components/documentos/flow/FlowNodes";
import "reactflow/dist/style.css";

interface FlowWithAutoFitViewProps {
  flowData: any;
  showFlowInspector: boolean;
  setShowFlowInspector: (show: boolean) => void;
  setSelectedFlowNode: (node: any) => void;
  selectedFlowNode: any;
  showApprovalAlert: boolean;
  setShowApprovalAlert: (show: boolean) => void;
  isPinned: boolean;
  setIsFlowInspectorPinned: (pinned: boolean) => void;
  flowDiagramModal: any;
  setFlowDiagramModal: (modal: any) => void;
  getTemplateInfo: (templates: any[], templateId: string) => any;
  saveChangesToDatabase: () => Promise<void>;
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
}

export function FlowWithAutoFitView({ 
  flowData, 
  showFlowInspector, 
  setShowFlowInspector, 
  setSelectedFlowNode, 
  selectedFlowNode, 
  showApprovalAlert, 
  setShowApprovalAlert, 
  isPinned,
  setIsFlowInspectorPinned,
  flowDiagramModal,
  setFlowDiagramModal,
  getTemplateInfo,
  saveChangesToDatabase: saveChangesToDatabaseProp,
  nodes,
  edges,
  setNodes
}: FlowWithAutoFitViewProps) {
  const { fitView, getNodes, setNodes: setReactFlowNodes } = useReactFlow();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estado para controlar os valores dos campos do formulário
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Estado para controlar resultado da execução de integração
  const [integrationResult, setIntegrationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  
  // Carregar dados salvos quando um nó é selecionado
  useEffect(() => {
    if (selectedFlowNode && selectedFlowNode.data.formData) {
      console.log('🔄 Carregando dados salvos do formulário:', selectedFlowNode.data.formData);
      setFormValues(selectedFlowNode.data.formData);
    } else {
      // Limpar formulário se não há dados salvos
      setFormValues({});
    }
    
    // Limpar resultado da integração ao mudar de nó
    setIntegrationResult({ status: null, message: '' });
  }, [selectedFlowNode?.id, selectedFlowNode?.data.formData]);
  
  // Função helper para extrair dados do formulário
  const getFormFields = () => {
    try {
      if (!selectedFlowNode) {
        console.log('🔍 getFormFields: Nenhum nó selecionado');
        return {};
      }
      
      const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
      console.log('🔍 getFormFields: dados brutos', {
        nodeId: selectedFlowNode.id,
        attachedFormData,
        hasForm: !!attachedFormData
      });
      
      if (!attachedFormData) return {};
      
      // Corrigir o formato JSON malformado específico
      let correctedData = attachedFormData;
      
      // Verificar se precisa de correção de formato
      if (attachedFormData.includes('["') && attachedFormData.includes('": [')) {
        // Primeiro, substituir a estrutura Fields
        correctedData = attachedFormData.replace(
          /"Fields":\s*\[/g, 
          '"Fields":{'
        );
        
        // Corrigir os campos individuais
        correctedData = correctedData
          .replace(/\"([^"]+)\"\:\s*\[/g, '"$1":[')
          .replace(/\]\s*,\s*\"([^"]+)\"\:\s*\[/g, '],"$1":[')
          .replace(/\]\s*\]/g, ']}');
        
        console.log('🔍 getFormFields: dados corrigidos', correctedData);
      }
      
      const parsedData = JSON.parse(correctedData);
      const fields = parsedData.Fields || {};
      console.log('🔍 getFormFields: campos extraídos', fields);
      return fields;
    } catch (e) {
      console.log('🔍 getFormFields: erro', e);
      return {};
    }
  };

  // Função para verificar se todos os campos obrigatórios estão preenchidos
  const areAllFieldsFilled = () => {
    // Só valida se há um nó selecionado e é um actionNode
    if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
      return true;
    }

    // Só valida se o nó está pendente de execução
    if (!selectedFlowNode.data.isPendingConnected) {
      return true;
    }

    // Verifica se existe formulário anexado
    const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
    if (!attachedFormData) {
      return true; // Sem formulário, pode salvar
    }

    try {
      // Parse do formulário anexado
      let formData;
      if (typeof attachedFormData === 'string' && attachedFormData.includes('"Motivo de Recusa":') && attachedFormData.includes('"Detalhamento":')) {
        // Converte o formato específico manualmente
        formData = {
          "Show_Condition": "FALSE",
          "Fields": {
            "Motivo de Recusa": ["Incompatível com processo", "Forma de operação", "Configuração de Sistema"],
            "Detalhamento": ["default:", "type:longText"]
          }
        };
      } else {
        formData = JSON.parse(attachedFormData);
      }

      // Verifica se é um formulário com condição
      if (formData.Show_Condition !== undefined && formData.Fields) {
        const showCondition = formData.Show_Condition;
        const isApprovalNode = selectedFlowNode.data.actionType === 'Intern_Aprove';
        const approvalStatus = selectedFlowNode.data.isAproved;
        
        // Determina se deve mostrar o formulário baseado na condição
        let shouldShowForm = false;
        if (isApprovalNode && approvalStatus !== 'UNDEF') {
          if (showCondition === 'TRUE' && approvalStatus === 'TRUE') {
            shouldShowForm = true;
          } else if (showCondition === 'FALSE' && approvalStatus === 'FALSE') {
            shouldShowForm = true;
          } else if (showCondition === 'BOTH' && (approvalStatus === 'TRUE' || approvalStatus === 'FALSE')) {
            shouldShowForm = true;
          }
        }
        
        // Se o formulário não deve ser exibido devido à condição, permite salvar
        if (!shouldShowForm) {
          console.log('🔍 Formulário oculto por condição de aprovação, permitindo salvar');
          return true;
        }
      }

      // Se chegou até aqui, o formulário deve ser exibido, então valida os campos
      const fieldsData = getFormFields();
      const fieldNames = Object.keys(fieldsData);
      
      console.log('🔍 Validação de campos:', {
        nodeId: selectedFlowNode.id,
        nodeType: selectedFlowNode.type,
        isPending: selectedFlowNode.data.isPendingConnected,
        fieldsData,
        fieldNames,
        formValues,
        hasFields: fieldNames.length > 0
      });
      
      // Se não há campos, permite salvar
      if (fieldNames.length === 0) return true;
      
      // Verifica se todos os campos têm valores preenchidos
      const allFilled = fieldNames.every(fieldName => {
        const value = formValues[fieldName];
        // Para campos select, verificar se não está vazio ou "Selecione uma opção"
        const isFilled = value && value.trim() !== '' && value !== 'Selecione uma opção';
        console.log(`Campo ${fieldName}: valor="${value}", preenchido=${isFilled}`);
        return isFilled;
      });
      
      console.log('🔍 Resultado da validação:', allFilled);
      return allFilled;
    } catch (e) {
      console.log('🔍 Erro na validação do formulário:', e);
      return true; // Em caso de erro, permite salvar
    }
  };

  // Função para alterar o status de aprovação (altera estado imediatamente e mostra alerta)
  const updateApprovalStatus = (nodeId: string, newStatus: string) => {
    const currentNodes = getNodes();
    const updatedNodes = currentNodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            isAproved: newStatus
          }
        };
      }
      return node;
    });
    setReactFlowNodes(updatedNodes);
    setNodes(updatedNodes);
    
    // Atualizar também o nó selecionado para refletir a mudança no painel
    if (selectedFlowNode && selectedFlowNode.id === nodeId) {
      setSelectedFlowNode({
        ...selectedFlowNode,
        data: {
          ...selectedFlowNode.data,
          isAproved: newStatus
        }
      });
    }

    // Mostrar alerta para persistir alterações
    console.log('🔴 Definindo showApprovalAlert para true');
    setShowApprovalAlert(true);
  };

  // Função para executar transferência de fluxo
  const executeFlowTransfer = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'endNode' || selectedFlowNode.data.FromType !== 'flow_init') {
      console.log('Nenhum endNode de transferência selecionado');
      return;
    }

    console.log('Executando transferência de fluxo...');
    
    try {
      // Verificar se existe fluxo destino
      if (!selectedFlowNode.data.To_Flow_id) {
        setIntegrationResult({
          status: 'error',
          message: 'Fluxo de destino não definido para transferência.'
        });
        return;
      }

      // Marcar o nó como executado
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            isExecuted: 'TRUE',
            isPendingConnected: false,
            isReadonly: true
          }
        };
        setNodes(updatedNodes);
        setReactFlowNodes(updatedNodes);
        
        // Atualizar nó selecionado
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            isPendingConnected: false,
            isReadonly: true
          }
        });
      }

      // Preparar dados atualizados do fluxo
      const updatedFlowTasks = {
        nodes: updatedNodes,
        edges: edges,
        viewport: flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
      };

      // Chamar API para transferir fluxo
      const response = await fetch(`/api/document-flow-executions/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentDocumentId: flowData.documentId,
          targetFlowId: selectedFlowNode.data.To_Flow_id,
          flowTasks: updatedFlowTasks
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao transferir fluxo');
      }

      const result = await response.json();
      
      console.log('✅ Transferência de fluxo concluída com sucesso pelo backend');

      // Atualizar estado local
      setFlowDiagramModal(prev => ({
        ...prev,
        flowData: {
          ...prev.flowData,
          flowTasks: updatedFlowTasks
        }
      }));

      // Mostrar resultado de sucesso
      setIntegrationResult({
        status: 'success',
        message: `Fluxo transferido com sucesso para "${result.targetFlowName}". Nova execução criada.`
      });

      // Recarregar dados
      queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      
    } catch (error) {
      console.error('❌ Erro ao transferir fluxo:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Falha na transferência do fluxo. Verifique os logs e tente novamente.'
      });
    }
  };

  // Função para executar encerramento direto do fluxo
  const executeDirectFlowConclusion = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'endNode' || selectedFlowNode.data.FromType !== 'Init') {
      console.log('Nenhum endNode de encerramento direto selecionado');
      return;
    }

    console.log('Executando encerramento direto do fluxo...');
    
    try {
      // Marcar o nó como executado
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            isExecuted: 'TRUE',
            isPendingConnected: false,
            isReadonly: true
          }
        };
        setNodes(updatedNodes);
        setReactFlowNodes(updatedNodes);
        
        // Atualizar nó selecionado
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            isPendingConnected: false,
            isReadonly: true
          }
        });

        // Salvar alterações no banco de dados - marcando como concluído
        const finalFlowTasks = {
          ...flowDiagramModal.flowData.flowTasks,
          nodes: updatedNodes
        };

        const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            flowTasks: finalFlowTasks,
            status: 'concluded',
            completedAt: new Date().toISOString()
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao salvar encerramento no banco');
        }

        // Atualizar status do documento para "Concluido"
        const docResponse = await fetch(`/api/documentos/${flowDiagramModal.flowData.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'Concluido'
          }),
        });

        if (!docResponse.ok) {
          throw new Error('Erro ao atualizar status do documento');
        }

        console.log('✅ Fluxo encerrado e documento marcado como concluído');
        
        setIntegrationResult({
          status: 'success',
          message: 'Fluxo encerrado com sucesso! O documento foi marcado como concluído e enviado para a aba [Concluídos].'
        });
        
        // Atualizar estado local
        setFlowDiagramModal(prev => ({
          ...prev,
          flowData: {
            ...prev.flowData,
            flowTasks: finalFlowTasks
          }
        }));

        // Recarregar dados
        queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      }
    } catch (error) {
      console.error('❌ Erro ao executar encerramento direto:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Falha ao encerrar o fluxo. Tente novamente.'
      });
    }
  };

  // Função para executar integração manual
  const executeManualIntegration = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'integrationNode') {
      console.log('Nenhum integrationNode selecionado');
      return;
    }

    console.log('Executando integração manual...');
    
    try {
      // Verificar se existe ID de integração
      if (!selectedFlowNode.data.integrationId) {
        setIntegrationResult({
          status: 'error',
          message: 'ID de integração não definido para este nó.'
        });
        return;
      }

      // Buscar configuração de integração
      const configResponse = await fetch(`/api/integrations/${selectedFlowNode.data.integrationId}`);
      if (!configResponse.ok) {
        throw new Error('Falha ao buscar configuração de integração');
      }

      const integrationConfig = await configResponse.json();
      console.log('Configuração de integração:', integrationConfig);

      // Executar integração simulada
      // Em produção, aqui seria feita a chamada real para a API externa
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay

      // Marcar o nó como executado
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            isExecuted: 'TRUE',
            executionTime: new Date().toISOString(),
            isPendingConnected: false
          }
        };
        setNodes(updatedNodes);
        setReactFlowNodes(updatedNodes);
        
        // Atualizar nó selecionado
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            executionTime: new Date().toISOString(),
            isPendingConnected: false
          }
        });
      }

      // Simular resultado de sucesso
      setIntegrationResult({
        status: 'success',
        message: `Integração "${integrationConfig.name}" executada com sucesso!`
      });

      // Salvar alterações no banco de dados
      const updatedFlowTasks = {
        ...flowDiagramModal.flowData.flowTasks,
        nodes: updatedNodes
      };

      const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowTasks: updatedFlowTasks
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar alterações no banco');
      }

      console.log('✅ Integração manual executada e salva no banco');
      
      // Atualizar estado local
      setFlowDiagramModal(prev => ({
        ...prev,
        flowData: {
          ...prev.flowData,
          flowTasks: updatedFlowTasks
        }
      }));

      // Buscar próximos nós a serem ativados
      const outgoingEdges = edges.filter(edge => edge.source === selectedFlowNode.id);
      const nextNodeIds = outgoingEdges.map(edge => edge.target);
      
      // Marcar próximos nós como pendentes
      const finalNodes = updatedNodes.map(node => {
        if (nextNodeIds.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              isPendingConnected: true
            }
          };
        }
        return node;
      });

      setNodes(finalNodes);
      setReactFlowNodes(finalNodes);

      // Salvar mudanças finais
      await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowTasks: {
            ...updatedFlowTasks,
            nodes: finalNodes
          }
        }),
      });

      console.log('✅ Próximos nós ativados com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao executar integração manual:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Falha na execução da integração. Verifique os logs e tente novamente.'
      });
    }
  };

  // Função local para salvar alterações
  const saveChangesToDatabase = async () => {
    try {
      // Chamar a função passada via props
      await saveChangesToDatabaseProp();
      
      // Fechar o alerta após salvar
      setShowApprovalAlert(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar alterações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para salvar dados do formulário
  const handleSaveFormData = (formValues: Record<string, string>) => {
    const updatedNodes = nodes.map(node => {
      if (node.id === selectedFlowNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            formData: formValues
          }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    setReactFlowNodes(updatedNodes);

    toast({
      title: "Dados salvos",
      description: "Os dados do formulário foram salvos com sucesso.",
    });
  };

  // Definir nodeTypes
  const nodeTypes = useMemo(() => ({
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent
  }), []);

  // Fit view quando o componente montar
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, minZoom: 0.1, maxZoom: 2 });
    }, 100);
  }, [fitView]);

  // Log de montagem/desmontagem do componente
  useEffect(() => {
    console.log('🔵 FlowWithAutoFitView montado');
    return () => {
      console.log('🔴 FlowWithAutoFitView desmontado');
    };
  }, []);

  // Processar nós para aplicar cores e animações
  const processedNodes = useMemo(() => {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    return nodes.map(node => {
      // Cores padrão
      const defaultColors = {
        startNode: '#22c55e',      // Verde
        endNode: '#ef4444',        // Vermelho
        actionNode: '#3b82f6',     // Azul
        documentNode: '#facc15',   // Amarelo
        integrationNode: '#8b5cf6', // Roxo
        switchNode: '#f97316'      // Laranja
      };
      
      // Aplicar cor baseada no tipo
      const backgroundColor = defaultColors[node.type] || '#94a3b8';

      // Lógica especial para approval nodes - mudar cor baseado no status
      if (node.type === 'actionNode' && node.data.actionType === 'Intern_Aprove') {
        let approvalColor = backgroundColor;
        if (node.data.isAproved === 'TRUE') {
          approvalColor = '#10b981'; // Verde esmeralda para aprovado
        } else if (node.data.isAproved === 'FALSE') {
          approvalColor = '#dc2626'; // Vermelho para rejeitado
        }
        
        return {
          ...node,
          data: {
            ...node.data,
            backgroundColor: approvalColor
          }
        };
      }

      return {
        ...node,
        data: {
          ...node.data,
          backgroundColor
        }
      };
    });
  }, [nodes]);

  // Processar edges para aplicar animações
  const processedEdges = useMemo(() => {
    if (!edges || !Array.isArray(edges)) return [];
    
    return edges.map(edge => {
      // Encontrar nó de origem
      const sourceNode = nodes && Array.isArray(nodes) ? nodes.find(node => node.id === edge.source) : null;
      
      // Lógica de animação
      let shouldAnimate = false;
      let edgeColor = '#64748b'; // Cor padrão (cinza)
      
      // 1. Animar edges de nós executados
      if (sourceNode && sourceNode.data.isExecuted === 'TRUE') {
        shouldAnimate = true;
        edgeColor = '#22c55e'; // Verde para executado
      }
      
      // 2. Animar edges de nós pendentes/conectados
      if (sourceNode && sourceNode.data.isPendingConnected) {
        shouldAnimate = true;
        edgeColor = '#f59e0b'; // Laranja/Amarelo para pendente
      }
      
      // 3. Lógica especial para switch nodes - baseado em isActive
      if (sourceNode && sourceNode.type === 'switchNode') {
        const edgeData = edge.data || {};
        const isActiveEdge = edgeData.isActive === 'TRUE';
        
        if (sourceNode.data.isExecuted === 'TRUE' && isActiveEdge) {
          shouldAnimate = true;
          edgeColor = '#22c55e'; // Verde para caminho ativo executado
        } else if (!isActiveEdge) {
          edgeColor = '#cbd5e1'; // Cinza claro para caminhos inativos
        }
      }
      
      return {
        ...edge,
        type: 'smoothstep', // garantir que o tipo seja definido
        animated: shouldAnimate, // aplicar animação baseada na lógica
        style: {
          stroke: edgeColor,
          strokeWidth: 3,
          transition: 'all 0.3s ease'
        }
      };
    });
  }, [edges, nodes]);

  return (
    <>
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(event, node) => {
          setSelectedFlowNode(node);
          setShowFlowInspector(true);
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* Inspector Panel */}
      <div className={`absolute top-4 transition-all duration-300 ${isPinned ? 'right-[320px]' : 'right-4'}`}>
        {!showFlowInspector && (
          <button
            onClick={() => setShowFlowInspector(true)}
            className="px-4 py-2 bg-blue-600 dark:bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 dark:hover:bg-[#1E3A8A] transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Informações</span>
          </button>
        )}
      </div>

      {/* Side Panel - Flow Inspector */}
      <div 
        className={`absolute top-0 right-0 h-full bg-white dark:bg-[#0F172A] border-l dark:border-[#374151] shadow-lg transition-transform duration-300 z-50 ${
          showFlowInspector ? 'translate-x-0' : 'translate-x-full'
        } ${isPinned ? 'w-80' : 'w-96'}`}
      >
        {showFlowInspector && (
          <div className="h-full flex flex-col">
            {/* Header do painel */}
            <div className="p-4 border-b dark:border-[#374151]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold dark:text-gray-200">Detalhes do Nó</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsFlowInspectorPinned(!isPinned)}
                    className={`p-2 rounded-lg transition-colors ${
                      isPinned 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                    title={isPinned ? "Desafixar painel" : "Fixar painel"}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setShowFlowInspector(false);
                      setSelectedFlowNode(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo do painel */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {selectedFlowNode ? (
                  <>
                    <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo do Nó</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{selectedFlowNode.type}</p>
                    </div>

                    {selectedFlowNode.data.label && (
                      <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Título</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedFlowNode.data.label}</p>
                      </div>
                    )}

                    {selectedFlowNode.data.description && (
                      <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedFlowNode.data.description}</p>
                      </div>
                    )}

                    {selectedFlowNode.data.actionType && (
                      <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo de Ação</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{selectedFlowNode.data.actionType}</p>
                      </div>
                    )}

                    {selectedFlowNode.data.isExecuted !== undefined && (
                      <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status de Execução</p>
                        <p className={`text-sm font-medium ${
                          selectedFlowNode.data.isExecuted === 'TRUE' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Executado' : 'Não Executado'}
                        </p>
                      </div>
                    )}

                    {/* Seção do formulário de execução */}
                    {selectedFlowNode.data.isPendingConnected && (
                      <div className="border-t dark:border-[#374151] pt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Formulário de Execução</h4>
                        
                        {/* Formulário de execução baseado no tipo do nó */}
                        {/* TODO: Implement ExecutionForm component */}

                        {/* Manual execution form para IntegrationNode */}
                        {selectedFlowNode.type === 'integrationNode' && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-600 rounded-lg">
                            <div className="mb-3">
                              <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-1">
                                Integração: <span className="font-mono font-medium">{selectedFlowNode.data.integrationId || 'N/A'}</span>
                              </p>
                              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                Clique no botão abaixo para executar manualmente esta integração.
                              </p>
                            </div>

                            {integrationResult.status && (
                              <div className={`mb-3 p-3 rounded-md ${
                                integrationResult.status === 'success' 
                                  ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                              }`}>
                                <p className={`text-sm ${
                                  integrationResult.status === 'success' 
                                    ? 'text-green-800 dark:text-green-300' 
                                    : 'text-red-800 dark:text-red-300'
                                }`}>
                                  {integrationResult.message}
                                </p>
                              </div>
                            )}

                            <button
                              onClick={executeManualIntegration}
                              disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                              className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedFlowNode.data.isExecuted === 'TRUE'
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                              }`}
                            >
                              {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Executado' : 'Executar'}
                            </button>
                          </div>
                        )}

                        {/* Layout tabular para StartNode - 2 colunas */}
                        {selectedFlowNode.type === 'startNode' && (
                          <table className="w-full text-xs execution-form-table">
                            <thead>
                              <tr>
                                <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                                <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-2 py-1.5 text-center">
                                  <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    selectedFlowNode.data.isExecuted === 'TRUE' 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                                      : selectedFlowNode.data.isPendingConnected
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                                  }`}>
                                    {selectedFlowNode.data.isExecuted === 'TRUE' 
                                      ? 'Executado' 
                                      : selectedFlowNode.data.isPendingConnected
                                      ? 'Pendente'
                                      : 'N.Exec.'}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                    Início Direto
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}

                        {/* Layout tabular para EndNode - 2 colunas */}
                        {selectedFlowNode.type === 'endNode' && (
                          <div>
                            <table className="w-full text-xs execution-form-table">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                                  <th className="px-2 py-1.5 text-center font-medium text-xs">Tipo</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-2 py-1.5 text-center">
                                    <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      selectedFlowNode.data.isExecuted === 'TRUE' 
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                                        : selectedFlowNode.data.isPendingConnected
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                        : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                                    }`}>
                                      {selectedFlowNode.data.isExecuted === 'TRUE' 
                                        ? 'Executado' 
                                        : selectedFlowNode.data.isPendingConnected
                                        ? 'Pendente'
                                        : 'N.Exec.'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {selectedFlowNode.data.To_Type ? (
                                      <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                        {selectedFlowNode.data.To_Type === 'Direct_finish' ? 'Encerramento Direto' : 
                                         selectedFlowNode.data.To_Type === 'flow_Finish' ? 'Transferência para Fluxo' : selectedFlowNode.data.To_Type}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Exibição do fluxo destino para EndNode de Transferência */}
                            {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (
                              <div className="mt-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-3">
                                  <div className="mb-2">
                                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Fluxo Destino:</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 font-mono bg-white dark:bg-[#0F172A] px-2 py-1 rounded border dark:border-[#374151]">
                                      {selectedFlowNode.data.To_Flow_id}
                                    </p>
                                  </div>
                                  {(selectedFlowNode.data.To_Flow_code || selectedFlowNode.data.To_Flow_name) && (
                                    <div>
                                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Detalhes:</p>
                                      <p className="text-xs text-blue-700 dark:text-blue-400 font-mono bg-white dark:bg-[#0F172A] px-2 py-1 rounded border dark:border-[#374151]">
                                        [{selectedFlowNode.data.To_Flow_code}] - {selectedFlowNode.data.To_Flow_name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Manual execution form para EndNode de Transferência para Fluxo */}
                            {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg">
                                <div className="mb-3">
                                  <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                                    Ao pressionar o botão você confirma o encerramento deste fluxo e a abertura do novo fluxo vinculado. Ao confirmar, o sistema: 1- Encerra o fluxo corrente, 2- Cria uma nova instância com o fluxo indicado vinculado ao presente documento, 3- Inicia o fluxo no novo documento. Confirma estas ações?
                                  </p>
                                </div>

                                {integrationResult.status && (
                                  <div className={`mb-3 p-3 rounded-md ${
                                    integrationResult.status === 'success' 
                                      ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                                      : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                                  }`}>
                                    <p className={`text-sm ${
                                      integrationResult.status === 'success' 
                                        ? 'text-green-800 dark:text-green-300' 
                                        : 'text-red-800 dark:text-red-300'
                                    }`}>
                                      {integrationResult.message}
                                    </p>
                                  </div>
                                )}

                                <button
                                  onClick={executeFlowTransfer}
                                  disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                                  className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    selectedFlowNode.data.isExecuted === 'TRUE'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                  }`}
                                >
                                  {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Executado' : 'Transferir Fluxo'}
                                </button>
                              </div>
                            )}

                            {/* Manual execution form para EndNode de Encerramento Direto */}
                            {selectedFlowNode.data.FromType === 'Init' && selectedFlowNode.data.To_Type === 'Direct_finish' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600 rounded-lg">
                                <div className="mb-3">
                                  <p className="text-xs text-green-800 dark:text-green-300 mb-2">
                                    Ao pressionar o botão você confirma o encerramento deste fluxo. O documento será movido para a aba [Concluídos]. Esta ação é irreversível. Confirma?
                                  </p>
                                </div>

                                {integrationResult.status && (
                                  <div className={`mb-3 p-3 rounded-md ${
                                    integrationResult.status === 'success' 
                                      ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600' 
                                      : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600'
                                  }`}>
                                    <p className={`text-sm ${
                                      integrationResult.status === 'success' 
                                        ? 'text-green-800 dark:text-green-300' 
                                        : 'text-red-800 dark:text-red-300'
                                    }`}>
                                      {integrationResult.message}
                                    </p>
                                  </div>
                                )}

                                <button
                                  onClick={executeDirectFlowConclusion}
                                  disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                                  className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    selectedFlowNode.data.isExecuted === 'TRUE'
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                                  }`}
                                >
                                  {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Fluxo Concluído' : 'Concluir Fluxo'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Layout tabular 3x2 para SwitchNode */}
                        {selectedFlowNode.type === 'switchNode' && (
                          <table className="w-full text-xs execution-form-table">
                            <thead>
                              <tr>
                                <th className="px-2 py-1.5 text-center font-medium text-xs">Status Exec.</th>
                                <th className="px-2 py-1.5 text-center font-medium text-xs">Campo Switch</th>
                                <th className="px-2 py-1.5 text-center font-medium text-xs">Input Switch</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-2 py-1.5 text-center">
                                  <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    selectedFlowNode.data.isExecuted === 'TRUE' 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' 
                                      : selectedFlowNode.data.isPendingConnected
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                                  }`}>
                                    {selectedFlowNode.data.isExecuted === 'TRUE' 
                                      ? 'Executado' 
                                      : selectedFlowNode.data.isPendingConnected
                                      ? 'Pendente'
                                      : 'N.Exec.'}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  {selectedFlowNode.data.switchField ? (
                                    <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                                      {selectedFlowNode.data.switchField}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  {selectedFlowNode.data.inputSwitch ? (
                                    <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400">
                                      {selectedFlowNode.data.inputSwitch}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-300 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}



                        {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && selectedFlowNode.data.isAproved !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Status de Aprovação</p>
                            <div className="flex space-x-2 mb-2">
                              <button
                                onClick={() => {
                                  if (selectedFlowNode.data.isPendingConnected) {
                                    updateApprovalStatus(selectedFlowNode.id, 'TRUE');
                                  }
                                }}
                                disabled={!selectedFlowNode.data.isPendingConnected}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                                  selectedFlowNode.data.isAproved === 'TRUE'
                                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-800 dark:text-green-400'
                                    : selectedFlowNode.data.isPendingConnected
                                    ? 'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151] text-gray-600 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 cursor-pointer'
                                    : 'bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <CircleCheck className="w-4 h-4" />
                                <span className="text-sm font-medium">SIM</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  if (selectedFlowNode.data.isPendingConnected) {
                                    updateApprovalStatus(selectedFlowNode.id, 'FALSE');
                                  }
                                }}
                                disabled={!selectedFlowNode.data.isPendingConnected}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                                  selectedFlowNode.data.isAproved === 'FALSE'
                                    ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-400'
                                    : selectedFlowNode.data.isPendingConnected
                                    ? 'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151] text-gray-600 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 cursor-pointer'
                                    : 'bg-gray-50 dark:bg-[#1F2937] border-gray-200 dark:border-[#374151] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <X className="w-4 h-4" />
                                <span className="text-sm font-medium">NÃO</span>
                              </button>
                            </div>
                            
                            {/* Caixa de alerta para confirmação */}
                            {showApprovalAlert && selectedFlowNode.data.isAproved !== 'UNDEF' && (
                              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-600 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">ATENÇÃO</h4>
                                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
                                      Ao executar esta ação o fluxo passará automaticamente para o próximo estágio definido conforme o diagrama, esta ação pode ser irreversível caso ações posteriores no workflow sejam executadas.
                                    </p>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={saveChangesToDatabase}
                                        disabled={!areAllFieldsFilled()}
                                        className={`px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                          areAllFieldsFilled()
                                            ? 'bg-orange-600 dark:bg-[#1E40AF] hover:bg-orange-700 dark:hover:bg-[#1E3A8A]'
                                            : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                        }`}
                                      >
                                        Salvar Alterações
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                            </div>
                          </div>
                        )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selecione um nó para ver seus detalhes.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}