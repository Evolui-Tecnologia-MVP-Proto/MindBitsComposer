import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Info } from "lucide-react";

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

type MondayColumnMappingProps = {
  mappingId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function MondayColumnMapping({ mappingId, isOpen, onClose }: MondayColumnMappingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [currentColumnMapping, setCurrentColumnMapping] = useState<ColumnMapping>({
    mondayColumnId: "",
    mindBitsColumn: "nome",
  });

  // Consulta para obter colunas do Monday para este mapeamento
  const { data: mondayColumns = [], isLoading: isLoadingColumns } = useQuery({
    queryKey: [`/api/monday/mappings/${mappingId}/columns`],
    queryFn: async () => {
      if (!mappingId) return [];
      const response = await fetch(`/api/monday/mappings/${mappingId}/columns`);
      if (!response.ok) {
        throw new Error('Falha ao carregar as colunas do mapeamento');
      }
      return response.json();
    },
    enabled: !!mappingId && isOpen,
  });

  // Consulta para obter mapeamentos de colunas existentes
  const { data: existingMappings = [], isLoading: isLoadingMappings } = useQuery({
    queryKey: [`/api/monday/mappings/${mappingId}/column-mappings`],
    queryFn: async () => {
      if (!mappingId) return [];
      try {
        const response = await fetch(`/api/monday/mappings/${mappingId}/column-mappings`);
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
    enabled: !!mappingId && isOpen,
  });

  // Mutação para salvar os mapeamentos de colunas
  const saveMappingsMutation = useMutation({
    mutationFn: async (mappings: ColumnMapping[]) => {
      const response = await apiRequest('POST', `/api/monday/mappings/${mappingId}/column-mappings`, { mappings });
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
      queryClient.invalidateQueries({ queryKey: [`/api/monday/mappings/${mappingId}/column-mappings`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar mapeamentos",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Atualiza o estado local quando os dados são carregados
  useEffect(() => {
    if (existingMappings && existingMappings.length > 0) {
      setColumnMappings(existingMappings);
    }
  }, [existingMappings]);

  // Função para verificar se uma coluna já está mapeada
  const isColumnMapped = (columnId: string) => {
    return columnMappings.some(mapping => mapping.mondayColumnId === columnId);
  };

  // Função para verificar se um campo mindBits já está mapeado
  const isMindBitsFieldMapped = (field: MindBitsColumnType) => {
    return columnMappings.some(mapping => mapping.mindBitsColumn === field);
  };

  // Adiciona ou atualiza um mapeamento
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mapeamento de Colunas</DialogTitle>
          <DialogDescription>
            Associe as colunas do Monday.com com os campos do sistema
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
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
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    toast({
                      title: "Funções de transformação",
                      description: "Use 'value' como parâmetro de entrada e retorne o valor transformado. Ex: (value) => value.toUpperCase()",
                      variant: "default",
                    });
                  }}
                >
                  <Info className="h-3 w-3 mr-1" />
                  Ajuda
                </Button>
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSaveAllMappings}>
            Salvar Todos os Mapeamentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}