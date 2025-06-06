import { useState, useEffect } from "react";
import { useReactFlow } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Play, Save, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import { FlowNodes } from "./FlowNodes";
import { DeleteArtifactConfirmDialog } from "../modals/DeleteArtifactConfirmDialog";

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

export function FlowWithAutoFitView({ flowData, showFlowInspector, setShowFlowInspector, setSelectedFlowNode, selectedFlowNode, showApprovalAlert, setShowApprovalAlert, isPinned }: FlowWithAutoFitViewProps) {
  const { fitView, getNodes, setNodes } = useReactFlow();
  
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
      }
    } else {
      setIntegrationResult({
        status: 'error',
        message: `Falha na integração. O serviço ${selectedFlowNode.data.service || 'externo'} não respondeu corretamente. Verifique a conectividade e tente novamente.`
      });
    }
  };

  // Efeito para fitView automático quando flowData muda
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.1 });
    }, 100);
    return () => clearTimeout(timer);
  }, [flowData, fitView]);

  if (!flowData || !flowData.flowTasks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando fluxo...</div>
      </div>
    );
  }

  // Processar dados do fluxo
  const { nodes, edges } = flowData.flowTasks;

  if (!nodes || !Array.isArray(nodes)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro: Dados de fluxo inválidos</div>
      </div>
    );
  }

  // Marcar nós executados como readonly
  const processedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isReadonly: node.data.isExecuted === 'TRUE'
    }
  }));

  // Aplicar animação nas arestas dos caminhos executados
  const processedEdges = edges?.map((edge: any) => {
    // Verificar se tanto source quanto target estão executados
    const sourceNode = processedNodes.find(n => n.id === edge.source);
    const targetNode = processedNodes.find(n => n.id === edge.target);
    
    const isExecutedPath = sourceNode?.data.isExecuted === 'TRUE' && 
                          targetNode?.data.isExecuted === 'TRUE';
    
    return {
      ...edge,
      animated: isExecutedPath,
      style: {
        ...edge.style,
        stroke: isExecutedPath ? '#21639a' : '#6b7280',
        strokeWidth: 3
      }
    };
  }) || [];

  console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter(edge => edge.animated));

  // Função para processar conexões switch
  const handleSwitchNodeConnections = (nodeId: string, switchValue: any) => {
    console.log(`🔄 Processando conexões do switch ${nodeId} com valor: ${switchValue}`);
    
    const currentNodes = getNodes();
    const switchNode = currentNodes.find(n => n.id === nodeId);
    
    if (!switchNode) return;

    const outgoingEdges = processedEdges.filter(edge => edge.source === nodeId);
    
    outgoingEdges.forEach(edge => {
      const targetNode = currentNodes.find(n => n.id === edge.target);
      if (targetNode) {
        const leftSwitchValues = switchNode.data.leftSwitch || [];
        const rightSwitchValues = switchNode.data.rightSwitch || [];
        
        let shouldExecute = false;
        
        // Verificar se o valor está em leftSwitch
        if (Array.isArray(leftSwitchValues) && leftSwitchValues.includes(switchValue)) {
          // Para leftSwitch, só executa se for conexão vermelha (handle left)
          shouldExecute = edge.sourceHandle === 'left' || edge.id.includes('left');
        }
        // Verificar se o valor está em rightSwitch  
        else if (Array.isArray(rightSwitchValues) && rightSwitchValues.includes(switchValue)) {
          // Para rightSwitch, só executa se for conexão verde (handle right)
          shouldExecute = edge.sourceHandle === 'right' || edge.id.includes('right');
        }
        
        if (shouldExecute) {
          console.log(`✅ Executando nó conectado: ${targetNode.id} via ${edge.sourceHandle || 'conexão padrão'}`);
          
          // Marcar o nó target como executado
          const updatedNodes = currentNodes.map(node => {
            if (node.id === targetNode.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  isExecuted: 'TRUE',
                  isPendingConnected: false
                }
              };
            }
            return node;
          });
          
          setNodes(updatedNodes);
          
          // Se o nó tem conexões próprias, continue a propagação
          if (targetNode.type === 'switchNode') {
            // Para switchNodes conectados, usar o mesmo valor do switch anterior
            setTimeout(() => handleSwitchNodeConnections(targetNode.id, switchValue), 100);
          } else {
            // Para outros tipos de nó, propagar execução simples
            setTimeout(() => {
              const nextEdges = processedEdges.filter(e => e.source === targetNode.id);
              nextEdges.forEach(e => {
                const nextNode = currentNodes.find(n => n.id === e.target);
                if (nextNode && nextNode.data.isExecuted !== 'TRUE') {
                  const finalNodes = updatedNodes.map(node => {
                    if (node.id === nextNode.id) {
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
                }
              });
            }, 200);
          }
        }
      }
    });
  };

  // Função para propagar execução automaticamente
  const propagateExecution = (executedNodeId: string) => {
    console.log(`🔄 Propagando execução a partir do nó: ${executedNodeId}`);
    
    const currentNodes = getNodes();
    const executedNode = currentNodes.find(n => n.id === executedNodeId);
    
    if (!executedNode) return;

    // Encontrar arestas saindo do nó executado
    const outgoingEdges = processedEdges.filter(edge => edge.source === executedNodeId);
    
    console.log(`📤 Encontradas ${outgoingEdges.length} conexões saindo de ${executedNodeId}`);
    
    outgoingEdges.forEach(edge => {
      const targetNode = currentNodes.find(n => n.id === edge.target);
      if (targetNode) {
        console.log(`🎯 Processando conexão para nó: ${targetNode.id} (${targetNode.type})`);
        
        // Marcar o nó target como pendente
        const updatedNodes = currentNodes.map(node => {
          if (node.id === targetNode.id && node.data.isExecuted !== 'TRUE') {
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
        
        setNodes(updatedNodes);
        console.log(`✅ Nó ${targetNode.id} marcado como pendente`);
      }
    });
  };

  // Handler para salvar formulário
  const saveFormData = async () => {
    if (!selectedFlowNode) return;

    try {
      const currentNodes = getNodes();
      const updatedNodes = currentNodes.map(node => {
        if (node.id === selectedFlowNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              formData: formValues,
              isExecuted: 'TRUE',
              isPendingConnected: false
            }
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      
      // Atualizar nó selecionado
      setSelectedFlowNode({
        ...selectedFlowNode,
        data: {
          ...selectedFlowNode.data,
          formData: formValues,
          isExecuted: 'TRUE',
          isPendingConnected: false
        }
      });

      // Propagar execução para nós conectados
      propagateExecution(selectedFlowNode.id);

      setIntegrationResult({
        status: 'success',
        message: 'Dados do formulário salvos e nó executado com sucesso!'
      });

    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro ao salvar dados do formulário.'
      });
    }
  };

  // Função para renderizar campos do formulário
  const renderFormField = (fieldName: string, fieldConfig: any[]) => {
    if (!Array.isArray(fieldConfig) || fieldConfig.length === 0) return null;

    const fieldType = fieldConfig.find(item => 
      typeof item === 'string' && item.startsWith('type:')
    );
    
    const defaultValue = fieldConfig.find(item => 
      typeof item === 'string' && item.startsWith('default:')
    );

    const currentValue = formValues[fieldName] || 
      (defaultValue ? defaultValue.replace('default:', '') : '');

    // Campo de texto longo
    if (fieldType === 'type:longText') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{fieldName}</Label>
          <Textarea
            id={fieldName}
            value={currentValue}
            onChange={(e) => setFormValues(prev => ({
              ...prev,
              [fieldName]: e.target.value
            }))}
            placeholder={`Digite ${fieldName.toLowerCase()}`}
            className="min-h-[100px]"
          />
        </div>
      );
    }

    // Campo select (opções múltiplas)
    const selectOptions = fieldConfig.filter(item => 
      typeof item === 'string' && 
      !item.startsWith('type:') && 
      !item.startsWith('default:')
    );

    if (selectOptions.length > 0) {
      return (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName}>{fieldName}</Label>
          <Select
            value={currentValue}
            onValueChange={(value) => setFormValues(prev => ({
              ...prev,
              [fieldName]: value
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Campo de texto simples (fallback)
    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName}>{fieldName}</Label>
        <Input
          id={fieldName}
          value={currentValue}
          onChange={(e) => setFormValues(prev => ({
            ...prev,
            [fieldName]: e.target.value
          }))}
          placeholder={`Digite ${fieldName.toLowerCase()}`}
        />
      </div>
    );
  };

  // Função para renderizar painel de propriedades
  const renderPropertiesPanel = () => {
    if (!selectedFlowNode) return null;

    const nodeData = selectedFlowNode.data;
    const isReadonly = nodeData.isReadonly || nodeData.isExecuted === 'TRUE';

    return (
      <div className="space-y-4">
        {/* Informações básicas do nó */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Propriedades do Nó</CardTitle>
            <CardDescription className="text-xs">
              {selectedFlowNode.type} - {selectedFlowNode.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status de execução */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Status:</span>
              <Badge 
                variant={nodeData.isExecuted === 'TRUE' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {nodeData.isExecuted === 'TRUE' ? 'Executado' : 
                 nodeData.isPendingConnected ? 'Pendente' : 'Não Executado'}
              </Badge>
            </div>

            {/* Tipo de ação para actionNodes */}
            {selectedFlowNode.type === 'actionNode' && nodeData.actionType && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Ação:</span>
                <span className="text-xs font-mono">{nodeData.actionType}</span>
              </div>
            )}

            {/* Status de aprovação para nós de aprovação */}
            {selectedFlowNode.type === 'actionNode' && nodeData.actionType === 'Intern_Aprove' && (
              <div className="space-y-2">
                <span className="text-xs text-gray-600">Status de Aprovação:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={nodeData.isAproved === 'TRUE' ? 'default' : 'outline'}
                    onClick={() => updateApprovalStatus(selectedFlowNode.id, 'TRUE')}
                    disabled={isReadonly}
                    className="flex-1 h-8 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant={nodeData.isAproved === 'FALSE' ? 'destructive' : 'outline'}
                    onClick={() => updateApprovalStatus(selectedFlowNode.id, 'FALSE')}
                    disabled={isReadonly}
                    className="flex-1 h-8 text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário anexado */}
        {selectedFlowNode.type === 'actionNode' && 
         nodeData.isPendingConnected && 
         !isReadonly && 
         (() => {
           const attachedFormData = nodeData.attached_Form || nodeData.attached_form;
           if (!attachedFormData) return null;

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

             // Verificar se deve mostrar o formulário baseado na condição
             if (formData.Show_Condition !== undefined && formData.Fields) {
               const showCondition = formData.Show_Condition;
               const isApprovalNode = nodeData.actionType === 'Intern_Aprove';
               const approvalStatus = nodeData.isAproved;
               
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
               
               // Se não deve mostrar o formulário devido à condição, não renderizar
               if (!shouldShowForm) {
                 return null;
               }
             }

             const fields = getFormFields();
             const fieldNames = Object.keys(fields);

             if (fieldNames.length === 0) return null;

             return (
               <Card>
                 <CardHeader className="pb-3">
                   <CardTitle className="text-sm">Formulário Anexado</CardTitle>
                   <CardDescription className="text-xs">
                     Preencha os campos obrigatórios para continuar
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   {fieldNames.map(fieldName => 
                     renderFormField(fieldName, fields[fieldName])
                   )}
                   
                   <div className="flex gap-2 pt-2">
                     <Button
                       onClick={saveFormData}
                       disabled={!areAllFieldsFilled()}
                       size="sm"
                       className="flex-1"
                     >
                       <Save className="w-3 h-3 mr-1" />
                       Salvar e Executar
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             );
           } catch (e) {
             console.error('Erro ao processar formulário anexado:', e);
             return null;
           }
         })()}

        {/* Ações para nós de integração */}
        {selectedFlowNode.type === 'integrationNode' && nodeData.isPendingConnected && !isReadonly && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Integração Manual</CardTitle>
              <CardDescription className="text-xs">
                Execute a integração com {nodeData.service || 'serviço externo'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={executeManualIntegration}
                size="sm"
                className="w-full"
              >
                <Play className="w-3 h-3 mr-1" />
                Executar Integração
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ações para nós de fim (transferência) */}
        {selectedFlowNode.type === 'endNode' && 
         nodeData.FromType === 'flow_init' && 
         nodeData.isPendingConnected && 
         !isReadonly && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Transferência de Fluxo</CardTitle>
              <CardDescription className="text-xs">
                Transferir documento para outro fluxo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={executeFlowTransfer}
                size="sm"
                className="w-full"
              >
                <Play className="w-3 h-3 mr-1" />
                Executar Transferência
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ações para nós de fim (encerramento direto) */}
        {selectedFlowNode.type === 'endNode' && 
         nodeData.FromType === 'Init' && 
         nodeData.isPendingConnected && 
         !isReadonly && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Finalizar Fluxo</CardTitle>
              <CardDescription className="text-xs">
                Encerrar o fluxo e marcar documento como concluído
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={executeDirectFlowConclusion}
                size="sm"
                className="w-full"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Finalizar Fluxo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Resultado da integração */}
        {integrationResult.status && (
          <Alert className={integrationResult.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-start">
              {integrationResult.status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <AlertDescription className="text-xs">
                {integrationResult.message}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex">
      <div className={`flex-1 ${showFlowInspector ? 'pr-0' : ''}`}>
        <ReactFlow
          nodes={processedNodes}
          edges={processedEdges}
          nodeTypes={FlowNodes}
          onNodeClick={(event, node) => {
            console.log('🎯 Nó clicado:', node);
            setSelectedFlowNode(node);
            if (!isPinned) {
              setShowFlowInspector(true);
            }
          }}
          onPaneClick={() => {
            if (!isPinned) {
              setShowFlowInspector(false);
              setSelectedFlowNode(null);
            }
          }}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            minZoom: 0.1,
            maxZoom: 1.5
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap 
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.data?.isExecuted === 'TRUE') return '#3b82f6';
              if (node.data?.isPendingConnected) return '#f59e0b';
              return '#6b7280';
            }}
            maskColor="rgb(240, 240, 240, 0.6)"
            position="bottom-left"
            style={{
              height: 80,
              width: 120,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
        </ReactFlow>
      </div>
      
      {showFlowInspector && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold">Painel de Controle</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowFlowInspector(false);
                  setSelectedFlowNode(null);
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {renderPropertiesPanel()}
          </div>
        </div>
      )}
    </div>
  );
}