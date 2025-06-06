import { useState, useEffect } from "react";
import ReactFlow, { useReactFlow, Controls, Background } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Clock, Play, Save, FileText, Settings } from "lucide-react";
import { 
  StartNodeComponent, 
  EndNodeComponent, 
  ActionNodeComponent, 
  DocumentNodeComponent, 
  IntegrationNodeComponent, 
  SwitchNodeComponent 
} from "./FlowNodes";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
        actionType: selectedFlowNode.data.actionType,
        attached_Form: selectedFlowNode.data.attached_Form,
        attached_form: selectedFlowNode.data.attached_form,
        formData: attachedFormData
      });
      
      if (!attachedFormData) {
        console.log('⚠️ getFormFields: Nenhum formulário anexado');
        return {};
      }
      
      // Primeiro, tentar parsear se for string
      let parsedData;
      if (typeof attachedFormData === 'string') {
        // Assumindo formulário visível por segurança
        console.log('🔍 getFormFields: dados brutos', Object(attachedFormData));
        
        // Corrigir formato JSON malformado se necessário
        let correctedData = attachedFormData;
        
        // Corrigir problemas comuns de JSON malformado
        correctedData = correctedData.replace(/\["/g, '{"').replace(/": \[/g, '": [');
        correctedData = correctedData.replace(/"\]/g, '"}');
        
        console.log('🔍 Dados corrigidos:', correctedData);
        
        try {
          parsedData = JSON.parse(correctedData);
          console.log('🔍 Dados parseados:', parsedData);
        } catch (e) {
          console.error('❌ Erro ao parsear JSON corrigido:', e);
          // Tentar uma abordagem mais robusta
          try {
            // Substituir formatação malformada mais agressivamente
            correctedData = attachedFormData
              .replace(/\["/g, '{"')
              .replace(/": \[/g, '": [')
              .replace(/"\]/g, '"}')
              .replace(/(\w+):/g, '"$1":')  // Adicionar aspas em chaves sem aspas
              .replace(/,\s*}/g, '}')       // Remover vírgulas extras
              .replace(/,\s*]/g, ']');      // Remover vírgulas extras em arrays
            
            parsedData = JSON.parse(correctedData);
          } catch (e2) {
            console.error('❌ Erro final ao parsear JSON:', e2);
            return {};
          }
        }
      } else {
        parsedData = attachedFormData;
      }
      
      return parsedData?.Fields || {};
    } catch (error) {
      console.error('❌ Erro em getFormFields:', error);
      return {};
    }
  };
  
  // Função compartilhada para executar mapeamento Monday
  async function executeMondayMapping(mappingId: string, documentId?: string, isHeadless?: boolean, additionalData?: any) {
    try {
      console.log('🔄 Executando mapeamento Monday:', { mappingId, documentId, isHeadless, additionalData });
      
      const requestData: any = {
        mappingId,
        isHeadless: isHeadless || false
      };
      
      if (documentId) {
        requestData.documentId = documentId;
      }
      
      if (additionalData) {
        requestData.additionalData = additionalData;
      }
      
      const response = await fetch('/api/monday/mappings/execute-headless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('✅ Resposta do mapeamento Monday:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Erro na execução do mapeamento Monday:', error);
      throw error;
    }
  }
  
  // Função para lidar com clique em nós
  const onNodeClick = (event: any, node: any) => {
    console.log('🔴 Node clicado:', node);
    setSelectedFlowNode(node);
    
    if (!isPinned) {
      setShowFlowInspector(true);
    }
  };
  
  // Função para salvar dados do formulário no nó
  const saveFormData = () => {
    if (!selectedFlowNode) return;
    
    console.log('💾 Salvando dados do formulário:', formValues);
    
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
    
    // Atualizar selectedFlowNode também
    setSelectedFlowNode({
      ...selectedFlowNode,
      data: {
        ...selectedFlowNode.data,
        formData: formValues
      }
    });
    
    toast({
      title: "Dados salvos",
      description: "Os dados do formulário foram salvos no nó.",
    });
  };
  
  // Função para executar integração manual
  const executeIntegration = async () => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'integrationNode') return;
    
    try {
      setIntegrationResult({ status: null, message: 'Executando integração...' });
      
      const integrationType = selectedFlowNode.data.integrType;
      const service = selectedFlowNode.data.service;
      
      console.log('🔄 Executando integração:', { integrationType, service });
      
      if (integrationType === 'Monday' && service) {
        // Executar mapeamento Monday
        const result = await executeMondayMapping(service, undefined, true, formValues);
        setIntegrationResult({ 
          status: 'success', 
          message: `Integração Monday executada com sucesso: ${JSON.stringify(result)}` 
        });
      } else {
        setIntegrationResult({ 
          status: 'error', 
          message: 'Tipo de integração não suportado ou serviço não configurado' 
        });
      }
    } catch (error: any) {
      console.error('❌ Erro na execução da integração:', error);
      setIntegrationResult({ 
        status: 'error', 
        message: `Erro na integração: ${error.message || 'Erro desconhecido'}` 
      });
    }
  };
  
  // Função para aprovar/rejeitar nó de ação
  const handleApproval = async (approved: boolean) => {
    if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') return;
    
    const currentNodes = getNodes();
    const updatedNodes = currentNodes.map(node => {
      if (node.id === selectedFlowNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            isAproved: approved ? 'TRUE' : 'FALSE'
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
        isAproved: approved ? 'TRUE' : 'FALSE'
      }
    });
    
    toast({
      title: approved ? "Ação aprovada" : "Ação rejeitada",
      description: `A ação foi ${approved ? 'aprovada' : 'rejeitada'} com sucesso.`,
    });
  };
  
  useEffect(() => {
    if (flowData?.nodes) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.1, duration: 800 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [flowData, fitView]);
  
  if (!flowData?.nodes) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Nenhum fluxo carregado</div>
      </div>
    );
  }
  
  // Processar edges para adicionar animação aos executados
  const processedEdges = flowData.edges?.map((edge: any) => {
    // Verificar se ambos os nós da edge foram executados
    const sourceNode = flowData.nodes.find((node: any) => node.id === edge.source);
    const targetNode = flowData.nodes.find((node: any) => node.id === edge.target);
    
    const sourceExecuted = sourceNode?.data?.isExecuted === 'TRUE';
    const targetExecuted = targetNode?.data?.isExecuted === 'TRUE';
    
    if (sourceExecuted && targetExecuted) {
      return {
        ...edge,
        animated: true,
        style: {
          ...edge.style,
          stroke: '#21639a',
          strokeWidth: 3
        },
        markerEnd: {
          ...edge.markerEnd,
          color: '#21639a'
        }
      };
    }
    
    return edge;
  }) || [];
  
  console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter((edge: any) => edge.animated));
  
  const formFields = getFormFields();
  const hasFormFields = Object.keys(formFields).length > 0;
  
  // Definir tipos de nós
  const nodeTypes = {
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent,
  };
  
  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={flowData.nodes}
        edges={processedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background />
      </ReactFlow>
      
      {showApprovalAlert && selectedFlowNode && selectedFlowNode.type === 'actionNode' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="w-96 shadow-lg border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900">Aprovação Necessária</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Este nó de ação requer aprovação para prosseguir no fluxo.
                  </p>
                  <div className="flex space-x-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleApproval(true);
                        setShowApprovalAlert(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleApproval(false);
                        setShowApprovalAlert(false);
                      }}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowApprovalAlert(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Painel de formulário para nós selecionados */}
      {selectedFlowNode && (selectedFlowNode.type === 'actionNode' || selectedFlowNode.type === 'integrationNode') && (
        <div className="absolute bottom-4 right-4 z-40">
          <Card className="w-80 max-h-96 overflow-y-auto shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {selectedFlowNode.type === 'actionNode' ? (
                    <Settings className="w-4 h-4 text-blue-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-600" />
                  )}
                  <h3 className="font-medium text-sm">
                    {selectedFlowNode.type === 'actionNode' ? 'Formulário de Ação' : 'Execução de Integração'}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFlowNode(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              
              {selectedFlowNode.type === 'actionNode' && hasFormFields && (
                <div className="space-y-3">
                  {Object.entries(formFields).map(([fieldName, fieldConfig]) => {
                    const configArray = Array.isArray(fieldConfig) ? fieldConfig : [];
                    const isLongText = configArray.some((item: any) => 
                      typeof item === 'string' && item.includes('type:longText')
                    );
                    const isSelect = Array.isArray(configArray) && configArray.length > 0 && 
                      !configArray.some((item: any) => typeof item === 'string' && item.includes('type:'));
                    
                    return (
                      <div key={fieldName}>
                        <Label className="text-xs font-medium">{fieldName}</Label>
                        {isLongText ? (
                          <Textarea
                            value={formValues[fieldName] || ''}
                            onChange={(e) => setFormValues(prev => ({
                              ...prev,
                              [fieldName]: e.target.value
                            }))}
                            className="mt-1 text-sm"
                            rows={3}
                          />
                        ) : isSelect ? (
                          <Select
                            value={formValues[fieldName] || ''}
                            onValueChange={(value) => setFormValues(prev => ({
                              ...prev,
                              [fieldName]: value
                            }))}
                          >
                            <SelectTrigger className="mt-1 text-sm">
                              <SelectValue placeholder={`Selecione ${fieldName}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {configArray.map((option: any, index: number) => (
                                <SelectItem key={index} value={option.toString()}>
                                  {option.toString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={formValues[fieldName] || ''}
                            onChange={(e) => setFormValues(prev => ({
                              ...prev,
                              [fieldName]: e.target.value
                            }))}
                            className="mt-1 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex space-x-2 pt-2">
                    <Button onClick={saveFormData} size="sm" className="flex-1">
                      <Save className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                  </div>
                  
                  {selectedFlowNode.data.actionType === 'Intern_Aprove' && (
                    <div className="pt-2 border-t">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleApproval(true)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => handleApproval(false)}
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {selectedFlowNode.type === 'integrationNode' && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <div><strong>Tipo:</strong> {selectedFlowNode.data.integrType || 'N/A'}</div>
                    <div><strong>Serviço:</strong> {selectedFlowNode.data.service || 'N/A'}</div>
                  </div>
                  
                  <Button 
                    onClick={executeIntegration} 
                    size="sm" 
                    className="w-full"
                    disabled={integrationResult.status === null && integrationResult.message !== ''}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Executar Integração
                  </Button>
                  
                  {integrationResult.message && (
                    <div className={`text-xs p-2 rounded border ${
                      integrationResult.status === 'success' 
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : integrationResult.status === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {integrationResult.status === 'success' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {integrationResult.status === 'error' && <XCircle className="w-3 h-3 inline mr-1" />}
                      {integrationResult.status === null && <Clock className="w-3 h-3 inline mr-1" />}
                      {integrationResult.message}
                    </div>
                  )}
                </div>
              )}
              
              {selectedFlowNode.type === 'actionNode' && !hasFormFields && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Nenhum formulário configurado para este nó.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}