import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Plus,
  File,
  Pencil,
  Trash2,
  Loader2,
  Paperclip,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { type DocumentArtifact, type InsertDocumento } from "@shared/schema";

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: InsertDocumento & {
    solicitante?: string;
    aprovador?: string;
    agente?: string;
  };
  setFormData: (data: InsertDocumento & {
    solicitante?: string;
    aprovador?: string;
    agente?: string;
  }) => void;
  createModalActiveTab: string;
  setCreateModalActiveTab: (tab: string) => void;
  currentCreatedDocumentId: string | null;
  isEscopoExpanded: boolean;
  setIsEscopoExpanded: (expanded: boolean) => void;
  isPessoasExpanded: boolean;
  setIsPessoasExpanded: (expanded: boolean) => void;
  createdDocumentArtifacts: DocumentArtifact[];
  onCreateDocument: () => void;
  createDocumentoMutation: {
    isPending: boolean;
  };
  updateDocumentoMutation: {
    isPending: boolean;
    mutate: (data: { id: string; data: any }) => void;
  };
  deleteArtifactMutation: {
    isPending: boolean;
    mutate: (id: string) => void;
  };
  onOpenAddArtifactModal: (documentId: string) => void;
  onOpenEditArtifactModal: (artifact: DocumentArtifact) => void;
  resetFormData: () => void;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  createModalActiveTab,
  setCreateModalActiveTab,
  currentCreatedDocumentId,
  isEscopoExpanded,
  setIsEscopoExpanded,
  isPessoasExpanded,
  setIsPessoasExpanded,
  createdDocumentArtifacts,
  onCreateDocument,
  createDocumentoMutation,
  updateDocumentoMutation,
  deleteArtifactMutation,
  onOpenAddArtifactModal,
  onOpenEditArtifactModal,
  resetFormData,
}: CreateDocumentModalProps) {
  // Query para buscar tipos de documento da tabela generic_tables
  const { data: docTypesData, isLoading, error } = useQuery({
    queryKey: ['/api/generic-tables/manual_doc_types'],
    queryFn: async () => {
      console.log('🔍 Fazendo query para tipos de documento...');
      const response = await fetch('/api/generic-tables/manual_doc_types');
      console.log('📄 Response status:', response.status);
      if (!response.ok) throw new Error('Erro ao buscar tipos de documento');
      const data = await response.json();
      console.log('📋 Dados recebidos:', data);
      return data;
    },
    enabled: isOpen,
  });

  // Extrair as opções de tipos de documento do conteúdo JSON
  const docTypeOptions = docTypesData?.content?.manual_doc_types || [];
  
  console.log('🎯 Modal aberto:', isOpen);
  console.log('🎯 Loading:', isLoading);
  console.log('🎯 Error:', error);
  console.log('🎯 DocTypesData:', docTypesData);
  console.log('🎯 DocTypeOptions:', docTypeOptions);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetFormData();
        }
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            {currentCreatedDocumentId
              ? "Criar Novo Documento"
              : "Criar Novo Documento"}
          </DialogTitle>
          <DialogDescription>
            {currentCreatedDocumentId
              ? "Documento criado com sucesso! Gerencie os dados e anexos"
              : "Preencha os dados do novo documento"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={createModalActiveTab}
          onValueChange={setCreateModalActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
            <TabsTrigger
              value="anexos"
              disabled={!currentCreatedDocumentId}
              className={
                !currentCreatedDocumentId ? "opacity-50 cursor-not-allowed" : ""
              }
            >
              Anexos {currentCreatedDocumentId ? "✅" : "🔒"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados-gerais" className="mt-6">
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="objeto">Objeto da Task</Label>
                  <Input
                    id="objeto"
                    value={formData.objeto}
                    onChange={(e) =>
                      setFormData({ ...formData, objeto: e.target.value })
                    }
                    placeholder="Nome do documento"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypeOptions.map((option: [string, string]) => (
                        <SelectItem key={option[0]} value={option[0]}>
                          {option[1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-700">Escopo</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEscopoExpanded(!isEscopoExpanded)}
                    className="h-6 w-6 p-0 hover:bg-blue-100"
                  >
                    {isEscopoExpanded ? (
                      <ChevronUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    )}
                  </Button>
                </div>
                {isEscopoExpanded && (
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="cliente">Cliente</Label>
                      <Input
                        id="cliente"
                        value={formData.cliente}
                        onChange={(e) =>
                          setFormData({ ...formData, cliente: e.target.value })
                        }
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sistema">Sistema</Label>
                        <Input
                          id="sistema"
                          value={formData.sistema}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sistema: e.target.value,
                            })
                          }
                          placeholder="Sistema"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modulo">Módulo</Label>
                        <Input
                          id="modulo"
                          value={formData.modulo}
                          onChange={(e) =>
                            setFormData({ ...formData, modulo: e.target.value })
                          }
                          placeholder="Módulo"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Pessoas</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPessoasExpanded(!isPessoasExpanded)}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    {isPessoasExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>
                {isPessoasExpanded && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input
                        id="responsavel"
                        value={formData.responsavel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            responsavel: e.target.value,
                          })
                        }
                        placeholder="Responsável"
                      />
                    </div>
                    <div>
                      <Label htmlFor="solicitante">Solicitante</Label>
                      <Input
                        id="solicitante"
                        value={formData.solicitante}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            solicitante: e.target.value,
                          })
                        }
                        placeholder="Solicitante"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aprovador">Aprovador</Label>
                      <Input
                        id="aprovador"
                        value={formData.aprovador}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            aprovador: e.target.value,
                          })
                        }
                        placeholder="Aprovador"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agente">Agente</Label>
                      <Input
                        id="agente"
                        value={formData.agente}
                        onChange={(e) =>
                          setFormData({ ...formData, agente: e.target.value })
                        }
                        placeholder="Agente"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="descricao">Detalhamento</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Detalhamento completo do documento..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="mt-6">
            <div className="space-y-4">
              {currentCreatedDocumentId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Anexos do Documento</h3>
                    <Button
                      onClick={() => onOpenAddArtifactModal(currentCreatedDocumentId)}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Anexo
                    </Button>
                  </div>

                  {/* Lista de anexos */}
                  {createdDocumentArtifacts &&
                  createdDocumentArtifacts.length > 0 ? (
                    <div className="space-y-2">
                      {createdDocumentArtifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <File className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">
                                {artifact.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {artifact.fileName} • {artifact.mimeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenEditArtifactModal(artifact)}
                              title="Editar anexo"
                            >
                              <Pencil className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log(
                                  "🗑️ EXCLUINDO ANEXO DIRETAMENTE:",
                                  artifact.id,
                                );
                                deleteArtifactMutation.mutate(artifact.id);
                              }}
                              title="Excluir anexo"
                              disabled={deleteArtifactMutation.isPending}
                            >
                              {deleteArtifactMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <Paperclip className="h-8 w-8 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-green-700 mb-3">
                        ✅ Documento criado com sucesso!
                      </p>
                      <p className="text-xs text-green-600">
                        Adicione anexos clicando no botão acima
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    Adicione anexos após criar o documento
                  </p>
                  <p className="text-xs text-gray-400">
                    Os anexos poderão ser gerenciados após a criação
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            {currentCreatedDocumentId ? "Fechar" : "Cancelar"}
          </Button>
          {!currentCreatedDocumentId ? (
            <Button
              onClick={onCreateDocument}
              disabled={createDocumentoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
            >
              {createDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Documento
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                // Salvar alterações no documento existente
                if (currentCreatedDocumentId) {
                  updateDocumentoMutation.mutate({
                    id: currentCreatedDocumentId,
                    data: formData,
                  });
                }
              }}
              disabled={updateDocumentoMutation.isPending}
              className="bg-green-600 hover:bg-green-700 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}