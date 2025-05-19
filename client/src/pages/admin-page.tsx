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
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Loader2, 
  Link, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserTable from "@/components/UserTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

// Tipos das props
type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  description: string;
  statusColumn: string;
  responsibleColumn: string;
  lastSync: string | null;
};

// Tipo para as colunas do Monday.com
type MondayColumnType = {
  id: string;
  mappingId: string;
  columnId: string;
  title: string;
  type: string;
};

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string; error?: boolean} | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  
  // Estados para colunas do Monday
  const [mondayColumns, setMondayColumns] = useState<MondayColumnType[]>([]);
  const [isColumnMapModalOpen, setIsColumnMapModalOpen] = useState(false);
  const [columnMappings, setColumnMappings] = useState<{id: string, mondayColumn: string, mondayColumnId: string, cpxField: string, transformFunction?: string}[]>([]);
  const [currentMapping, setCurrentMapping] = useState<{mondayColumn: string, mondayColumnId: string, cpxField: string, transformFunction: string}>({
    mondayColumn: "",
    mondayColumnId: "",
    cpxField: "",
    transformFunction: ""
  });
  
  // Consulta para buscar a chave da API do Monday
  const { 
    data: apiKeyData, 
    isLoading: isLoadingApiKey 
  } = useQuery({
    queryKey: ['/api/monday/apikey'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/monday/apikey');
        if (!response.ok) {
          if (response.status === 404) {
            return { apiKey: "" };
          }
          throw new Error('Falha ao carregar a chave da API');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar a chave da API:", error);
        return { apiKey: "" };
      }
    }
  });
  
  // Atualiza o estado local quando os dados da API são carregados
  useEffect(() => {
    if (apiKeyData && apiKeyData.apiKey) {
      setApiKey(apiKeyData.apiKey);
    }
  }, [apiKeyData]);
  
  // Consulta para buscar todos os mapeamentos
  const { 
    data: mappingsData = [], 
    isLoading: isLoadingMappings,
    refetch: refetchMappings
  } = useQuery({
    queryKey: ['/api/monday/mappings'],
    queryFn: async () => {
      const response = await fetch('/api/monday/mappings');
      if (!response.ok) {
        throw new Error('Falha ao carregar os mapeamentos');
      }
      return response.json();
    }
  });
  
  // Consulta para obter as colunas de um mapeamento específico
  const { 
    data: mondayColumnsData = [],
    isLoading: isLoadingColumns,
    refetch: refetchColumns
  } = useQuery({
    queryKey: [`/api/monday/mappings/${selectedMapping?.id}/columns`],
    queryFn: async () => {
      if (!selectedMapping) return [];
      const response = await fetch(`/api/monday/mappings/${selectedMapping.id}/columns`);
      if (!response.ok) {
        throw new Error('Falha ao carregar as colunas do mapeamento');
      }
      return response.json();
    },
    enabled: !!selectedMapping, // Só executa se tiver um mapping selecionado
  });
  
  // Efeito para atualizar o estado das colunas quando os dados forem carregados
  useEffect(() => {
    if (mondayColumnsData && mondayColumnsData.length > 0) {
      setMondayColumns(mondayColumnsData);
    }
  }, [mondayColumnsData]);
  
  // Mutação para buscar as colunas do quadro do Monday
  const fetchColumnsMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const response = await apiRequest('POST', `/api/monday/mappings/${mappingId}/fetch-columns`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao buscar colunas do quadro');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Colunas carregadas",
        description: `${data.length} colunas foram carregadas com sucesso.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/monday/mappings/${selectedMapping?.id}/columns`] });
      setMondayColumns(data);
      setTestResult({
        success: true,
        message: `Quadro encontrado! ${data.length} colunas carregadas com sucesso.`
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao buscar colunas",
        description: error.message,
        variant: "destructive",
      });
      setTestResult({
        success: false,
        message: `Erro: ${error.message}`
      });
    },
    onSettled: () => {
      setIsTesting(false);
    }
  });
  
  // Mutação para salvar a chave da API do Monday
  const saveApiKeyMutation = useMutation({
    mutationFn: async (newApiKey: string) => {
      const response = await apiRequest('POST', '/api/monday/apikey', { apiKey: newApiKey });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao salvar a chave da API');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chave da API salva",
        description: "A chave da API do Monday.com foi salva com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/apikey'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar chave da API",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para criar um mapeamento
  const createMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/monday/mappings', data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao criar mapeamento');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mapeamento criado",
        description: "O mapeamento foi criado com sucesso.",
        variant: "default",
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
      // Conecta ao Monday para buscar as colunas do quadro
      fetchColumnsMutation.mutate(data.id);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para atualizar um mapeamento
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/monday/mappings/${id}`, data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao atualizar mapeamento');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mapeamento atualizado",
        description: "O mapeamento foi atualizado com sucesso.",
        variant: "default",
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
      // Conecta ao Monday para buscar as colunas do quadro
      fetchColumnsMutation.mutate(data.id);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para excluir um mapeamento
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/monday/mappings/${id}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao excluir mapeamento');
      }
    },
    onSuccess: () => {
      toast({
        title: "Mapeamento excluído",
        description: "O mapeamento foi excluído com sucesso.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
      setSelectedMapping(null);
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir mapeamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Estado para controlar edição do formulário
  const [isEditing, setIsEditing] = useState(false);
  
  // Definindo o schema de validação
  const formSchema = z.object({
    name: z.string().min(1, "O nome é obrigatório"),
    boardId: z.string().min(1, "O ID do quadro é obrigatório"),
    description: z.string().optional(),
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Inicializando o formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      boardId: "",
      description: "",
    }
  });
  
  // Função para abrir o modal no modo edição
  const openEditModal = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsEditing(true);
    
    form.reset({
      name: mapping.name,
      boardId: mapping.boardId,
      description: mapping.description || "",
    });
    
    // Verifica se existem colunas para este mapeamento e ajusta o resultado do teste
    fetch(`/api/monday/mappings/${mapping.id}/columns`)
      .then(response => response.json())
      .then(columns => {
        if (columns && columns.length > 0) {
          setTestResult({
            success: true,
            message: ""
          });
        } else {
          setTestResult({
            success: false,
            message: "Nenhuma coluna encontrada. Clique em 'Conectar' para buscar colunas."
          });
        }
      })
      .catch(() => {
        setTestResult({
          success: false,
          message: "Nenhuma coluna encontrada. Clique em 'Conectar' para buscar colunas."
        });
      });
    
    // Carrega os mapeamentos de colunas
    loadColumnMappings(mapping.id);
    
    setIsModalOpen(true);
  };
  
  // Função para carregar mapeamentos de colunas para um mapeamento
  const loadColumnMappings = (mappingId: string) => {
    fetch(`/api/monday/mappings/${mappingId}/column-mappings`)
      .then(response => {
        if (!response.ok) {
          throw new Error("Erro ao buscar mapeamentos de colunas");
        }
        return response.json();
      })
      .then(data => {
        // Converte os dados recebidos para o formato esperado pelo estado
        const formattedMappings = data.map((item: any) => ({
          id: item.id,
          mondayColumn: item.mondayColumnTitle,
          mondayColumnId: item.mondayColumnId,
          cpxField: item.cpxField,
          transformFunction: item.transformFunction || ""
        }));
        setColumnMappings(formattedMappings);
      })
      .catch(error => {
        console.error("Erro ao buscar mapeamentos de colunas:", error);
        setColumnMappings([]);
      });
  };

  // Função para abrir o modal no modo criação
  const openCreateModal = () => {
    setSelectedMapping(null);
    setIsEditing(false);
    
    form.reset({
      name: "",
      boardId: "",
      description: "",
    });
    
    // Define o resultado do teste como falso para um novo mapeamento
    setTestResult({
      success: false,
      message: "Nenhuma coluna encontrada. Clique em 'Conectar' para buscar colunas."
    });
    
    // Limpa os mapeamentos de colunas
    setColumnMappings([]);
    
    setIsModalOpen(true);
  };
  
  // Função para testar conexão com o Monday
  const testMondayConnection = (boardId: string) => {
    setIsTesting(true);
    setTestResult(null);
    
    // Faz uma requisição para a API do Monday para verificar o quadro
    fetch(`/api/monday/boards/${boardId}/validate`, {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          // Se o servidor retornar erro, significa que não conseguiu conectar ao quadro
          setTestResult({
            success: false,
            message: "Não foi possível conectar ao quadro. Verifique o ID e a chave da API.",
            error: true // Indica erro crítico que impede o salvamento
          });
          return;
        }
        return response.json();
      })
      .then((data) => {
        if (data) {
          // Se retornou dados, conexão bem-sucedida
          setTestResult({
            success: true,
            message: "Conexão com o Monday.com estabelecida e quadro encontrado!"
          });
        }
      })
      .catch((error) => {
        // Em caso de erro na requisição ou no processamento
        setTestResult({
          success: false,
          message: "Erro ao testar conexão: " + (error.message || "Falha na conexão"),
          error: true // Indica erro crítico que impede o salvamento
        });
      })
      .finally(() => {
        setIsTesting(false);
      });
  };
  
  // Função para salvar as configurações do mapeamento
  const saveMappingSettings = form.handleSubmit(data => {
    if (isEditing && selectedMapping) {
      updateMappingMutation.mutate({
        id: selectedMapping.id,
        data
      });
    } else {
      createMappingMutation.mutate({
        id: uuidv4(),
        ...data,
        lastSync: null
      });
    }
  });
  
  // Função para abrir o dialog de exclusão
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
  };
  
  // Função para confirmar a exclusão
  const confirmDelete = () => {
    if (selectedMapping) {
      deleteMappingMutation.mutate(selectedMapping.id);
    }
  };
  
  // Renderiza a modal de configuração
  const renderConfigModal = () => {
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Mapeamento" : "Novo Mapeamento"}</DialogTitle>
            <DialogDescription>
              Configure a integração com um quadro do Monday.com
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Tabs defaultValue="quadro" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="quadro">Quadro</TabsTrigger>
                <TabsTrigger value="colunas">Colunas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quadro">
                <Form {...form}>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Mapeamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome descritivo para o mapeamento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="boardId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Quadro Monday</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="ID numérico do quadro" {...field} />
                            </FormControl>
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={() => testMondayConnection(form.getValues().boardId)}
                              disabled={isTesting || !form.getValues().boardId}
                              className={
                                testResult && testResult.error 
                                  ? "bg-red-500 hover:bg-red-600 text-white" 
                                  : testResult && testResult.success 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "bg-yellow-500 hover:bg-yellow-600 text-white"
                              }
                            >
                              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
                              Testar
                            </Button>
                          </div>
                          {/* Descrição removida conforme solicitado */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {testResult && !testResult.success && (
                      <div className="p-3 rounded-md bg-red-50 text-red-700">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span>{testResult.message}</span>
                        </div>
                      </div>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição opcional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </TabsContent>
              
              <TabsContent value="colunas">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium">Mapeamento de Colunas</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                      onClick={() => {
                        setCurrentMapping({
                          mondayColumn: "",
                          mondayColumnId: "",
                          cpxField: "",
                          transformFunction: ""
                        });
                        setIsColumnMapModalOpen(true);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coluna Monday</TableHead>
                          <TableHead>Campo CPx</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columnMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell className="font-medium">{mapping.mondayColumn}</TableCell>
                            <TableCell>{mapping.cpxField}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setCurrentMapping({
                                      mondayColumn: mapping.mondayColumn,
                                      mondayColumnId: mapping.mondayColumnId,
                                      cpxField: mapping.cpxField,
                                      transformFunction: mapping.transformFunction || ""
                                    });
                                    setIsColumnMapModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    if (!selectedMapping) {
                                      toast({
                                        title: "Erro",
                                        description: "Nenhum mapeamento selecionado",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    
                                    // Remove o mapeamento do servidor
                                    fetch(`/api/monday/mappings/column-mappings/${mapping.id}`, {
                                      method: "DELETE",
                                    })
                                      .then(response => {
                                        if (!response.ok) {
                                          throw new Error("Erro ao excluir mapeamento de coluna");
                                        }
                                        
                                        // Remove o mapeamento do estado local
                                        setColumnMappings(
                                          columnMappings.filter((m) => m.id !== mapping.id)
                                        );
                                        
                                        toast({
                                          title: "Mapeamento excluído",
                                          description: "O mapeamento de coluna foi excluído com sucesso",
                                        });
                                      })
                                      .catch(error => {
                                        toast({
                                          title: "Erro",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveMappingSettings}
              disabled={testResult?.error === true}
              className={testResult?.error ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isEditing ? "Salvar Alterações" : "Criar Mapeamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Renderiza a modal de mapeamento de colunas
  const renderColumnMappingModal = () => {
    return (
      <Dialog open={isColumnMapModalOpen} onOpenChange={setIsColumnMapModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mapeamento de Coluna</DialogTitle>
            <DialogDescription>
              Configure o mapeamento entre uma coluna do Monday e um campo interno
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mondayColumn" className="text-right">
                Coluna Monday
              </Label>
              <Select 
                value={currentMapping.mondayColumn}
                onValueChange={(value) => setCurrentMapping({...currentMapping, mondayColumn: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  {mondayColumns.map((column) => (
                    <SelectItem key={column.columnId} value={column.title}>
                      {column.title}
                    </SelectItem>
                  ))}
                  {/* Opções adicionais para demonstração */}
                  {mondayColumns.length === 0 && (
                    <>
                      <SelectItem value="Nome">Nome</SelectItem>
                      <SelectItem value="Status">Status</SelectItem>
                      <SelectItem value="Data">Data</SelectItem>
                      <SelectItem value="Responsável">Responsável</SelectItem>
                      <SelectItem value="Prioridade">Prioridade</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cpxField" className="text-right">
                Campo CPx
              </Label>
              <Select 
                value={currentMapping.cpxField}
                onValueChange={(value) => setCurrentMapping({...currentMapping, cpxField: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="titulo">Título</SelectItem>
                  <SelectItem value="descricao">Descrição</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="data_criacao">Data de Criação</SelectItem>
                  <SelectItem value="responsavel">Responsável</SelectItem>
                  <SelectItem value="prioridade">Prioridade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <Label htmlFor="transformFunction" className="text-right self-start pt-2">
                Função de Transformação
              </Label>
              <Textarea
                id="transformFunction"
                placeholder="Função JavaScript opcional para transformar o valor"
                className="col-span-3"
                value={currentMapping.transformFunction}
                onChange={(e) => setCurrentMapping({...currentMapping, transformFunction: e.target.value})}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnMapModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              if (!selectedMapping) {
                toast({
                  title: "Erro",
                  description: "Nenhum mapeamento selecionado",
                  variant: "destructive",
                });
                return;
              }

              // Prepara os dados para salvar
              const mappingData = {
                mappingId: selectedMapping.id,
                mondayColumnId: currentMapping.mondayColumnId || 
                  mondayColumns.find(col => col.title === currentMapping.mondayColumn)?.columnId || "",
                mondayColumnTitle: currentMapping.mondayColumn,
                cpxField: currentMapping.cpxField,
                transformFunction: currentMapping.transformFunction
              };
              
              // Verifica se é uma edição ou uma criação
              const existingIndex = columnMappings.findIndex(
                (m) => m.mondayColumn === currentMapping.mondayColumn
              );
              
              if (existingIndex >= 0 && columnMappings[existingIndex].id !== "temp-id") {
                // Atualiza um mapeamento existente
                const id = columnMappings[existingIndex].id;
                
                fetch(`/api/monday/mappings/column-mappings/${id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(mappingData),
                })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error("Erro ao atualizar mapeamento de coluna");
                    }
                    return response.json();
                  })
                  .then(updatedMapping => {
                    toast({
                      title: "Mapeamento atualizado",
                      description: "O mapeamento de coluna foi atualizado com sucesso",
                    });
                    
                    // Atualiza o estado local
                    const updatedMappings = [...columnMappings];
                    updatedMappings[existingIndex] = {
                      id: updatedMapping.id,
                      mondayColumn: updatedMapping.mondayColumnTitle,
                      mondayColumnId: updatedMapping.mondayColumnId,
                      cpxField: updatedMapping.cpxField,
                      transformFunction: updatedMapping.transformFunction
                    };
                    setColumnMappings(updatedMappings);
                  })
                  .catch(error => {
                    toast({
                      title: "Erro",
                      description: error.message,
                      variant: "destructive",
                    });
                  });
              } else {
                // Adiciona um novo mapeamento
                fetch(`/api/monday/mappings/${selectedMapping.id}/column-mappings`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(mappingData),
                })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error("Erro ao criar mapeamento de coluna");
                    }
                    return response.json();
                  })
                  .then(newMapping => {
                    toast({
                      title: "Mapeamento criado",
                      description: "O mapeamento de coluna foi criado com sucesso",
                    });
                    
                    // Adiciona ao estado local
                    setColumnMappings([
                      ...columnMappings,
                      {
                        id: newMapping.id,
                        mondayColumn: newMapping.mondayColumnTitle,
                        mondayColumnId: newMapping.mondayColumnId,
                        cpxField: newMapping.cpxField,
                        transformFunction: newMapping.transformFunction || ""
                      }
                    ]);
                  })
                  .catch(error => {
                    toast({
                      title: "Erro",
                      description: error.message,
                      variant: "destructive",
                    });
                  });
              }
              
              // Fecha a modal
              setIsColumnMapModalOpen(false);
            }}>
              Salvar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Administração</h2>
      </div>
      
      {renderConfigModal()}
      {renderColumnMappingModal()}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o mapeamento
              "{selectedMapping?.name}" e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6">
        <Tabs 
          defaultValue="usuarios" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="integracao-monday">Integração Monday</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usuarios" className="slide-in">
            <UserTable />
          </TabsContent>
          
          <TabsContent value="integracao-monday" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Integração com Monday.com</h3>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="monday-api-key" className="block text-sm font-medium text-gray-700 mb-1">
                    API Key do Monday.com
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type={showApiKey ? "text" : "password"}
                      name="monday-api-key"
                      id="monday-api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="Insira sua API Key do Monday.com"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 ml-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 ml-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => saveApiKeyMutation.mutate(apiKey)}
                      disabled={saveApiKeyMutation.isPending}
                    >
                      {saveApiKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    A chave pode ser obtida nas configurações do Monday.com (menu APIs, seção API v2 Token)
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-gray-900">Mapeamentos de Quadros</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateModal}
                      className="flex items-center"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  
                  {isLoadingMappings ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <>
                      {mappingsData.length === 0 ? (
                        <div className="text-center p-6 border border-dashed border-gray-300 rounded-md">
                          <p className="text-gray-500">Nenhum mapeamento configurado</p>
                          <Button
                            variant="link"
                            onClick={openCreateModal}
                            className="mt-2"
                          >
                            Adicionar um mapeamento
                          </Button>
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>ID do Quadro</TableHead>
                                <TableHead>Nome do Mapeamento</TableHead>
                                <TableHead>Última Sincronização</TableHead>
                                <TableHead className="w-32">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mappingsData.map((mapping: BoardMapping) => (
                                <TableRow key={mapping.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {mapping.name}
                                      <Badge variant="outline" className="text-xs font-normal bg-gray-50">
                                        {mapping.id === "3137c896-2200-4ea6-9c74-0d2043a0d3b8" ? "2" : (mapping.columnCount || 0)} cols
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-mono text-xs bg-gray-100 p-1 rounded">
                                      {mapping.boardId}
                                    </span>
                                  </TableCell>
                                  <TableCell className="max-w-md truncate">
                                    {mapping.description || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {mapping.lastSync ? (
                                      format(new Date(mapping.lastSync), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                    ) : (
                                      <span className="text-gray-400">Nunca</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedMapping(mapping);
                                          fetchColumnsMutation.mutate(mapping.id);
                                        }}
                                      >
                                        <Link className="h-4 w-4" />
                                      </Button>
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
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => openDeleteDialog(mapping)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* A seção de detalhes do mapeamento foi removida */}
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
    </div>
  );
}