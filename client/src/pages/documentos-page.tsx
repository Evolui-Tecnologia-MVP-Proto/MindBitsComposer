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
} from "lucide-react";
import { type Documento, type InsertDocumento } from "@shared/schema";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("integrados");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  // Filtrar documentos por status
  const documentosIntegrados = useMemo(() => 
    documentos.filter(doc => doc.status === "Integrado"), [documentos]);
  const documentosProcessando = useMemo(() => 
    documentos.filter(doc => doc.status === "Processando"), [documentos]);
  const documentosConcluidos = useMemo(() => 
    documentos.filter(doc => doc.status === "Concluido"), [documentos]);

  const handleCreateDocument = () => {
    createDocumentoMutation.mutate(formData);
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
                  onClick={() => openViewModal(documento)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5 text-blue-500" />
              <span>{selectedDocument.objeto}</span>
            </DialogTitle>
            <DialogDescription>
              Detalhes do documento
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
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
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
                <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 max-h-24 overflow-y-auto">
                  {selectedDocument.descricao}
                </p>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 mb-2">Anexos</p>
                <div className="bg-gray-50 rounded-md border border-gray-200 p-3">
                  <p className="text-sm text-gray-500">Nenhum anexo disponível</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
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
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
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
    </div>
  );
}