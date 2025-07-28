import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Calendar, 
  User, 
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { type Documento } from "@shared/schema";

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  responsavel: string;
}

export function DocumentReviewModal({ isOpen, onClose, responsavel }: DocumentReviewModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-[#111827] border-gray-200 dark:border-[#374151]">
        <DialogHeader className="border-b border-gray-200 dark:border-[#374151] pb-4">
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

        <div className="mt-6">
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
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Exibindo {documentosLimitados.length} de {documentos.length} documentos
                </p>
                {documentos.length > maxItems && (
                  <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Limite atingido
                  </Badge>
                )}
              </div>

              <div className="grid gap-4">
                {documentosLimitados.map((documento, index) => (
                  <Card key={documento.id} className="bg-gray-50 dark:bg-[#0F172A] border-gray-200 dark:border-[#374151] hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                            {documento.objeto || "Documento sem nome"}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{documento.responsavel}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{documento.createdAt ? formatDate(documento.createdAt.toString()) : "Data não disponível"}</span>
                            </div>
                            {documento.updatedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Atualizado: {formatDate(documento.updatedAt.toString())}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-600">
                            {documento.origem}
                          </Badge>
                          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-600">
                            {documento.status}
                          </Badge>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {documento.descricao && (
                      <CardContent className="pt-0">
                        <div className="bg-white dark:bg-[#1E293B] rounded p-3 border border-gray-200 dark:border-[#374151]">
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {documento.descricao}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#0F172A] -mx-6 -mb-6 px-6 py-4">
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