import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Template, TemplateType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type TemplateFormValues = {
  name: string;
  code: string;
  description: string;
  type: string;
  structure: string | object;
  mappings?: Record<string, string>;
};

const emptyTemplate: TemplateFormValues = {
  name: "",
  code: "",
  description: "",
  type: "struct",
  structure: "{}",
  mappings: {},
};

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateFormValues) => Promise<void>;
  template?: Template;
  mode: "create" | "edit";
  selectedType?: TemplateType;
}

export default function TemplateFormModal({
  isOpen,
  onClose,
  onSave,
  template,
  mode,
  selectedType
}: TemplateFormModalProps) {
  const [formData, setFormData] = useState<TemplateFormValues>(
    template
      ? {
          name: template.name || "",
          code: template.code,
          description: template.description,
          type: template.type,
          structure: typeof template.structure === 'object' 
            ? JSON.stringify(template.structure, null, 2) 
            : "{}",
          mappings: template.mappings || {},
        }
      : { 
          ...emptyTemplate, 
          type: selectedType || "struct", 
          structure: "{}" 
        }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Query para obter colunas da tabela documentos
  const { data: documentosColumns = [] } = useQuery({
    queryKey: ["/api/schema/documentos/columns"],
    enabled: isOpen, // Só executa quando a modal está aberta
  });

  // Função para extrair campos do JSON da estrutura
  const extractFieldsFromStructure = (structureString: string): string[] => {
    try {
      const parsed = JSON.parse(structureString);
      const fields: string[] = [];
      
      const extractFields = (obj: any, prefix = ''): void => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            const currentPath = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              // Se é um objeto, adiciona a seção e continua recursivamente
              fields.push(`[SEÇÃO] ${currentPath}`);
              extractFields(obj[key], currentPath);
            } else {
              // Se é um campo final, adiciona o campo
              fields.push(currentPath);
            }
          });
        }
      };
      
      extractFields(parsed);
      return fields;
    } catch (error) {
      return [];
    }
  };

  // Atualiza os mapeamentos quando a estrutura muda ou template é carregado
  useEffect(() => {
    const fields = extractFieldsFromStructure(
      typeof formData.structure === 'string' ? formData.structure : JSON.stringify(formData.structure)
    );
    
    const newMappings: Record<string, string> = {};
    fields.forEach(field => {
      // Preserva valores existentes do template ou do estado local
      newMappings[field] = formData.mappings?.[field] || fieldMappings[field] || '';
    });
    
    setFieldMappings(newMappings);
  }, [formData.structure, formData.mappings]);

  // Função para atualizar valor de mapeamento
  const handleMappingChange = (field: string, value: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para aplicar máscara no código XXX-99
  const applyCodeMask = (value: string) => {
    // Remove tudo que não é letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length <= 3) {
      // Apenas letras para os primeiros 3 caracteres
      return cleaned.replace(/[^A-Z]/g, '');
    } else {
      // Primeiros 3 caracteres como letras + hífen + até 2 números
      const letters = cleaned.slice(0, 3).replace(/[^A-Z]/g, '');
      const numbers = cleaned.slice(3, 5).replace(/[^0-9]/g, '');
      return letters + (numbers ? '-' + numbers : '');
    }
  };

  // Função para validar código XXX-99
  const validateCode = (code: string) => {
    const codeRegex = /^[A-Z]{3}-[0-9]{2}$/;
    return codeRegex.test(code);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'code') {
      // Aplicar máscara no campo código
      const maskedValue = applyCodeMask(value);
      setFormData((prev) => ({ ...prev, [name]: maskedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Armazenar o texto bruto da estrutura
    const structureValue = e.target.value.trim();
    
    try {
      // Verifica se o campo está vazio
      if (!structureValue) {
        setFormData((prev) => ({ ...prev, structure: "{}" }));
        setStructureError("");
        return;
      }
      
      // Validar se é um JSON válido
      JSON.parse(structureValue);
      
      // Armazenar o texto JSON original, não o objeto parseado
      setFormData((prev) => ({ ...prev, structure: structureValue }));
      setStructureError("");
    } catch (error) {
      // Se não for um JSON válido, manter o valor no campo mas marcar erro
      setFormData((prev) => ({ ...prev, structure: structureValue }));
      setStructureError("Formato JSON inválido");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (structureError) {
      toast({
        title: "Erro de validação",
        description: "O formato JSON da estrutura é inválido",
        variant: "destructive",
      });
      return;
    }

    if (!validateCode(formData.code)) {
      toast({
        title: "Erro de validação",
        description: "O código deve ter o formato XXX-99 (3 letras maiúsculas + hífen + 2 números)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Converter a estrutura de string para objeto JSON antes de enviar
      const processedData = {
        ...formData,
        structure: typeof formData.structure === 'string' 
          ? JSON.parse(formData.structure) 
          : formData.structure
      };
      
      console.log("Enviando template:", JSON.stringify(processedData, null, 2));
      await onSave(processedData);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast({
        title: "Erro ao salvar template",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[780px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Template" : "Editar Template"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos para {mode === "create" ? "criar um novo" : "editar o"} template.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="formatacao" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="formatacao">Formatação</TabsTrigger>
                <TabsTrigger value="mapeamento">Mapeamento</TabsTrigger>
              </TabsList>
              
              <TabsContent value="formatacao" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Nome do template"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Código
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="XXX-99"
                    required
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-500">
                    Formato: 3 letras maiúsculas + hífen + 2 números (ex: ABC-12)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Tipo
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={handleTypeChange}
                    disabled={mode === "edit"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="struct">Struct Template</SelectItem>
                      <SelectItem value="output">Out Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="structure">
                    Estrutura (JSON)
                  </Label>
                  <Textarea
                    id="structure"
                    name="structure"
                    value={typeof formData.structure === 'string' 
                      ? formData.structure 
                      : JSON.stringify(formData.structure, null, 2)}
                    onChange={handleStructureChange}
                    className="font-mono text-sm h-32 w-full"
                    required
                  />
                  {structureError && (
                    <p className="text-sm text-red-500">{structureError}</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="mapeamento" className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Configure valores para os campos extraídos da estrutura do template:
                  </div>
                  
                  {Object.keys(fieldMappings).length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/2">Campo/Seção</TableHead>
                            <TableHead className="w-1/2">Valor de Mapeamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(fieldMappings).map(([field, value]) => (
                            <TableRow key={field}>
                              <TableCell className={field.startsWith('[SEÇÃO]') ? 'font-semibold bg-gray-50' : ''}>
                                {field.startsWith('[SEÇÃO]') ? (
                                  <span className="text-blue-600">
                                    {field.replace('[SEÇÃO] ', '')}
                                  </span>
                                ) : (
                                  <span className="font-mono text-sm">
                                    {field}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {field.startsWith('[SEÇÃO]') ? (
                                  <span className="text-gray-400 italic text-sm">
                                    Seção de agrupamento
                                  </span>
                                ) : (
                                  <Select
                                    value={value}
                                    onValueChange={(selectedValue) => handleMappingChange(field, selectedValue)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Selecione uma coluna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {documentosColumns.map((column: any) => (
                                        <SelectItem key={column.name} value={column.name}>
                                          <div className="flex flex-col">
                                            <span className="font-mono text-sm">{column.name}</span>
                                            <span className="text-xs text-gray-500">{column.type}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">Nenhum campo encontrado</p>
                      <p className="text-sm text-gray-400">
                        Adicione uma estrutura JSON válida na aba "Formatação" para ver os campos aqui
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="border-t pt-4 mt-4 bg-white">
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !!structureError}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}