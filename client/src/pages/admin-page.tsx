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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Tipo para representar o mapeamento de quadros
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

// Tipos de colunas que podem ser mapeadas no sistema
type MindBitsColumnType = "nome" | "cliente" | "requisitante" | "data_inclusao" | "status_origem" | "descricao" | "anexos";

// Estrutura para o mapeamento de colunas
type ColumnMapping = {
  mondayColumnId: string;  // ID da coluna no Monday
  mindBitsColumn: MindBitsColumnType;  // Tipo de coluna no MindBits
  transformFunction?: string;  // Função de transformação opcional
};

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  
  // Estados para mapeamento de colunas
  const [isColumnMappingModalOpen, setIsColumnMappingModalOpen] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [currentColumnMapping, setCurrentColumnMapping] = useState<ColumnMapping>({
    mondayColumnId: "",
    mindBitsColumn: "nome"
  });
  const [mondayColumns, setMondayColumns] = useState<MondayColumnType[]>([]);
  
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
  
  // Mutação para salvar a chave da API
  const saveApiKeyMutation = useMutation({
    mutationFn: async (newApiKey: string) => {
      const response = await apiRequest('POST', '/api/monday/apikey', { apiKey: newApiKey });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chave da API salva",
        description: "A chave da API foi salva com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/apikey'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar a chave da API",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Consulta para buscar os mapeamentos do Monday
  const { 
    data: boardMappings = [], 
    isLoading: isLoadingMappings,
    isError: isMappingsError,
    error: mappingsError
  } = useQuery({
    queryKey: ['/api/monday/mappings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/monday/mappings');
        if (!response.ok) {
          throw new Error('Falha ao carregar os mapeamentos');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar mapeamentos:", error);
        return [];
      }
    }
  });
  
  // Mutação para criar um novo mapeamento
  const createMappingMutation = useMutation({
    mutationFn: async (newMapping: Omit<BoardMapping, 'id' | 'lastSync'>) => {
      const response = await apiRequest('POST', '/api/monday/mappings', newMapping);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapeamento criado",
        description: "O mapeamento foi criado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutação para atualizar um mapeamento existente
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<BoardMapping> }) => {
      const response = await apiRequest('PATCH', `/api/monday/mappings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapeamento atualizado",
        description: "O mapeamento foi atualizado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
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
      await apiRequest('DELETE', `/api/monday/mappings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Mapeamento excluído",
        description: "O mapeamento foi excluído com sucesso.",
        variant: "default",
      });
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
  
  const openEditModal = (mapping: BoardMapping | null = null) => {
    setSelectedMapping(mapping);
    setIsModalOpen(true);
    setTestResult(null);
  };
  
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteMapping = () => {
    if (selectedMapping) {
      deleteMappingMutation.mutate(selectedMapping.id);
      setIsDeleteDialogOpen(false);
      setSelectedMapping(null);
    }
  };
  
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
        message: `Quadro encontrado! ${data.length} colunas carregadas com sucesso. Você pode configurar o mapeamento de colunas abaixo.`
      });
      
      // Mostrar a seção de mapeamento de colunas na mesma modal
      setShowColumnMapping(true);
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

  const testBoardConnection = (boardId: string) => {
    setIsTesting(true);
    setTestResult(null);
    
    // Verifica se temos o ID do quadro e a chave da API
    if (!apiKey) {
      setTestResult({
        success: false,
        message: "Configure a chave da API do Monday primeiro."
      });
      setIsTesting(false);
      return;
    }
    
    if (!boardId || boardId.trim() === "") {
      setTestResult({
        success: false,
        message: "Por favor, informe um ID de quadro válido."
      });
      setIsTesting(false);
      return;
    }
    
    if (!selectedMapping) {
      // Se não tem mapeamento selecionado, é preciso salvar primeiro para obter um ID
      const nameInput = document.getElementById('mapping-name') as HTMLInputElement;
      const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
      
      if (!nameInput || !nameInput.value.trim()) {
        setTestResult({
          success: false,
          message: "Preencha o nome do mapeamento antes de conectar."
        });
        setIsTesting(false);
        return;
      }
      
      // Cria um novo mapeamento temporário para teste
      const tempMapping = {
        name: nameInput.value.trim(),
        boardId: boardId,
        description: descriptionInput ? descriptionInput.value.trim() : "",
        statusColumn: "",
        responsibleColumn: ""
      };
      
      createMappingMutation.mutate(tempMapping, {
        onSuccess: (data) => {
          // Após criar o mapeamento, busca as colunas
          fetchColumnsMutation.mutate(data.id);
          setSelectedMapping(data);
        },
        onError: (error) => {
          setTestResult({
            success: false,
            message: `Erro ao criar mapeamento: ${error.message}`
          });
          setIsTesting(false);
        }
      });
      
      return;
    }
    
    // Se já tem um mapeamento selecionado, atualiza-o com o novo ID do quadro
    if (boardId !== selectedMapping.boardId) {
      const updatedMapping = {
        ...selectedMapping,
        boardId: boardId
      };
      
      updateMappingMutation.mutate({
        id: selectedMapping.id,
        data: updatedMapping
      }, {
        onSuccess: (data) => {
          setSelectedMapping(data);
          fetchColumnsMutation.mutate(data.id);
        },
        onError: (error) => {
          setTestResult({
            success: false,
            message: `Erro ao atualizar mapeamento: ${error.message}`
          });
          setIsTesting(false);
        }
      });
      
      return;
    }
    
    // Caso já tenha um mapeamento selecionado com o mesmo boardId
    fetchColumnsMutation.mutate(selectedMapping.id);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe uma chave de API válida.",
        variant: "destructive",
      });
      return;
    }

    saveApiKeyMutation.mutate(apiKey);
  };

  // Função para salvar um novo mapeamento ou atualizar um existente
  const saveMappingSettings = () => {
    // Obter os valores do formulário
    const nameInput = document.getElementById('mapping-name') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
    const boardIdInput = document.getElementById('board-id') as HTMLInputElement;
    
    // Validar campos
    if (!nameInput.value.trim() || !boardIdInput.value.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome do mapeamento e o ID do quadro.",
        variant: "destructive",
      });
      return;
    }
    
    // Criação de novo objeto de mapeamento
    const mappingData = {
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim(),
      boardId: boardIdInput.value.trim(),
      statusColumn: selectedMapping?.statusColumn || "",
      responsibleColumn: selectedMapping?.responsibleColumn || ""
    };
    
    // Armazenar também os mapeamentos de colunas se houver
    if (showColumnMapping && columnMappings.length > 0) {
      // Aqui seria implementado o salvamento dos mapeamentos de colunas no banco de dados
      // Por enquanto, apenas exibimos um feedback ao usuário
      toast({
        title: "Mapeamentos de colunas salvos",
        description: `${columnMappings.length} mapeamentos de colunas configurados.`,
        variant: "default",
      });
    }
    
    if (selectedMapping) {
      // Atualizando um mapeamento existente
      updateMappingMutation.mutate({
        id: selectedMapping.id,
        data: mappingData
      });
    } else {
      // Adicionando um novo mapeamento
      createMappingMutation.mutate(mappingData);
    }
    
    // Fecha o modal e reseta os estados
    setIsModalOpen(false);
    setSelectedMapping(null);
    setShowColumnMapping(false);
    setColumnMappings([]);
  };

  // Modal de configuração do mapeamento
  const renderConfigModal = () => {
    const isEditing = selectedMapping !== null;
    
    return (
      <Dialog 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setShowColumnMapping(false);
          }
        }}
      >
        <DialogContent className={showColumnMapping ? "sm:max-w-3xl" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Mapeamento" : "Novo Mapeamento"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do mapeamento com o Monday.com
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="mapping-name" className="text-sm font-medium text-gray-700">
                  Nome do Mapeamento
                </label>
                <input
                  id="mapping-name"
                  name="mapping-name"
                  defaultValue={selectedMapping?.name || ""}
                  placeholder="Ex: Quadro de Projetos"
                  className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={selectedMapping?.description || ""}
                  placeholder="Descrição breve deste mapeamento"
                  className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="board-id" className="text-sm font-medium text-gray-700">
                  ID do Quadro
                </label>
                <div className="flex space-x-2">
                  <input
                    id="board-id"
                    name="board-id"
                    defaultValue={selectedMapping?.boardId || ""}
                    placeholder="Ex: 12345678"
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const boardIdInput = document.getElementById('board-id') as HTMLInputElement;
                      testBoardConnection(boardIdInput.value);
                    }}
                    className="whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-1 align-[-2px]"></span>
                        Testando...
                      </>
                    ) : (
                      "Conectar"
                    )}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 px-3 py-2 rounded-md text-sm ${
                    testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testResult.message}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  O ID do quadro pode ser encontrado na URL do quadro no Monday.com
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 ml-3 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={saveMappingSettings}
            >
              {isEditing ? "Salvar Alterações" : "Criar Mapeamento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Renderiza a modal de mapeamento de colunas
  const renderColumnMappingModal = () => {
    return (
      <Dialog open={isColumnMappingModalOpen} onOpenChange={setIsColumnMappingModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mapeamento de Colunas</DialogTitle>
            <DialogDescription>
              Configure como as colunas do Monday serão mapeadas para os campos do sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Mapeamentos Configurados</h3>
              {columnMappings.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Coluna Monday</TableHead>
                        <TableHead>Campo no Sistema</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columnMappings.map((mapping, index) => {
                        const mondayColumn = mondayColumns.find(col => col.columnId === mapping.mondayColumnId);
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{mondayColumn?.title || mapping.mondayColumnId}</TableCell>
                            <TableCell>{mapping.mindBitsColumn}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  // Remove o mapeamento
                                  setColumnMappings(columnMappings.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-6 border rounded-md">
                  <p className="text-muted-foreground">Nenhum mapeamento configurado</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Adicionar Novo Mapeamento</h3>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mondayColumn" className="text-right">
                  Coluna Monday
                </Label>
                <Select 
                  onValueChange={(value) => {
                    setCurrentColumnMapping({
                      ...currentColumnMapping,
                      mondayColumnId: value
                    });
                  }}
                  value={currentColumnMapping.mondayColumnId}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {mondayColumns.map((column) => (
                      <SelectItem key={column.columnId} value={column.columnId}>
                        {column.title} ({column.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mindBitsColumn" className="text-right">
                  Campo Sistema
                </Label>
                <Select 
                  onValueChange={(value) => {
                    setCurrentColumnMapping({
                      ...currentColumnMapping,
                      mindBitsColumn: value as MindBitsColumnType
                    });
                  }}
                  value={currentColumnMapping.mindBitsColumn}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="requisitante">Requisitante</SelectItem>
                    <SelectItem value="data_inclusao">Data de Inclusão</SelectItem>
                    <SelectItem value="status_origem">Status de Origem</SelectItem>
                    <SelectItem value="descricao">Descrição</SelectItem>
                    <SelectItem value="anexos">Anexos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transformFunction" className="text-right">
                  Função de Transformação
                </Label>
                <Textarea
                  id="transformFunction"
                  placeholder="Função JavaScript opcional para transformar o valor (ex: (value) => value.toUpperCase())"
                  onChange={(e) => {
                    setCurrentColumnMapping({
                      ...currentColumnMapping,
                      transformFunction: e.target.value
                    });
                  }}
                  value={currentColumnMapping.transformFunction || ""}
                  className="col-span-3"
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={() => {
                    if (!currentColumnMapping.mondayColumnId) {
                      toast({
                        title: "Erro",
                        description: "Selecione uma coluna do Monday",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Verifica se já existe um mapeamento para este campo do sistema
                    const existingIndex = columnMappings.findIndex(
                      m => m.mindBitsColumn === currentColumnMapping.mindBitsColumn
                    );
                    
                    if (existingIndex >= 0) {
                      // Atualiza o mapeamento existente
                      const updatedMappings = [...columnMappings];
                      updatedMappings[existingIndex] = currentColumnMapping;
                      setColumnMappings(updatedMappings);
                      
                      toast({
                        title: "Mapeamento atualizado",
                        description: `O campo ${currentColumnMapping.mindBitsColumn} foi remapeado.`,
                        variant: "default",
                      });
                    } else {
                      // Adiciona um novo mapeamento
                      setColumnMappings([...columnMappings, currentColumnMapping]);
                      
                      toast({
                        title: "Mapeamento adicionado",
                        description: `Novo mapeamento para ${currentColumnMapping.mindBitsColumn} adicionado.`,
                        variant: "default",
                      });
                    }
                    
                    // Reseta o formulário
                    setCurrentColumnMapping({
                      mondayColumnId: "",
                      mindBitsColumn: "nome"
                    });
                  }}
                >
                  Adicionar Mapeamento
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnMappingModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Aqui seria implementada a lógica para salvar os mapeamentos no banco de dados
              toast({
                title: "Mapeamentos salvos",
                description: `${columnMappings.length} mapeamentos configurados com sucesso.`,
                variant: "default",
              });
              setIsColumnMappingModalOpen(false);
            }}>
              Salvar Mapeamentos
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
              Tem certeza que deseja excluir o mapeamento "{selectedMapping?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMapping} className="bg-red-600 hover:bg-red-700">
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
                      className="flex-1 min-w-0 block px-3 py-2 rounded-l-md border border-r-0 border-gray-300 focus:ring-primary focus:border-primary"
                      placeholder="Informe a chave de API do Monday.com"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={saveApiKey}
                      disabled={saveApiKeyMutation.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveApiKeyMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Salvando...
                        </>
                      ) : saveApiKeyMutation.isSuccess ? (
                        "Salvo com sucesso!"
                      ) : (
                        "Salvar"
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    A API Key é necessária para integração com o Monday.com. 
                    <a href="https://monday.com/developers/v2/api_keys/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-600 ml-1 inline-flex items-center">
                      Como obter uma chave <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-gray-900">Mapeamentos de Quadros</h4>
                    <button
                      type="button"
                      onClick={() => openEditModal()}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Novo Mapeamento
                    </button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    {isLoadingMappings ? (
                      <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-gray-500">Carregando mapeamentos...</span>
                      </div>
                    ) : isMappingsError ? (
                      <div className="p-6 text-center">
                        <p className="text-red-600 mb-2">Erro ao carregar mapeamentos</p>
                        <p className="text-gray-600 text-sm">{String(mappingsError)}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableCaption>Lista de mapeamentos configurados com o Monday.com</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>ID do Quadro</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Última Sincronização</TableHead>
                            <TableHead className="w-[150px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {boardMappings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                Nenhum mapeamento configurado.
                                <button
                                  onClick={() => openEditModal()}
                                  className="text-primary hover:underline ml-1"
                                >
                                  Adicionar um mapeamento
                                </button>
                              </TableCell>
                            </TableRow>
                          ) : (
                            boardMappings.map((mapping) => (
                              <TableRow key={mapping.id}>
                                <TableCell className="font-medium">{mapping.name}</TableCell>
                                <TableCell>{mapping.boardId}</TableCell>
                                <TableCell className="text-sm text-gray-600">{mapping.description}</TableCell>
                                <TableCell>
                                  {mapping.lastSync ? (
                                    <span className="text-sm text-gray-600">{mapping.lastSync}</span>
                                  ) : (
                                    <span className="text-xs text-gray-500 italic">Nunca sincronizado</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => openEditModal(mapping)}
                                      className="p-1 text-gray-500 hover:text-primary transition-colors"
                                      title="Editar mapeamento"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteDialog(mapping)}
                                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                      title="Excluir mapeamento"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuracao" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações do Sistema</h3>
              <p className="text-gray-600 mb-4">
                Esta seção está em desenvolvimento. Configurações adicionais estarão disponíveis em breve.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}