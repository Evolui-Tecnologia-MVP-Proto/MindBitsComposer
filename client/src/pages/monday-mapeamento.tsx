import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Edit, 
  Trash2, 
  Link, 
  ArrowDown, 
  PlusCircle, 
  CheckCircle,
  Loader2
} from "lucide-react";

// Tipos
type MondayColumnType = {
  id: string;
  mappingId: string;
  columnId: string;
  title: string;
  type: string;
};

type MindBitsColumnType = "nome" | "cliente" | "requisitante" | "data_inclusao" | "status_origem" | "descricao" | "anexos";

type ColumnMapping = {
  mondayColumnId: string;
  mindBitsColumn: MindBitsColumnType;
  transformFunction?: string;
};

type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  description: string;
  statusColumn: string;
  responsibleColumn: string;
  lastSync: string | null;
};

export default function MondayMapeamentoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnMappingModalOpen, setIsColumnMappingModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [currentColumnMapping, setCurrentColumnMapping] = useState<ColumnMapping>({
    mondayColumnId: "",
    mindBitsColumn: "nome"
  });
  
  // Consulta para buscar os mapeamentos do Monday
  const { 
    data: boardMappings = [], 
    isLoading: isLoadingMappings,
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
  
  // Consulta para obter colunas de um mapeamento específico
  const { 
    data: mondayColumns = [],
    isLoading: isLoadingColumns,
  } = useQuery({
    queryKey: [`/api/monday/mappings/${selectedMapping?.id}/columns`],
    queryFn: async () => {
      if (!selectedMapping) return [];
      try {
        const response = await fetch(`/api/monday/mappings/${selectedMapping.id}/columns`);
        if (!response.ok) {
          if (response.status === 404) {
            return [];
          }
          throw new Error('Falha ao carregar as colunas do mapeamento');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar colunas:", error);
        return [];
      }
    },
    enabled: !!selectedMapping,
  });
  
  // Consulta para obter mapeamentos de colunas existentes
  const { 
    data: existingMappings = [], 
    isLoading: isLoadingExistingMappings,
    refetch: refetchMappings,
  } = useQuery({
    queryKey: [`/api/monday/mappings/${selectedMapping?.id}/column-mappings`],
    queryFn: async () => {
      if (!selectedMapping) return [];
      try {
        const response = await fetch(`/api/monday/mappings/${selectedMapping.id}/column-mappings`);
        if (!response.ok) {
          // Pode ser que os mapeamentos ainda não existam
          if (response.status === 404) {
            return [];
          }
          throw new Error('Falha ao carregar os mapeamentos de colunas');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar mapeamentos de colunas:", error);
        return [];
      }
    },
    enabled: !!selectedMapping && isColumnMappingModalOpen,
  });
  
  // Efeito para carregar os mapeamentos existentes
  useState(() => {
    if (existingMappings && existingMappings.length > 0) {
      setColumnMappings(existingMappings);
    } else {
      setColumnMappings([]);
    }
  });
  
  // Mutação para salvar os mapeamentos de colunas
  const saveMappingsMutation = useMutation({
    mutationFn: async (mappings: ColumnMapping[]) => {
      if (!selectedMapping) {
        throw new Error("Nenhum mapeamento selecionado");
      }
      const response = await apiRequest('POST', `/api/monday/mappings/${selectedMapping.id}/column-mappings`, { mappings });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao salvar mapeamentos de colunas');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mapeamentos salvos",
        description: `${columnMappings.length} mapeamentos de colunas foram salvos com sucesso.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/monday/mappings/${selectedMapping?.id}/column-mappings`] });
      setIsColumnMappingModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar mapeamentos",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Função para abrir o modal de mapeamento de colunas
  const openColumnMappingModal = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsColumnMappingModalOpen(true);
    setColumnMappings(existingMappings || []);
  };
  
  // Função para adicionar ou atualizar um mapeamento
  const handleAddOrUpdateMapping = () => {
    // Validar
    if (!currentColumnMapping.mondayColumnId || !currentColumnMapping.mindBitsColumn) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma coluna do Monday e um campo do sistema.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se já existe um mapeamento para este campo
    const existingIndex = columnMappings.findIndex(
      m => m.mindBitsColumn === currentColumnMapping.mindBitsColumn
    );
    
    let updatedMappings = [...columnMappings];
    
    if (existingIndex >= 0) {
      // Atualiza o mapeamento existente
      updatedMappings[existingIndex] = currentColumnMapping;
      
      toast({
        title: "Mapeamento atualizado",
        description: `O campo ${currentColumnMapping.mindBitsColumn} foi remapeado.`,
        variant: "default",
      });
    } else {
      // Adiciona um novo mapeamento
      updatedMappings = [...columnMappings, currentColumnMapping];
      
      toast({
        title: "Mapeamento adicionado",
        description: `Novo mapeamento para ${currentColumnMapping.mindBitsColumn} adicionado.`,
        variant: "default",
      });
    }
    
    setColumnMappings(updatedMappings);
    
    // Reseta o formulário
    setCurrentColumnMapping({
      mondayColumnId: "",
      mindBitsColumn: "nome"
    });
  };
  
  // Remove um mapeamento
  const handleRemoveMapping = (index: number) => {
    const updatedMappings = [...columnMappings];
    updatedMappings.splice(index, 1);
    setColumnMappings(updatedMappings);
    
    toast({
      title: "Mapeamento removido",
      description: "O mapeamento foi removido com sucesso.",
      variant: "default",
    });
  };
  
  // Edita um mapeamento existente
  const handleEditMapping = (mapping: ColumnMapping) => {
    setCurrentColumnMapping(mapping);
  };
  
  // Salva todos os mapeamentos
  const handleSaveAllMappings = () => {
    saveMappingsMutation.mutate(columnMappings);
  };
  
  // Contador de mapeamentos para exibir na tabela
  const getMappingCount = (mappingId: string) => {
    if (mappingId !== selectedMapping?.id) return null;
    return columnMappings.length;
  };
  
  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Mapeamento de Colunas Monday.com</h2>
      </div>
      
      <div className="mt-6 bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Configure os mapeamentos dos quadros do Monday.com e associe as colunas aos campos do sistema.
            Defina como as informações serão importadas e organize os dados de acordo com suas necessidades.
          </p>
          
          {isLoadingMappings ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando mapeamentos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Mapeamento</TableHead>
                  <TableHead>ID do Quadro</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Última Sincronização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boardMappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-gray-500">Nenhum mapeamento configurado.</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Configure os mapeamentos na página de Administração.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  boardMappings.map((mapping: BoardMapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">
                        {mapping.name}
                        {selectedMapping?.id === mapping.id && columnMappings.length > 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {columnMappings.length} {columnMappings.length === 1 ? 'coluna mapeada' : 'colunas mapeadas'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{mapping.boardId}</TableCell>
                      <TableCell className="text-sm text-gray-600">{mapping.description}</TableCell>
                      <TableCell>
                        {mapping.lastSync ? (
                          <span className="text-sm text-gray-600">{mapping.lastSync}</span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Nunca sincronizado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openColumnMappingModal(mapping)}
                          className="flex items-center"
                        >
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Mapear Colunas
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      
      {/* Modal de Mapeamento de Colunas */}
      <Dialog 
        open={isColumnMappingModalOpen} 
        onOpenChange={(open) => {
          setIsColumnMappingModalOpen(open);
          if (!open) {
            setSelectedMapping(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mapeamento de Colunas</DialogTitle>
            <DialogDescription>
              Associe as colunas do Monday.com com os campos do sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingColumns || isLoadingExistingMappings ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-sm text-gray-500">Carregando colunas...</p>
              </div>
            ) : (
              <>
                {/* Lista de mapeamentos já configurados */}
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Mapeamentos Configurados</h3>
                  
                  {columnMappings.length > 0 ? (
                    <div className="space-y-3">
                      {columnMappings.map((mapping, index) => (
                        <div key={index} className="p-3 bg-gray-50 border rounded-md flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium">{mapping.mindBitsColumn}</span>
                            <span className="text-gray-500 mx-2">→</span>
                            <span className="text-sm">
                              {mondayColumns.find((col: MondayColumnType) => col.columnId === mapping.mondayColumnId)?.title || mapping.mondayColumnId}
                            </span>
                            
                            {mapping.transformFunction && (
                              <div className="mt-1 text-xs text-gray-500 italic">
                                Função de transformação aplicada
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditMapping(mapping)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              onClick={() => handleRemoveMapping(index)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center border rounded-md bg-gray-50">
                      <p className="text-sm text-gray-500">
                        Nenhum mapeamento de coluna configurado.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Formulário para adicionar ou editar um mapeamento */}
                <div className="space-y-4 bg-gray-50 p-4 rounded-md border">
                  <h3 className="text-sm font-medium text-gray-800">
                    {currentColumnMapping.mondayColumnId ? "Editar Mapeamento" : "Adicionar Novo Mapeamento"}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Campo no Sistema</label>
                      <Select
                        value={currentColumnMapping.mindBitsColumn}
                        onValueChange={(value) => 
                          setCurrentColumnMapping({
                            ...currentColumnMapping,
                            mindBitsColumn: value as MindBitsColumnType
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nome">Nome do Documento</SelectItem>
                          <SelectItem value="cliente">Cliente</SelectItem>
                          <SelectItem value="requisitante">Requisitante</SelectItem>
                          <SelectItem value="data_inclusao">Data de Inclusão</SelectItem>
                          <SelectItem value="status_origem">Status de Origem</SelectItem>
                          <SelectItem value="descricao">Descrição</SelectItem>
                          <SelectItem value="anexos">Anexos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Coluna no Monday</label>
                      <Select 
                        value={currentColumnMapping.mondayColumnId}
                        onValueChange={(value) => 
                          setCurrentColumnMapping({
                            ...currentColumnMapping,
                            mondayColumnId: value
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          {mondayColumns.map((column: MondayColumnType) => (
                            <SelectItem key={column.columnId} value={column.columnId}>
                              {column.title} ({column.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="text-sm font-medium flex-1">Função de Transformação (opcional)</label>
                    </div>
                    <textarea
                      className="w-full rounded-md border border-gray-300 p-2 text-sm font-mono"
                      rows={3}
                      placeholder="(value) => { return value; }"
                      value={currentColumnMapping.transformFunction || ""}
                      onChange={(e) => 
                        setCurrentColumnMapping({
                          ...currentColumnMapping,
                          transformFunction: e.target.value
                        })
                      }
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Resetar o formulário
                        setCurrentColumnMapping({
                          mondayColumnId: "",
                          mindBitsColumn: "nome"
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    
                    <Button onClick={handleAddOrUpdateMapping}>
                      {currentColumnMapping.mondayColumnId ? "Atualizar" : "Adicionar"} Mapeamento
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnMappingModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAllMappings}
              disabled={saveMappingsMutation.isPending}
            >
              {saveMappingsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Todos os Mapeamentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}