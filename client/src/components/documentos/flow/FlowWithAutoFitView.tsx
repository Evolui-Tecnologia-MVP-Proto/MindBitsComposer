import React, { useEffect, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlowNodes } from "./FlowNodes";

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
  
  // Estado para controlar os valores dos campos do formulário
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Estado para controlar resultado da execução de integração
  const [integrationResult, setIntegrationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  
  // Carregar dados salvos quando um nó é selecionado
  useEffect(() => {
    if (selectedFlowNode && selectedFlowNode.data && selectedFlowNode.data.formData) {
      console.log('🔄 Carregando dados salvos do formulário:', selectedFlowNode.data.formData);
      setFormValues(selectedFlowNode.data.formData);
    } else {
      // Limpar formulário se não há dados salvos
      setFormValues({});
    }
    
    // Limpar resultado da integração ao mudar de nó
    setIntegrationResult({ status: null, message: '' });
  }, [selectedFlowNode?.id, selectedFlowNode?.data?.formData]);
  
  // Função helper para extrair dados do formulário
  const getFormFields = () => {
    try {
      if (!selectedFlowNode) {
        console.log('🔍 getFormFields: Nenhum nó selecionado');
        return {};
      }
      
      const attachedFormData = selectedFlowNode.data?.attached_Form || selectedFlowNode.data?.attached_form;
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
      const fields = getFormFields();
      
      // Verifica se todos os campos obrigatórios estão preenchidos
      const requiredFields = Object.entries(fields).filter(([, fieldData]: [string, any]) => {
        return Array.isArray(fieldData) && fieldData.includes('required');
      });

      for (const [fieldName] of requiredFields) {
        if (!formValues[fieldName] || formValues[fieldName].trim() === '') {
          return false;
        }
      }

      return true;
    } catch (e) {
      console.log('Erro ao validar campos:', e);
      return true; // Em caso de erro, permite salvar
    }
  };

  // Função para renderizar campos do formulário
  const renderFormFields = () => {
    const fields = getFormFields();
    
    if (!fields || Object.keys(fields).length === 0) {
      return <p className="text-gray-500 text-sm">Nenhum formulário anexado</p>;
    }

    return Object.entries(fields).map(([fieldName, fieldData]) => {
      const isRequired = Array.isArray(fieldData) && fieldData.includes('required');
      const currentValue = formValues[fieldName] || '';
      
      return (
        <div key={fieldName} className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {fieldName} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={currentValue}
            onChange={(e) => setFormValues(prev => ({
              ...prev,
              [fieldName]: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Digite ${fieldName.toLowerCase()}`}
          />
        </div>
      );
    });
  };

  // Função para salvar alterações do formulário
  const handleSaveChanges = async () => {
    if (!selectedFlowNode) return;

    try {
      console.log('💾 Salvando alterações do formulário:', {
        nodeId: selectedFlowNode.id,
        formValues
      });

      // 1. Atualizar o nó local com os dados do formulário
      const updatedNodes = getNodes().map(node => {
        if (node.id === selectedFlowNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              formData: formValues // Salvar dados do formulário
            }
          };
        }
        return node;
      });

      // 2. Atualizar os nós no React Flow
      setNodes(updatedNodes);

      // 3. Atualizar o nó selecionado com os novos dados
      const updatedSelectedNode = updatedNodes.find(n => n.id === selectedFlowNode.id);
      if (updatedSelectedNode) {
        setSelectedFlowNode(updatedSelectedNode);
      }

      // 4. Preparar dados para envio ao servidor
      const updatedFlowTasks = {
        ...flowData.flowTasks,
        nodes: updatedNodes
      };

      // 5. Enviar para o servidor (atualizar execução do fluxo, não o template)
      const response = await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
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

      console.log('Dados do formulário salvos com sucesso');
      
      // 6. Mostrar feedback visual (opcional)
      // setToast({ message: 'Dados salvos com sucesso!', type: 'success' });

    } catch (error) {
      console.error('Erro ao salvar dados do formulário:', error);
      // setToast({ message: 'Erro ao salvar dados', type: 'error' });
    }
  };

  // Função para executar integração manual
  const handleExecuteIntegration = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'integrationNode') {
      return;
    }

    console.log('🚀 Executando integração manual para nó:', selectedFlowNode.id);
    setIntegrationResult({ status: null, message: 'Executando...' });

    try {
      const response = await fetch('/api/monday/mappings/execute-headless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mappingId: selectedFlowNode.data.mondayMappingId,
          documentId: flowData.documentId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIntegrationResult({
          status: 'success',
          message: 'Integração executada com sucesso!'
        });
        
        // Marcar o nó como executado automaticamente
        const updatedNodes = getNodes().map(node => {
          if (node.id === selectedFlowNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                isExecuted: 'TRUE',
                executedAt: new Date().toISOString()
              }
            };
          }
          return node;
        });

        setNodes(updatedNodes);
        
        // Atualizar dados no servidor
        const updatedFlowTasks = {
          ...flowData.flowTasks,
          nodes: updatedNodes
        };

        await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            flowTasks: updatedFlowTasks
          }),
        });

      } else {
        setIntegrationResult({
          status: 'error',
          message: result.error || 'Erro na execução da integração'
        });
      }
    } catch (error) {
      console.error('Erro na execução da integração:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro de conexão com o servidor'
      });
    }
  };

  // Função para processar aprovação/rejeição
  const handleApproval = async (approved: boolean) => {
    if (!selectedFlowNode) return;

    try {
      console.log(`💡 Processando ${approved ? 'aprovação' : 'rejeição'} para nó:`, selectedFlowNode.id);

      // 1. Atualizar o nó local
      const updatedNodes = getNodes().map(node => {
        if (node.id === selectedFlowNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              isAproved: approved ? 'TRUE' : 'FALSE',
              isExecuted: 'TRUE', // Marca como executado
              isInProcess: 'FALSE',
              approvedAt: new Date().toISOString(),
              // Manter dados do formulário se existirem
              formData: formValues && Object.keys(formValues).length > 0 ? formValues : node.data.formData
            }
          };
        }
        return node;
      });

      // 2. Processar lógica de fluxo baseada na aprovação
      let finalNodes = [...updatedNodes];
      const currentNode = updatedNodes.find(n => n.id === selectedFlowNode.id);
      
      if (currentNode) {
        // Encontrar edges conectadas ao nó atual
        const connectedEdges = flowData.flowTasks.edges.filter((edge: any) => 
          edge.source === currentNode.id
        );

        console.log('Edges conectadas encontradas:', connectedEdges);

        // 3. Lógica para switchNode conectado
        connectedEdges.forEach((edge: any) => {
          const targetNode = finalNodes.find(n => n.id === edge.target);
          
          if (targetNode && targetNode.type === 'switchNode') {
            console.log('SwitchNode encontrado:', targetNode.id);
            
            // Encontrar todas as edges que saem do switchNode
            const switchEdges = flowData.flowTasks.edges.filter((e: any) => e.source === targetNode.id);
            
            switchEdges.forEach((switchEdge: any) => {
              const nextNode = finalNodes.find(n => n.id === switchEdge.target);
              if (nextNode) {
                // Determinar qual caminho seguir baseado na aprovação
                const shouldActivate = 
                  (approved && (switchEdge.sourceHandle === 'true' || switchEdge.label === 'Sim')) ||
                  (!approved && (switchEdge.sourceHandle === 'false' || switchEdge.label === 'Não'));

                if (shouldActivate) {
                  console.log(`Ativando nó ${nextNode.id} via switch`);
                  
                  // Marcar próximo nó como pendente
                  const nodeIndex = finalNodes.findIndex(n => n.id === nextNode.id);
                  if (nodeIndex !== -1) {
                    finalNodes[nodeIndex] = {
                      ...finalNodes[nodeIndex],
                      data: {
                        ...finalNodes[nodeIndex].data,
                        isPendingConnected: true
                      }
                    };
                  }
                } else {
                  console.log(`Não ativando nó ${nextNode.id} - caminho não escolhido`);
                }
              }
            });
          } else if (targetNode && targetNode.data?.isExecuted !== 'TRUE') {
            // 4. Lógica para nós normais conectados diretamente
            console.log('Ativando próximo nó normal:', targetNode.id);
            
            const nodeIndex = finalNodes.findIndex(n => n.id === targetNode.id);
            if (nodeIndex !== -1) {
              finalNodes[nodeIndex] = {
                ...finalNodes[nodeIndex],
                data: {
                  ...finalNodes[nodeIndex].data,
                  isPendingConnected: true
                }
              };
            }
          }
        });
      }

      // 5. Atualizar estado do React Flow
      setNodes(finalNodes);

      // 6. Atualizar nó selecionado
      const updatedSelectedNode = finalNodes.find(n => n.id === selectedFlowNode.id);
      if (updatedSelectedNode) {
        setSelectedFlowNode(updatedSelectedNode);
      }

      // 7. Enviar para o servidor
      const updatedFlowTasks = {
        ...flowData.flowTasks,
        nodes: finalNodes
      };

      const response = await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
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

      console.log('Aprovação processada com sucesso');
      setShowApprovalAlert(false);

    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.1 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, flowData]);

  return (
    <div className="w-full h-full relative">
      <FlowNodes 
        nodes={flowData.flowTasks.nodes || []} 
        edges={flowData.flowTasks.edges || []} 
        onNodeClick={setSelectedFlowNode}
        isReadOnly={true}
      />
      
      {/* Flow Inspector */}
      {showFlowInspector && selectedFlowNode && (
        <div className={`absolute top-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-w-md ${
          isPinned ? 'right-4' : 'left-4'
        }`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">
              Inspetor de Nó: {selectedFlowNode.data.label}
            </h3>
            <button
              onClick={() => setShowFlowInspector(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Informações Básicas */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-600">ID:</span>
                <span className="ml-2 text-gray-800">{selectedFlowNode.id}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Tipo:</span>
                <span className="ml-2 text-gray-800">{selectedFlowNode.type}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-600">Status:</span>
                <Badge 
                  variant={selectedFlowNode.data.isExecuted === 'TRUE' ? 'default' : 
                           selectedFlowNode.data.isPendingConnected ? 'secondary' : 'outline'}
                  className="ml-2"
                >
                  {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Executado' : 
                   selectedFlowNode.data.isPendingConnected ? 'Pendente' : 'Aguardando'}
                </Badge>
              </div>
            </div>

            {/* Descrição (se existir) */}
            {selectedFlowNode.data.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Descrição:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {selectedFlowNode.data.description}
                </p>
              </div>
            )}

            {/* Formulário (para actionNodes) */}
            {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.isPendingConnected && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Formulário:</h4>
                <div className="space-y-3">
                  {renderFormFields()}
                </div>
                
                {/* Botão para salvar dados do formulário */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveChanges}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Salvar Dados
                  </button>
                </div>
              </div>
            )}

            {/* Botão de execução manual para integrationNode */}
            {selectedFlowNode.type === 'integrationNode' && 
             selectedFlowNode.data.isPendingConnected && 
             selectedFlowNode.data.isExecuted !== 'TRUE' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Integração Manual:</h4>
                <div className="space-y-2">
                  <button
                    onClick={handleExecuteIntegration}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    disabled={integrationResult.status === null && integrationResult.message === 'Executando...'}
                  >
                    {integrationResult.message === 'Executando...' ? 'Executando...' : 'Executar Integração'}
                  </button>
                  
                  {/* Resultado da execução */}
                  {integrationResult.status && (
                    <div className={`text-xs p-2 rounded ${
                      integrationResult.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {integrationResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controles de Aprovação/Rejeição */}
            {selectedFlowNode.type === 'actionNode' && 
             selectedFlowNode.data.actionType === 'Intern_Aprove' && 
             selectedFlowNode.data.isPendingConnected && 
             selectedFlowNode.data.isExecuted !== 'TRUE' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Ação Requerida:</h4>
                
                {/* Validação de campos obrigatórios */}
                {!areAllFieldsFilled() && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ Preencha todos os campos obrigatórios antes de aprovar/rejeitar
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApproval(true)}
                    disabled={!areAllFieldsFilled()}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      areAllFieldsFilled() 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleApproval(false)}
                    disabled={!areAllFieldsFilled()}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      areAllFieldsFilled() 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            )}

            {/* Botão genérico para marcar como executado */}
            {selectedFlowNode.data.isPendingConnected && 
             selectedFlowNode.data.isExecuted !== 'TRUE' && 
             selectedFlowNode.type !== 'actionNode' && 
             selectedFlowNode.type !== 'integrationNode' && (
              <div className="space-y-3">
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Este nó está pendente de execução
                </div>
                
                <button
                  onClick={async () => {
                    // Marcar nó como executado
                    const updatedNodes = getNodes().map(node => {
                      if (node.id === selectedFlowNode.id) {
                        return {
                          ...node,
                          data: {
                            ...node.data,
                            isExecuted: 'TRUE',
                            isPendingConnected: false,
                            executedAt: new Date().toISOString()
                          }
                        };
                      }
                      return node;
                    });

                    setNodes(updatedNodes);

                    // Salvar no servidor
                    const updatedFlowTasks = {
                      ...flowData.flowTasks,
                      nodes: updatedNodes
                    };

                    try {
                      await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          flowTasks: updatedFlowTasks
                        }),
                      });
                      
                      console.log('Nó marcado como executado');
                    } catch (error) {
                      console.error('Erro ao salvar:', error);
                    }
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Marcar como Executado
                </button>
              </div>
            )}

            {/* Para documentNode, mostrar informações específicas */}
            {selectedFlowNode.type === 'documentNode' && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Informações do Documento:</h4>
                <div className="text-sm space-y-1">
                  {selectedFlowNode.data.documentTemplate && (
                    <div>
                      <span className="font-medium text-gray-600">Template:</span>
                      <span className="ml-2 text-gray-800">{selectedFlowNode.data.documentTemplate}</span>
                    </div>
                  )}
                  {selectedFlowNode.data.targetPath && (
                    <div>
                      <span className="font-medium text-gray-600">Caminho:</span>
                      <span className="ml-2 text-gray-800">{selectedFlowNode.data.targetPath}</span>
                    </div>
                  )}
                </div>
                
                {selectedFlowNode.data.isPendingConnected && 
                 selectedFlowNode.data.isExecuted !== 'TRUE' && (
                  <div className="pt-2">
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded mb-2">
                      📄 Documento pronto para geração
                    </div>
                    <button
                      onClick={async () => {
                        // Implementar lógica de geração de documento
                        console.log('Gerando documento...');
                        
                        // Por enquanto, apenas marca como executado
                        const updatedNodes = getNodes().map(node => {
                          if (node.id === selectedFlowNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                isExecuted: 'TRUE',
                                isPendingConnected: false,
                                generatedAt: new Date().toISOString()
                              }
                            };
                          }
                          return node;
                        });

                        setNodes(updatedNodes);

                        // Salvar no servidor
                        const updatedFlowTasks = {
                          ...flowData.flowTasks,
                          nodes: updatedNodes
                        };

                        try {
                          await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              flowTasks: updatedFlowTasks
                            }),
                          });
                          
                          console.log('Documento gerado e marcado como executado');
                        } catch (error) {
                          console.error('Erro ao salvar:', error);
                        }
                      }}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      Gerar Documento
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mostrar dados salvos do formulário (se existirem) */}
            {selectedFlowNode.data.formData && Object.keys(selectedFlowNode.data.formData).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Dados Salvos:</h4>
                <div className="text-xs bg-gray-50 p-2 rounded space-y-1">
                  {Object.entries(selectedFlowNode.data.formData).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-gray-600">{key}:</span>
                      <span className="ml-2 text-gray-800">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informações de execução */}
            {selectedFlowNode.data.isExecuted === 'TRUE' && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Execução:</h4>
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✅ Executado com sucesso
                  {selectedFlowNode.data.executedAt && (
                    <div className="mt-1">
                      Em: {new Date(selectedFlowNode.data.executedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Mostrar resultado da aprovação se for actionNode */}
                {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.isAproved && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Resultado:</span>
                    <Badge 
                      variant={selectedFlowNode.data.isAproved === 'TRUE' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {selectedFlowNode.data.isAproved === 'TRUE' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                  </div>
                )}
                
                {/* Para nós de aprovação, mostrar botão para salvar dados mesmo após execução */}
                {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && (
                  <div className="space-y-3 mt-3">
                    <h5 className="text-sm font-medium text-gray-700">Atualizar Dados:</h5>
                    <div className="space-y-2">
                      {renderFormFields()}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveChanges}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        disabled={!areAllFieldsFilled()}
                      >
                        Salvar Alterações
                      </button>
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
      )}
    </div>
  );
};