import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  BookOpen,
  File,
  Download,
  Check,
  Loader2,
} from "lucide-react";

interface Documento {
  id: string;
  objeto: string;
  cliente: string;
  responsavel: string;
  sistema: string;
  modulo: string;
  assetsSynced?: boolean;
  origem?: string;
  [key: string]: any; // Para permitir acesso dinâmico a campos
}

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocument: Documento | null;
  selectedFlowId: string;
  setSelectedFlowId: (id: string) => void;
  documentsFlows: any[];
  optimisticSyncState: string | null;
  setOptimisticSyncState: (id: string | null) => void;
  onStartDocumentation: (data: { documentId: string; flowId: string }) => void;
  onIntegrateAttachments: (documentId: string) => void;
  hasMondayItemValues: (doc: Documento) => boolean;
  startDocumentationMutation: {
    isPending: boolean;
  };
  integrateAttachmentsMutation: {
    isPending: boolean;
    mutate: (documentId: string) => void;
  };
}

export function DocumentationModal({
  isOpen,
  onClose,
  selectedDocument,
  selectedFlowId,
  setSelectedFlowId,
  documentsFlows,
  optimisticSyncState,
  setOptimisticSyncState,
  onStartDocumentation,
  onIntegrateAttachments,
  hasMondayItemValues,
  startDocumentationMutation,
  integrateAttachmentsMutation,
}: DocumentationModalProps) {
  const { toast } = useToast();

  // Declarar funções como const antes de usá-las para evitar problemas de hoisting
  const evaluateCondition = (document: Documento, condition: any): boolean => {
    const field = condition.field;
    const operator = condition.operator;
    const value = condition.value;
    const documentValue = document[field];
    
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

  // Declarar as funções auxiliares antes da função principal
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

  // Função para verificar se o documento atende aos critérios do application_filter
  const documentMatchesFlowFilter = (document: Documento, flow: any): boolean => {
    // Se o fluxo não tem application_filter, sempre mostrar
    if (!flow.applicationFilter || Object.keys(flow.applicationFilter).length === 0) {
      return true;
    }

    try {
      const filter = flow.applicationFilter;
      
      // Verificar se tem estrutura aplication.filter
      if (filter.aplication && filter.aplication.filter) {
        const filterConfig = filter.aplication.filter;
        const field = filterConfig.field;
        const operator = filterConfig.operator;
        const value = filterConfig.value;
        
        // Obter o valor do campo no documento
        const documentValue = document[field];
        
        // Aplicar operador
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
      
      // Verificar estrutura com and/or
      if (filter.aplication && filter.aplication.and) {
        return evaluateAndConditions(document, filter.aplication.and);
      }
      
      if (filter.aplication && filter.aplication.or) {
        return evaluateOrConditions(document, filter.aplication.or);
      }
      
      return true; // Se não reconhecer a estrutura, mostrar o fluxo
    } catch (error) {
      console.error('Erro ao avaliar application_filter:', error);
      return true; // Em caso de erro, mostrar o fluxo
    }
  };

  // Efeito para selecionar automaticamente o fluxo quando houver apenas um disponível
  useEffect(() => {
    if (isOpen && selectedDocument && documentsFlows) {
      // Filtrar fluxos disponíveis
      const availableFlows = documentsFlows.filter(
        (flow: any) => flow.isEnabled === true && documentMatchesFlowFilter(selectedDocument, flow)
      );
      
      // Se houver apenas um fluxo disponível, selecioná-lo automaticamente
      if (availableFlows.length === 1 && !selectedFlowId) {
        setSelectedFlowId(availableFlows[0].id);
      }
    }
  }, [isOpen, selectedDocument, documentsFlows, selectedFlowId]);

  const handleStartDocumentation = () => {
    console.log("Iniciar documentação para:", selectedDocument);
    console.log("Fluxo selecionado:", selectedFlowId);
    if (!selectedFlowId) {
      toast({
        title: "Fluxo obrigatório",
        description: "Por favor, selecione um fluxo de documentação.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDocument) {
      onStartDocumentation({
        documentId: selectedDocument.id,
        flowId: selectedFlowId
      });
    }
  };

  const handleIntegrateAttachments = () => {
    if (selectedDocument?.id) {
      // Atualização otimística - definir como sincronizado imediatamente
      setOptimisticSyncState(selectedDocument.id);
      integrateAttachmentsMutation.mutate(selectedDocument.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg dark:bg-[#0F1729]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Iniciar Documentação
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros para iniciar o processo de documentação do
            documento selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Documento selecionado */}
          {selectedDocument && (
            <div className="bg-gray-50 dark:bg-[#1E293B] p-4 rounded-lg border dark:border-[#374151]">
              <div className="flex items-start gap-3">
                <File className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {selectedDocument.objeto}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="font-medium dark:text-gray-200">Cliente:</span>{" "}
                      {selectedDocument.cliente}
                    </div>
                    <div>
                      <span className="font-medium dark:text-gray-200">Responsável:</span>{" "}
                      {selectedDocument.responsavel}
                    </div>
                    <div>
                      <span className="font-medium dark:text-gray-200">Sistema:</span>{" "}
                      {selectedDocument.sistema}
                    </div>
                    <div>
                      <span className="font-medium dark:text-gray-200">Módulo:</span>{" "}
                      {selectedDocument.modulo}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aviso de anexos - não sincronizados ou já sincronizados */}
          {selectedDocument && (() => {
            const hasMondayData = hasMondayItemValues(selectedDocument);
            
            // Usar estado otimístico se disponível, senão usar o campo assetsSynced do documento
            const isOptimisticallySynced = optimisticSyncState === selectedDocument.id;
            const isSynced = isOptimisticallySynced || selectedDocument.assetsSynced;
            
            const hasUnsyncedAttachments = hasMondayData && !isSynced;
            const hasSyncedAttachments = hasMondayData && isSynced;
            
            if (hasUnsyncedAttachments) {
              return (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">
                        Anexos não sincronizados
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                        O item tem anexos que não foram sincronizados. Estes anexos podem ser úteis para o processo de análise e geração da documentação.
                      </p>
                      <Button
                        onClick={handleIntegrateAttachments}
                        disabled={integrateAttachmentsMutation.isPending}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {integrateAttachmentsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Sincronizar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
            
            if (hasSyncedAttachments) {
              return (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-400">
                        Anexos do item já sincronizados
                      </h4>
                    </div>
                  </div>
                </div>
              );
            }
            
            return null;
          })()}

          {/* Seleção de Fluxo */}
          <div className="space-y-3">
            <Label htmlFor="flow-select" className="text-sm font-medium dark:text-gray-200">
              Selecionar Fluxo de Documentação
            </Label>
            <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
              <SelectTrigger id="flow-select" className="font-mono text-xs dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Escolha um fluxo para a documentação" />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs dark:bg-[#0F172A] dark:border-[#374151]">
                {documentsFlows
                  .filter((flow: any) => flow.isEnabled === true && (!selectedDocument || documentMatchesFlowFilter(selectedDocument, flow)))
                  .map((flow: any) => (
                  <SelectItem key={flow.id} value={flow.id} className="font-mono text-xs">
                    <span className="font-mono text-xs">
                      [{flow.code}]
                    </span>
                    <span className="ml-2 text-xs">
                      {flow.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFlowId && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                    Fluxo selecionado
                  </span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {documentsFlows.find((flow: any) => flow.id === selectedFlowId)?.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleStartDocumentation}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-[#1E40AF] dark:hover:bg-[#1E3A8A]"
            disabled={!selectedFlowId || startDocumentationMutation.isPending}
          >
            {startDocumentationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Confirmar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}