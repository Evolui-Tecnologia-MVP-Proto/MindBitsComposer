import { useState, useEffect } from "react";
import { useReactFlow } from "@reactflow/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Play, Loader2, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  }, [selectedFlowNode]);

  // Mutation para executar integração
  const executeIntegrationMutation = useMutation({
    mutationFn: async (data: { nodeId: string; formData: Record<string, string> }) => {
      return apiRequest(`/api/flow-nodes/${data.nodeId}/execute`, {
        method: 'POST',
        body: data.formData
      });
    },
    onSuccess: (data) => {
      console.log('✅ Integração executada com sucesso:', data);
      setIntegrationResult({
        status: 'success',
        message: data.message || 'Integração executada com sucesso!'
      });
      
      // Invalidar cache para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      
      toast({
        title: "Sucesso",
        description: "Integração executada com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro na execução da integração:', error);
      setIntegrationResult({
        status: 'error',
        message: error.message || 'Erro na execução da integração'
      });
      
      toast({
        title: "Erro",
        description: "Erro na execução da integração",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (flowData && flowData.nodes) {
      // Fit view automaticamente após carregar os dados
      setTimeout(() => {
        fitView({ padding: 0.1, includeHiddenNodes: false });
      }, 100);
    }
  }, [flowData, fitView]);

  // Função para verificar se todos os campos obrigatórios estão preenchidos
  const areAllFieldsFilled = () => {
    if (!selectedFlowNode || !selectedFlowNode.data.fields) return false;
    
    const requiredFields = selectedFlowNode.data.fields.filter((field: any) => field.required);
    return requiredFields.every((field: any) => {
      const value = formValues[field.id];
      return value && value.trim() !== '';
    });
  };

  // Função para salvar alterações no banco de dados
  const saveChangesToDatabase = async () => {
    if (!selectedFlowNode || !areAllFieldsFilled()) return;

    try {
      console.log('💾 Salvando alterações no banco de dados...');
      console.log('📋 Dados do formulário:', formValues);
      console.log('🎯 Nó selecionado:', selectedFlowNode);

      // Atualizar o nó no flow com os novos dados
      const updatedNodes = getNodes().map(node => {
        if (node.id === selectedFlowNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              formData: formValues,
              isAproved: selectedFlowNode.data.isAproved,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      });

      setNodes(updatedNodes);

      // Salvar no banco de dados
      const response = await apiRequest(`/api/flow-nodes/${selectedFlowNode.id}/save`, {
        method: 'POST',
        body: {
          formData: formValues,
          isAproved: selectedFlowNode.data.isAproved,
          lastUpdated: new Date().toISOString()
        }
      });

      console.log('✅ Alterações salvas com sucesso:', response);
      
      // Fechar o alerta de aprovação
      setShowApprovalAlert(false);
      
      toast({
        title: "Sucesso",
        description: "Alterações salvas com sucesso!",
      });

      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents-flows'] });

    } catch (error: any) {
      console.error('❌ Erro ao salvar alterações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar alterações",
        variant: "destructive",
      });
    }
  };

  // Função para executar integração
  const executeIntegration = () => {
    if (!selectedFlowNode || !areAllFieldsFilled()) return;
    
    executeIntegrationMutation.mutate({
      nodeId: selectedFlowNode.id,
      formData: formValues
    });
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-lg border dark:border-[#374151] p-6">
      {/* Resultado da integração */}
      {integrationResult.status && (
        <div className={`mb-4 p-3 rounded-lg border ${
          integrationResult.status === 'success' 
            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-700 dark:text-red-400'
        }`}>
          <div className="flex items-center space-x-2">
            {integrationResult.status === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {integrationResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Painel do FlowInspector */}
      {showFlowInspector && selectedFlowNode && (
        <div className={`mb-6 bg-gray-50 dark:bg-[#0F172A] rounded-lg p-4 border-l-4 border-blue-500 dark:border-blue-400 ${isPinned ? 'relative' : 'absolute top-4 right-4 z-50 w-80 shadow-lg'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">
              Inspetor de Nó: {selectedFlowNode.data.label}
            </h3>
            <button
              onClick={() => setShowFlowInspector(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <strong>ID:</strong> {selectedFlowNode.id}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <strong>Tipo:</strong> {selectedFlowNode.type}
            </div>
            
            {selectedFlowNode.data.description && (
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <strong>Descrição:</strong> {selectedFlowNode.data.description}
              </div>
            )}

            {/* Badge de status de aprovação */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Status:</span>
              <Badge 
                variant={
                  selectedFlowNode.data.isAproved === 'YES' ? 'default' : 
                  selectedFlowNode.data.isAproved === 'NO' ? 'destructive' : 
                  'secondary'
                }
                className="text-xs"
              >
                {selectedFlowNode.data.isAproved === 'YES' ? 'Aprovado' : 
                 selectedFlowNode.data.isAproved === 'NO' ? 'Rejeitado' : 
                 'Pendente'}
              </Badge>
            </div>

            {/* Campos do formulário */}
            {selectedFlowNode.data.fields && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600 pb-1">
                  Campos do Formulário
                </h4>
                {selectedFlowNode.data.fields.map((field: any) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues(prev => ({
                          ...prev,
                          [field.id]: e.target.value
                        }))}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-[#0F172A] dark:text-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues(prev => ({
                          ...prev,
                          [field.id]: e.target.value
                        }))}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-[#0F172A] dark:text-gray-200 dark:placeholder-gray-400 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formValues[field.id] || ''}
                        onChange={(e) => setFormValues(prev => ({
                          ...prev,
                          [field.id]: e.target.value
                        }))}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-[#0F172A] dark:text-gray-200 dark:placeholder-gray-400 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botão de execução para nós de integração */}
            {selectedFlowNode.type === 'integration' && (
              <div className="pt-3 border-t dark:border-gray-600">
                <Button
                  onClick={executeIntegration}
                  disabled={!areAllFieldsFilled() || executeIntegrationMutation.isPending}
                  size="sm"
                  className="w-full"
                >
                  {executeIntegrationMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Executar Integração
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Sistema de aprovação para nós de aprovação */}
            {selectedFlowNode.type === 'approval' && (
              <div className="pt-3 border-t dark:border-gray-600 space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Sistema de Aprovação
                </h4>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedFlowNode({
                        ...selectedFlowNode,
                        data: { ...selectedFlowNode.data, isAproved: 'YES' }
                      });
                      setShowApprovalAlert(true);
                    }}
                    disabled={!areAllFieldsFilled()}
                    className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                      areAllFieldsFilled()
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">SIM</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedFlowNode({
                        ...selectedFlowNode,
                        data: { ...selectedFlowNode.data, isAproved: 'NO' }
                      });
                      setShowApprovalAlert(true);
                    }}
                    disabled={!areAllFieldsFilled()}
                    className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
                      areAllFieldsFilled()
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
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
                        <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-orange-800 dark:text-orange-400 mb-1">ATENÇÃO</h4>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
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
      )}
    </div>
  );
}