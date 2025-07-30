import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Plus,
  Paperclip,
  Loader2,
  FileText,
  Image,
  Database,
  Eye,
  Trash2,
  Download,
} from "lucide-react";
import { type Documento, type DocumentArtifact, type InsertDocumentArtifact } from "@shared/schema";

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDocument: Documento | null;
  currentCreatedDocumentId: string | null;
  formData: any;
  setFormData: (data: any) => void;
  onOpenAddArtifactModal: () => void;
  onOpenEditArtifactModal: (artifact: DocumentArtifact) => void;
  onDeleteArtifact: (artifactId: string) => void;
  onUpdateDocument: () => void;
  updateDocumentoMutation: any;
}

export function EditDocumentModal({
  isOpen,
  onClose,
  editingDocument,
  currentCreatedDocumentId,
  formData,
  setFormData,
  onOpenAddArtifactModal,
  onOpenEditArtifactModal,
  onDeleteArtifact,
  onUpdateDocument,
  updateDocumentoMutation,
}: EditDocumentModalProps) {
  const { toast } = useToast();

  // Query para buscar artifacts do documento em edição
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery({
    queryKey: ["/api/documentos", editingDocument?.id, "artifacts"],
    enabled: !!editingDocument?.id,
  });

  // Função para obter ícone do tipo de arquivo
  const getFileTypeIcon = (type: string | null | undefined) => {
    if (!type) return <FileText className="h-4 w-4 text-gray-500" />;
    
    switch (type.toLowerCase()) {
      case "image":
        return <Image className="h-4 w-4 text-green-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "monday_asset":
        return <Database className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Função para verificar se o MIME type é suportado pelo browser para visualização
  const isSupportedForPreview = (mimeType: string | null | undefined): boolean => {
    if (!mimeType) return false;
    
    const supportedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml'
    ];
    
    return supportedTypes.includes(mimeType.toLowerCase());
  };

  if (!editingDocument) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            {currentCreatedDocumentId
              ? "Criar Novo Documento"
              : `Editar Documento: ${editingDocument.objeto}`}
          </DialogTitle>
          <DialogDescription>
            {currentCreatedDocumentId
              ? "Complete os dados do documento e adicione anexos conforme necessário"
              : "Edite os dados do documento e gerencie seus anexos"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados-gerais" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="dados-gerais" className="mt-6">
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-objeto">Objeto da Task</Label>
                  <Input
                    id="edit-objeto"
                    value={formData.objeto}
                    onChange={(e) =>
                      setFormData({ ...formData, objeto: e.target.value })
                    }
                    placeholder="Descrição da task"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tipo">Tipo</Label>
                  <Input
                    id="edit-tipo"
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value })
                    }
                    placeholder="Tipo do documento"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-cliente">Cliente</Label>
                  <Input
                    id="edit-cliente"
                    value={formData.cliente}
                    onChange={(e) =>
                      setFormData({ ...formData, cliente: e.target.value })
                    }
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-responsavel">Responsável</Label>
                  <Input
                    id="edit-responsavel"
                    value={formData.responsavel}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavel: e.target.value })
                    }
                    placeholder="Responsável pela task"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-sistema">Sistema</Label>
                  <Input
                    id="edit-sistema"
                    value={formData.sistema}
                    onChange={(e) =>
                      setFormData({ ...formData, sistema: e.target.value })
                    }
                    placeholder="Sistema relacionado"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-modulo">Módulo</Label>
                  <Input
                    id="edit-modulo"
                    value={formData.modulo}
                    onChange={(e) =>
                      setFormData({ ...formData, modulo: e.target.value })
                    }
                    placeholder="Módulo do sistema"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Incluido">Incluído</SelectItem>
                      <SelectItem value="Em Processo">Em Processo</SelectItem>
                      <SelectItem value="Concluido">Concluído</SelectItem>
                      <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-solicitante">Solicitante</Label>
                  <Input
                    id="edit-solicitante"
                    value={formData.solicitante}
                    onChange={(e) =>
                      setFormData({ ...formData, solicitante: e.target.value })
                    }
                    placeholder="Quem solicitou"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-aprovador">Aprovador</Label>
                  <Input
                    id="edit-aprovador"
                    value={formData.aprovador}
                    onChange={(e) =>
                      setFormData({ ...formData, aprovador: e.target.value })
                    }
                    placeholder="Quem aprova"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-agente">Agente</Label>
                <Input
                  id="edit-agente"
                  value={formData.agente}
                  onChange={(e) =>
                    setFormData({ ...formData, agente: e.target.value })
                  }
                  placeholder="Agente responsável"
                />
              </div>

              <div>
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea
                  id="edit-descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descrição detalhada da task..."
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="mt-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium">Anexos do Documento</h4>
                <Button
                  onClick={onOpenAddArtifactModal}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Anexo
                </Button>
              </div>

              {isLoadingArtifacts ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Carregando anexos...
                  </p>
                </div>
              ) : artifacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artifacts.map((artifact: DocumentArtifact) => (
                      <TableRow key={artifact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(artifact.type)}
                            <span className="text-xs font-medium uppercase">
                              {artifact.type || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{artifact.name}</p>
                            {artifact.fileName && (
                              <p className="text-xs text-gray-500">
                                {artifact.fileName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {artifact.fileSize && (
                              <p>
                                Tamanho:{" "}
                                {Math.round(
                                  parseInt(artifact.fileSize) / 1024,
                                )}{" "}
                                KB
                              </p>
                            )}
                            {artifact.mimeType && (
                              <p>Tipo: {artifact.mimeType}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {artifact.fileData &&
                              isSupportedForPreview(artifact.mimeType) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    try {
                                      // Criar URL do blob para visualizar
                                      const byteCharacters = atob(
                                        artifact.fileData || "",
                                      );
                                      const byteNumbers = new Array(
                                        byteCharacters.length,
                                      );
                                      for (
                                        let i = 0;
                                        i < byteCharacters.length;
                                        i++
                                      ) {
                                        byteNumbers[i] =
                                          byteCharacters.charCodeAt(i);
                                      }
                                      const byteArray = new Uint8Array(
                                        byteNumbers,
                                      );
                                      const blob = new Blob([byteArray], {
                                        type: artifact.mimeType || undefined,
                                      });
                                      const url = URL.createObjectURL(blob);

                                      // Abrir em nova aba
                                      window.open(url, "_blank");

                                      // Limpar URL após um tempo
                                      setTimeout(
                                        () => URL.revokeObjectURL(url),
                                        10000,
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Erro ao visualizar arquivo:",
                                        error,
                                      );
                                      toast({
                                        title: "Erro",
                                        description:
                                          "Erro ao visualizar arquivo",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  title="Visualizar arquivo"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}

                            {artifact.fileData && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  try {
                                    // Criar URL do blob para download
                                    const byteCharacters = atob(
                                      artifact.fileData || "",
                                    );
                                    const byteNumbers = new Array(
                                      byteCharacters.length,
                                    );
                                    for (
                                      let i = 0;
                                      i < byteCharacters.length;
                                      i++
                                    ) {
                                      byteNumbers[i] =
                                        byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray], {
                                      type: artifact.mimeType || undefined,
                                    });
                                    const url = URL.createObjectURL(blob);

                                    // Criar link temporário para download
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download =
                                      artifact.fileName || "arquivo";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                    // Limpar URL
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error(
                                      "Erro ao baixar arquivo:",
                                      error,
                                    );
                                    toast({
                                      title: "Erro",
                                      description: "Erro ao baixar arquivo",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                title="Baixar arquivo"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenEditArtifactModal(artifact)}
                              title="Editar anexo"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteArtifact(artifact.id)}
                              title="Excluir anexo"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    Nenhum anexo encontrado
                  </p>
                  <Button
                    onClick={onOpenAddArtifactModal}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar primeiro anexo
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onUpdateDocument}
            disabled={updateDocumentoMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateDocumentoMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}