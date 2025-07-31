import { useState, useEffect, useMemo } from "react";
import { useReactFlow, ReactFlow, Controls, Background } from 'reactflow';
import { Pin } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ExecutionFormPanel } from '@/refact/components/documentos/flow/ExecutionFormPanel';
import {
  StartNodeComponent,
  EndNodeComponent,
  ActionNodeComponent,
  DocumentNodeComponent,
  IntegrationNodeComponent,
  SwitchNodeComponent
} from "@/refact/components/documentos/flow/FlowNodes_refact";

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
  saveChangesToDatabase,
  nodes,
  edges,
  setNodes
}: FlowWithAutoFitViewProps) {
  const { fitView, getNodes } = useReactFlow();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para controlar os valores dos campos do formulário
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Estado para controlar resultado da execução de integração
  const [integrationResult, setIntegrationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    success?: boolean;
  }>({ status: null, message: '' });
  
  // Estados para formulários dinâmicos
  const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>({});
  const [approvalFieldValues, setApprovalFieldValues] = useState<{ [key: string]: any }>({});
  
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

    console.log('Executando integração manual para o nó:', selectedFlowNode.id);
    
    try {
      // Exibir mensagem de processamento
      setIntegrationResult({ status: null, message: 'Executando integração...' });

      // Simular integração - aqui você chamaria a API real
      await new Promise(resolve => setTimeout(resolve, 2000));

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

        // Salvar alterações no banco de dados
        await saveChangesToDatabase();
      }

      // Exibir resultado de sucesso
      setIntegrationResult({
        status: 'success',
        message: 'Integração executada com sucesso!'
      });

      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setIntegrationResult({ status: null, message: '' });
      }, 3000);

    } catch (error) {
      console.error('Erro ao executar integração:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Falha ao executar integração. Verifique os logs.'
      });
    }
  };

  // Função para executar ação interna
  const executeInternalAction = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
      console.log('Nenhum actionNode selecionado');
      return;
    }

    console.log('Executando ação interna para o nó:', selectedFlowNode.id);
    
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
            isReadonly: true,
            formData: formValues // Salvar dados do formulário
          }
        };
        setNodes(updatedNodes);
        
        // Atualizar nó selecionado
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            isPendingConnected: false,
            isReadonly: true,
            formData: formValues
          }
        });

        // Salvar alterações no banco de dados
        await saveChangesToDatabase();
      }

      toast({
        title: "Ação executada",
        description: "A ação foi executada com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast({
        title: "Erro",
        description: "Falha ao executar ação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para salvar dados do formulário no nó
  const saveFormData = () => {
    if (!selectedFlowNode) return;

    const currentNodes = getNodes();
    const updatedNodes = currentNodes.map(node => {
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

    toast({
      title: "Dados salvos",
      description: "Os dados do formulário foram salvos com sucesso.",
    });
  };

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
          strokeDasharray: 'none'
        },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
        },
      };
    });
  }, [edges, nodes]);

  const nodeTypes = useMemo(() => ({
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent
  }), []);

  const onNodeClick = (event: any, node: any) => {
    setSelectedFlowNode(node);
    setShowFlowInspector(true);
  };

  const onPaneClick = () => {
    if (!isPinned) {
      setShowFlowInspector(false);
      setSelectedFlowNode(null);
    }
  };

  // Log para debug das edges com animação
  console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter(edge => edge.animated));

  return (
    <div className="flex-1 flex h-full w-full">
      <div className="flex-1 h-full w-full">
        <ReactFlow
          nodes={processedNodes}
          edges={processedEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.1,
            maxZoom: 2
          }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
        >
          <Controls showInteractive={false} />
          <Background />
        </ReactFlow>
      </div>
      {showFlowInspector && selectedFlowNode && (
        <div className="w-80 bg-white dark:bg-[#0F172A] border-l border-gray-200 dark:border-[#374151] p-4 overflow-y-auto relative">
          <div className="space-y-4">
            <div className="border-b dark:border-[#374151] pb-2 relative">
              <h3 className="text-lg font-semibold dark:text-gray-200">Execution Form</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                {(() => {
                  const typeMap: { [key: string]: string } = {
                    'startNode': 'Início',
                    'endNode': 'Fim',
                    'actionNode': 'Ação',
                    'documentNode': 'Documento',
                    'integrationNode': 'Integração',
                    'switchNode': 'Condição'
                  };
                  return typeMap[selectedFlowNode.type] || selectedFlowNode.type;
                })()} - {selectedFlowNode.id}
              </p>
              <button
                onClick={() => setIsFlowInspectorPinned(!isPinned)}
                className={`absolute top-0 right-0 p-1 rounded transition-colors ${
                  isPinned 
                    ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/30' 
                    : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1F2937]'
                }`}
                title={isPinned ? "Desafixar painel" : "Fixar painel"}
              >
                <Pin 
                  className={`w-4 h-4 transition-transform ${isPinned ? 'rotate-45' : 'rotate-0'}`}
                />
              </button>
            </div>
            
            <ExecutionFormPanel 
              selectedFlowNode={selectedFlowNode}
              queryClient={queryClient}
              toast={toast}
              flowDiagramModal={flowDiagramModal}
              getTemplateInfo={getTemplateInfo}
              areAllFieldsFilled={areAllFieldsFilled}
              saveChangesToDatabase={saveChangesToDatabase}
              updateApprovalStatus={updateApprovalStatus}
              showApprovalAlert={showApprovalAlert}
              fieldValues={fieldValues}
              setFieldValues={setFieldValues}
              approvalFieldValues={approvalFieldValues}
              setApprovalFieldValues={setApprovalFieldValues}
              integrationResult={integrationResult}
              setIntegrationResult={setIntegrationResult}
            />
          </div>
        </div>
      )}
    </div>
  );
}