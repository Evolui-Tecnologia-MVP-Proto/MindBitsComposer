import { useState, useEffect } from "react";
import { useReactFlow, ReactFlow, Controls, Background } from "reactflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle, Play, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StartNodeComponent, EndNodeComponent, ActionNodeComponent, DocumentNodeComponent, IntegrationNodeComponent, SwitchNodeComponent } from "./FlowNodes";

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
    
    setShowApprovalAlert(true);
  };

  // Função para salvar dados do formulário
  const saveFormData = () => {
    if (!selectedFlowNode) return;
    
    console.log('💾 Salvando dados do formulário:', {
      nodeId: selectedFlowNode.id,
      formValues
    });
    
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
    
    // Atualizar também o nó selecionado
    setSelectedFlowNode({
      ...selectedFlowNode,
      data: {
        ...selectedFlowNode.data,
        formData: formValues
      }
    });
    
    toast({
      title: "Dados salvos",
      description: "Os dados do formulário foram salvos com sucesso.",
    });
  };

  // Função para executar integração
  const executeIntegration = async () => {
    if (!selectedFlowNode) return;
    
    console.log('⚡ Executando integração:', {
      nodeId: selectedFlowNode.id,
      integrType: selectedFlowNode.data.integrType,
      service: selectedFlowNode.data.service
    });
    
    try {
      setIntegrationResult({ status: null, message: 'Executando...' });
      
      // Simular execução da integração
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular resultado (pode ser success ou error)
      const isSuccess = Math.random() > 0.3; // 70% de chance de sucesso
      
      if (isSuccess) {
        setIntegrationResult({
          status: 'success',
          message: 'Integração executada com sucesso!'
        });
        
        // Marcar o nó como executado
        const currentNodes = getNodes();
        const updatedNodes = currentNodes.map(node => {
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
        
        toast({
          title: "Integração executada",
          description: "A integração foi executada com sucesso.",
        });
      } else {
        setIntegrationResult({
          status: 'error',
          message: 'Erro na execução da integração. Tente novamente.'
        });
        
        toast({
          title: "Erro na integração",
          description: "Ocorreu um erro durante a execução da integração.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIntegrationResult({
        status: 'error',
        message: 'Erro inesperado na integração.'
      });
      
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado durante a integração.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (flowData?.nodes) {
      setTimeout(() => {
        fitView({ duration: 800, padding: 0.1 });
      }, 100);
    }
  }, [flowData, fitView]);

  if (!flowData?.nodes || !flowData?.edges) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando diagrama...</div>
      </div>
    );
  }

  // Converter nós para incluir animação baseada em isExecuted
  const processedNodes = flowData.nodes.map((node: any) => ({
    ...node,
    data: {
      ...node.data,
      isReadonly: true // Marcar todos os nós como readonly no modo de visualização
    }
  }));

  // Converter edges para incluir animação baseada na execução dos nós
  const processedEdges = flowData.edges.map((edge: any) => {
    // Encontrar o nó de origem
    const sourceNode = processedNodes.find((node: any) => node.id === edge.source);
    
    // Se o nó de origem foi executado, animar a aresta
    const isSourceExecuted = sourceNode?.data?.isExecuted === 'TRUE';
    
    return {
      ...edge,
      animated: isSourceExecuted,
      style: {
        ...edge.style,
        stroke: isSourceExecuted ? '#21639a' : '#6b7280',
        strokeWidth: 3
      },
      markerEnd: {
        type: 'arrowclosed',
        color: isSourceExecuted ? '#21639a' : '#6b7280'
      }
    };
  });

  console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter((edge: any) => edge.animated));

  // Definir os tipos de nós
  const nodeTypes = {
    startNode: StartNodeComponent,
    endNode: EndNodeComponent,
    actionNode: ActionNodeComponent,
    documentNode: DocumentNodeComponent,
    integrationNode: IntegrationNodeComponent,
    switchNode: SwitchNodeComponent,
  };

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(event, node) => {
          console.log('🎯 Nó clicado:', node);
          setSelectedFlowNode(node);
          if (!isPinned) {
            setShowFlowInspector(true);
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.1 }}
      >
        <Controls />
        <Background />
      </ReactFlow>
      
      {/* Painel lateral para mostrar formulários quando um nó está selecionado */}
      {selectedFlowNode && selectedFlowNode.data.isPendingConnected && (
        <div className="absolute top-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-lg font-semibold">Ações Pendentes</h3>
              <p className="text-sm text-gray-600">
                {selectedFlowNode.data.label || selectedFlowNode.id}
              </p>
            </div>
            
            {/* Mostrar botões de aprovação para nós de ação */}
            {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status de Aprovação</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateApprovalStatus(selectedFlowNode.id, 'TRUE')}
                    variant={selectedFlowNode.data.isAproved === 'TRUE' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => updateApprovalStatus(selectedFlowNode.id, 'FALSE')}
                    variant={selectedFlowNode.data.isAproved === 'FALSE' ? 'destructive' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
            
            {/* Mostrar formulário dinâmico baseado nos dados anexados */}
            {selectedFlowNode.type === 'actionNode' && (() => {
              const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
              
              if (!attachedFormData) return null;
              
              try {
                console.log('🔍 Dados brutos do formulário:', attachedFormData);
                
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
                  
                  console.log('🔍 Dados corrigidos:', correctedData);
                }
                
                const parsedData = JSON.parse(correctedData);
                console.log('🔍 Dados parseados:', parsedData);
                
                // Verificar se deve mostrar o formulário baseado na condição
                if (parsedData.Show_Condition !== undefined && parsedData.Fields) {
                  const showCondition = parsedData.Show_Condition;
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
                  
                  // Se não deve mostrar o formulário, não renderizar
                  if (!shouldShowForm) {
                    console.log('🔍 Formulário oculto por condição:', { showCondition, approvalStatus });
                    return null;
                  }
                }
                
                const fields = parsedData.Fields || {};
                const fieldNames = Object.keys(fields);
                
                if (fieldNames.length === 0) return null;
                
                return (
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <Label className="text-sm font-medium">Formulário de Dados</Label>
                    {fieldNames.map((fieldName, index) => {
                      const fieldOptions = fields[fieldName];
                      const isLongText = Array.isArray(fieldOptions) && fieldOptions.some((opt: string) => opt.includes('type:longText'));
                      const isSelect = Array.isArray(fieldOptions) && fieldOptions.length > 0 && !fieldOptions.some((opt: string) => opt.includes('type:'));
                      
                      if (isLongText) {
                        return (
                          <div key={index} className="space-y-1">
                            <Label className="text-xs">{fieldName}</Label>
                            <Textarea
                              placeholder={`Digite ${fieldName.toLowerCase()}`}
                              value={formValues[fieldName] || ''}
                              onChange={(e) => setFormValues(prev => ({
                                ...prev,
                                [fieldName]: e.target.value
                              }))}
                              className="text-sm"
                              rows={3}
                            />
                          </div>
                        );
                      } else if (isSelect) {
                        const selectOptions = fieldOptions.filter((opt: string) => !opt.includes('default:') && !opt.includes('type:'));
                        return (
                          <div key={index} className="space-y-1">
                            <Label className="text-xs">{fieldName}</Label>
                            <Select
                              value={formValues[fieldName] || ''}
                              onValueChange={(value) => setFormValues(prev => ({
                                ...prev,
                                [fieldName]: value
                              }))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectOptions.map((option: string, optIndex: number) => (
                                  <SelectItem key={optIndex} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      } else {
                        return (
                          <div key={index} className="space-y-1">
                            <Label className="text-xs">{fieldName}</Label>
                            <Input
                              placeholder={`Digite ${fieldName.toLowerCase()}`}
                              value={formValues[fieldName] || ''}
                              onChange={(e) => setFormValues(prev => ({
                                ...prev,
                                [fieldName]: e.target.value
                              }))}
                              className="text-sm"
                            />
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              } catch (e) {
                console.log('🔍 Erro ao processar formulário:', e);
                return null;
              }
            })()}
            
            {/* Mostrar botão de execução para nós de integração */}
            {selectedFlowNode.type === 'integrationNode' && (
              <div className="space-y-3 mt-4 border-t pt-4">
                <Label className="text-sm font-medium">Execução Manual</Label>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    Tipo: {selectedFlowNode.data.integrType}<br/>
                    Serviço: {selectedFlowNode.data.service}
                  </div>
                  
                  {integrationResult.status && (
                    <div className={`p-2 rounded text-xs ${
                      integrationResult.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : integrationResult.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {integrationResult.message}
                    </div>
                  )}
                  
                  <Button
                    onClick={executeIntegration}
                    size="sm"
                    className="w-full"
                    disabled={integrationResult.status === null && integrationResult.message === 'Executando...'}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Executar Integração
                  </Button>
                </div>
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={saveFormData}
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={!areAllFieldsFilled()}
              >
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
              
              {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && (
                <div className="text-xs text-gray-500">
                  Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}