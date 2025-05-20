import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Pencil, 
  Trash, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Database,
  Settings,
  Users,
  CalendarDays,
  Plug,
  Github,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import UserTable from "@/components/UserTable";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Definições de tipos
type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  description: string;
  lastSync: string | null;
  colunas?: number;
};

type MappingColumn = {
  id: string;
  mappingId: string;
  mondayColumnId: string;
  cpxField: string;
  transformFunction: string | null;
  createdAt: string;
  mondayColumnTitle?: string;
};

type MondayColumn = {
  id: string;
  mappingId: string;
  columnId: string;
  title: string;
  type: string;
};

type ServiceConnection = {
  id: string;
  serviceName: string;
  token: string;
  description: string | null;
  createdAt: string;
};

// Schemas para validação de formulários
const mappingFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  boardId: z.string().min(1, { message: "ID do quadro é obrigatório" }),
  description: z.string().optional(),
});

const columnMappingFormSchema = z.object({
  mondayColumnId: z.string().min(1, { message: "Coluna do Monday é obrigatória" }),
  cpxField: z.string().min(1, { message: "Campo CPX é obrigatório" }),
  transformFunction: z.string().optional(),
});

export default function AdminPage() {
  const { toast } = useToast();
  
  // Estados para gerenciar modais e seleções
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [activeTab, setActiveTab] = useState("quadro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<MappingColumn | null>(null);
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isServiceDeleteDialogOpen, setIsServiceDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ServiceConnection | null>(null);
  
  // Formulário para mapeamento do Monday
  const mappingForm = useForm<z.infer<typeof mappingFormSchema>>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      name: "",
      boardId: "",
      description: "",
    },
  });
  
  // Formulário para coluna de mapeamento
  const columnForm = useForm<z.infer<typeof columnMappingFormSchema>>({
    resolver: zodResolver(columnMappingFormSchema),
    defaultValues: {
      mondayColumnId: "",
      cpxField: "",
      transformFunction: "",
    },
  });
  
  // Atualiza o formulário quando um mapeamento é selecionado
  useEffect(() => {
    if (selectedMapping) {
      mappingForm.reset({
        name: selectedMapping.name,
        boardId: selectedMapping.boardId,
        description: selectedMapping.description,
      });
    } else {
      mappingForm.reset({
        name: "",
        boardId: "",
        description: "",
      });
    }
  }, [selectedMapping, mappingForm]);
  
  // Atualiza o formulário quando uma coluna é selecionada
  useEffect(() => {
    if (selectedColumn) {
      columnForm.reset({
        mondayColumnId: selectedColumn.mondayColumnId,
        cpxField: selectedColumn.cpxField,
        transformFunction: selectedColumn.transformFunction || "",
      });
    } else {
      columnForm.reset({
        mondayColumnId: "",
        cpxField: "",
        transformFunction: "",
      });
    }
  }, [selectedColumn, columnForm]);
  
  // Queries
  const { data: mappingsData = [], isLoading: mappingsIsLoading, error: mappingsError } = useQuery<BoardMapping[]>({
    queryKey: ['/api/monday/mappings'],
  });
  
  const { data: connections = [] } = useQuery<ServiceConnection[]>({
    queryKey: ['/api/service-connections'],
  });
  
  // Query para colunas do Monday de um mapeamento específico
  const { data: mondayColumns = [], isLoading: columnsLoading } = useQuery<MondayColumn[]>({
    queryKey: ['/api/monday/columns', selectedMapping?.id],
    enabled: !!selectedMapping,
  });
  
  // Query para colunas mapeadas de um mapeamento específico
  const { data: mappingColumns = [], isLoading: mappingColumnsLoading } = useQuery<MappingColumn[]>({
    queryKey: ['/api/monday/mapping-columns', selectedMapping?.id],
    enabled: !!selectedMapping,
  });
  
  // Handlers para os formulários
  const onSubmitMapping = async (data: z.infer<typeof mappingFormSchema>) => {
    setIsSubmitting(true);
    try {
      // Simular chamada à API para salvar mapeamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: selectedMapping ? "Mapeamento atualizado" : "Mapeamento criado",
        description: `O mapeamento "${data.name}" foi ${selectedMapping ? 'atualizado' : 'criado'} com sucesso.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
      setIsModalOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o mapeamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onSubmitColumn = async (data: z.infer<typeof columnMappingFormSchema>) => {
    try {
      // Simular chamada à API para salvar coluna de mapeamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: selectedColumn ? "Coluna atualizada" : "Coluna adicionada",
        description: `A coluna foi ${selectedColumn ? 'atualizada' : 'adicionada'} com sucesso.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mapping-columns', selectedMapping?.id] });
      setIsAddingColumn(false);
      setSelectedColumn(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a coluna de mapeamento.",
        variant: "destructive",
      });
    }
  };
  
  const deleteColumn = async (columnId: string) => {
    try {
      // Simular chamada à API para excluir coluna de mapeamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Coluna excluída",
        description: "A coluna de mapeamento foi excluída com sucesso.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mapping-columns', selectedMapping?.id] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a coluna de mapeamento.",
        variant: "destructive",
      });
    }
  };
  
  // Funções para abrir modal de edição/exclusão
  const openEditModal = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setActiveTab("quadro");
    setIsModalOpen(true);
  };
  
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
  };
  
  const editColumn = (column: MappingColumn) => {
    setSelectedColumn(column);
    setIsAddingColumn(true);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
        </div>
        
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="usuarios" className="text-center">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="monday" className="text-center">
              <CalendarDays className="h-4 w-4 mr-2" />
              Integração Monday
            </TabsTrigger>
            <TabsTrigger value="servicos" className="text-center">
              <Plug className="h-4 w-4 mr-2" />
              Integrações de Serviços
            </TabsTrigger>
            <TabsTrigger value="configuracao" className="text-center">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="usuarios" className="slide-in">
            {/* Conteúdo da aba de usuários */}
            <UserTable />
          </TabsContent>
          
          <TabsContent value="monday" className="slide-in">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Mapeamentos de Quadros do Monday</CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMapping(null);
                        setActiveTab("quadro");
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Mapeamento
                    </Button>
                  </div>
                  <CardDescription>
                    Configure a integração entre os quadros do Monday.com e o EVO-MindBits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mappingsIsLoading ? (
                    <div className="w-full flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : mappingsError ? (
                    <div className="w-full flex justify-center py-8 text-red-500">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      <span>Erro ao carregar mapeamentos</span>
                    </div>
                  ) : mappingsData && mappingsData.length > 0 ? (
                    <div className="relative w-full overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>ID do Quadro</TableHead>
                            <TableHead>Última Sincronização</TableHead>
                            <TableHead>Colunas</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappingsData.map((mapping: BoardMapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell className="font-medium">{mapping.name}</TableCell>
                              <TableCell>{mapping.boardId}</TableCell>
                              <TableCell>{mapping.lastSync ? new Date(mapping.lastSync).toLocaleString() : "Nunca"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {mapping.colunas || 0} cols
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditModal(mapping)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDeleteDialog(mapping)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum mapeamento encontrado</p>
                      <p className="text-sm mt-1">
                        Clique em "Novo Mapeamento" para começar a integração com o Monday.com
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="servicos" className="slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card Monday */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                        <CalendarDays className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">Monday.com</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "monday") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com Monday.com para sincronização de quadros e itens.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setSelectedService("monday");
                        setSelectedConnection(connections.find(c => c.serviceName === "monday") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração Monday.com",
                          description: "Abrindo modal para configurar integração com Monday.com",
                        });
                      }}
                    >
                      {connections.find(c => c.serviceName === "monday") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Card GitHub */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                        <Github className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">GitHub</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "github") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com GitHub para gestão de código e versionamento de documentação.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        setSelectedService("github");
                        setSelectedConnection(connections.find(c => c.serviceName === "github") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração GitHub",
                          description: "Abrindo modal para configurar integração com GitHub",
                        });
                      }}
                    >
                      {connections.find(c => c.serviceName === "github") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Card OpenAI */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <Lightbulb className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">OpenAI</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "openai") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com a API da OpenAI para recursos de inteligência artificial.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setSelectedService("openai");
                        setSelectedConnection(connections.find(c => c.serviceName === "openai") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração OpenAI",
                          description: "Abrindo modal para configurar integração com OpenAI",
                        });
                      }}
                    >
                      {connections.find(c => c.serviceName === "openai") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuracao" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h3>
              <p className="text-gray-500">Configurações globais do sistema.</p>
              
              <div className="mt-4 border-t pt-4">
                <h4 className="text-base font-medium mb-2">Sobre o Sistema</h4>
                <p className="text-sm text-gray-500 mb-1">Versão: 1.0.0</p>
                <p className="text-sm text-gray-500">
                  EVO-MindBits Composer é uma plataforma para gerenciamento e integração de documentos
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal para edição/inclusão de mapeamento de quadros do Monday */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {selectedMapping ? "Editar Mapeamento" : "Novo Mapeamento"}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do mapeamento entre Monday.com e EVO-MindBits.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quadro">Quadro</TabsTrigger>
              <TabsTrigger value="colunas">Colunas</TabsTrigger>
            </TabsList>
            
            {/* Aba de informações do quadro */}
            <TabsContent value="quadro" className="space-y-4 py-4">
              <Form {...mappingForm}>
                <form onSubmit={mappingForm.handleSubmit(onSubmitMapping)} className="space-y-4">
                  <FormField
                    control={mappingForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do mapeamento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={mappingForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva a finalidade deste mapeamento"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={mappingForm.control}
                    name="boardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID do Quadro</FormLabel>
                        <FormControl>
                          <Input placeholder="ID do quadro no Monday.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            
            {/* Aba de colunas mapeadas */}
            <TabsContent value="colunas" className="py-4">
              {!selectedMapping ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    Salve o mapeamento primeiro para adicionar colunas.
                  </p>
                </div>
              ) : isAddingColumn ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {selectedColumn ? "Editar Coluna" : "Nova Coluna"}
                  </h3>
                  <Form {...columnForm}>
                    <form onSubmit={columnForm.handleSubmit(onSubmitColumn)} className="space-y-4">
                      <FormField
                        control={columnForm.control}
                        name="mondayColumnId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coluna do Monday</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="">Selecione uma coluna</option>
                                {mondayColumns.map((column) => (
                                  <option key={column.id} value={column.columnId}>
                                    {column.title}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={columnForm.control}
                        name="cpxField"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campo CPX</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do campo no CPX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={columnForm.control}
                        name="transformFunction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função de Transformação (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Função para transformar dados" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-between pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingColumn(false);
                            setSelectedColumn(null);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Colunas Mapeadas</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedColumn(null);
                        setIsAddingColumn(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Coluna
                    </Button>
                  </div>
                  
                  {mappingColumnsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mappingColumns.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>Nenhuma coluna mapeada.</p>
                      <p className="text-sm mt-1">
                        Clique em "Nova Coluna" para adicionar um mapeamento.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coluna Monday</TableHead>
                          <TableHead>Campo CPX</TableHead>
                          <TableHead>Função de Transformação</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappingColumns.map((column) => (
                          <TableRow key={column.id}>
                            <TableCell>
                              {column.mondayColumnTitle || mondayColumns.find(c => c.columnId === column.mondayColumnId)?.title || column.mondayColumnId}
                            </TableCell>
                            <TableCell>{column.cpxField}</TableCell>
                            <TableCell>{column.transformFunction || "-"}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => editColumn(column)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteColumn(column.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmação para exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o mapeamento "{selectedMapping?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                toast({
                  title: "Mapeamento excluído",
                  description: `O mapeamento "${selectedMapping?.name}" foi excluído com sucesso.`,
                });
                setIsDeleteDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}