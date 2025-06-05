import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bold, 
  Italic, 
  Save, 
  Palette, 
  LayoutTemplate, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Code,
  Puzzle,
  Database,
  Bot,
  Brain,
  BarChart3,
  Zap,
  Settings,
  Image,
  Brush,
  PenTool,
  Layers,
  Globe,
  Calculator,
  Clock,
  Users,
  Mail,
  Phone,
  Search,
  Filter,
  Download,
  Upload,
  Link,
  Share,
  Copy,
  Edit,
  Trash,
  Plus,
  Minus,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  FileCode2,
  FileText,
  Heading1,
  Heading2, 
  Heading3,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Table,
  MessageSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SimpleRichTextDisplay from "./SimpleRichTextDisplay";

interface Plugin {
  id: string;
  name: string;
  status: "active" | "inactive";
  type: "text" | "image" | "code" | "integration" | "automation";
  description?: string;
  icon?: string;
  pageName?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  structure?: string;
  category?: string;
}

interface DocumentEdition {
  id: string;
  name: string;
  content: string;
  templateId?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplateSection {
  name: string;
  content: string;
  isOpen: boolean;
  fields?: Array<{ key: string; value: string }>;
  tables?: Array<{
    key: string;
    columns: string[];
    lines: Array<Record<string, any>>;
  }>;
}

interface HeaderField {
  key: string;
  value: string;
}

export default function BasicTextEditor() {
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedDocumentEdition, setSelectedDocumentEdition] = useState<DocumentEdition | null>(null);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [headerFields, setHeaderFields] = useState<HeaderField[]>([]);
  const [activePlugins, setActivePlugins] = useState<Plugin[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastCursorInfo, setLastCursorInfo] = useState<{
    elementId: string;
    position: number;
    sectionIndex?: number;
  } | null>(null);

  const queryClient = useQueryClient();

  // Buscar templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates/struct"],
  });

  // Buscar edições de documentos
  const { data: documentEditions = [] } = useQuery({
    queryKey: ["/api/document-editions-with-objects"],
  });

  // Buscar plugins
  const { data: plugins = [] } = useQuery({
    queryKey: ["/api/plugins"],
  });

  // Filtrar plugins ativos
  useEffect(() => {
    if (plugins && Array.isArray(plugins)) {
      const active = plugins.filter((plugin: Plugin) => plugin.status === "active");
      setActivePlugins(active);
    }
  }, [plugins]);

  // Monitorar mudanças não salvas
  useEffect(() => {
    console.log("hasUnsavedChanges changed to:", hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  // Função para salvar documento
  const saveDocument = async () => {
    try {
      const documentData = {
        name: selectedDocumentEdition?.name || `Documento ${new Date().toLocaleString()}`,
        content: content,
        templateId: selectedTemplate?.id,
        headerFields: headerFields,
        sections: templateSections.map(section => ({
          name: section.name,
          content: section.content,
          fields: section.fields || [],
          tables: section.tables || []
        }))
      };

      let response;
      if (selectedDocumentEdition) {
        response = await apiRequest("PUT", `/api/document-editions/${selectedDocumentEdition.id}`, documentData);
      } else {
        response = await apiRequest("POST", "/api/document-editions", documentData);
      }

      if (response.ok) {
        setHasUnsavedChanges(false);
        queryClient.invalidateQueries({ queryKey: ["/api/document-editions-with-objects"] });
        console.log("Documento salvo com sucesso");
      }
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
    }
  };

  // Função para aplicar formatação
  const insertFormatting = (format: string, content: string = '') => {
    // Tentar encontrar o textarea que está em foco primeiro
    let targetTextarea: HTMLTextAreaElement | HTMLInputElement | null = null;
    const activeElement = document.activeElement as HTMLElement;

    // Verificar se o elemento ativo é um textarea ou input
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      targetTextarea = activeElement as HTMLTextAreaElement | HTMLInputElement;
    } else {
      // Se não há foco em um campo, tentar ativar qualquer campo de texto visível
      const allTextareas = Array.from(document.querySelectorAll('textarea, input[type="text"]')) as (HTMLTextAreaElement | HTMLInputElement)[];
      
      // Procurar por campos visíveis e funcionais
      for (let i = 0; i < allTextareas.length; i++) {
        const textarea = allTextareas[i];
        const rect = textarea.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                          !textarea.hidden && 
                          textarea.style.display !== 'none';
        
        if (isVisible) {
          targetTextarea = textarea;
          targetTextarea.focus(); // Focar no campo encontrado
          break;
        }
      }

      // Se ainda não encontrou, tentar encontrar divs clicáveis que podem ativar campos de texto
      if (!targetTextarea) {
        const clickableDivs = document.querySelectorAll('div[class*="cursor-text"]');
        if (clickableDivs.length > 0) {
          (clickableDivs[0] as HTMLElement).click();
          
          // Aguardar o campo aparecer
          setTimeout(() => {
            const newTextareas = Array.from(document.querySelectorAll('textarea:not([hidden])')) as HTMLTextAreaElement[];
            if (newTextareas.length > 0) {
              targetTextarea = newTextareas[0];
              applyFormattingToTextarea(targetTextarea, format, content);
            }
          }, 200);
          return;
        }
      }

      // Fallback para o editor principal se existir
      if (!targetTextarea) {
        const mainTextarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
        if (mainTextarea) {
          targetTextarea = mainTextarea;
          targetTextarea.focus();
        }
      }
    }

    if (!targetTextarea) {
      console.log('Para usar as ferramentas de formatação: 1) Selecione um template, 2) Expanda uma seção, 3) Clique em um campo de texto');
      return;
    }

    applyFormattingToTextarea(targetTextarea, format, content);
  };

  const applyFormattingToTextarea = (targetTextarea: HTMLTextAreaElement | HTMLInputElement, format: string, content: string = '') => {
    // Focar no textarea se não estiver focado
    if (document.activeElement !== targetTextarea) {
      targetTextarea.focus();
    }

    const start = targetTextarea.selectionStart || 0;
    const end = targetTextarea.selectionEnd || 0;
    const selectedText = targetTextarea.value.substring(start, end);
    const beforeText = targetTextarea.value.substring(0, start);
    const afterText = targetTextarea.value.substring(end);

    let newText = '';
    let cursorPosition = start;

    switch (format) {
      case 'h1':
        newText = `${beforeText}# ${selectedText || content || 'Título 1'}\n${afterText}`;
        cursorPosition = start + 2 + (selectedText || content || 'Título 1').length;
        break;
      case 'h2':
        newText = `${beforeText}## ${selectedText || content || 'Título 2'}\n${afterText}`;
        cursorPosition = start + 3 + (selectedText || content || 'Título 2').length;
        break;
      case 'h3':
        newText = `${beforeText}### ${selectedText || content || 'Título 3'}\n${afterText}`;
        cursorPosition = start + 4 + (selectedText || content || 'Título 3').length;
        break;
      case 'bold':
        if (selectedText) {
          newText = `${beforeText}**${selectedText}**${afterText}`;
          cursorPosition = end + 4;
        } else {
          newText = `${beforeText}**texto em negrito**${afterText}`;
          cursorPosition = start + 2;
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = `${beforeText}_${selectedText}_${afterText}`;
          cursorPosition = end + 2;
        } else {
          newText = `${beforeText}_texto em itálico_${afterText}`;
          cursorPosition = start + 1;
        }
        break;
      case 'underline':
        if (selectedText) {
          newText = `${beforeText}<u>${selectedText}</u>${afterText}`;
          cursorPosition = end + 7;
        } else {
          newText = `${beforeText}<u>texto sublinhado</u>${afterText}`;
          cursorPosition = start + 3;
        }
        break;
      case 'strikethrough':
        if (selectedText) {
          newText = `${beforeText}~~${selectedText}~~${afterText}`;
          cursorPosition = end + 4;
        } else {
          newText = `${beforeText}~~texto riscado~~${afterText}`;
          cursorPosition = start + 2;
        }
        break;
      case 'code':
        if (selectedText) {
          newText = `${beforeText}\`${selectedText}\`${afterText}`;
          cursorPosition = end + 2;
        } else {
          newText = `${beforeText}\`código\`${afterText}`;
          cursorPosition = start + 1;
        }
        break;
      case 'codeblock':
        const codeContent = selectedText || content || 'código aqui';
        newText = `${beforeText}\n\`\`\`\n${codeContent}\n\`\`\`\n${afterText}`;
        cursorPosition = start + 5 + codeContent.length;
        break;
      case 'quote':
        const textToQuote = selectedText || content || 'citação';
        const quotedText = textToQuote.split('\n').map(line => `> ${line}`).join('\n');
        newText = `${beforeText}${quotedText}\n${afterText}`;
        cursorPosition = start + quotedText.length + 1;
        break;
      case 'comment':
        const commentText = selectedText || content || 'comentário';
        newText = `${beforeText}<!-- ${commentText} -->${afterText}`;
        cursorPosition = selectedText ? end + 9 : start + 5;
        break;
      case 'ul':
        const listContent = selectedText || content || 'Item da lista';
        const ulText = listContent.split('\n').map(line => `- ${line.trim()}`).join('\n');
        newText = `${beforeText}${ulText}\n${afterText}`;
        cursorPosition = start + ulText.length + 1;
        break;
      case 'ol':
        const numberedContent = selectedText || content || 'Item da lista';
        const olText = numberedContent.split('\n').map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
        newText = `${beforeText}${olText}\n${afterText}`;
        cursorPosition = start + olText.length + 1;
        break;
      case 'table':
        const tableText = `\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| Linha 1  | Dado 1   | Dado 2   |\n| Linha 2  | Dado 3   | Dado 4   |\n`;
        newText = `${beforeText}${tableText}${afterText}`;
        cursorPosition = start + tableText.length;
        break;
      case 'link':
        const linkText = selectedText || 'texto do link';
        const url = content || 'https://exemplo.com';
        newText = `${beforeText}[${linkText}](${url})${afterText}`;
        cursorPosition = start + linkText.length + url.length + 4;
        break;
      default:
        return;
    }

    targetTextarea.value = newText;
    targetTextarea.focus();
    
    // Definir posição do cursor
    if (targetTextarea.setSelectionRange) {
      targetTextarea.setSelectionRange(cursorPosition, cursorPosition);
    }

    // Disparar evento de mudança para atualizar o estado
    const inputEvent = new Event('input', { bubbles: true });
    targetTextarea.dispatchEvent(inputEvent);

    // Para campos específicos de seções, pode ser necessário disparar onChange também
    const changeEvent = new Event('change', { bubbles: true });
    targetTextarea.dispatchEvent(changeEvent);
    
    console.log(`✅ Formatação ${format} aplicada com sucesso`);
  };

  // Função para processar estrutura do template
  const parseTemplateStructure = (structure: string): TemplateSection[] => {
    const sections: TemplateSection[] = [];
    const lines = structure.split('\n');
    let currentSection: TemplateSection | null = null;
    let processingTable = false;
    let tableKey = '';
    let tableColumns: string[] = [];
    let tableLines: Array<Record<string, any>> = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('## ')) {
        // Nova seção
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          name: trimmedLine.replace('## ', ''),
          content: '',
          isOpen: false,
          fields: [],
          tables: []
        };
        processingTable = false;
      } else if (trimmedLine.startsWith('- **') && trimmedLine.includes('**:')) {
        // Campo de formulário
        const fieldMatch = trimmedLine.match(/- \*\*(.*?)\*\*:/);
        if (fieldMatch && currentSection) {
          const fieldKey = fieldMatch[1].toLowerCase().replace(/\s+/g, '_');
          currentSection.fields = currentSection.fields || [];
          currentSection.fields.push({ key: fieldKey, value: '' });
        }
      } else if (trimmedLine.startsWith('| ') && trimmedLine.endsWith(' |')) {
        // Linha de tabela
        if (!processingTable) {
          // Primeira linha da tabela (cabeçalhos)
          tableKey = `table_${Date.now()}`;
          tableColumns = trimmedLine.split('|').map(col => col.trim()).filter(col => col);
          tableLines = [];
          processingTable = true;
        } else if (!trimmedLine.includes('---')) {
          // Linha de dados da tabela
          const values = trimmedLine.split('|').map(col => col.trim()).filter(col => col);
          const lineObj: Record<string, any> = {};
          tableColumns.forEach((col, index) => {
            lineObj[col] = values[index] || '';
          });
          tableLines.push(lineObj);
        }
      } else if (processingTable && trimmedLine === '') {
        // Fim da tabela
        if (currentSection && tableColumns.length > 0) {
          currentSection.tables = currentSection.tables || [];
          currentSection.tables.push({
            key: tableKey,
            columns: tableColumns,
            lines: tableLines.length > 0 ? tableLines : [
              tableColumns.reduce((obj: Record<string, any>, col) => ({ ...obj, [col]: '' }), {} as Record<string, any>)
            ]
          });
        }
        processingTable = false;
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    console.log('🔍 Seções processadas:', sections);
    return sections;
  };

  // Função para carregar template
  const loadTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setSelectedDocumentEdition(null);
    
    if (template.structure) {
      const sections = parseTemplateStructure(template.structure);
      setTemplateSections(sections);
      setHeaderFields([]);
      setContent(template.content || '');
    } else {
      setTemplateSections([]);
      setHeaderFields([]);
      setContent(template.content || '');
    }
    
    setHasUnsavedChanges(false);
  };

  // Função para carregar edição de documento
  const loadDocumentEdition = (edition: DocumentEdition) => {
    setSelectedDocumentEdition(edition);
    setContent(edition.content || '');
    
    // Se a edição tem um template associado, carregar sua estrutura
    if (edition.templateId && Array.isArray(templates)) {
      const template = templates.find((t: Template) => t.id === edition.templateId);
      if (template) {
        setSelectedTemplate(template);
        if (template.structure) {
          const sections = parseTemplateStructure(template.structure);
          setTemplateSections(sections);
        }
      }
    } else {
      setSelectedTemplate(null);
      setTemplateSections([]);
    }
    
    setHeaderFields([]);
    setHasUnsavedChanges(false);
  };

  // Funções para manipular seções
  const toggleSection = (index: number) => {
    setTemplateSections(prev => prev.map((section, i) => 
      i === index ? { ...section, isOpen: !section.isOpen } : section
    ));
  };

  const updateSectionContent = (index: number, newContent: string) => {
    setTemplateSections(prev => prev.map((section, i) => 
      i === index ? { ...section, content: newContent } : section
    ));
    setHasUnsavedChanges(true);
  };

  const updateSectionField = (sectionIndex: number, fieldKey: string, value: string) => {
    setTemplateSections(prev => prev.map((section, i) => {
      if (i === sectionIndex && section.fields) {
        return {
          ...section,
          fields: section.fields.map(field => 
            field.key === fieldKey ? { ...field, value } : field
          )
        };
      }
      return section;
    }));
    setHasUnsavedChanges(true);
  };

  const updateTableCell = (sectionIndex: number, tableIndex: number, lineIndex: number, column: string, value: any) => {
    setTemplateSections(prev => prev.map((section, i) => {
      if (i === sectionIndex && section.tables) {
        return {
          ...section,
          tables: section.tables.map((table, tIdx) => {
            if (tIdx === tableIndex) {
              return {
                ...table,
                lines: table.lines.map((line, lIdx) => 
                  lIdx === lineIndex ? { ...line, [column]: value } : line
                )
              };
            }
            return table;
          })
        };
      }
      return section;
    }));
    setHasUnsavedChanges(true);
  };

  const addTableRow = (sectionIndex: number, tableIndex: number) => {
    setTemplateSections(prev => prev.map((section, i) => {
      if (i === sectionIndex && section.tables) {
        return {
          ...section,
          tables: section.tables.map((table, tIdx) => {
            if (tIdx === tableIndex) {
              const newRow = table.columns.reduce((obj, column) => ({ ...obj, [column]: '' }), {});
              return {
                ...table,
                lines: [...table.lines, newRow]
              };
            }
            return table;
          })
        };
      }
      return section;
    }));
  };

  const removeTableRow = (sectionIndex: number, tableIndex: number, lineIndex: number) => {
    setTemplateSections(prev => prev.map((section, i) => {
      if (i === sectionIndex && section.tables) {
        return {
          ...section,
          tables: section.tables.map((table, tIdx) => {
            if (tIdx === tableIndex) {
              return {
                ...table,
                lines: table.lines.filter((_, lIdx) => lIdx !== lineIndex)
              };
            }
            return table;
          })
        };
      }
      return section;
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header com controles */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          {/* Seleção de template */}
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-gray-500" />
            <Select value={selectedTemplate?.id || ""} onValueChange={(value) => {
              if (Array.isArray(templates)) {
                const template = templates.find((t: Template) => t.id === value);
                if (template) loadTemplate(template);
              }
            }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar template" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(templates) && templates.map((template: Template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de edição de documento */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <Select value={selectedDocumentEdition?.id || ""} onValueChange={(value) => {
              if (Array.isArray(documentEditions)) {
                const edition = documentEditions.find((e: DocumentEdition) => e.id === value);
                if (edition) loadDocumentEdition(edition);
              }
            }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Carregar documento" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(documentEditions) && documentEditions.map((edition: DocumentEdition) => (
                  <SelectItem key={edition.id} value={edition.id}>
                    {edition.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Barra de ferramentas de formatação */}
        <div className="flex items-center gap-4">
          {/* Barra de ferramentas de formatação */}
          <div className="flex items-center gap-1">
            {/* Títulos */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('h1')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Título 1"
            >
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('h2')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Título 2"
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('h3')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Título 3"
            >
              <Heading3 className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Formatação de texto */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('bold')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Negrito"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('italic')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Itálico"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('underline')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Sublinhado"
            >
              <Underline className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('strikethrough')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Riscado"
            >
              <Strikethrough className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Código */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('code')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Código Inline"
            >
              <Code className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('codeblock')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Bloco de Código"
            >
              <FileCode2 className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Outros elementos */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('quote')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Citação"
            >
              <Quote className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('comment')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Comentário"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Listas */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('ul')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Lista com Marcadores"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('ol')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Lista Numerada"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Tabela e Link */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('table')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Inserir Tabela"
            >
              <Table className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('link')}
              className="h-8 px-2 text-xs hover:bg-gray-100"
              title="Inserir Link"
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Salvar */}
          <Button onClick={saveDocument} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Área de conteúdo */}
      <div className="flex-1 overflow-auto">
        {templateSections.length > 0 ? (
          /* Renderizar seções do template */
          <div className="p-6 space-y-6">
            {templateSections.map((section, index) => (
              <Collapsible
                key={`section-${index}`}
                open={section.isOpen}
                onOpenChange={() => toggleSection(index)}
                className="border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800">{section.name}</h3>
                  {section.isOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Campos estruturados */}
                    {section.fields && section.fields.length > 0 && (
                      <div className="grid gap-4">
                        {section.fields.map((field, fieldIndex) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                              {field.key.replace(/_/g, ' ')}
                            </label>
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateSectionField(index, field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Digite ${field.key.replace(/_/g, ' ')}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tabelas */}
                    {section.tables && section.tables.map((table, tableIndex) => (
                      <div key={table.key} className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                          <h4 className="text-sm font-medium text-gray-700">Tabela</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addTableRow(index, tableIndex)}
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Linha
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                {table.columns.map((column) => (
                                  <th key={column} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                                    {column}
                                  </th>
                                ))}
                                <th className="px-3 py-2 w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {table.lines.map((line, rowIndex) => (
                                <tr key={rowIndex}>
                                  {table.columns.map((column) => (
                                    <td key={column} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                                      <input
                                        type="text"
                                        value={line[column] || ''}
                                        onChange={(e) => updateTableCell(index, tableIndex, rowIndex, column, e.target.value)}
                                        className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                                        placeholder={column}
                                      />
                                    </td>
                                  ))}
                                  <td className="px-3 py-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTableRow(index, tableIndex, rowIndex)}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      disabled={table.lines.length <= 1}
                                    >
                                      <Trash className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    
                    {/* Editor de texto livre da seção */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Conteúdo Adicional</h4>
                      <SimpleRichTextDisplay
                        content={section.content}
                        onContentChange={(newContent) => updateSectionContent(index, newContent)}
                        onCursorCapture={(position) => {
                          setLastCursorInfo({
                            elementId: `section-${index}`,
                            position: position,
                            sectionIndex: index
                          });
                        }}
                        placeholder={`Escreva conteúdo adicional para ${section.name}...`}
                        className="w-full h-32 min-h-[8rem] resize-y border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          /* Editor livre quando não há template */
          <div className="p-6">
            <SimpleRichTextDisplay
              content={content}
              onContentChange={(newContent) => {
                setContent(newContent);
                setHasUnsavedChanges(true);
              }}
              onCursorCapture={(position) => {
                setLastCursorInfo({
                  elementId: 'main-editor',
                  position: position
                });
              }}
              placeholder="Comece a escrever seu documento..."
              className="w-full min-h-[500px] p-4 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
            />
          </div>
        )}
      </div>
    </div>
  );
}