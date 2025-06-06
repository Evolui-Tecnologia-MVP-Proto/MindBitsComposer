import { useReactFlow, ReactFlow, Controls, Background } from 'reactflow';
import { useState, useEffect } from 'react';

interface FlowWithAutoFitViewProps {
  flowData: any;
  showFlowInspector: boolean;
  setShowFlowInspector: (show: boolean) => void;
  setSelectedFlowNode: (node: any) => void;
  selectedFlowNode: any;
  showApprovalAlert: boolean;
  setShowApprovalAlert: (show: boolean) => void;
  isPinned: boolean;
}

export function FlowWithAutoFitView({ 
  flowData, 
  showFlowInspector, 
  setShowFlowInspector, 
  setSelectedFlowNode, 
  selectedFlowNode, 
  showApprovalAlert, 
  setShowApprovalAlert, 
  isPinned 
}: FlowWithAutoFitViewProps) {
  const { fitView, getNodes, setNodes } = useReactFlow();
  const [nodes, setLocalNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  
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

      // Salvar alterações no banco
      await saveChangesToDatabase(updatedFlowTasks);

      setIntegrationResult({
        status: 'success',
        message: 'Transferência de fluxo executada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao executar transferência:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro ao executar transferência de fluxo.'
      });
    }
  };

  // Função para executar conclusão direta do fluxo
  const executeDirectFlowConclusion = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'endNode' || selectedFlowNode.data.FromType !== 'direct_conclusion') {
      console.log('Nenhum endNode de conclusão direta selecionado');
      return;
    }

    console.log('Executando conclusão direta do fluxo...');
    
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
      }

      // Preparar dados atualizados do fluxo
      const updatedFlowTasks = {
        nodes: updatedNodes,
        edges: edges,
        viewport: flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
      };

      // Salvar alterações no banco
      await saveChangesToDatabase(updatedFlowTasks);

      setIntegrationResult({
        status: 'success',
        message: 'Conclusão direta do fluxo executada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao executar conclusão direta:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro ao executar conclusão direta do fluxo.'
      });
    }
  };

  // Função para executar integração manual
  const executeManualIntegration = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode' || selectedFlowNode.data.actionType !== 'Manual_Integration') {
      console.log('Nenhum actionNode de integração manual selecionado');
      return;
    }

    console.log('Executando integração manual...');
    
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
      }

      // Preparar dados atualizados do fluxo
      const updatedFlowTasks = {
        nodes: updatedNodes,
        edges: edges,
        viewport: flowData.flowTasks?.viewport || { x: 0, y: 0, zoom: 1 }
      };

      // Salvar alterações no banco
      await saveChangesToDatabase(updatedFlowTasks);

      setIntegrationResult({
        status: 'success',
        message: 'Integração manual executada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao executar integração manual:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro ao executar integração manual.'
      });
    }
  };

  // Função para salvar alterações no banco de dados
  const saveChangesToDatabase = async (updatedFlowTasks: any) => {
    try {
      const response = await fetch('/api/flow/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: flowData.id,
          flowTasks: updatedFlowTasks
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar alterações no banco de dados');
      }

      console.log('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      throw error;
    }
  };

  // Função para obter a cor do handle do switch
  const getSwitchHandleColor = (switchValue: any) => {
    return switchValue === 'TRUE' ? '#22c55e' : '#ef4444';
  };

  // Função para lidar com clique em nó
  const onNodeClick = (event: any, node: any) => {
    setSelectedFlowNode(node);
    setShowFlowInspector(true);
  };

  // Função para lidar com clique no painel
  const onPaneClick = () => {
    if (!isPinned) {
      setShowFlowInspector(false);
      setSelectedFlowNode(null);
    }
  };

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={flowData.flowTasks?.nodes || []}
        edges={flowData.flowTasks?.edges || []}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
} 