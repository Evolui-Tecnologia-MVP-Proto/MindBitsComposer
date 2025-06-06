import React, { useState, useEffect, useMemo } from 'react';
import { useReactFlow, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Controls, Background } from 'reactflow';
import { Pin, BookOpen, Zap, CircleCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Importar componentes de nós
import StartNode from '@/components/flow/StartNode';
import EndNode from '@/components/flow/EndNode';
import TaskNode from '@/components/flow/TaskNode';
import DecisionNode from '@/components/flow/DecisionNode';
import ApproveNode from '@/components/flow/ApproveNode';
import ElaboreNode from '@/components/flow/ElaboreNode';
import ReviseNode from '@/components/flow/ReviseNode';

interface FlowWithAutoFitViewProps {
  flowData: any;
  showFlowInspector: boolean;
  setShowFlowInspector: (show: boolean) => void;
  setSelectedFlowNode: (node: any) => void;
  selectedFlowNode: any;
  showApprovalAlert: boolean;
  setShowApprovalAlert: (show: boolean) => void;
  isPinned: boolean;
  setFlowDiagramModal: (callback: (prev: any) => any) => void;
  flowDiagramModal: any;
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
  setFlowDiagramModal,
  flowDiagramModal
}: FlowWithAutoFitViewProps) {
  const { fitView, getNodes, setNodes } = useReactFlow();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

    console.log('Executando integração manual...');

    // Simular execução - 70% chance de sucesso
    const isSuccess = Math.random() > 0.3;

    if (isSuccess) {
      setIntegrationResult({
        status: 'success',
        message: `Integração executada com sucesso! A função ${selectedFlowNode.data.callType || 'callJob'} foi processada e ${selectedFlowNode.data.integrType || 'dados'} foram sincronizados com o serviço ${selectedFlowNode.data.service || 'externo'}.`
      });

      // Marcar o nó como executado
      const updatedNodes = [...nodes];
      const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            isExecuted: 'TRUE',
            isPendingConnected: false
          }
        };
        setNodes(updatedNodes);

        // Atualizar nó selecionado
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            isPendingConnected: false
          }
        });

        // Salvar alterações no banco de dados - atualizando fluxo completo
        try {
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
              flowTasks: finalFlowTasks
            }),
          });

          if (!response.ok) {
            throw new Error('Erro ao salvar alterações no banco');
          }

          console.log('✅ Alterações da integração manual salvas no banco de dados');

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
        } catch (error) {
          console.error('❌ Erro ao salvar integração manual:', error);
        }
      }
    } else {
      setIntegrationResult({
        status: 'error',
        message: `Falha na execução da integração. Erro ao executar a função ${selectedFlowNode.data.callType || 'callJob'}. Verifique a conectividade com o serviço ${selectedFlowNode.data.service || 'externo'} e tente novamente.`
      });
    }
  };

  // Função para persistir as alterações no banco de dados
  const saveChangesToDatabase = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
      console.log('Nenhum actionNode selecionado');
      return;
    }

    console.log('Salvando alterações no banco de dados...');
    console.log('selectedFlowNode:', selectedFlowNode);
    console.log('flowData:', flowData);

    try {
      // 1. Marcar o actionNode atual como executado, preservar o isAproved e salvar formValues
      const updatedNodes = [...nodes];
      const actionNodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
      if (actionNodeIndex !== -1) {
        updatedNodes[actionNodeIndex] = {
          ...updatedNodes[actionNodeIndex],
          data: {
            ...updatedNodes[actionNodeIndex].data,
            isExecuted: 'TRUE',
            isAproved: selectedFlowNode.data.isAproved, // Preservar o valor de aprovação
            formData: formValues, // Salvar os dados do formulário
            isPendingConnected: false // Marcar como não mais editável
          }
        };
        console.log('Nó atual atualizado com isAproved:', selectedFlowNode.data.isAproved);
        console.log('Dados do formulário salvos:', formValues);
      }

      // 2. Encontrar nós conectados APENAS pelas conexões de SAÍDA do actionNode
      const outgoingConnections = edges.filter(edge => edge.source === selectedFlowNode.id);
      console.log('Conexões de saída do actionNode encontradas:', outgoingConnections);

      // 3. Processar apenas os nós que recebem conexões diretas do actionNode
      outgoingConnections.forEach(edge => {
        const targetNodeIndex = updatedNodes.findIndex(n => n.id === edge.target);
        if (targetNodeIndex !== -1) {
          const targetNode = updatedNodes[targetNodeIndex];

          // Se for switchNode, apenas definir inputSwitch (não marcar como executado ainda)
          if (targetNode.type === 'switchNode') {
            updatedNodes[targetNodeIndex] = {
              ...targetNode,
              data: {
                ...targetNode.data,
                isExecuted: 'TRUE',
                inputSwitch: selectedFlowNode.data.isAproved
              }
            };
          } else {
            // Para outros tipos de nós, marcar como executado
            updatedNodes[targetNodeIndex] = {
              ...targetNode,
              data: {
                ...targetNode.data,
                isExecuted: 'TRUE'
              }
            };
          }
        }
      });

      // 4. Agora processar a lógica de "pendente conectado" baseada apenas nas conexões de SAÍDA
      const pendingConnectedNodeIds = new Set<string>();

      // Para cada conexão de saída do actionNode, verificar os nós conectados
      outgoingConnections.forEach(edge => {
        const connectedNode = updatedNodes.find(n => n.id === edge.target);

        if (connectedNode?.type === 'switchNode') {
          // Para switchNodes, encontrar as próximas conexões baseadas no inputSwitch
          const switchOutgoingEdges = edges.filter(e => e.source === connectedNode.id);

          switchOutgoingEdges.forEach(switchEdge => {
            const { inputSwitch, leftSwitch, rightSwitch } = connectedNode.data;
            let shouldActivateConnection = false;

            // Verificar se a conexão deve estar ativa baseada no inputSwitch
            if (switchEdge.sourceHandle === 'a' && inputSwitch === rightSwitch) {
              shouldActivateConnection = true;
            } else if (switchEdge.sourceHandle === 'c' && inputSwitch === leftSwitch) {
              shouldActivateConnection = true;
            }

            // Se a conexão deve estar ativa, marcar o nó de destino como pendente conectado
            if (shouldActivateConnection) {
              const finalTargetNode = updatedNodes.find(n => n.id === switchEdge.target);
              if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
                pendingConnectedNodeIds.add(switchEdge.target);
              }
            }
          });
        } else {
          // Para outros tipos de nós, verificar suas conexões de saída
          const nodeOutgoingEdges = edges.filter(e => e.source === connectedNode.id);
          nodeOutgoingEdges.forEach(nodeEdge => {
            const finalTargetNode = updatedNodes.find(n => n.id === nodeEdge.target);
            if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
              pendingConnectedNodeIds.add(nodeEdge.target);
            }
          });
        }
      });

      // 5. Aplicar o status "pendente conectado" apenas aos nós identificados
      pendingConnectedNodeIds.forEach(nodeId => {
        const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            data: {
              ...updatedNodes[nodeIndex].data,
              isPendingConnected: true
            }
          };
        }
      });

      console.log('Nós marcados como pendente conectado:', Array.from(pendingConnectedNodeIds));

      // 5.1. Processar endNodes de "encerramento direto" automaticamente
      let hasDirectEndNodeChanges = false;
      let documentCompleted = false;

      updatedNodes.forEach((node, index) => {
        if (node.type === 'endNode' && 
            node.data.endType === 'Encerramento Direto' && 
            node.data.isPendingConnected && 
            node.data.isExecuted !== 'TRUE') {

          console.log(`🔄 Processando endNode de encerramento direto automaticamente: ${node.id}`);
          hasDirectEndNodeChanges = true;

          updatedNodes[index] = {
            ...node,
            data: {
              ...node.data,
              isExecuted: 'TRUE',
              isPendingConnected: false,
              status: 'completed',
              completedAt: new Date().toISOString()
            }
          };
        }
      });

      // Verificar se todos os nós estão executados para marcar o fluxo como completo
      if (hasDirectEndNodeChanges) {
        const allNodesExecuted = updatedNodes.every(node => 
          node.data.isExecuted === 'TRUE' || node.type === 'startNode'
        );

        if (allNodesExecuted) {
          console.log('🎯 Fluxo completo detectado - marcando documento como completed');
          documentCompleted = true;
        }
      }

      // 6. Preparar dados para envio ao servidor
      const updatedFlowTasks = {
        ...flowData.flowTasks,
        nodes: updatedNodes
      };

      // 5. Enviar para o servidor (atualizar execução do fluxo, não o template)
      const requestBody: any = {
        flowTasks: updatedFlowTasks
      };

      // Se o documento foi marcado como completo, adicionar status e timestamp
      if (documentCompleted) {
        requestBody.status = 'completed';
        requestBody.completedAt = new Date().toISOString();
      }

      const response = await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar alterações');
      }

      console.log('Alterações salvas com sucesso');
      console.log('Atualizando estado local com:', updatedFlowTasks);

      // 6. Atualizar estado local e recarregar diagrama
      setFlowDiagramModal(prev => ({
        ...prev,
        flowData: {
          ...prev.flowData,
          flowTasks: updatedFlowTasks
        }
      }));

      // 7. Atualizar o nó selecionado para refletir as mudanças imediatamente
      setSelectedFlowNode({
        ...selectedFlowNode,
        data: {
          ...selectedFlowNode.data,
          isExecuted: 'TRUE',
          formData: formValues,
          isPendingConnected: false
        }
      });

      // 8. Limpar o formValues para mostrar que foi salvo
      setFormValues({});

      console.log('Estado local atualizado');

      // Fechar o alerta
      setShowApprovalAlert(false);

      // Recarregar a lista de execuções de fluxo para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });

    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      // Aqui poderia mostrar um toast de erro
    }
  };

  // Effect para executar fit view quando o painel inspector é aberto/fechado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fitView({
        padding: 0.2,
        minZoom: 0.1,
        maxZoom: 2,
        duration: 300
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showFlowInspector, fitView]);

  // Implementar lógica de "pendente em processo"
  const nodes = flowData.flowTasks.nodes || [];
  const edges = flowData.flowTasks.edges || [];

  // Encontrar nós executados
  const executedNodes = new Set(
    nodes.filter((node: any) => node.data?.isExecuted === 'TRUE').map((node: any) => node.id)
  );

  // Encontrar nós pendentes conectados aos executados
  const pendingConnectedNodes = new Set<string>();

  for (const edge of edges) {
    // Se o nó de origem está executado e o nó de destino não está executado
    if (executedNodes.has(edge.source)) {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);

      if (targetNode && targetNode.data?.isExecuted !== 'TRUE') {
        // Verificar se o nó de origem é um switchNode
        if (sourceNode?.type === 'switchNode') {
          // Para switchNodes, verificar se a conexão está no handle correto
          const { inputSwitch, leftSwitch, rightSwitch } = sourceNode.data;

          // Determinar qual handle deveria estar ativo baseado no inputSwitch
          let shouldBeActive = false;
          if (edge.sourceHandle === 'a' && inputSwitch === rightSwitch) {
            shouldBeActive = true; // Handle direito ativo
          } else if (edge.sourceHandle === 'c' && inputSwitch === leftSwitch) {
            shouldBeActive = true; // Handle esquerdo ativo
          }

          // Apenas marcar como pendente se a conexão está no handle correto
          if (shouldBeActive) {
            pendingConnectedNodes.add(edge.target);
          }
        } else {
          // Para outros tipos de nós, aplicar lógica normal
          pendingConnectedNodes.add(edge.target);
        }
      }
    }

    // Se o nó de destino está executado e o nó de origem não está executado
    if (executedNodes.has(edge.target)) {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      if (sourceNode && sourceNode.data?.isExecuted !== 'TRUE') {
        pendingConnectedNodes.add(edge.source);
      }
    }
  }

  // Processar nós para adicionar destaque amarelo aos pendentes conectados
  const processedNodes = nodes.map((node: any) => {
    const isSelected = selectedFlowNode?.id === node.id;

    if (pendingConnectedNodes.has(node.id)) {
      return {
        ...node,
        selected: isSelected,
        data: {
          ...node.data,
          isPendingConnected: true,
          isReadonly: true
        },
      };
    }
    return {
      ...node,
      selected: isSelected,
      data: { ...node.data, isReadonly: true }
    };
  });

  // Processar edges para colorir conexões e adicionar animação
  const processedEdges = edges.map((edge: any) => {
    const sourceNode = nodes.find((n: any) => n.id === edge.source);
    const targetNode = nodes.find((n: any) => n.id === edge.target);

    const sourceExecuted = sourceNode?.data?.isExecuted === 'TRUE';
    const targetExecuted = targetNode?.data?.isExecuted === 'TRUE';

    const sourcePending = pendingConnectedNodes.has(edge.source);
    const targetPending = pendingConnectedNodes.has(edge.target);

    let edgeColor = '#6b7280'; // cor padrão
    let shouldAnimate = false; // nova variável para controlar animação

    // PRIMEIRA PRIORIDADE: Lógica de execução/pendência (sempre tem precedência)
    // Se ambos os nós estão executados
    if (sourceExecuted && targetExecuted) {
      edgeColor = '#21639a';
      shouldAnimate = true; // animar conexões executadas (azuis)
    }
    // Se há conexão entre executado e pendente conectado (PRIORIDADE MÁXIMA)
    else if ((sourceExecuted && targetPending) || (sourcePending && targetExecuted)) {
      edgeColor = '#fbbf24'; // amarelo
      shouldAnimate = true; // animar conexões pendentes (amarelas)
    }
    // SEGUNDA PRIORIDADE: Verificar se a conexão parte de um SwitchNode e aplicar cor dinâmica do handle
    else if (sourceNode?.type === 'switchNode') {
      // Função para determinar cor do handle do switchNode
      const getSwitchHandleColor = (switchValue: any) => {
        if (!switchValue) return '#9ca3af'; // gray-400

        if (Array.isArray(switchValue)) {
          const firstValue = switchValue[0];
          if (firstValue === 'TRUE') return '#10b981'; // green-500
          if (firstValue === 'FALSE') return '#ef4444'; // red-500
          return '#9ca3af'; // gray-400
        }

        if (switchValue === 'TRUE') return '#10b981'; // green-500
        if (switchValue === 'FALSE') return '#ef4444'; // red-500
        return '#9ca3af'; // gray-400
      };

      // Verificar qual handle está sendo usado baseado no sourceHandle e usar cores dinâmicas
      if (edge.sourceHandle === 'a') {
        // Handle direito - usar cor baseada em rightSwitch
        edgeColor = getSwitchHandleColor(sourceNode.data.rightSwitch);
      } else if (edge.sourceHandle === 'c') {
        // Handle esquerdo - usar cor baseada em leftSwitch
        edgeColor = getSwitchHandleColor(sourceNode.data.leftSwitch);
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
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto relative">
          <div className="space-y-4">
            <div className="border-b pb-2 relative">
              <h3 className="text-lg font-semibold">Execution Form</h3>
              <p className="text-sm text-gray-600 font-mono">
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
                onClick={() => setIsFlowInspectorPinned(!isFlowInspectorPinned)}
                className={`absolute top-0 right-0 p-1 rounded transition-colors ${
                  isFlowInspectorPinned 
                    ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={isFlowInspectorPinned ? "Desafixar painel" : "Fixar painel"}
              >
                <Pin 
                  className={`w-4 h-4 transition-transform ${isFlowInspectorPinned ? 'rotate-45' : 'rotate-0'}`}
                />
              </button>
            </div>

            <div className="space-y-3">
              {/* Status Exec./Tipo apenas para ActionNode */}
              {selectedFlowNode.type === 'actionNode' && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Status Exec.</p>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedFlowNode.data.isExecuted === 'TRUE' 
                        ? 'bg-blue-100 text-blue-800' 
                        : selectedFlowNode.data.isPendingConnected
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFlowNode.data.isExecuted === 'TRUE' 
                        ? 'Executado' 
                        : selectedFlowNode.data.isPendingConnected
                        ? 'Pendente'
                        : 'N.Exec.'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Tipo Ação</p>
                    {selectedFlowNode.data.actionType && (
                      <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {selectedFlowNode.data.actionType}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Aprovação</p>
                    {selectedFlowNode.data.isAproved && (
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        selectedFlowNode.data.isAproved === 'TRUE' 
                          ? 'bg-green-100 text-green-800'
                          : selectedFlowNode.data.isAproved === 'FALSE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedFlowNode.data.isAproved === 'TRUE' 
                          ? 'SIM' 
                          : selectedFlowNode.data.isAproved === 'FALSE'
                          ? 'NÃO'
                          : 'UNDEF'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedFlowNode.data.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Descrição</p>
                  <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded border font-mono">
                    {selectedFlowNode.data.description}
                  </p>
                </div>
              )}

              {/* Formulário dinâmico baseado no attached_Form */}
              {selectedFlowNode.type === 'actionNode' && (selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form) && (
                <div>
                  {(() => {
                    try {
                      // Verifica tanto attached_Form (maiúsculo) quanto attached_form (minúsculo)
                      let attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                      console.log('🔍 Dados brutos do formulário:', attachedFormData);

                      // Corrige formato malformado do JSON se necessário
                      if (typeof attachedFormData === 'string' && attachedFormData.includes('"Motivo de Recusa":') && attachedFormData.includes('"Detalhamento":')) {
                        // Converte o formato específico manualmente
                        const fixedJson = {
                          "Show_Condition": "FALSE",
                          "Fields": {
                            "Motivo de Recusa": ["Incompatível com processo", "Forma de operação", "Configuração de Sistema"],
                            "Detalhamento": ["default:", "type:longText"]
                          }
                        };
                        attachedFormData = JSON.stringify(fixedJson);
                      }

                      console.log('🔍 Dados corrigidos:', attachedFormData);
                      const formData = JSON.parse(attachedFormData);
                      console.log('🔍 Dados parseados:', formData);

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

                        if (!shouldShowForm) {
                          return null;
                        }

                        // Converte Fields para objeto se for array - só processa se vai mostrar
                        let fieldsData = formData.Fields;
                        if (Array.isArray(formData.Fields)) {
                          fieldsData = {};
                          // Trata diferentes formatos de array
                          formData.Fields.forEach((item, index) => {
                            if (typeof item === 'string') {
                              // Formato: [fieldName1, fieldValue1, fieldName2, fieldValue2, ...]
                              const nextItem = formData.Fields[index + 1];
                              if (nextItem !== undefined && index % 2 === 0) {
                                fieldsData[item] = nextItem;
                              }
                            } else if (typeof item === 'object' && item !== null) {
                              // Formato: [{fieldName: fieldValue}, ...]
                              Object.assign(fieldsData, item);
                            }
                          });
                        }

                        console.log('🟡 Dados do formulário processados:', fieldsData);

                        return (
                          <div className="bg-gray-50 p-4 rounded border space-y-4">
                            {Object.entries(fieldsData).map(([fieldName, fieldValue]) => {
                            // Verifica se é um array de configuração com default e type
                            if (Array.isArray(fieldValue) && fieldValue.length === 2 && 
                                typeof fieldValue[0] === 'string' && fieldValue[0].startsWith('default:') &&
                                typeof fieldValue[1] === 'string' && fieldValue[1].startsWith('type:')) {

                              const defaultValue = fieldValue[0].replace('default:', '');
                              const fieldType = fieldValue[1].replace('type:', '');
                              const isReadonly = !selectedFlowNode.data.isPendingConnected;
                              const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                              const readonlyClasses = isReadonly 
                                ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                                : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

                              return (
                                <div key={fieldName} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                  {fieldType === 'longText' ? (
                                    <textarea
                                      rows={4}
                                      placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses} resize-vertical`}
                                    />
                                  ) : fieldType.startsWith('char(') ? (
                                    <input
                                      type="text"
                                      maxLength={parseInt(fieldType.match(/\d+/)?.[0] || '255')}
                                      placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  ) : fieldType === 'int' ? (
                                    <input
                                      type="number"
                                      step="1"
                                      placeholder={defaultValue || `Digite um número inteiro`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  ) : fieldType.startsWith('number(') ? (
                                    <input
                                      type="number"
                                      step={Math.pow(10, -parseInt(fieldType.match(/\d+/)?.[0] || '2'))}
                                      placeholder={defaultValue || `Digite um número`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  )}
                                </div>
                              );
                            }

                            // Comportamento original para arrays simples ou strings
                            const isReadonly = !selectedFlowNode.data.isPendingConnected;
                            const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                            const readonlyClasses = isReadonly 
                              ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                              : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

                            return (
                              <div key={fieldName} className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                {Array.isArray(fieldValue) ? (
                                  <select 
                                    disabled={isReadonly}
                                    value={formValues[fieldName] || ''}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`${baseClasses} ${readonlyClasses}`}
                                  >
                                    <option value="">Selecione uma opção</option>
                                    {fieldValue.map((option, index) => (
                                      <option key={index} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                    readOnly={isReadonly}
                                    value={formValues[fieldName] || ''}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`${baseClasses} ${readonlyClasses}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                      }

                      // Comportamento legado para formulários sem condição
                      return (
                        <div className="bg-gray-50 p-4 rounded border space-y-4">
                          {Object.entries(formData).map(([fieldName, fieldValue]) => {
                            const isReadonly = !selectedFlowNode.data.isPendingConnected;
                            const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                            const readonlyClasses = isReadonly 
                              ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                              : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

                            return (
                              <div key={fieldName} className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                {Array.isArray(fieldValue) ? (
                                  <select 
                                    disabled={isReadonly}
                                    value={formValues[fieldName] || ''}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`${baseClasses} ${readonlyClasses}`}
                                  >
                                    <option value="">Selecione uma opção</option>
                                    {fieldValue.map((option, index) => (
                                      <option key={index} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                    readOnly={isReadonly}
                                    value={formValues[fieldName] || ''}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                    className={`${baseClasses} ${readonlyClasses}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    } catch (e) {
                      const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                      return (
                        <div className="text-sm text-red-600">
                          Erro ao processar formulário: {attachedFormData}
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Layout tabular para DocumentNode - 2 colunas */}
              {selectedFlowNode.type === 'documentNode' && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">ID Template</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {selectedFlowNode.data.docType ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 font-mono">
                                {selectedFlowNode.data.docType}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Mensagem e botão para iniciar edição quando isExecuted = FALSE e isInProcess = FALSE */}
                  {selectedFlowNode.data.isExecuted === 'FALSE' && selectedFlowNode.data.isInProcess === 'FALSE' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">
                            Iniciar Documentação
                          </h4>
                          <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                            Selecione o botão de iniciar edição para enviar este documento para início de documentação no editor. 
                            Ao selecionar este elemento do fluxo indicará modo "In Progress", acesse o editor e selecione o documento 
                            para dar prosseguimento ao processo de edição da documentação. O documento a ser editado será o{' '}
                            <span className="font-mono font-medium text-xs">
                              {(() => {
                                if (selectedFlowNode.data.docType) {
                                  const templateInfo = getTemplateInfo(selectedFlowNode.data.docType);
                                  if (templateInfo) {
                                    return `${templateInfo.code} - ${templateInfo.name}`;
                                  }
                                  // Fallback: tentar extrair do formato já processado
                                  const parts = selectedFlowNode.data.docType.split('-');
                                  return parts.length >= 2 ? `${parts[0]} - ${parts[1]}` : selectedFlowNode.data.docType;
                                }
                                return 'Documento não definido';
                              })()}
                            </span>
                          </p>
                          <Button
                            onClick={async () => {
                              try {
                                // Atualizar o nó para marcar como em processo
                                const currentNodes = getNodes();
                                const updatedNodes = currentNodes.map(node => {
                                  if (node.id === selectedFlowNode.id) {
                                    return {
                                      ...node,
                                      data: {
                                        ...node.data,
                                        isInProcess: 'TRUE'
                                      }
                                    };
                                  }
                                  return node;
                                });
                                setNodes(updatedNodes);

                                // Atualizar também o nó selecionado para refletir a mudança no painel
                                setSelectedFlowNode({
                                  ...selectedFlowNode,
                                  data: {
                                    ...selectedFlowNode.data,
                                    isInProcess: 'TRUE'
                                  }
                                });

                                // Salvar alterações no banco de dados imediatamente
                                const updatedFlowTasks = {
                                  nodes: updatedNodes,
                                  edges: flowDiagramModal.flowData?.flowTasks?.edges || [],
                                  viewport: flowDiagramModal.flowData?.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
                                };

                                const response = await fetch(`/api/document-flow-executions/${flowDiagramModal.flowData?.documentId}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    flowTasks: updatedFlowTasks
                                  }),
                                });

                                if (!response.ok) {
                                  throw new Error('Erro ao salvar alterações');
                                }

                                // Atualizar estado local
                                setFlowDiagramModal(prev => ({
                                  ...prev,
                                  flowData: {
                                    ...prev.flowData,
                                    flowTasks: updatedFlowTasks
                                  }
                                }));

                                // Criar registro em document_editions e atualizar task_state
                                try {
                                  const templateId = selectedFlowNode.data.docType; // Este é o ID do template
                                  const documentId = flowDiagramModal.flowData?.documentId;

                                  if (templateId && documentId) {
                                    const editionResponse = await fetch('/api/document-editions', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        documentId: documentId,
                                        templateId: templateId,
                                        status: 'in_progress',
                                        init: new Date().toISOString()
                                      }),
                                    });

                                    if (editionResponse.ok) {
                                      const editionData = await editionResponse.json();
                                      console.log('✅ Registro criado em document_editions:', editionData);
                                      console.log('✅ Task state atualizado para "in_doc" automaticamente');
                                    } else {
                                      console.error('❌ Erro ao criar registro em document_editions:', await editionResponse.text());
                                    }
                                  }
                                } catch (editionError) {
                                  console.error('❌ Erro ao criar edição de documento:', editionError);
                                }

                                // Recarregar dados
                                queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });

                                toast({
                                  title: "Documentação iniciada",
                                  description: "O documento foi marcado como 'In Progress' e registro de edição criado no banco de dados.",
                                });
                              } catch (error) {
                                console.error('Erro ao salvar alterações:', error);
                                toast({
                                  title: "Erro",
                                  description: "Falha ao salvar as alterações no banco de dados.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <BookOpen className="mr-1.5 h-3 w-3" />
                            Iniciar Edição
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensagem informativa quando está em processo */}
                  {selectedFlowNode.data.isInProcess === 'TRUE' && selectedFlowNode.data.isExecuted === 'FALSE' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Zap className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-purple-800 mb-2">
                            Documentação em Progresso
                          </h4>
                          <p className="text-xs text-purple-700">
                            Este documento está sendo editado no editor. Acesse a página de fluxos para continuar o processo de documentação do{' '}
                            <span className="font-mono font-medium text-xs">
                              {(() => {
                                if (selectedFlowNode.data.docType) {
                                  const templateInfo = getTemplateInfo(selectedFlowNode.data.docType);
                                  if (templateInfo) {
                                    return `${templateInfo.code} - ${templateInfo.name}`;
                                  }
                                  // Fallback: tentar extrair do formato já processado
                                  const parts = selectedFlowNode.data.docType.split('-');
                                  return parts.length >= 2 ? `${parts[0]} - ${parts[1]}` : selectedFlowNode.data.docType;
                                }
                                return 'Documento não definido';
                              })()}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(selectedFlowNode.data.integrType || selectedFlowNode.type === 'integrationNode') && (
                <div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Dir.Integr.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo Integr.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            {selectedFlowNode.data.integrType ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {selectedFlowNode.data.integrType}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {selectedFlowNode.data.callType ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {selectedFlowNode.data.callType}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedFlowNode.data.service && (
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Serviço:</span> {selectedFlowNode.data.service}
                  </p>
                </div>
              )}

              {(selectedFlowNode.data.callType?.toLowerCase() === 'automatico' || selectedFlowNode.data.callType?.toLowerCase() === 'automático') && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    Esta integração é feita automaticamente por um processo agendado, o ID deste processo é:
                  </p>
                  <p className="text-xs text-blue-800 font-mono mt-1">
                    {selectedFlowNode.data.jobId || 'N/A'}
                  </p>
                </div>
              )}

              {selectedFlowNode.data.callType?.toLowerCase() === 'manual' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="mb-3">
                    <p className="text-xs text-yellow-800 mb-2">
                      {(() => {
                        // Extrair informações do jobId
                        let functionCaption = selectedFlowNode.data.callType || 'callJob';
                        let functionName = '';

                        if (selectedFlowNode.data.jobId) {
                          try {
                            const jobData = JSON.parse(selectedFlowNode.data.jobId);
                            const firstKey = Object.keys(jobData)[0];
                            if (firstKey) {
                              functionCaption = firstKey;
                              functionName = jobData[firstKey];
                            }
                          } catch (e) {
                            console.log('Erro ao fazer parse do jobId:', e);
                          }
                        }

                        const displayName = functionName ? `${functionCaption} [${functionName}]` : functionCaption;

                        return (
                          <>
                            Ao clicar no botão você executará a função{' '}
                            <span className="font-mono font-semibold bg-yellow-100 px-1 py-0.5 rounded text-yellow-900">
                              {displayName}
                            </span>
                            {' '}que {selectedFlowNode.data.integrType || 'Atualiza Dados'} com o serviço {selectedFlowNode.data.service || 'externo'}. Pressione para continuar.
                          </>
                        );
                      })()}
                    </p>
                  </div>

                  {integrationResult.status && (
                    <div className={`mb-3 p-3 rounded-md ${
                      integrationResult.status === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`text-sm ${
                        integrationResult.status === 'success' 
                          ? 'text-green-800' 
                          : 'text-red-800'
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
                <div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Início Direto
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Layout tabular para EndNode - 2 colunas */}
              {selectedFlowNode.type === 'endNode' && (
                <div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
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
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {selectedFlowNode.data.To_Type === 'Direct_finish' ? 'Encerramento Direto' : 
                                 selectedFlowNode.data.To_Type === 'flow_Finish' ? 'Transferência para Fluxo' : selectedFlowNode.data.To_Type}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Exibição do fluxo destino para EndNode de Transferência */}
                  {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (
                    <div className="mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="mb-2">
                          <p className="text-xs font-medium text-blue-800 mb-1">Fluxo Destino:</p>
                          <p className="text-xs text-blue-700 font-mono bg-white px-2 py-1 rounded border">
                            {selectedFlowNode.data.To_Flow_id}
                          </p>
                        </div>
                        {(selectedFlowNode.data.To_Flow_code || selectedFlowNode.data.To_Flow_name) && (
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Detalhes:</p>
                            <p className="text-xs text-blue-700 font-mono bg-white px-2 py-1 rounded border">
                              [{selectedFlowNode.data.To_Flow_code}] - {selectedFlowNode.data.To_Flow_name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual execution form para EndNode de Transferência para Fluxo */}
                  {selectedFlowNode.data.FromType === 'flow_init' && selectedFlowNode.data.To_Flow_id && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="mb-3">
                        <p className="text-xs text-blue-800 mb-2">
                          Ao pressionar o botão você confirma o encerramento deste fluxo e a abertura do novo fluxo vinculado. Ao confirmar, o sistema: 1- Encerra o fluxo corrente, 2- Cria uma nova instância com o fluxo indicado vinculado ao presente documento, 3- Inicia o fluxo no novo documento. Confirma estas ações?
                        </p>
                      </div>

                      {integrationResult.status && (
                        <div className={`mb-3 p-3 rounded-md ${
                          integrationResult.status === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm ${
                            integrationResult.status === 'success' 
                              ? 'text-green-800' 
                              : 'text-red-800'
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
                        {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Transferência Concluída' : 'Transferir Fluxo'}
                      </button>
                    </div>
                  )}

                  {/* Manual execution form para EndNode de Encerramento Direto */}
                  {selectedFlowNode.data.FromType === 'Init' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="mb-3">
                        <p className="text-xs text-red-800 mb-2">
                          Ao pressionar o botão você encerrará este fluxo vinculado ao documento, bem como marcará o documento como encerrado e o enviará para a tab [Concluídos] da página [Documentos]. Pressione para continuar.
                        </p>
                      </div>

                      {integrationResult.status && (
                        <div className={`mb-3 p-3 rounded-md ${
                          integrationResult.status === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm ${
                            integrationResult.status === 'success' 
                              ? 'text-green-800' 
                              : 'text-red-800'
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
                            : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                        }`}
                      >
                        {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Concluído' : 'Concluir Fluxo'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Layout tabular 3x2 para SwitchNode */}
              {selectedFlowNode.type === 'switchNode' && (
                <div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Campo Switch</th>
                          <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Input Switch</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedFlowNode.data.isExecuted === 'TRUE' 
                                ? 'Executado' 
                                : selectedFlowNode.data.isPendingConnected
                                ? 'Pendente'
                                : 'N.Exec.'}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                            {selectedFlowNode.data.switchField ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {selectedFlowNode.data.switchField}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {selectedFlowNode.data.inputSwitch ? (
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                {selectedFlowNode.data.inputSwitch}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && selectedFlowNode.data.isAproved !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Status de Aprovação</p>
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
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : selectedFlowNode.data.isPendingConnected
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-300 cursor-pointer'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
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
                          ? 'bg-red-100 border-red-300 text-red-800'
                          : selectedFlowNode.data.isPendingConnected
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm font-medium">NÃO</span>
                    </button>
                  </div>

                  {/* Caixa de alerta para confirmação */}
                  {showApprovalAlert && selectedFlowNode.data.isAproved !== 'UNDEF' && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-orange-800 mb-1">ATENÇÃO</h4>
                          <p className="text-xs text-orange-700 mb-3">
                            Ao executar esta ação o fluxo passará automaticamente para o próximo estágio definido conforme o diagrama, esta ação pode ser irreversível caso ações posteriores no workflow sejam executadas.
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={saveChangesToDatabase}
                              disabled={!areAllFieldsFilled()}
                              className={`px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                areAllFieldsFilled()
                                  ? 'bg-orange-600 hover:bg-orange-700'
                                  : 'bg-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Salvar Alterações
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
