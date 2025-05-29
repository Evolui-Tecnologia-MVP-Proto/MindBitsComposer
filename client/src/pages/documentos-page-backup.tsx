import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  File,
  Clock,
  CircleCheck,
  CircleX,
  AlertCircle,
  BookOpen,
  TestTube,
  Beaker,
} from "lucide-react";
import { type Documento } from "@shared/schema";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("incluidos");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isTest2ModalOpen, setIsTest2ModalOpen] = useState(false);
  
  const [filtros, setFiltros] = useState({
    responsavel: "__todos__",
    modulo: "__todos__",
    cliente: "__todos__",
    statusOrigem: "__todos__",
    nome: "",
    arquivos: "__todos__",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar contagem de anexos para todos os documentos
  const { data: artifactCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documentos/artifacts-count"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const documento of documentos) {
        try {
          const response = await fetch(`/api/documentos/${documento.id}/artifacts`);
          if (response.ok) {
            const artifacts = await response.json();
            counts[documento.id] = artifacts.length;
          } else {
            counts[documento.id] = 0;
          }
        } catch {
          counts[documento.id] = 0;
        }
      }
      return counts;
    },
    enabled: documentos.length > 0,
  });

  // Função para formatar data
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Função para obter variante do badge de status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Integrado":
        return "default";
      case "Incluido":
        return "secondary";
      case "Em Processo":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Função para obter ícone de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Integrado":
        return <CircleCheck className="h-3 w-3" />;
      case "Incluido":
        return <AlertCircle className="h-3 w-3" />;
      case "Em Processo":
        return <CircleX className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  // Função para obter variante do badge de status origem
  const getStatusOrigemBadgeVariant = (statusOrigem: string) => {
    switch (statusOrigem) {
      case "Finalizado":
        return "default";
      case "Em Detalhamento Técnico":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Função para verificar se monday_item_values tem conteúdo JSON válido
  const hasMondayItemValues = (documento: Documento): boolean => {
    if (!documento.mondayItemValues) return false;
    
    try {
      const parsed = Array.isArray(documento.mondayItemValues) 
        ? documento.mondayItemValues 
        : JSON.parse(JSON.stringify(documento.mondayItemValues));
      
      return Array.isArray(parsed) && parsed.length > 0 && 
             parsed.some(item => item.value && item.value.trim() !== '');
    } catch {
      return false;
    }
  };

  // Função para filtrar e ordenar documentos
  const filteredAndSortedDocumentos = useMemo(() => {
    let filtered = documentos.filter((doc) => {
      // Filtro por responsável
      if (filtros.responsavel !== "__todos__" && filtros.responsavel && !doc.responsavel?.toLowerCase().includes(filtros.responsavel.toLowerCase())) {
        return false;
      }
      
      // Filtro por módulo
      if (filtros.modulo !== "__todos__" && filtros.modulo && !doc.modulo?.toLowerCase().includes(filtros.modulo.toLowerCase())) {
        return false;
      }
      
      // Filtro por cliente
      if (filtros.cliente !== "__todos__" && filtros.cliente && !doc.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())) {
        return false;
      }
      
      // Filtro por status origem
      if (filtros.statusOrigem !== "__todos__" && filtros.statusOrigem && doc.statusOrigem !== filtros.statusOrigem) {
        return false;
      }
      
      // Filtro por nome/objeto
      if (filtros.nome && !doc.objeto?.toLowerCase().includes(filtros.nome.toLowerCase())) {
        return false;
      }
      
      // Filtro por arquivos
      if (filtros.arquivos !== "__todos__" && filtros.arquivos) {
        const artifactCount = artifactCounts[doc.id] || 0;
        const hasMondayData = hasMondayItemValues(doc);
        
        switch (filtros.arquivos) {
          case "sem-arquivos":
            return !hasMondayData && artifactCount === 0;
          case "a-sincronizar":
            return hasMondayData && artifactCount === 0;
          case "sincronizados":
            return artifactCount > 0;
          default:
            break;
        }
      }
      
      return true;
    });

    // Ordenação alfabética por nome (objeto)
    filtered.sort((a, b) => {
      const nomeA = a.objeto?.toLowerCase() || "";
      const nomeB = b.objeto?.toLowerCase() || "";
      return nomeA.localeCompare(nomeB);
    });

    return filtered;
  }, [documentos, filtros, artifactCounts]);

  // Obter listas únicas para os filtros
  const responsaveisUnicos = useMemo(() => {
    const responsaveis = documentos.map(doc => doc.responsavel).filter(Boolean);
    return Array.from(new Set(responsaveis)).sort();
  }, [documentos]);

  const modulosUnicos = useMemo(() => {
    const modulos = documentos.map(doc => doc.modulo).filter(Boolean);
    return Array.from(new Set(modulos)).sort();
  }, [documentos]);

  const clientesUnicos = useMemo(() => {
    const clientes = documentos.map(doc => doc.cliente).filter(Boolean);
    return Array.from(new Set(clientes)).sort();
  }, [documentos]);

  const statusOrigensUnicos = useMemo(() => {
    const statusOrigens = documentos.map(doc => doc.statusOrigem).filter(Boolean);
    return Array.from(new Set(statusOrigens)).sort();
  }, [documentos]);

  // Função para abrir modal de visualização
  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
  };

  // Renderizar tabela de documentos
  const renderDocumentosTable = (documentos: Documento[]) => {
    if (activeTab === "integrados") {
      return (
        <div className="border rounded-lg">
          <div className="max-h-[calc(100vh-450px)] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="bg-gray-50 border-b w-[130px]">Origem</TableHead>
                  <TableHead className="bg-gray-50 border-b">Nome</TableHead>
                  <TableHead className="bg-gray-50 border-b">Status</TableHead>
                  <TableHead className="bg-gray-50 border-b w-[155px]">Data Integração</TableHead>
                  <TableHead className="bg-gray-50 border-b">Status Origem</TableHead>
                  <TableHead className="bg-gray-50 border-b">Anexos</TableHead>
                  <TableHead className="bg-gray-50 border-b text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-compact">
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {documento.origem === "Monday" ? (
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Monday
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                            {documento.origem}
                          </div>
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
                    <TableCell>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {formatDate(documento.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusOrigemBadgeVariant(documento.statusOrigem) as any} className="flex items-center gap-1 whitespace-nowrap">
                        {documento.statusOrigem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(() => {
                          const hasContent = hasMondayItemValues(documento);
                          const artifactCount = artifactCounts[documento.id] || 0;
                          
                          if (!hasContent && artifactCount === 0) {
                            return (
                              <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300">
                                none
                              </Badge>
                            );
                          } else {
                            return (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                files
                              </Badge>
                            );
                          }
                        })()}

                        {documento.assetsSynced && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            sync
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedDocument(documento);
                            setIsDocumentationModalOpen(true);
                          }}
                          title="Iniciar Documentação"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsTestModalOpen(true)}
                          title="Teste"
                        >
                          <TestTube className="h-4 w-4 text-purple-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsTest2ModalOpen(true)}
                          title="Teste 2"
                        >
                          <Beaker className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewModal(documento)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {documentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                      Nenhum documento encontrado nesta categoria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
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
                </div>
              </TableCell>
            </TableRow>
          ))}
          {documentos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                Nenhum documento encontrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  // Modal de visualização
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
              Detalhes do documento
            </DialogDescription>
          </DialogHeader>
          
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
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Descrição</p>
              <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 min-h-[80px]">
                {selectedDocument.descricao}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal de documentação
  const renderDocumentationModal = () => {
    if (!selectedDocument) return null;
    
    return (
      <Dialog open={isDocumentationModalOpen} onOpenChange={setIsDocumentationModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Iniciar Documentação
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros para iniciar o processo de documentação do documento selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <File className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{selectedDocument.objeto}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Cliente:</span> {selectedDocument.cliente}
                    </div>
                    <div>
                      <span className="font-medium">Responsável:</span> {selectedDocument.responsavel}
                    </div>
                    <div>
                      <span className="font-medium">Sistema:</span> {selectedDocument.sistema}
                    </div>
                    <div>
                      <span className="font-medium">Módulo:</span> {selectedDocument.modulo}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium">Configurações de Documentação</p>
              <p className="text-xs mt-1">Parâmetros e opções serão implementados aqui</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDocumentationModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("Iniciar documentação para:", selectedDocument);
                setIsDocumentationModalOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal de teste
  const renderTestModal = () => {
    return (
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-purple-600" />
              Modal de Teste
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <p className="text-lg">testando</p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsTestModalOpen(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal de teste 2
  const renderTest2Modal = () => {
    return (
      <Dialog open={isTest2ModalOpen} onOpenChange={setIsTest2ModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-green-600" />
              Modal de Teste 2
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <p className="text-lg">testando</p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsTest2ModalOpen(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header fixo */}
      <div className="flex-shrink-0 p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
            <p className="text-gray-600 mt-1">Gerencie documentos e suas integrações</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div>
            <Label htmlFor="filtro-responsavel" className="text-xs">Responsável</Label>
            <Select
              value={filtros.responsavel}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, responsavel: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {responsaveisUnicos.map((responsavel) => (
                  <SelectItem key={responsavel} value={responsavel}>
                    {responsavel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-modulo" className="text-xs">Módulo</Label>
            <Select
              value={filtros.modulo}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, modulo: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {modulosUnicos.map((modulo) => (
                  <SelectItem key={modulo} value={modulo}>
                    {modulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-cliente" className="text-xs">Cliente</Label>
            <Select
              value={filtros.cliente}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, cliente: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {clientesUnicos.map((cliente) => (
                  <SelectItem key={cliente} value={cliente}>
                    {cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-status-origem" className="text-xs">Status Origem</Label>
            <Select
              value={filtros.statusOrigem}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, statusOrigem: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                {statusOrigensUnicos.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-arquivos" className="text-xs">Arquivos</Label>
            <Select
              value={filtros.arquivos}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, arquivos: value }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                <SelectItem value="sem-arquivos">Sem arquivos</SelectItem>
                <SelectItem value="a-sincronizar">A sincronizar</SelectItem>
                <SelectItem value="sincronizados">Sincronizados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filtro-nome" className="text-xs">Nome</Label>
            <Input
              id="filtro-nome"
              placeholder="Buscar por nome..."
              value={filtros.nome}
              onChange={(e) => setFiltros((prev) => ({ ...prev, nome: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="incluidos" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="incluidos">Incluídos</TabsTrigger>
            <TabsTrigger value="integrados">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo">Em Processo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
          <TabsContent value="incluidos" className="h-full overflow-hidden">
            {renderDocumentosTable(documentos.filter(doc => doc.status === "Incluido"))}
          </TabsContent>

          <TabsContent value="integrados" className="h-full overflow-hidden">
            {renderDocumentosTable(filteredAndSortedDocumentos.filter(doc => doc.status === "Integrado"))}
          </TabsContent>

          <TabsContent value="em-processo" className="h-full overflow-hidden">
            {renderDocumentosTable(documentos.filter(doc => doc.status === "Em Processo"))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      {renderViewModal()}
      {renderDocumentationModal()}
      {renderTestModal()}
      {renderTest2Modal()}
    </div>
  );
}