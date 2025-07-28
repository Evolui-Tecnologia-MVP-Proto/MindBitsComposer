import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Calendar, 
  User, 
  Clock,
  Loader2,
  AlertCircle,
  Workflow
} from "lucide-react";
import { type Documento } from "@shared/schema";

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  responsavel: string;
}

export function DocumentReviewModal({ isOpen, onClose, responsavel }: DocumentReviewModalProps) {
  // Estado para gerenciar fluxos selecionados por documento
  const [selectedFlows, setSelectedFlows] = useState<Record<string, string>>({});
  
  // Estado para gerenciar itens selecionados via checkbox
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  // Calcular limite de itens
  const getMaxItems = () => {
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

  const maxItems = getMaxItems();
  const documentosLimitados = documentos.slice(0, maxItems);

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
    }
  }, [isOpen]);

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
              <span className="text-purple-600 dark:text-purple-400">
                {" "}(Limite: {maxItems} itens - mais antigos primeiro)
              </span>
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
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum documento encontrado para revisão
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Responsável: {responsavel} | Origem: MindBits_CT | Status: Integrado
                </p>
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
                  </p>
                </div>
                {documentos.length > maxItems && (
                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Limite atingido
                  </Badge>
                )}
              </div>

              <div className="grid gap-4">
                {documentosLimitados.map((documento, index) => {
                  const availableFlows = getAvailableFlows(documento);
                  const selectedFlowId = selectedFlows[documento.id] || "";
                  
                  return (
                    <Card key={documento.id} className="bg-gray-50 dark:bg-[#0F172A] border-gray-200 dark:border-[#374151] hover:shadow-md transition-shadow">
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
          {documentosLimitados.length > 0 && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                // TODO: Implementar ação para iniciar revisão em lote
                console.log("Iniciando revisão de", documentosLimitados.length, "documentos");
              }}
            >
              Iniciar Revisão ({documentosLimitados.length})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}