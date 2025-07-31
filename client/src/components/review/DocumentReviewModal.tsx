import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Calendar, 
  User, 
  Clock,
  Loader2,
  AlertCircle,
  Workflow,
  BookOpen,
  CheckCircle,
  XCircle
} from "lucide-react";
import { type Documento } from "@shared/schema";

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  responsavel: string;
}

export function DocumentReviewModal({ isOpen, onClose, responsavel }: DocumentReviewModalProps) {
  const { toast } = useToast();
  
  // Estado para gerenciar fluxos selecionados por documento
  const [selectedFlows, setSelectedFlows] = useState<Record<string, string>>({});
  
  // Estado para gerenciar itens selecionados via checkbox
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Estado para rastrear progresso da documentação
  const [documentationProgress, setDocumentationProgress] = useState<Record<string, 'pending' | 'processing' | 'success' | 'error'>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar fluxos de documentação disponíveis
  const { data: documentsFlows = [] } = useQuery({
    queryKey: ["/api/documents-flows"],
    enabled: isOpen
  });
  
  // Buscar parâmetro MAX_ITEMS_PER_REVISOR
  const { data: maxItemsParam } = useQuery({
    queryKey: ["/api/system-params", "MAX_ITEMS_PER_REVISOR"],
    queryFn: async () => {
      const res = await fetch("/api/system-params/MAX_ITEMS_PER_REVISOR");
      if (res.ok) {
        return res.json();
      }
      return null;
    },
    enabled: isOpen
  });

  // Buscar documentos já em processo do usuário logado (tabela documentos, não document_editions)
  const { data: documentosEmProcessoUsuario = [] } = useQuery({
    queryKey: ["/api/documentos/user-in-process"],
    queryFn: async () => {
      const res = await fetch("/api/documentos/user-in-process");
      if (res.ok) {
        return res.json();
      }
      return [];
    },
    enabled: isOpen
  });
  
  // Mutation para iniciar documentação
  const startDocumentationMutation = useMutation({
    mutationFn: async ({ documentId, flowId }: { documentId: string; flowId: string }) => {
      const response = await fetch("/api/documentos/start-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          flowId
        }),
      });
      if (!response.ok) throw new Error("Erro ao iniciar documentação");
      return response.json();
    },
    onError: (error: any, variables) => {
      setDocumentationProgress(prev => ({
        ...prev,
        [variables.documentId]: 'error'
      }));
    },
    onSuccess: (data, variables) => {
      setDocumentationProgress(prev => ({
        ...prev,
        [variables.documentId]: 'success'
      }));
    }
  });

  // Buscar documentos filtrados
  const { data: documentos = [], isLoading, error } = useQuery<Documento[]>({
    queryKey: ["/api/documentos/review", responsavel],
    queryFn: async () => {
      const res = await fetch(`/api/documentos/review?responsavel=${encodeURIComponent(responsavel)}`);
      if (res.ok) {
        return res.json();
      }
      throw new Error("Erro ao buscar documentos");
    },
    enabled: isOpen && !!responsavel
  });

  // Calcular limite de itens considerando documentos já em processo do usuário
  const getMaxItemsFromParam = () => {
    if (!maxItemsParam) return 10; // valor padrão
    
    const paramType = maxItemsParam.paramType;
    const paramValue = maxItemsParam.paramValue;
    
    try {
      switch (paramType) {
        case "number":
        case "integer":
          return parseInt(paramValue) || 10;
        case "string":
          const parsed = parseInt(paramValue);
          return isNaN(parsed) ? 10 : parsed;
        default:
          return parseInt(paramValue) || 10;
      }
    } catch {
      return 10;
    }
  };

  const maxItemsParam_value = getMaxItemsFromParam();
  const documentosJaEmProcesso = documentosEmProcessoUsuario.length;
  const limiteDiponivel = Math.max(0, maxItemsParam_value - documentosJaEmProcesso);
  const documentosLimitados = documentos.slice(0, limiteDiponivel);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return "Data inválida";
    }
  };

  // Funções de filtragem de fluxos (copiadas da DocumentationModal)
  const evaluateCondition = (document: Documento, condition: any): boolean => {
    const field = condition.field;
    const operator = condition.operator;
    const value = condition.value;
    const documentValue = (document as any)[field];
    
    switch (operator) {
      case '=':
      case '==':
        return documentValue === value;
      case '!=':
      case '<>':
        return documentValue !== value;
      case '>':
        return documentValue > value;
      case '>=':
        return documentValue >= value;
      case '<':
        return documentValue < value;
      case '<=':
        return documentValue <= value;
      case 'contains':
      case 'like':
        return documentValue && documentValue.toString().toLowerCase().includes(value.toString().toLowerCase());
      default:
        console.warn(`Operador desconhecido: ${operator}`);
        return true;
    }
  };

  const evaluateAndConditions = (document: Documento, conditions: any[]): boolean => {
    return conditions.every((condition: any) => {
      if (condition.field && condition.operator && condition.value !== undefined) {
        return evaluateCondition(document, condition);
      } else if (condition.or) {
        return evaluateOrConditions(document, condition.or);
      } else if (condition.and) {
        return evaluateAndConditions(document, condition.and);
      }
      return true;
    });
  };

  const evaluateOrConditions = (document: Documento, conditions: any[]): boolean => {
    return conditions.some((condition: any) => {
      if (condition.field && condition.operator && condition.value !== undefined) {
        return evaluateCondition(document, condition);
      } else if (condition.or) {
        return evaluateOrConditions(document, condition.or);
      } else if (condition.and) {
        return evaluateAndConditions(document, condition.and);
      }
      return false;
    });
  };

  const documentMatchesFlowFilter = (document: Documento, flow: any): boolean => {
    if (!flow.applicationFilter || Object.keys(flow.applicationFilter).length === 0) {
      return true;
    }

    try {
      const filter = flow.applicationFilter;
      
      if (filter.aplication && filter.aplication.filter) {
        const filterConfig = filter.aplication.filter;
        const field = filterConfig.field;
        const operator = filterConfig.operator;
        const value = filterConfig.value;
        const documentValue = (document as any)[field];
        
        switch (operator) {
          case '=':
          case '==':
            return documentValue === value;
          case '!=':
          case '<>':
            return documentValue !== value;
          case '>':
            return documentValue > value;
          case '>=':
            return documentValue >= value;
          case '<':
            return documentValue < value;
          case '<=':
            return documentValue <= value;
          case 'contains':
          case 'like':
            return documentValue && documentValue.toString().toLowerCase().includes(value.toString().toLowerCase());
          default:
            console.warn(`Operador desconhecido: ${operator}`);
            return true;
        }
      }
      
      if (filter.aplication && filter.aplication.and) {
        return evaluateAndConditions(document, filter.aplication.and);
      }
      
      if (filter.aplication && filter.aplication.or) {
        return evaluateOrConditions(document, filter.aplication.or);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao avaliar application_filter:', error);
      return true;
    }
  };

  // Função para obter fluxos disponíveis para um documento
  const getAvailableFlows = (document: Documento) => {
    return (documentsFlows as any[]).filter(
      (flow: any) => flow.isEnabled === true && documentMatchesFlowFilter(document, flow)
    );
  };

  // Função para atualizar fluxo selecionado
  const handleFlowChange = (documentId: string, flowId: string) => {
    setSelectedFlows(prev => ({
      ...prev,
      [documentId]: flowId
    }));
  };

  // Função para alternar seleção de item via checkbox
  const handleItemSelection = (documentId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  // Função para selecionar/desselecionar todos
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(documentosLimitados.map(doc => doc.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Verificar se todos os itens estão selecionados
  const allSelected = documentosLimitados.length > 0 && selectedItems.size === documentosLimitados.length;
  // Verificar se alguns itens estão selecionados (para estado intermediário)
  const someSelected = selectedItems.size > 0 && selectedItems.size < documentosLimitados.length;

  // Limpar seleções ao fechar modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedFlows({});
      setSelectedItems(new Set());
      setDocumentationProgress({});
      setIsProcessing(false);
    }
  }, [isOpen]);
  
  // Função para processar documentação de todos os documentos selecionados
  const handleStartDocumentation = async () => {
    const selectedDocumentIds = Array.from(selectedItems);
    
    // Verificar se todos os documentos selecionados têm fluxo associado
    const documentsWithoutFlow = selectedDocumentIds.filter(docId => !selectedFlows[docId]);
    
    if (documentsWithoutFlow.length > 0) {
      toast({
        title: "Fluxo não selecionado",
        description: `Selecione um fluxo para todos os ${documentsWithoutFlow.length} documento(s) antes de iniciar.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Inicializar progresso como 'pending' para todos os documentos selecionados
    const initialProgress: Record<string, 'pending'> = {};
    selectedDocumentIds.forEach(docId => {
      initialProgress[docId] = 'pending';
    });
    setDocumentationProgress(initialProgress);
    
    // Processar cada documento
    let successCount = 0;
    let errorCount = 0;
    
    for (const documentId of selectedDocumentIds) {
      const flowId = selectedFlows[documentId];
      
      // Atualizar progresso para 'processing'
      setDocumentationProgress(prev => ({
        ...prev,
        [documentId]: 'processing'
      }));
      
      try {
        await startDocumentationMutation.mutateAsync({
          documentId,
          flowId
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erro ao processar documento ${documentId}:`, error);
      }
    }
    
    // Invalidar queries relacionadas
    queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
    queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions/count"] });
    queryClient.invalidateQueries({ queryKey: ["/api/documentos/review", responsavel] });
    
    // Mostrar resultado final
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Documentação iniciada com sucesso!",
        description: `${successCount} documento(s) processado(s) com sucesso.`,
      });
      // Aguardar um pouco antes de fechar para mostrar o status
      setTimeout(() => {
        onClose();
      }, 2000);
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Processamento parcialmente concluído",
        description: `${successCount} sucesso(s), ${errorCount} erro(s).`,
        variant: "default",
      });
    } else {
      toast({
        title: "Erro no processamento",
        description: `Não foi possível processar os documentos selecionados.`,
        variant: "destructive",
      });
    }
    
    setIsProcessing(false);
  };

  // Seleção automática de fluxos quando há apenas um disponível para cada documento
  useEffect(() => {
    if (isOpen && documentosLimitados.length > 0 && documentsFlows) {
      const newSelectedFlows = { ...selectedFlows };
      let hasChanges = false;

      documentosLimitados.forEach((documento) => {
        // Se já tem fluxo selecionado para este documento, pular
        if (selectedFlows[documento.id]) {
          return;
        }

        const availableFlows = getAvailableFlows(documento);
        
        // Se há apenas um fluxo disponível, selecioná-lo automaticamente
        if (availableFlows.length === 1) {
          newSelectedFlows[documento.id] = availableFlows[0].id;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setSelectedFlows(newSelectedFlows);
      }
    }
  }, [isOpen, documentosLimitados, documentsFlows, selectedFlows]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-white dark:bg-[#111827] border-gray-200 dark:border-[#374151] flex flex-col">
        {/* Header fixo */}
        <DialogHeader className="border-b border-gray-200 dark:border-[#374151] pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-200">
            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Revisão de Documentos - {responsavel}
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Documentos MindBits_CT integrados para revisão
            {maxItemsParam && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-purple-600 dark:text-purple-400">
                  Limite máximo: {maxItemsParam_value} itens por revisor
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  Em processo: {documentosJaEmProcesso} itens
                </span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Disponível: {limiteDiponivel} itens
                </span>
              </div>
            )}
          </p>
        </DialogHeader>

        {/* Área com scroll */}
        <div className="flex-1 overflow-y-auto py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Carregando documentos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400">Erro ao carregar documentos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Tente novamente mais tarde
                </p>
              </div>
            </div>
          ) : documentosLimitados.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                {limiteDiponivel === 0 && documentos.length > 0 ? (
                  <>
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
                    <p className="text-amber-600 dark:text-amber-400 font-medium">
                      Limite de documentos por revisor atingido
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Você já possui {documentosJaEmProcesso} documentos em processo 
                      (limite: {maxItemsParam_value} por revisor)
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Finalize alguns documentos para poder pegar novos
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum documento encontrado para revisão
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Responsável: {responsavel} | Origem: MindBits_CT | Status: Integrado
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      ref={(el) => {
                        if (el && someSelected) {
                          (el as any).indeterminate = true;
                        }
                      }}
                    />
                    <label 
                      htmlFor="select-all" 
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      Selecionar todos
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Exibindo {documentosLimitados.length} de {documentos.length} documentos 
                    {limiteDiponivel === 0 && (
                      <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                        (Limite de {maxItemsParam_value} atingido)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {documentosLimitados.map((documento, index) => {
                  const availableFlows = getAvailableFlows(documento);
                  const selectedFlowId = selectedFlows[documento.id] || "";
                  
                  const documentProgress = documentationProgress[documento.id];
                  
                  return (
                    <Card key={documento.id} className={`bg-gray-50 dark:bg-[#0F172A] border-gray-200 dark:border-[#374151] hover:shadow-md transition-shadow ${
                      documentProgress ? 'ring-2' : ''
                    } ${
                      documentProgress === 'processing' ? 'ring-blue-500' :
                      documentProgress === 'success' ? 'ring-green-500' :
                      documentProgress === 'error' ? 'ring-red-500' :
                      documentProgress === 'pending' ? 'ring-gray-400' : ''
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              id={`select-${documento.id}`}
                              checked={selectedItems.has(documento.id)}
                              onCheckedChange={(checked) => handleItemSelection(documento.id, !!checked)}
                              className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <div className="flex-1">
                              <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-200 mb-2">
                                {documento.objeto || "Documento sem nome"}
                              </CardTitle>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{documento.responsavel}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{documento.createdAt ? formatDate(documento.createdAt.toString()) : "Data não disponível"}</span>
                              </div>
                            </div>
                            
                            {/* Select de Fluxo */}
                            <div className="mt-3">
                              <Select 
                                value={selectedFlowId} 
                                onValueChange={(flowId) => handleFlowChange(documento.id, flowId)}
                              >
                                <SelectTrigger className="h-8 text-xs font-mono bg-white dark:bg-[#1E293B] border-gray-300 dark:border-[#374151] text-gray-700 dark:text-gray-200">
                                  <SelectValue placeholder="Selecionar fluxo..." />
                                </SelectTrigger>
                                <SelectContent className="font-mono text-xs bg-white dark:bg-[#1E293B] border-gray-300 dark:border-[#374151]">
                                  {availableFlows.length === 0 ? (
                                    <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                      Nenhum fluxo disponível
                                    </div>
                                  ) : (
                                    availableFlows.map((flow: any) => (
                                      <SelectItem key={flow.id} value={flow.id} className="font-mono text-xs">
                                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                                          [{flow.code}]
                                        </span>
                                        <span className="ml-2 text-xs text-gray-700 dark:text-gray-200">
                                          {flow.name}
                                        </span>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {documentProgress && (
                              <div className="flex items-center gap-2">
                                {documentProgress === 'pending' && (
                                  <Clock className="h-4 w-4 text-gray-400" />
                                )}
                                {documentProgress === 'processing' && (
                                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                )}
                                {documentProgress === 'success' && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                                {documentProgress === 'error' && (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                              #{index + 1}
                            </div>
                          </div>
                        </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#0F172A] px-6 py-4 -mx-6 -mb-6 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white dark:bg-[#374151] border-gray-300 dark:border-[#6B7280] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1F2937]"
          >
            Fechar
          </Button>
          {selectedItems.size > 0 && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              onClick={handleStartDocumentation}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Iniciar Documentação ({selectedItems.size})
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}