import { useState, useEffect } from "react";
import { useReactFlow } from "reactflow";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Pin,
  PinOff,
} from "lucide-react";

interface FlowWithAutoFitViewProps {
  flowData: any;
  showFlowInspector: boolean;
  setShowFlowInspector: (show: boolean) => void;
  setSelectedFlowNode: (node: any) => void;
  selectedFlowNode: any;
  showApprovalAlert: boolean;
  setShowApprovalAlert: (show: boolean) => void;
  isPinned?: boolean;
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
  const { toast } = useToast();
  
  // Estado para controlar os valores dos campos do formulário
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  // Estado para controlar resultado da execução de integração
  const [integrationResult, setIntegrationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  
  // Estado para controlar se o inspetor está fixado
  const [isFlowInspectorPinned, setIsFlowInspectorPinned] = useState(false);
  
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
      
      if (!attachedFormData) {
        console.log('🔍 getFormFields: Nenhum formulário anexado encontrado');
        return {};
      }
      
      // Assumindo formulário visível por segurança
      const fields = {};
      if (typeof attachedFormData === 'object') {
        Object.keys(attachedFormData).forEach(key => {
          if (attachedFormData[key] && typeof attachedFormData[key] === 'object') {
            if (attachedFormData[key].visible !== false) {
              fields[key] = {
                label: attachedFormData[key].label || key,
                type: attachedFormData[key].type || 'text',
                required: attachedFormData[key].required || false,
                options: attachedFormData[key].options || null,
                value: formValues[key] || attachedFormData[key].defaultValue || ''
              };
            }
          }
        });
      }
      
      console.log('🔍 getFormFields: campos processados', fields);
      return fields;
    } catch (error) {
      console.error('🔍 getFormFields: Erro ao processar formulário', error);
      return {};
    }
  };
  
  // Função para salvar dados do formulário no nó
  const saveFormData = () => {
    if (!selectedFlowNode) return;
    
    console.log('💾 Salvando dados do formulário:', formValues);
    
    const nodes = getNodes();
    const updatedNodes = nodes.map(node => {
      if (node.id === selectedFlowNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            formData: { ...formValues }
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    setSelectedFlowNode({
      ...selectedFlowNode,
      data: {
        ...selectedFlowNode.data,
        formData: { ...formValues }
      }
    });
    
    toast({
      title: "Dados salvos",
      description: "Os dados do formulário foram salvos no nó.",
    });
  };
  
  // Função para executar integração manual
  const executeManualIntegration = async () => {
    if (!selectedFlowNode) return;
    
    try {
      setIntegrationResult({ status: null, message: 'Executando integração...' });
      
      // Simular execução de integração
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar status do nó para executado
      const nodes = getNodes();
      const updatedNodes = nodes.map(node => {
        if (node.id === selectedFlowNode.id) {
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
      setSelectedFlowNode({
        ...selectedFlowNode,
        data: {
          ...selectedFlowNode.data,
          isExecuted: 'TRUE',
          isPendingConnected: false
        }
      });
      
      setIntegrationResult({
        status: 'success',
        message: 'Integração executada com sucesso!'
      });
      
      toast({
        title: "Integração executada",
        description: "A integração foi executada com sucesso.",
      });
      
    } catch (error) {
      console.error('Erro ao executar integração:', error);
      setIntegrationResult({
        status: 'error',
        message: 'Erro ao executar a integração.'
      });
      
      toast({
        title: "Erro",
        description: "Erro ao executar a integração.",
        variant: "destructive",
      });
    }
  };
  
  // Função para iniciar documentação
  const startDocumentation = async () => {
    if (!selectedFlowNode) return;
    
    try {
      const response = await apiRequest('/api/documentos/start-documentation', {
        method: 'POST',
        body: {
          nodeId: selectedFlowNode.id,
          docType: selectedFlowNode.data.docType || 'default'
        }
      });
      
      if (response.ok) {
        // Atualizar status do nó
        const nodes = getNodes();
        const updatedNodes = nodes.map(node => {
          if (node.id === selectedFlowNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                isInProcess: 'TRUE',
                isPendingConnected: true
              }
            };
          }
          return node;
        });
        
        setNodes(updatedNodes);
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isInProcess: 'TRUE',
            isPendingConnected: true
          }
        });
        
        toast({
          title: "Documentação iniciada",
          description: "O documento foi enviado para o editor.",
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar documentação:', error);
      toast({
        title: "Erro",
        description: "Erro ao iniciar a documentação.",
        variant: "destructive",
      });
    }
  };
  
  // Função para atualizar status de aprovação
  const updateApprovalStatus = (nodeId: string, status: string) => {
    const nodes = getNodes();
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            isAproved: status,
            isExecuted: 'TRUE',
            isPendingConnected: false
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
    
    if (selectedFlowNode && selectedFlowNode.id === nodeId) {
      setSelectedFlowNode({
        ...selectedFlowNode,
        data: {
          ...selectedFlowNode.data,
          isAproved: status,
          isExecuted: 'TRUE',
          isPendingConnected: false
        }
      });
    }
    
    toast({
      title: status === 'TRUE' ? "Aprovado" : "Rejeitado",
      description: `O documento foi ${status === 'TRUE' ? 'aprovado' : 'rejeitado'}.`,
    });
  };
  
  // Função para obter label do tipo de nó
  const getNodeTypeLabel = (nodeType: string) => {
    switch (nodeType) {
      case 'startNode': return 'Nó de Início';
      case 'documentNode': return 'Nó de Documento';
      case 'actionNode': return 'Nó de Ação';
      case 'integrationNode': return 'Nó de Integração';
      case 'switchNode': return 'Nó de Switch';
      case 'endNode': return 'Nó de Fim';
      default: return 'Nó Desconhecido';
    }
  };
  
  // Auto-fit quando o fluxo é carregado
  useEffect(() => {
    if (flowData && flowData.nodes && flowData.nodes.length > 0) {
      // Pequeno delay para garantir que os nós estão renderizados
      const timer = setTimeout(() => {
        fitView({ 
          padding: 0.1,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [flowData, fitView]);

  return (
    <>
      {/* Inspetor de Propriedades */}
      {showFlowInspector && selectedFlowNode && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Inspetor de Nó</h3>
              <p className="text-sm text-gray-600 font-mono">
                {getNodeTypeLabel(selectedFlowNode.type)} - {selectedFlowNode.id}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFlowInspectorPinned(!isFlowInspectorPinned)}
                className="p-1"
              >
                {isFlowInspectorPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFlowInspector(false);
                  setSelectedFlowNode(null);
                  setIsFlowInspectorPinned(false);
                }}
                className="p-1"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Informações do nó de documento */}
            {selectedFlowNode.type === 'documentNode' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
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
                                return selectedFlowNode.data.docType;
                              }
                              
                              const nodeData = selectedFlowNode.data;
                              if (nodeData.description && nodeData.description.includes('tipo:')) {
                                const match = nodeData.description.match(/tipo:\s*([^\s,]+)/i);
                                if (match) {
                                  return match[1];
                                }
                              }
                              
                              return 'Padrão';
                            })()}
                          </span>
                        </p>
                        <button
                          onClick={startDocumentation}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                          Iniciar Edição
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensagem quando está em processo */}
                {selectedFlowNode.data.isInProcess === 'TRUE' && selectedFlowNode.data.isExecuted === 'FALSE' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          Em Processo de Documentação
                        </h4>
                        <p className="text-xs text-yellow-700 leading-relaxed">
                          Este documento está atualmente em processo de documentação no editor. 
                          Acesse o editor para continuar a edição ou finalizar o documento.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensagem quando está executado */}
                {selectedFlowNode.data.isExecuted === 'TRUE' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800 mb-2">
                          Documento Finalizado
                        </h4>
                        <p className="text-xs text-green-700 leading-relaxed">
                          A documentação deste elemento foi finalizada com sucesso.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Informações do nó de integração */}
            {selectedFlowNode.type === 'integrationNode' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                    {(() => {
                      const functionCaption = selectedFlowNode.data.functionCaption || 'Função de Integração';
                      let functionName = '';
                      
                      if (selectedFlowNode.data.jobId) {
                        try {
                          const jobData = JSON.parse(selectedFlowNode.data.jobId);
                          const firstKey = Object.keys(jobData)[0];
                          if (firstKey) {
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

            {/* Informações do nó de fim */}
            {selectedFlowNode.type === 'endNode' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
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
              </div>
            )}

            {/* Informações do nó de switch */}
            {selectedFlowNode.type === 'switchNode' && (
              <div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Campo</th>
                        <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Valor</th>
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

            {/* Informações do nó de ação com aprovação */}
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
                    disabled={selectedFlowNode.data.isExecuted === 'TRUE' || !selectedFlowNode.data.isPendingConnected}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedFlowNode.data.isAproved === 'TRUE'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : selectedFlowNode.data.isPendingConnected
                        ? 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlowNode.data.isPendingConnected) {
                        updateApprovalStatus(selectedFlowNode.id, 'FALSE');
                      }
                    }}
                    disabled={selectedFlowNode.data.isExecuted === 'TRUE' || !selectedFlowNode.data.isPendingConnected}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedFlowNode.data.isAproved === 'FALSE'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : selectedFlowNode.data.isPendingConnected
                        ? 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mx-auto" />
                  </button>
                </div>
                
                <div className={`text-center p-2 rounded-md text-sm font-medium ${
                  selectedFlowNode.data.isAproved === 'TRUE' 
                    ? 'bg-green-50 text-green-800' 
                    : selectedFlowNode.data.isAproved === 'FALSE'
                    ? 'bg-red-50 text-red-800'
                    : 'bg-gray-50 text-gray-800'
                }`}>
                  {selectedFlowNode.data.isAproved === 'TRUE' 
                    ? 'Aprovado' 
                    : selectedFlowNode.data.isAproved === 'FALSE'
                    ? 'Rejeitado'
                    : 'Aguardando Aprovação'}
                </div>

                {!selectedFlowNode.data.isPendingConnected && selectedFlowNode.data.isExecuted === 'FALSE' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-700">
                        Este nó precisa ser conectado a um elemento anterior executado para habilitar a aprovação.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Formulário dinâmico para nós com attached_form */}
            {(() => {
              const formFields = getFormFields();
              const hasFields = Object.keys(formFields).length > 0;
              
              if (!hasFields) return null;
              
              return (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Formulário Dinâmico</h4>
                    <Button
                      onClick={saveFormData}
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Salvar
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(formFields).map(([fieldKey, field]: [string, any]) => (
                      <div key={fieldKey}>
                        <Label htmlFor={fieldKey} className="text-xs font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        
                        {field.type === 'select' && field.options ? (
                          <Select
                            value={formValues[fieldKey] || field.value || ''}
                            onValueChange={(value) => setFormValues(prev => ({ ...prev, [fieldKey]: value }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option: any) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            id={fieldKey}
                            value={formValues[fieldKey] || field.value || ''}
                            onChange={(e) => setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            placeholder={field.placeholder || ''}
                            className="min-h-[60px] text-xs"
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={fieldKey}
                            type={field.type || 'text'}
                            value={formValues[fieldKey] || field.value || ''}
                            onChange={(e) => setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            placeholder={field.placeholder || ''}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Inspetor de Propriedades Geral (versão simplificada) */}
      {showFlowInspector && selectedFlowNode && !isFlowInspectorPinned && (
        <div className="absolute top-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-40">
          <div className="p-4">
            <div className="border-b pb-2">
              <h3 className="text-lg font-semibold">Inspetor de Propriedades</h3>
              <p className="text-sm text-gray-600 font-mono">
                {getNodeTypeLabel(selectedFlowNode.type)} - {selectedFlowNode.id}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Status de Execução</p>
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

              {selectedFlowNode.data.actionType && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo de Ação</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.actionType}</p>
                </div>
              )}

              {selectedFlowNode.data.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Descrição</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedFlowNode.data.description}
                  </p>
                </div>
              )}

              {selectedFlowNode.data.docType && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo de Documento</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.docType}</p>
                </div>
              )}

              {selectedFlowNode.data.integrType && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo de Integração</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.integrType}</p>
                </div>
              )}

              {selectedFlowNode.data.service && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Serviço</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.service}</p>
                </div>
              )}

              {selectedFlowNode.data.switchField && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Campo Switch</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.switchField}</p>
                </div>
              )}

              {selectedFlowNode.data.inputSwitch && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Valor Switch</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.inputSwitch}</p>
                </div>
              )}

              {selectedFlowNode.data.formData && Object.keys(selectedFlowNode.data.formData).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Dados do Formulário</p>
                  <div className="bg-gray-50 p-2 rounded border text-xs">
                    {Object.entries(selectedFlowNode.data.formData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-mono text-gray-600">{key}:</span>
                        <span className="font-mono text-gray-900">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedFlowNode.data.isAproved && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Status de Aprovação</p>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    selectedFlowNode.data.isAproved === 'TRUE' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedFlowNode.data.isAproved === 'FALSE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedFlowNode.data.isAproved === 'TRUE' 
                      ? 'Aprovado' 
                      : selectedFlowNode.data.isAproved === 'FALSE'
                      ? 'Rejeitado'
                      : 'Indefinido'}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={() => {
                  setShowFlowInspector(false);
                  setSelectedFlowNode(null);
                  setIsFlowInspectorPinned(false);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Fechar Inspetor
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}