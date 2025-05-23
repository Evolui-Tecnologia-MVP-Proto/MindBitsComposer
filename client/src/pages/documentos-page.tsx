import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  File,
  Clock,
  CircleCheck,
  CircleX,
  AlertCircle,
  Loader2,
  Paperclip,
  Upload,
  Download,
} from "lucide-react";
import { type Documento, type InsertDocumento, type DocumentArtifact, type InsertDocumentArtifact } from "@shared/schema";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("integrados");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [editingDocument, setEditingDocument] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<DocumentArtifact | null>(null);
  const [artifactFormData, setArtifactFormData] = useState<InsertDocumentArtifact>({
    documentoId: "",
    name: "",
    file: "",
    type: "",
  });
  const [formData, setFormData] = useState<InsertDocumento>({
    origem: "",
    objeto: "",
    cliente: "",
    responsavel: "",
    sistema: "",
    modulo: "",
    descricao: "",
    status: "Integrado",
    statusOrigem: "Incluido",
  });

  const queryClient = useQueryClient();

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar artefatos do documento selecionado
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery<DocumentArtifact[]>({
    queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"],
    enabled: !!selectedDocument?.id,
  });

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: async (data: InsertDocumento) => {
      const response = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar documento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setIsCreateModalOpen(false);
      setFormData({
        origem: "",
        objeto: "",
        cliente: "",
        responsavel: "",
        sistema: "",
        modulo: "",
        descricao: "",
        status: "Integrado",
        statusOrigem: "Incluido",
      });
    },
  });

  // Mutation para criar artefato
  const createArtifactMutation = useMutation({
    mutationFn: async (data: InsertDocumentArtifact) => {
      const response = await fetch(`/api/documentos/${data.documentoId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar artefato");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] });
      setIsAddArtifactModalOpen(false);
      resetArtifactForm();
    },
  });

  // Mutation para atualizar artefato
  const updateArtifactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentArtifact> }) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar artefato");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] });
      setIsEditArtifactModalOpen(false);
      resetArtifactForm();
    },
  });

  // Mutation para excluir artefato
  const deleteArtifactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir artefato");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"] });
    },
  });

  // Mutation para atualizar documento
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDocumento> }) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar documento");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setIsCreateModalOpen(false);
      setEditingDocument(null);
      resetForm();
    },
  });

  // Mutation para excluir documento
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir documento");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
    },
  });

  // Filtrar documentos por status
  const documentosIntegrados = useMemo(() => 
    documentos.filter(doc => doc.status === "Integrado"), [documentos]);
  const documentosProcessando = useMemo(() => 
    documentos.filter(doc => doc.status === "Processando"), [documentos]);
  const documentosConcluidos = useMemo(() => 
    documentos.filter(doc => doc.status === "Concluido"), [documentos]);

  const handleCreateDocument = () => {
    if (editingDocument) {
      // Atualizar documento existente
      updateDocumentMutation.mutate({
        id: editingDocument.id,
        data: formData,
      });
    } else {
      // Criar novo documento
      createDocumentoMutation.mutate(formData);
    }
  };

  const handleEditDocument = (documento: Documento) => {
    setEditingDocument(documento);
    setFormData({
      origem: documento.origem,
      objeto: documento.objeto,
      cliente: documento.cliente,
      responsavel: documento.responsavel,
      sistema: documento.sistema,
      modulo: documento.modulo,
      descricao: documento.descricao,
      status: documento.status,
      statusOrigem: documento.statusOrigem,
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const resetForm = () => {
    setFormData({
      origem: "",
      objeto: "",
      cliente: "",
      responsavel: "",
      sistema: "",
      modulo: "",
      descricao: "",
      status: "Integrado",
      statusOrigem: "Incluido",
    });
    setEditingDocument(null);
  };

  // Funções auxiliares para artefatos
  const resetArtifactForm = () => {
    setArtifactFormData({
      documentoId: "",
      name: "",
      file: "",
      type: "",
    });
    setSelectedArtifact(null);
  };

  const openAddArtifactModal = () => {
    resetArtifactForm();
    setArtifactFormData(prev => ({ ...prev, documentoId: selectedDocument?.id || "" }));
    setIsAddArtifactModalOpen(true);
  };

  const openEditArtifactModal = (artifact: DocumentArtifact) => {
    setSelectedArtifact(artifact);
    setArtifactFormData({
      documentoId: artifact.documentoId,
      name: artifact.name,
      file: artifact.file,
      type: artifact.type,
    });
    setIsEditArtifactModalOpen(true);
  };

  const handleCreateArtifact = () => {
    createArtifactMutation.mutate(artifactFormData);
  };

  const handleUpdateArtifact = () => {
    if (selectedArtifact) {
      updateArtifactMutation.mutate({
        id: selectedArtifact.id,
        data: artifactFormData,
      });
    }
  };

  const handleDeleteArtifact = (artifactId: string) => {
    if (confirm("Tem certeza que deseja excluir este artefato?")) {
      deleteArtifactMutation.mutate(artifactId);
    }
  };

  const getFileTypeIcon = (type: string) => {
    if (!type) return <File className="h-4 w-4 text-gray-400" />;
    
    switch (type.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "doc":
      case "docx":
        return <File className="h-4 w-4 text-blue-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <File className="h-4 w-4 text-green-500" />;
      case "txt":
        return <File className="h-4 w-4 text-gray-500" />;
      case "json":
        return <File className="h-4 w-4 text-orange-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Integrado":
        return <CircleCheck className="h-3 w-3" />;
      case "Processando":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "Concluido":
        return <CircleCheck className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Integrado":
        return "default";
      case "Processando":
        return "secondary";
      case "Concluido":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getStatusOrigemBadgeVariant = (statusOrigem: string) => {
    switch (statusOrigem) {
      case "Incluido":
        return "default";
      case "Em CRP":
        return "secondary";
      case "Em Aprovação":
        return "outline";
      case "Em DRP":
        return "secondary";
      case "Concluido":
        return "default";
      default:
        return "destructive";
    }
  };

  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
  };

  const renderDocumentosTable = (documentos: Documento[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          {activeTab === "integrados" ? (
            <>
              <TableHead>Origem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Origem</TableHead>
              <TableHead>Data Integração</TableHead>
              <TableHead>Status Origem</TableHead>
              <TableHead>Anexos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </>
          ) : (
            <>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.map((documento) => (
          <TableRow key={documento.id}>
            {activeTab === "integrados" ? (
              <>
                <TableCell>
                  <div className="flex items-center">
                    {documento.origem === "Monday" ? (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Monday</div>
                    ) : (
                      <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">{documento.origem}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{documento.objeto}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(documento.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                    {getStatusIcon(documento.status)}
                    {documento.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{formatDate(documento.createdAt)}</TableCell>
                <TableCell className="text-sm text-gray-500">{formatDate(documento.updatedAt)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusOrigemBadgeVariant(documento.statusOrigem) as any} className="flex items-center gap-1 whitespace-nowrap">
                    {documento.statusOrigem}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-gray-100 text-gray-500">
                    0 anexos
                  </Badge>
                </TableCell>
              </>
            ) : (
              <>
                <TableCell>
                  <div className="flex items-center">
                    <File className="h-5 w-5 text-blue-500" />
                    <span className="ml-2 text-xs text-gray-500">DOC</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{documento.objeto}</TableCell>
                <TableCell>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    {formatDate(documento.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(documento.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                    {getStatusIcon(documento.status)}
                    {documento.status}
                  </Badge>
                </TableCell>
              </>
            )}
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleEditDocument(documento)}
                >
                  <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleDeleteDocument(documento.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {documentos.length === 0 && (
          <TableRow>
            <TableCell colSpan={activeTab === "integrados" ? 8 : 5} className="text-center py-6 text-gray-500">
              Nenhum documento encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderViewModal = () => {
    if (!selectedDocument) return null;
    
    return (
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="anexos">
                Anexos ({artifacts.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados-gerais" className="mt-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Origem</p>
                    <p className="text-sm">{selectedDocument.origem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Cliente</p>
                    <p className="text-sm">{selectedDocument.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Responsável</p>
                    <p className="text-sm">{selectedDocument.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Sistema</p>
                    <p className="text-sm">{selectedDocument.sistema}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Módulo</p>
                    <p className="text-sm">{selectedDocument.modulo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                    <div>
                      <Badge variant={getStatusBadgeVariant(selectedDocument.status) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {getStatusIcon(selectedDocument.status)}
                        {selectedDocument.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status Origem</p>
                    <div>
                      <Badge variant={getStatusOrigemBadgeVariant(selectedDocument.statusOrigem) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {selectedDocument.statusOrigem}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Data Criação</p>
                    <p className="text-sm">{formatDate(selectedDocument.createdAt)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 min-h-[80px]">
                    {selectedDocument.descricao}
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="anexos" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Anexos do Documento</h3>
                  <Button 
                    onClick={openAddArtifactModal}
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
                    <p className="text-sm text-gray-500">Carregando anexos...</p>
                  </div>
                ) : artifacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artifacts.map((artifact) => (
                        <TableRow key={artifact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileTypeIcon(artifact.type)}
                              <span className="text-xs font-medium uppercase text-gray-500">
                                {artifact.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{artifact.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{artifact.file}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(artifact.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => window.open(artifact.file, '_blank')}
                              >
                                <Download className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => openEditArtifactModal(artifact)}
                              >
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleDeleteArtifact(artifact.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
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
                    <p className="text-sm text-gray-500 mb-3">Nenhum anexo encontrado</p>
                    <Button 
                      onClick={openAddArtifactModal}
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
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal para criar novo documento
  const renderCreateModal = () => (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Documento</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo documento
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origem">Origem</Label>
              <Input
                id="origem"
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                placeholder="Ex: Monday, EVO-CTx"
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="objeto">Objeto/Nome</Label>
            <Input
              id="objeto"
              value={formData.objeto}
              onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
              placeholder="Nome do documento"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Responsável"
              />
            </div>
            <div>
              <Label htmlFor="sistema">Sistema</Label>
              <Input
                id="sistema"
                value={formData.sistema}
                onChange={(e) => setFormData({ ...formData, sistema: e.target.value })}
                placeholder="Sistema"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="modulo">Módulo</Label>
            <Input
              id="modulo"
              value={formData.modulo}
              onChange={(e) => setFormData({ ...formData, modulo: e.target.value })}
              placeholder="Módulo"
            />
          </div>
          
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição do documento"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateDocument} 
            disabled={createDocumentoMutation.isPending}
          >
            {createDocumentoMutation.isPending ? "Criando..." : "Criar Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 overflow-y-auto">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
          <Button onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>
        
        <Tabs 
          defaultValue="integrados" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="integrados">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo">Em Processo</TabsTrigger>
            <TabsTrigger value="distribuidos">Distribuídos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrados" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosIntegrados)
            )}
          </TabsContent>
          
          <TabsContent value="em-processo" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosProcessando)
            )}
          </TabsContent>
          
          <TabsContent value="distribuidos" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosConcluidos)
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {renderViewModal()}
      {renderCreateModal()}
      {renderAddArtifactModal()}
      {renderEditArtifactModal()}
    </div>
  );

  // Modal para adicionar artefato
  function renderAddArtifactModal() {
    return (
      <Dialog open={isAddArtifactModalOpen} onOpenChange={setIsAddArtifactModalOpen}>
        <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-500" />
              Adicionar Anexo
            </DialogTitle>
            <DialogDescription>
              Adicione um novo anexo ao documento
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="artifact-name">Nome do Anexo</Label>
              <Input
                id="artifact-name"
                value={artifactFormData.name}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, name: e.target.value })}
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>
            
            <div>
              <Label htmlFor="artifact-file">Arquivo/URL</Label>
              <Input
                id="artifact-file"
                value={artifactFormData.file}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, file: e.target.value })}
                placeholder="Ex: /uploads/manual.pdf, https://exemplo.com/doc.pdf"
              />
            </div>
            
            <div>
              <Label htmlFor="artifact-type">Tipo do Arquivo</Label>
              <Select
                value={artifactFormData.type}
                onValueChange={(value) => setArtifactFormData({ ...artifactFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateArtifact}
              disabled={createArtifactMutation.isPending || !artifactFormData.name || !artifactFormData.file || !artifactFormData.type}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createArtifactMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Anexo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para editar artefato
  function renderEditArtifactModal() {
    return (
      <Dialog open={isEditArtifactModalOpen} onOpenChange={setIsEditArtifactModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              Editar Anexo
            </DialogTitle>
            <DialogDescription>
              Edite as informações do anexo
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-artifact-name">Nome do Anexo</Label>
              <Input
                id="edit-artifact-name"
                value={artifactFormData.name}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, name: e.target.value })}
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-artifact-file">Arquivo/URL</Label>
              <Input
                id="edit-artifact-file"
                value={artifactFormData.file}
                onChange={(e) => setArtifactFormData({ ...artifactFormData, file: e.target.value })}
                placeholder="Ex: /uploads/manual.pdf, https://exemplo.com/doc.pdf"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-artifact-type">Tipo do Arquivo</Label>
              <Select
                value={artifactFormData.type}
                onValueChange={(value) => setArtifactFormData({ ...artifactFormData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateArtifact}
              disabled={updateArtifactMutation.isPending || !artifactFormData.name || !artifactFormData.file || !artifactFormData.type}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateArtifactMutation.isPending ? (
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
}