import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Unplug } from "lucide-react";
import { Template, TemplateType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type TemplateFormValues = {
  name: string;
  code: string;
  description: string;
  type: string;
  structure: string | object;
  mappings?: Record<string, string>;
  repoPath?: string;
};

const emptyTemplate: TemplateFormValues = {
  name: "",
  code: "",
  description: "",
  type: "struct",
  structure: "{}",
  mappings: {},
  repoPath: "",
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
          repoPath: (template as any).repoPath || "",
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
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [formulaFields, setFormulaFields] = useState<Set<string>>(new Set());
  const [openFormulaEditors, setOpenFormulaEditors] = useState<Set<string>>(new Set());
  const [formulaValues, setFormulaValues] = useState<Record<string, string>>({});
  const [pluginFields, setPluginFields] = useState<Set<string>>(new Set());
  const [openPluginSelectors, setOpenPluginSelectors] = useState<Set<string>>(new Set());
  const [pluginValues, setPluginValues] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Query para obter colunas da tabela documentos
  const { data: documentosColumns = [] } = useQuery({
    queryKey: ["/api/schema/documentos/columns"],
    enabled: isOpen, // Só executa quando a modal está aberta
  });

  // Query para buscar plugins ativos do tipo DOCUMENT_PART
  const { data: documentPartPlugins = [] } = useQuery({
    queryKey: ['/api/plugins', 'DOCUMENT_PART'],
    queryFn: async () => {
      const response = await fetch('/api/plugins');
      if (!response.ok) throw new Error('Erro ao buscar plugins');
      const plugins = await response.json();
      return plugins.filter((plugin: any) => plugin.status === 'active' && plugin.type === 'DOCUMENT_PART');
    },
    enabled: isOpen,
  });

  // Query para buscar estrutura do repositório
  const { data: repoStructures = [] } = useQuery({
    queryKey: ["/api/repo-structure"],
    enabled: isOpen,
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
              
              // Adicionar definição para o corpo da seção (conteúdo de texto livre)
              if (prefix === 'sections' || currentPath.startsWith('sections.')) {
                fields.push(`${currentPath}.body`);
              }
              
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

  // Reseta acordions quando a modal é aberta
  useEffect(() => {
    if (isOpen) {
      setOpenAccordions({});
    }
  }, [isOpen]);

  // Force override #374151 colors with JavaScript after render
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const forceColorOverride = () => {
        const modal = modalRef.current;
        if (!modal) return;

        // Find all elements with #374151 or gray-600 border
        const allElements = modal.querySelectorAll('*');
        allElements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlElement);
          
          // Check border colors
          if (
            computedStyle.borderColor === 'rgb(55, 65, 81)' ||
            computedStyle.borderTopColor === 'rgb(55, 65, 81)' ||
            computedStyle.borderBottomColor === 'rgb(55, 65, 81)' ||
            computedStyle.borderLeftColor === 'rgb(55, 65, 81)' ||
            computedStyle.borderRightColor === 'rgb(55, 65, 81)'
          ) {
            htmlElement.style.setProperty('border-color', '#0F172A', 'important');
            htmlElement.style.setProperty('border-top-color', '#0F172A', 'important');
            htmlElement.style.setProperty('border-bottom-color', '#0F172A', 'important');
            htmlElement.style.setProperty('border-left-color', '#0F172A', 'important');
            htmlElement.style.setProperty('border-right-color', '#0F172A', 'important');
          }

          // Check background colors
          if (computedStyle.backgroundColor === 'rgb(55, 65, 81)') {
            htmlElement.style.setProperty('background-color', '#0F172A', 'important');
          }
        });
      };

      // Run immediately and after small delays
      forceColorOverride();
      const timeout1 = setTimeout(forceColorOverride, 100);
      const timeout2 = setTimeout(forceColorOverride, 500);
      const timeout3 = setTimeout(forceColorOverride, 1000);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    }
  }, [isOpen, openAccordions]);

  // Função para verificar se um valor é um UUID (ID de plugin)
  const isPluginId = (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value) && documentPartPlugins.some((plugin: any) => plugin.id === value);
  };

  // Função para extrair valor de mapping (compatibilidade com formato antigo e novo)
  const extractMappingValue = (mapping: any) => {
    if (typeof mapping === 'string') {
      // Formato antigo - string direta
      return mapping;
    } else if (mapping && typeof mapping === 'object' && mapping.value) {
      // Formato novo - objeto com type e value
      return mapping.value;
    }
    return '';
  };

  // Função para extrair tipo de mapping
  const extractMappingType = (mapping: any, value: string) => {
    if (mapping && typeof mapping === 'object' && mapping.type) {
      // Formato novo - objeto com type definido
      return mapping.type;
    }
    // Formato antigo - inferir tipo baseado no valor
    if (value === '__compose_formula__' || (value && value.includes('SUBSTR') || value.includes('+'))) {
      return 'formula';
    } else if (value === '__data_plugin__' || isPluginId(value)) {
      return 'plugin';
    }
    return 'field';
  };

  // Atualiza os mapeamentos quando a estrutura muda ou template é carregado
  useEffect(() => {
    const fields = extractFieldsFromStructure(
      typeof formData.structure === 'string' ? formData.structure : JSON.stringify(formData.structure)
    );
    
    const newMappings: Record<string, string> = {};
    const newFormulaFields = new Set<string>();
    const newPluginFields = new Set<string>();
    const newPluginValues: Record<string, string> = {};
    
    fields.forEach(field => {
      // Preserva valores existentes do template ou do estado local
      const existingMapping = formData.mappings?.[field] || fieldMappings[field] || '';
      const existingValue = extractMappingValue(existingMapping);
      const mappingType = extractMappingType(existingMapping, existingValue);
      
      // Define o valor de exibição baseado no tipo
      if (mappingType === 'formula') {
        newMappings[field] = '__compose_formula__';
        newFormulaFields.add(field);
        setFormulaValues(prev => ({
          ...prev,
          [field]: existingValue
        }));
      } else if (mappingType === 'plugin') {
        newMappings[field] = '__data_plugin__';
        newPluginFields.add(field);
        if (existingValue && existingValue !== '__data_plugin__') {
          newPluginValues[field] = existingValue;
        }
      } else {
        // Tipo 'field' ou valor direto
        newMappings[field] = existingValue;
      }
    });
    
    setFieldMappings(newMappings);
    setFormulaFields(newFormulaFields);
    setPluginFields(newPluginFields);
    
    // Atualizar pluginValues se há novos valores
    if (Object.keys(newPluginValues).length > 0) {
      setPluginValues(prev => ({
        ...prev,
        ...newPluginValues
      }));
    }
  }, [formData.structure, formData.mappings, documentPartPlugins]);

  // Função para atualizar valor de mapeamento
  const handleMappingChange = (field: string, value: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Se selecionou "Compose Formula", adiciona ao set
    if (value === '__compose_formula__') {
      setFormulaFields(prev => new Set(prev).add(field));
      setPluginFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    } else if (value === '__data_plugin__') {
      // Se selecionou "Data Plugin", adiciona ao set
      setPluginFields(prev => new Set(prev).add(field));
      setFormulaFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    } else {
      // Se mudou para outra opção, remove de ambos os sets
      setFormulaFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
      setPluginFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
  };

  // Função para obter o nome real da seção a partir da estrutura
  const getSectionRealName = (sectionKey: string) => {
    try {
      if (!formData.structure) return sectionKey;
      
      const parsed = typeof formData.structure === 'string' 
        ? JSON.parse(formData.structure) 
        : formData.structure;
      
      if (parsed.sections && typeof parsed.sections === 'object' && !Array.isArray(parsed.sections)) {
        // Procurar pela chave que inicia com o número da seção
        const fullSectionKey = Object.keys(parsed.sections).find(key => 
          key.startsWith(`${sectionKey}.`)
        );
        
        if (fullSectionKey) {
          return fullSectionKey;
        }
        
        // Fallback: se não encontrar, tentar busca direta
        const section = parsed.sections[sectionKey];
        if (section && section.title) {
          return `${sectionKey}. ${section.title}`;
        }
      }
      
      return sectionKey;
    } catch (error) {
      return sectionKey;
    }
  };

  // Função para agrupar campos de mapeamento
  const groupFieldMappings = () => {
    const groups: Record<string, { 
      type: 'simple';
      fields: Array<{ field: string; value: string }>;
    } | {
      type: 'nested';
      subgroups: Record<string, { fields: Array<{ field: string; value: string }>; displayName: string }>;
    }> = {};
    
    const sectionsGroups: Record<string, { fields: Array<{ field: string; value: string }>; displayName: string }> = {};
    
    Object.entries(fieldMappings).forEach(([field, value]) => {
      if (field.startsWith('[SEÇÃO]')) {
        return; // Pular seções de agrupamento
      }
      
      // Determinar o grupo baseado no campo
      if (field.startsWith('header.') || field === 'header') {
        if (!groups['Header']) {
          groups['Header'] = { type: 'simple', fields: [] };
        }
        if (groups['Header'].type === 'simple') {
          groups['Header'].fields.push({ field, value });
        }
      } else if (field.startsWith('sections.')) {
        const parts = field.split('.');
        if (parts.length >= 2) {
          const sectionKey = parts[1];
          if (!sectionsGroups[sectionKey]) {
            sectionsGroups[sectionKey] = {
              fields: [],
              displayName: getSectionRealName(sectionKey)
            };
          }
          sectionsGroups[sectionKey].fields.push({ field, value });
        }
      } else if (field === 'sections') {
        if (!groups['Outros']) {
          groups['Outros'] = { type: 'simple', fields: [] };
        }
        if (groups['Outros'].type === 'simple') {
          groups['Outros'].fields.push({ field, value });
        }
      } else {
        if (!groups['Outros']) {
          groups['Outros'] = { type: 'simple', fields: [] };
        }
        if (groups['Outros'].type === 'simple') {
          groups['Outros'].fields.push({ field, value });
        }
      }
    });
    
    // Se há campos de seções, criar estrutura hierárquica
    if (Object.keys(sectionsGroups).length > 0) {
      groups['Seções'] = { type: 'nested', subgroups: sectionsGroups };
    }
    
    return groups;
  };

  // Função para alternar estado do accordion
  const toggleAccordion = (groupKey: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
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
  }

  const handleRepoPathChange = (value: string) => {
    setFormData(prev => ({ ...prev, repoPath: value }));
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
      // Converter para o novo formato estruturado com tipo e valor
      const finalMappings: Record<string, any> = {};
      
      Object.entries(fieldMappings).forEach(([field, value]) => {
        if (field.startsWith('[SEÇÃO]')) {
          // Seções de agrupamento mantém formato string vazio
          finalMappings[field] = '';
        } else if (value === '__compose_formula__' && formulaValues[field]) {
          // Campos de fórmula
          finalMappings[field] = {
            type: 'formula',
            value: formulaValues[field]
          };
        } else if (value === '__data_plugin__' && pluginValues[field]) {
          // Campos de plugin
          finalMappings[field] = {
            type: 'plugin',
            value: pluginValues[field]
          };
        } else if (value && value !== '__compose_formula__' && value !== '__data_plugin__') {
          // Campos diretos
          finalMappings[field] = {
            type: 'field',
            value: value
          };
        } else {
          // Campos vazios ou sem valor definido
          finalMappings[field] = '';
        }
      });
      
      const processedData = {
        ...formData,
        structure: typeof formData.structure === 'string' 
          ? JSON.parse(formData.structure) 
          : formData.structure,
        mappings: finalMappings
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
      <DialogContent ref={modalRef} className="sm:max-w-[780px] max-h-[80vh] flex flex-col">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      Formato: ABC-12
                    </p>
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="repoPath">
                    Caminho do Repositório
                  </Label>
                  <Select
                    value={formData.repoPath || ""}
                    onValueChange={handleRepoPathChange}
                  >
                    <SelectTrigger className="w-full dark:bg-[#0F172A] dark:border-[#374151]">
                      <SelectValue placeholder="Selecione um caminho do repositório" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                      {Array.isArray(repoStructures) && repoStructures.length > 0 ? (
                        repoStructures.map((structure: any) => (
                          <SelectItem key={structure.path} value={structure.path}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{structure.path}</span>
                              {structure.type === 'directory' && (
                                <span className="text-xs text-gray-500">📁</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Nenhuma estrutura de repositório encontrada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Selecione o caminho no repositório onde este template será aplicado
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
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Configure valores para os campos extraídos da estrutura do template:
                  </div>
                  
                  {Object.keys(fieldMappings).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(groupFieldMappings()).map(([groupKey, groupData]) => {
                        const isNested = groupData.type === 'nested';
                        const fields = groupData.type === 'simple' ? groupData.fields : [];
                        const subGroups = groupData.type === 'nested' ? groupData.subgroups : {} as Record<string, { fields: Array<{ field: string; value: string }>; displayName: string }>;
                        
                        return (
                          <Collapsible
                            key={groupKey}
                            open={openAccordions[groupKey] ?? false}
                            onOpenChange={() => toggleAccordion(groupKey)}
                          >
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left bg-gray-50 dark:bg-[#1E293B] hover:bg-gray-100 dark:hover:bg-[#1E293B] rounded-lg border dark:border-[#0F172A] transition-colors">
                              <div className="flex items-center gap-2">
                                {openAccordions[groupKey] ?? false ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-gray-100">{groupKey}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                                  {isNested 
                                    ? `${Object.keys(subGroups).length} seções`
                                    : `${fields.length} campos`
                                  }
                                </span>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="border border-t-0 border-gray-200 dark:border-[#0F172A] rounded-b-lg dark:bg-[#0F172A]">
                              <div className="p-4">
                                {isNested ? (
                                  // Renderizar seções aninhadas
                                  <div className="space-y-3">
                                    {Object.entries(subGroups).map(([sectionKey, sectionData]) => (
                                      <Collapsible
                                        key={`${groupKey}-${sectionKey}`}
                                        open={openAccordions[`${groupKey}-${sectionKey}`] ?? false}
                                        onOpenChange={() => toggleAccordion(`${groupKey}-${sectionKey}`)}
                                      >
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left bg-blue-50 dark:bg-[#1E293B] hover:bg-blue-100 dark:hover:bg-[#1E293B] rounded border border-blue-200 dark:border-[#0F172A] transition-colors">
                                          <div className="flex items-center gap-2">
                                            {openAccordions[`${groupKey}-${sectionKey}`] ?? false ? (
                                              <ChevronDown className="h-3 w-3 text-blue-500 dark:text-blue-300" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 text-blue-500 dark:text-blue-300" />
                                            )}
                                            <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">{sectionData.displayName}</span>
                                            <span className="text-xs text-blue-500 dark:text-blue-300 bg-blue-200 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                              {sectionData.fields.length} campos
                                            </span>
                                          </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="w-1/2 text-xs">Campo</TableHead>
                                                <TableHead className="w-1/2 text-xs">Mapeamento</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {sectionData.fields.map(({ field, value }) => (
                                                <TableRow key={field}>
                                                  <TableCell className="py-2">
                                                    <span className="font-mono text-xs text-gray-700 dark:text-gray-200">
                                                      {field}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell className="py-2">
                                                    <div className="flex items-center gap-2">
                                                      <Select
                                                        value={value}
                                                        onValueChange={(selectedValue) => handleMappingChange(field, selectedValue)}
                                                      >
                                                        <SelectTrigger className={`h-8 text-xs ${formulaFields.has(field) || pluginFields.has(field) ? 'flex-1' : 'w-full'}`}>
                                                          <SelectValue placeholder="Selecione uma coluna" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="__compose_formula__" className="text-red-600 font-semibold">
                                                            Compose Formula
                                                          </SelectItem>
                                                          <SelectItem value="__data_plugin__" className="text-blue-600 font-semibold">
                                                            Data Plugin
                                                          </SelectItem>
                                                          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                                                          {Array.isArray(documentosColumns) && documentosColumns.map((column: any) => (
                                                            <SelectItem key={column.name} value={column.name}>
                                                              <div className="flex flex-col items-start">
                                                                <span className="font-mono text-xs text-left">{column.name}</span>
                                                                <span className="text-xs text-gray-500 text-left">{column.type}</span>
                                                              </div>
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                      {formulaFields.has(field) && (
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          className="h-8 px-3"
                                                          onClick={() => {
                                                            setOpenFormulaEditors(prev => {
                                                              const newSet = new Set(prev);
                                                              if (newSet.has(field)) {
                                                                newSet.delete(field);
                                                              } else {
                                                                newSet.add(field);
                                                              }
                                                              return newSet;
                                                            });
                                                          }}
                                                        >
                                                          <span className="italic">f(x)</span>
                                                        </Button>
                                                      )}
                                                      {pluginFields.has(field) && (
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          className="h-8 px-3"
                                                          onClick={() => {
                                                            setOpenPluginSelectors(prev => {
                                                              const newSet = new Set(prev);
                                                              if (newSet.has(field)) {
                                                                newSet.delete(field);
                                                              } else {
                                                                newSet.add(field);
                                                              }
                                                              return newSet;
                                                            });
                                                          }}
                                                        >
                                                          <Unplug className="h-3 w-3" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                    {openFormulaEditors.has(field) && (
                                                      <div className="mt-2">
                                                        <Textarea
                                                          placeholder={`Ex: SUBSTR(coluna_x, 0, 3) + ' - ' + coluna_y`}
                                                          value={formulaValues[field] || ''}
                                                          onChange={(e) => {
                                                            setFormulaValues(prev => ({
                                                              ...prev,
                                                              [field]: e.target.value
                                                            }));
                                                          }}
                                                          className="font-mono text-xs h-20 resize-none dark:bg-[#0F172A] dark:border-[#374151]"
                                                        />
                                                      </div>
                                                    )}
                                                    {openPluginSelectors.has(field) && (
                                                      <div className="mt-2">
                                                        <Select
                                                          value={pluginValues[field] || ''}
                                                          onValueChange={(selectedValue) => {
                                                            setPluginValues(prev => ({
                                                              ...prev,
                                                              [field]: selectedValue
                                                            }));
                                                          }}
                                                        >
                                                          <SelectTrigger className="h-8 text-xs dark:bg-[#0F172A] dark:border-[#374151]">
                                                            <SelectValue placeholder="Selecione um plugin" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {documentPartPlugins.map((plugin: any) => (
                                                              <SelectItem key={plugin.id} value={plugin.id}>
                                                                <div className="flex items-center gap-2">
                                                                  <span className="text-xs">{plugin.name}</span>
                                                                  <span className="text-xs text-gray-500">v{plugin.version}</span>
                                                                </div>
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    ))}
                                  </div>
                                ) : (
                                  // Renderizar campos normais
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-1/2">Campo</TableHead>
                                        <TableHead className="w-1/2">Mapeamento</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {fields.map(({ field, value }) => (
                                        <TableRow key={field}>
                                          <TableCell>
                                            <span className="font-mono text-sm text-gray-700 dark:text-gray-200">
                                              {field}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <Select
                                                value={value}
                                                onValueChange={(selectedValue) => handleMappingChange(field, selectedValue)}
                                              >
                                                <SelectTrigger className={`${formulaFields.has(field) || pluginFields.has(field) ? 'flex-1' : 'w-full'}`}>
                                                  <SelectValue placeholder="Selecione uma coluna" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="__compose_formula__" className="text-red-600 font-semibold">
                                                    Compose Formula
                                                  </SelectItem>
                                                  <SelectItem value="__data_plugin__" className="text-blue-600 font-semibold">
                                                    Data Plugin
                                                  </SelectItem>
                                                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                                                  {Array.isArray(documentosColumns) && documentosColumns.map((column: any) => (
                                                    <SelectItem key={column.name} value={column.name}>
                                                      <div className="flex flex-col items-start">
                                                        <span className="font-mono text-sm text-left">{column.name}</span>
                                                        <span className="text-xs text-gray-500 text-left">{column.type}</span>
                                                      </div>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              {formulaFields.has(field) && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-9 px-3"
                                                  onClick={() => {
                                                    setOpenFormulaEditors(prev => {
                                                      const newSet = new Set(prev);
                                                      if (newSet.has(field)) {
                                                        newSet.delete(field);
                                                      } else {
                                                        newSet.add(field);
                                                      }
                                                      return newSet;
                                                    });
                                                  }}
                                                >
                                                  <span className="italic">f(x)</span>
                                                </Button>
                                              )}
                                              {pluginFields.has(field) && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-9 px-3"
                                                  onClick={() => {
                                                    setOpenPluginSelectors(prev => {
                                                      const newSet = new Set(prev);
                                                      if (newSet.has(field)) {
                                                        newSet.delete(field);
                                                      } else {
                                                        newSet.add(field);
                                                      }
                                                      return newSet;
                                                    });
                                                  }}
                                                >
                                                  <Unplug className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </div>
                                            {openFormulaEditors.has(field) && (
                                              <div className="mt-2">
                                                <Textarea
                                                  placeholder={`Ex: SUBSTR(coluna_x, 0, 3) + ' - ' + coluna_y`}
                                                  value={formulaValues[field] || ''}
                                                  onChange={(e) => {
                                                    setFormulaValues(prev => ({
                                                      ...prev,
                                                      [field]: e.target.value
                                                    }));
                                                  }}
                                                  className="font-mono text-sm h-24 resize-none dark:bg-[#0F172A] dark:border-[#374151]"
                                                />
                                              </div>
                                            )}
                                            {openPluginSelectors.has(field) && (
                                              <div className="mt-2">
                                                <Select
                                                  value={pluginValues[field] || ''}
                                                  onValueChange={(selectedValue) => {
                                                    setPluginValues(prev => ({
                                                      ...prev,
                                                      [field]: selectedValue
                                                    }));
                                                  }}
                                                >
                                                  <SelectTrigger className="h-9 text-sm dark:bg-[#0F172A] dark:border-[#374151]">
                                                    <SelectValue placeholder="Selecione um plugin" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {documentPartPlugins.map((plugin: any) => (
                                                      <SelectItem key={plugin.id} value={plugin.id}>
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-sm">{plugin.name}</span>
                                                          <span className="text-xs text-gray-500">v{plugin.version}</span>
                                                        </div>
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum campo encontrado</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Adicione uma estrutura JSON válida na aba "Formatação" para ver os campos aqui
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="border-t pt-4 mt-4 bg-white dark:bg-[#0F172A] dark:border-gray-600">
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