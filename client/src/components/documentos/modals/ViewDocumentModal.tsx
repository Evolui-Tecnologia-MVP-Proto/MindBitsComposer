import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  File,
  Database,
  Paperclip,
  Image,
  FileText,
  Download,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { type Documento, type DocumentArtifact } from "@shared/schema";

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocument: Documento | null;
}

export function ViewDocumentModal({ isOpen, onClose, selectedDocument }: ViewDocumentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar artifacts do documento
  const { data: artifacts } = useQuery({
    queryKey: ['/api/documentos', selectedDocument?.id, 'artifacts'],
    queryFn: async () => {
      if (!selectedDocument?.id) return [];
      const response = await fetch(`/api/documentos/${selectedDocument.id}/artifacts`);
      if (!response.ok) throw new Error('Erro ao buscar artifacts');
      return response.json();
    },
    enabled: !!selectedDocument?.id,
    staleTime: 0, // Força refetch sempre
    gcTime: 0, // Não faz cache
  });



  // Mutation para integrar anexos
  const integrateAttachmentsMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documentos/${documentId}/integrate-attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao integrar anexos');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Anexos integrados com sucesso!",
      });
      // Invalidar artifacts do documento específico
      queryClient.invalidateQueries({
        queryKey: ['/api/documentos', selectedDocument?.id, 'artifacts']
      });
      // Invalidar lista principal de documentos para atualizar badge de sync
      queryClient.invalidateQueries({
        queryKey: ['/api/documentos']
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao integrar anexos",
        variant: "destructive",
      });
    },
  });

  // Função para verificar se monday_item_values tem conteúdo JSON válido
  const hasMondayItemValues = (documento: Documento): boolean => {
    if (!documento.mondayItemValues) return false;

    try {
      const parsed = Array.isArray(documento.mondayItemValues)
        ? documento.mondayItemValues
        : JSON.parse(JSON.stringify(documento.mondayItemValues));

      return (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.some((item) => item.value && item.value.trim() !== "")
      );
    } catch {
      return false;
    }
  };

  // Funções de formatação
  const formatDate = (date: Date | string | null): string => {
    if (!date) return "N/A";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "Incluido":
        return <Clock className="h-3 w-3" />;
      case "Concluido":
        return <CircleCheck className="h-3 w-3" />;
      case "Rejeitado":
        return <CircleX className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "Incluido":
        return "secondary";
      case "Concluido":
        return "default";
      case "Rejeitado":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusOrigemBadgeVariant = (statusOrigem: string | null) => {
    switch (statusOrigem) {
      case "Manual":
        return "secondary";
      case "Monday":
        return "default";
      case "GitHub":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getColumnTitle = (columnId: string): string => {
    const columnTitles: { [key: string]: string } = {
      "anexo_geral": "Anexo Geral",
      "anexo_especifico": "Anexo Específico",
      "documentacao": "Documentação",
      "imagens": "Imagens",
      "arquivos": "Arquivos",
    };
    return columnTitles[columnId] || `Coluna ${columnId}`;
  };

  if (!selectedDocument) return null;

  const showAnexosTab = hasMondayItemValues(selectedDocument);
  const gridCols = showAnexosTab ? "grid-cols-3" : "grid-cols-2";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-[#0F1729]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="h-5 w-5 text-blue-500" />
            <span>{selectedDocument.objeto}</span>
          </DialogTitle>
          <DialogDescription>
            Detalhes e anexos do documento
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados-gerais" className="w-full">
          <TabsList className={`grid w-full ${gridCols}`}>
            <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
            <TabsTrigger value="general-fields">General Fields</TabsTrigger>
            {showAnexosTab && (
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dados-gerais" className="mt-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Origem
                  </p>
                  <p className="text-sm">{selectedDocument.origem}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Cliente
                  </p>
                  <p className="text-sm">{selectedDocument.cliente}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Responsável
                  </p>
                  <p className="text-sm">{selectedDocument.responsavel}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Sistema
                  </p>
                  <p className="text-sm">{selectedDocument.sistema}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Módulo
                  </p>
                  <p className="text-sm">{selectedDocument.modulo}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Status
                  </p>
                  <div>
                    <Badge
                      variant={
                        getStatusBadgeVariant(selectedDocument.status) as any
                      }
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      {getStatusIcon(selectedDocument.status)}
                      {selectedDocument.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Status Origem
                  </p>
                  <div>
                    <Badge
                      variant={
                        getStatusOrigemBadgeVariant(
                          selectedDocument.statusOrigem,
                        ) as any
                      }
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      {selectedDocument.statusOrigem}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Data Criação
                  </p>
                  <p className="text-sm">
                    {formatDate(selectedDocument.createdAt)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Descrição
                </p>
                <p className="text-sm bg-gray-50 dark:bg-[#1E293B] p-3 rounded-md text-gray-700 dark:text-gray-300 border dark:border-[#374151] min-h-[80px]">
                  {selectedDocument.descricao}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general-fields" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium dark:text-gray-200">Campos Gerais</h3>
                <Badge variant="outline" className="text-xs dark:bg-[#374151] dark:border-[#6B7280] dark:text-gray-300">
                  {selectedDocument.generalColumns ? "JSON" : "Vazio"}
                </Badge>
              </div>

              {selectedDocument.generalColumns &&
              Object.keys(selectedDocument.generalColumns).length > 0 ? (
                <div className="grid gap-4">
                  {Object.entries(selectedDocument.generalColumns).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-3 gap-4 items-center"
                      >
                        <div className="bg-gray-50 dark:bg-[#1E293B] p-2 rounded border dark:border-[#374151]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Campo
                          </p>
                          <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {key}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Valor
                          </p>
                          <div className="bg-white dark:bg-[#0F172A] border dark:border-[#374151] rounded p-2 min-h-[40px] flex items-center">
                            <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                              {typeof value === "object"
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-[#1E293B] rounded-lg border dark:border-[#374151] border-dashed">
                  <Database className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhum campo geral encontrado
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Os campos gerais são armazenados no formato JSON
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {showAnexosTab && (
            <TabsContent value="anexos" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    Anexos (Assets) na Origem
                  </h4>

                  <Button
                    onClick={() => {
                      if (selectedDocument?.id) {
                        integrateAttachmentsMutation.mutate(
                          selectedDocument.id,
                        );
                      }
                    }}
                    disabled={
                      integrateAttachmentsMutation.isPending ||
                      (artifacts && artifacts.length > 0)
                    }
                    className={
                      artifacts && artifacts.length > 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }
                    size="sm"
                  >
                    {integrateAttachmentsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Integrando...
                      </>
                    ) : artifacts && artifacts.length > 0 ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Já Integrado
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Integrar Anexos
                      </>
                    )}
                  </Button>
                </div>

                {(() => {
                  try {
                    let mondayData = null;
                    if (selectedDocument?.mondayItemValues) {
                      // Verificar se já é um objeto ou se é uma string JSON
                      if (
                        typeof selectedDocument.mondayItemValues === "string"
                      ) {
                        mondayData = JSON.parse(
                          selectedDocument.mondayItemValues,
                        );
                      } else {
                        mondayData = selectedDocument.mondayItemValues;
                      }
                    }

                    if (
                      !mondayData ||
                      !Array.isArray(mondayData) ||
                      mondayData.length === 0
                    ) {
                      return (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                          <Database className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Nenhum dado do Monday.com encontrado
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {mondayData.map(
                          (column: any, columnIndex: number) => {
                            try {
                              const value = column.value
                                ? JSON.parse(column.value)
                                : {};
                              const files = value.files || [];

                              if (
                                !Array.isArray(files) ||
                                files.length === 0
                              ) {
                                return null; // Pular colunas sem arquivos
                              }

                              return (
                                <div
                                  key={columnIndex}
                                  className="bg-white border rounded-lg p-4"
                                >
                                  <h5 className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-700">
                                    <Paperclip className="h-4 w-4 text-blue-500" />
                                    {getColumnTitle(column.columnid)}
                                  </h5>

                                  <div className="w-full overflow-x-auto">
                                    <Table className="table-fixed min-w-full text-sm">
                                      <TableHeader>
                                        <TableRow className="h-8">
                                          <TableHead
                                            className="w-40 px-2 py-1 font-medium"
                                            style={{ fontSize: "14px" }}
                                          >
                                            Arquivo
                                          </TableHead>
                                          <TableHead
                                            className="w-40 px-2 py-1 font-medium"
                                            style={{ fontSize: "14px" }}
                                          >
                                            Asset ID
                                          </TableHead>
                                          <TableHead
                                            className="w-20 px-2 py-1 font-medium"
                                            style={{ fontSize: "14px" }}
                                          >
                                            Tipo
                                          </TableHead>
                                          <TableHead
                                            className="w-20 px-2 py-1 font-medium text-center"
                                            style={{ fontSize: "14px" }}
                                          >
                                            Ações
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {files.map(
                                          (file: any, fileIndex: number) => (
                                            <TableRow
                                              key={fileIndex}
                                              className="h-8"
                                            >
                                              <TableCell className="font-medium w-40 px-2 py-1">
                                                <div className="flex items-center gap-1 min-w-0">
                                                  {file.isImage === "true" ||
                                                  file.isImage === true ? (
                                                    <Image className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                  ) : (
                                                    <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                                  )}
                                                  <span
                                                    className="truncate text-xs"
                                                    title={file.name || "N/A"}
                                                  >
                                                    {file.name || "N/A"}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell
                                                className="font-mono text-xs w-40 px-2 py-1"
                                                title={
                                                  file.assetId
                                                    ? String(file.assetId)
                                                    : "N/A"
                                                }
                                              >
                                                {file.assetId
                                                  ? String(file.assetId)
                                                  : "N/A"}
                                              </TableCell>
                                              <TableCell className="w-28 px-2 py-1">
                                                <div className="flex items-center justify-center space-x-1">
                                                  {file.isImage === "true" ||
                                                  file.isImage === true ? (
                                                    <>
                                                      <span className="text-sm">
                                                        📷
                                                      </span>
                                                      <span className="text-xs text-green-600">
                                                        Imagem
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <span className="text-sm">
                                                        📄
                                                      </span>
                                                      <span className="text-xs text-gray-600">
                                                        Arquivo
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="w-20 px-2 py-1">
                                                <div className="flex justify-center">
                                                  {file.assetId &&
                                                    artifacts?.find(
                                                      (artifact: DocumentArtifact) =>
                                                        artifact.originAssetId ===
                                                        file.assetId?.toString(),
                                                    ) && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={async () => {
                                                          // Encontrar o artifact correspondente pelo originAssetId
                                                          const correspondingArtifact =
                                                            artifacts?.find(
                                                              (artifact: DocumentArtifact) =>
                                                                artifact.originAssetId ===
                                                                file.assetId?.toString(),
                                                            );

                                                          if (
                                                            correspondingArtifact
                                                          ) {
                                                            try {
                                                              // Fazer download do arquivo via fetch
                                                              const response =
                                                                await fetch(
                                                                  `/api/artifacts/${correspondingArtifact.id}/file`,
                                                                );

                                                              if (
                                                                !response.ok
                                                              ) {
                                                                throw new Error(
                                                                  "Erro ao carregar arquivo",
                                                                );
                                                              }

                                                              const blob =
                                                                await response.blob();
                                                              const url =
                                                                URL.createObjectURL(
                                                                  blob,
                                                                );

                                                              // Abrir em nova aba
                                                              window.open(
                                                                url,
                                                                "_blank",
                                                              );

                                                              // Limpar URL após um tempo
                                                              setTimeout(
                                                                () =>
                                                                  URL.revokeObjectURL(
                                                                    url,
                                                                  ),
                                                                10000,
                                                              );
                                                            } catch (error) {
                                                              console.error(
                                                                "Erro ao carregar arquivo:",
                                                                error,
                                                              );
                                                              toast({
                                                                title: "Erro",
                                                                description:
                                                                  "Erro ao carregar arquivo",
                                                                variant:
                                                                  "destructive",
                                                              });
                                                            }
                                                          }
                                                        }}
                                                      >
                                                        <Download className="h-3 w-3" />
                                                      </Button>
                                                    )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ),
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              );
                            } catch (fileError) {
                              console.error(
                                "Erro ao processar arquivo:",
                                fileError,
                              );
                              return (
                                <div
                                  key={columnIndex}
                                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                                >
                                  <p className="text-sm text-red-600">
                                    Erro ao processar coluna {columnIndex + 1}
                                  </p>
                                </div>
                              );
                            }
                          },
                        )}

                        {mondayData.filter((column: any) => {
                          try {
                            const value = column.value
                              ? JSON.parse(column.value)
                              : {};
                            const files = value.files || [];
                            return Array.isArray(files) && files.length > 0;
                          } catch {
                            return false;
                          }
                        }).length === 0 && (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                            <Database className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              Nenhum arquivo encontrado nos dados do
                              Monday.com
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  } catch (error) {
                    console.error(
                      "Erro ao processar monday_item_values:",
                      error,
                    );
                    return (
                      <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                        <p className="text-sm text-red-600">
                          Erro ao processar dados do Monday.com
                        </p>
                        <p className="text-xs text-red-500 mt-1">
                          Formato de dados inválido:{" "}
                          {error instanceof Error
                            ? error.message
                            : "Erro desconhecido"}
                        </p>
                        {selectedDocument?.mondayItemValues && (
                          <details className="mt-3 text-left">
                            <summary className="text-xs text-red-500 cursor-pointer">
                              Ver dados brutos
                            </summary>
                            <pre className="text-xs bg-red-100 p-2 rounded mt-2 overflow-auto max-h-32">
                              {typeof selectedDocument.mondayItemValues ===
                              "string"
                                ? selectedDocument.mondayItemValues
                                : JSON.stringify(
                                    selectedDocument.mondayItemValues,
                                    null,
                                    2,
                                  )}
                            </pre>
                          </details>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}