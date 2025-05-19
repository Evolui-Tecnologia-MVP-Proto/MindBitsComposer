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
  const fetchMondayColumns = (mappingId: string) => {
    return useQuery({
      queryKey: [`/api/monday/mappings/${mappingId}/columns`],
      queryFn: async () => {
        const response = await fetch(`/api/monday/mappings/${mappingId}/columns`);
        if (!response.ok) {
          throw new Error('Falha ao carregar as colunas do mapeamento');
        }
        return response.json();
      },
      enabled: !!mappingId, // Só executa se tiver um mappingId
    });
  };

  // Se temos um mapping selecionado, buscamos suas colunas
  const { 
    data: mondayColumnsData = [],
    isLoading: isLoadingColumns
  } = selectedMapping ? fetchMondayColumns(selectedMapping.id) : { data: [], isLoading: false };

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
      // Abre a modal de mapeamento de colunas após carregar as colunas
      if (data.length > 0) {
        setIsColumnMappingModalOpen(true);
      }
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
    if (!selectedMapping) {
      toast({
        title: "Erro",
        description: "É necessário salvar o mapeamento antes de buscar as colunas.",
        variant: "destructive",
      });
      return;
    }
    
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
    
    // Chama a API para buscar as colunas do quadro
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
    
    // Fecha o modal
    setIsModalOpen(false);
    setSelectedMapping(null);
  };

  // Modal de configuração do mapeamento
  const renderConfigModal = () => {
    const isEditing = selectedMapping !== null;
    
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
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

  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Administração</h2>
      </div>
      
      {renderConfigModal()}
      
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