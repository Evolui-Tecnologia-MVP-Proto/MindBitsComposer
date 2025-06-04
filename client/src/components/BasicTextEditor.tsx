import React, { useState } from "react";
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
  FileText
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PluginModal from "@/components/plugin-modal";
import SimpleRichTextDisplay from "@/components/SimpleRichTextDisplay";
import { Plugin, PluginType, PluginStatus, Template } from "@shared/schema";

interface TemplateSection {
  name: string;
  content: string;
  isOpen: boolean;
  fields?: Array<{ key: string; value: string }>;
}

interface HeaderField {
  key: string;
  value: string;
}

export default function BasicTextEditor() {
  const [content, setContent] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedDocumentEdition, setSelectedDocumentEdition] = useState<string>("");
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [headerFields, setHeaderFields] = useState<HeaderField[]>([]);
  const [isMarkdownView, setIsMarkdownView] = useState<boolean>(false);
  const [lastCursorInfo, setLastCursorInfo] = useState<{
    elementId: string;
    position: number;
    sectionIndex?: number;
  } | null>(null);

  // Capturar cursor globalmente
  React.useEffect(() => {
    const handleGlobalClick = () => {
      const activeElement = document.activeElement as HTMLTextAreaElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        const textareas = document.querySelectorAll('textarea');
        const textareaIndex = Array.from(textareas).indexOf(activeElement);
        
        setTimeout(() => {
          setLastCursorInfo({
            elementId: activeElement.id || 'editor-textarea',
            position: activeElement.selectionStart,
            sectionIndex: textareaIndex >= 0 ? textareaIndex : undefined
          });
        }, 10);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Buscar plugins disponíveis
  const { data: plugins } = useQuery<Plugin[]>({
    queryKey: ["/api/plugins"],
  });

  // Filtrar apenas plugins ativos
  const activePlugins = plugins?.filter(plugin => plugin.status === PluginStatus.ACTIVE) || [];

  // Buscar templates estruturais
  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates/struct"],
  });

  // Buscar document editions com objetos dos documentos
  const { data: documentEditions } = useQuery<Array<{ id: string; documentId: string; documentObject?: string; status: string; init: string | null; templateCode?: string }>>({
    queryKey: ["/api/document-editions-with-objects"],
  });

  // Função genérica para abrir qualquer plugin
  const openPlugin = (plugin: Plugin) => {
    // Capturar posição do cursor antes de abrir o modal
    const activeElement = document.activeElement as HTMLTextAreaElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') {
      const textareas = document.querySelectorAll('textarea');
      const textareaIndex = Array.from(textareas).indexOf(activeElement);
      
      setLastCursorInfo({
        elementId: activeElement.id || 'editor-textarea',
        position: activeElement.selectionStart,
        sectionIndex: textareaIndex >= 0 ? textareaIndex : undefined
      });
    }
    
    setSelectedPlugin(plugin);
    setIsPluginModalOpen(true);
  };

  const openFreeHandCanvas = () => {
    // Procurar pelo plugin FreeHand Canvas nos plugins disponíveis
    const freeHandPlugin = activePlugins.find(p => 
      p.pageName === "freehand-canvas-plugin" || 
      p.name.toLowerCase().includes("freehand") ||
      p.name.toLowerCase().includes("canvas")
    );
    
    if (freeHandPlugin) {
      console.log("Plugin encontrado:", freeHandPlugin.name);
      setSelectedPlugin(freeHandPlugin);
      setIsPluginModalOpen(true);
    } else {
      console.log("Plugin FreeHand Canvas não encontrado. Criando plugin temporário...");
      // Criar plugin temporário para funcionar
      const tempPlugin: Plugin = {
        id: "temp-freehand-canvas",
        name: "FreeHand Canvas",
        description: "Canvas de desenho livre para criar diagramas e ilustrações",
        type: PluginType.UTILITY,
        status: PluginStatus.ACTIVE,
        version: "1.0.0",
        author: "Sistema",
        icon: "palette",
        pageName: "freehand-canvas-plugin",
        configuration: {},
        endpoints: [],
        permissions: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setSelectedPlugin(tempPlugin);
      setIsPluginModalOpen(true);
    }
  };

  const handlePluginClose = () => {
    setIsPluginModalOpen(false);
    setSelectedPlugin(null);
  };

  const insertFreeHandLink = (imageUrl: string) => {
    console.log('Inserindo link FreeHand:', imageUrl);
    console.log('Info do cursor capturado:', lastCursorInfo);
    const linkText = `[Imagem FreeHand](${imageUrl})`;
    
    if (lastCursorInfo && templateSections.length > 0 && lastCursorInfo.sectionIndex !== undefined) {
      // Inserir na seção específica onde estava o cursor
      console.log('Inserindo na seção:', lastCursorInfo.sectionIndex);
      console.log('Seções disponíveis:', templateSections.length);
      console.log('Seção target:', templateSections[lastCursorInfo.sectionIndex]);
      
      const targetSection = templateSections[lastCursorInfo.sectionIndex];
      if (targetSection) {
        const currentContent = targetSection.content;
        const position = lastCursorInfo.position;
        
        console.log('Conteúdo atual:', currentContent);
        console.log('Posição:', position);
        
        const newContent = currentContent.slice(0, position) + 
                          linkText + 
                          currentContent.slice(position);
        
        console.log('Novo conteúdo:', newContent);
        updateSectionContent(lastCursorInfo.sectionIndex, newContent);
        console.log('updateSectionContent chamado');
      } else {
        console.log('Seção target não encontrada!');
      }
    } else if (lastCursorInfo && templateSections.length === 0) {
      // Editor simples - inserir na posição do cursor
      console.log('Inserindo no editor simples na posição:', lastCursorInfo.position);
      const position = lastCursorInfo.position;
      const newContent = content.slice(0, position) + 
                        linkText + 
                        content.slice(position);
      setContent(newContent);
    } else {
      // Fallback - adicionar ao final
      console.log('Fallback - inserindo ao final');
      if (templateSections.length > 0) {
        const firstSection = templateSections[0];
        const newContent = firstSection.content + '\n\n' + linkText;
        updateSectionContent(0, newContent);
      } else {
        const newContent = content + '\n\n' + linkText;
        setContent(newContent);
      }
    }
    
    // Limpar info do cursor após uso
    setLastCursorInfo(null);
  };

  // Função para ser chamada pelo plugin quando uma imagem for exportada
  const handleImageExport = (imageUrl: string) => {
    console.log('BasicTextEditor handleImageExport chamado com URL:', imageUrl);
    insertFreeHandLink(imageUrl);
    handlePluginClose();
  };

  const handleDocumentEditionSelect = async (editionId: string) => {
    setSelectedDocumentEdition(editionId);
    
    const edition = documentEditions?.find(e => e.id === editionId);
    if (edition) {
      console.log("Document Edition selecionada:", edition);
      
      // Buscar detalhes completos da edição para obter o templateId
      try {
        const response = await fetch(`/api/document-editions/${editionId}`);
        if (response.ok) {
          const editionDetails = await response.json();
          console.log("Detalhes da edição:", editionDetails);
          
          if (editionDetails.templateId) {
            // Selecionar automaticamente o template associado
            setSelectedTemplate(editionDetails.templateId);
            
            // Carregar o template
            const template = templates?.find(t => t.id === editionDetails.templateId);
            if (template) {
              console.log("Template automaticamente selecionado:", template);
              handleTemplateSelect(editionDetails.templateId);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes da edição:", error);
      }
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      // Processar estrutura do template
      if (template.structure && typeof template.structure === 'object') {
        const structure = template.structure as any;
        
        // Processar campos do header se existirem
        if (structure.header && typeof structure.header === 'object') {
          const newHeaderFields: HeaderField[] = Object.keys(structure.header).map(key => ({
            key: key,
            value: structure.header[key] || ''
          }));
          setHeaderFields(newHeaderFields);
        } else {
          setHeaderFields([]);
        }
        
        // Processar seções
        if (structure.sections) {
          let newSections: TemplateSection[] = [];
          
          if (Array.isArray(structure.sections) && structure.sections.length > 0) {
            // Estrutura antiga: sections como array de strings
            newSections = structure.sections.map((sectionName: string) => ({
              name: sectionName,
              content: '',
              isOpen: false // Começar todas recolhidas
            }));
          } else if (typeof structure.sections === 'object' && structure.sections !== null) {
            // Estrutura nova: sections como objeto
            newSections = Object.keys(structure.sections).map((sectionName: string) => {
              const sectionData = structure.sections[sectionName];
              let sectionFields: Array<{ key: string; value: string }> = [];
              
              // Se a seção contém campos (objeto), extrair os campos
              if (typeof sectionData === 'object' && sectionData !== null && !Array.isArray(sectionData)) {
                sectionFields = Object.keys(sectionData).map(fieldKey => ({
                  key: fieldKey,
                  value: sectionData[fieldKey] || ''
                }));
              }
              
              return {
                name: sectionName,
                content: '',
                isOpen: false, // Começar todas recolhidas
                fields: sectionFields.length > 0 ? sectionFields : undefined
              };
            });
          }
          
          if (newSections.length > 0) {
            setTemplateSections(newSections);
            setContent(''); // Limpar o editor principal
            return;
          }
        }
      }
      
      // Verificar estrutura em string (compatibilidade)
      if (template.structure && typeof template.structure === 'string' && template.structure.trim() !== '') {
        try {
          const sections = JSON.parse(template.structure);
          if (Array.isArray(sections) && sections.length > 0) {
            // Criar seções colapsíveis baseadas no template
            const newSections: TemplateSection[] = sections.map((sectionName: string) => ({
              name: sectionName,
              content: '',
              isOpen: false // Começar todas recolhidas
            }));
            
            setTemplateSections(newSections);
            setHeaderFields([]);
            setContent(''); // Limpar o editor principal
            return;
          }
        } catch (error) {
          console.error('Erro ao processar estrutura do template:', error);
        }
      }
      
      // Se não há estrutura válida, criar seções padrão
      const defaultSections: TemplateSection[] = [
        { name: "Introdução", content: '', isOpen: false },
        { name: "Desenvolvimento", content: '', isOpen: false },
        { name: "Conclusão", content: '', isOpen: false }
      ];
      
      setTemplateSections(defaultSections);
      setHeaderFields([]);
      setContent('');
    }
  };

  const updateHeaderField = (index: number, value: string) => {
    const updatedFields = [...headerFields];
    updatedFields[index].value = value;
    setHeaderFields(updatedFields);
  };

  const updateSectionContent = (index: number, newContent: string) => {
    setTemplateSections(prev => 
      prev.map((section, i) => 
        i === index ? { ...section, content: newContent } : section
      )
    );
  };

  const updateSectionField = (sectionIndex: number, fieldIndex: number, value: string) => {
    setTemplateSections(prev => 
      prev.map((section, i) => {
        if (i === sectionIndex && section.fields) {
          const updatedFields = [...section.fields];
          updatedFields[fieldIndex].value = value;
          return { ...section, fields: updatedFields };
        }
        return section;
      })
    );
  };

  // Função para gerar markdown do documento
  const generateMarkdown = () => {
    let markdown = '';

    // Adicionar campos do header como tabela (sem título do template)
    if (headerFields.length > 0) {
      markdown += `| Campo | Valor |\n`;
      markdown += `|-------|-------|\n`;
      headerFields.forEach(field => {
        markdown += `| ${field.key} | ${field.value || ''} |\n`;
      });
      markdown += `\n`;
    }

    // Adicionar seções
    templateSections.forEach(section => {
      markdown += `## ${section.name}\n\n`;
      markdown += `${section.content}\n\n`;
    });

    return markdown;
  };

  const toggleSection = (index: number) => {
    setTemplateSections(prev => 
      prev.map((section, i) => 
        i === index ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-gray-50 shrink-0">
        {/* Lado esquerdo - Ferramentas de formatação */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const selected = text.substring(start, end);
                const after = text.substring(end);
                
                if (selected) {
                  setContent(before + "**" + selected + "**" + after);
                }
              }
            }}
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const selected = text.substring(start, end);
                const after = text.substring(end);
                
                if (selected) {
                  setContent(before + "*" + selected + "*" + after);
                }
              }
            }}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Botões dinâmicos para plugins ativos */}
          {activePlugins.map((plugin) => {
            // Função para renderizar o ícone correto do plugin
            const renderPluginIcon = () => {
              if (plugin.icon && plugin.icon.startsWith('http')) {
                // Ícone personalizado (URL de imagem)
                return (
                  <img 
                    src={plugin.icon} 
                    alt={plugin.name}
                    className="h-4 w-4 object-contain"
                  />
                );
              } else {
                // Mapeamento direto dos ícones do Lucide React
                const iconName = plugin.icon || 'Puzzle';
                const iconMap: Record<string, any> = {
                  'Puzzle': Puzzle,
                  'Database': Database,
                  'Bot': Bot,
                  'Brain': Brain,
                  'BarChart3': BarChart3,
                  'FileText': FileText,
                  'Zap': Zap,
                  'Settings': Settings,
                  'Image': Image,
                  'Brush': Brush,
                  'PenTool': PenTool,
                  'Palette': Palette,
                  'Layers': Layers,
                  'Globe': Globe,
                  'Calculator': Calculator,
                  'Clock': Clock,
                  'Users': Users,
                  'Mail': Mail,
                  'Phone': Phone,
                  'Search': Search,
                  'Filter': Filter,
                  'Download': Download,
                  'Upload': Upload,
                  'Link': Link,
                  'Share': Share,
                  'Copy': Copy,
                  'Edit': Edit,
                  'Trash': Trash,
                  'Plus': Plus,
                  'Minus': Minus,
                  'Check': Check,
                  'X': X,
                  'ArrowRight': ArrowRight,
                  'ArrowLeft': ArrowLeft,
                  'ArrowUp': ArrowUp,
                  'ArrowDown': ArrowDown
                };
                
                const IconComponent = iconMap[iconName] || Puzzle;
                return <IconComponent className="h-4 w-4" />;
              }
            };

            return (
              <Button
                key={plugin.id}
                variant="ghost"
                size="sm"
                onClick={() => openPlugin(plugin)}
                className="flex items-center gap-1"
                title={`Abrir ${plugin.name}`}
              >
                {renderPluginIcon()}
                <span className="text-xs">{plugin.name}</span>
              </Button>
            );
          })}

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        {/* Lado direito - Controles */}
        <div className="flex items-center gap-2">
          {/* Botão de alternância de visualização */}
          <Button
            variant={isMarkdownView ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMarkdownView(!isMarkdownView)}
            className="flex items-center gap-1"
            title={isMarkdownView ? "Visualização Lexical" : "Visualização Markdown"}
          >
            {isMarkdownView ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
            {isMarkdownView ? "Lexical" : "Markdown"}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Database className="h-4 w-4 text-gray-500" />
          <Select value={selectedDocumentEdition} onValueChange={handleDocumentEditionSelect}>
            <SelectTrigger className="w-[200px] font-mono">
              <SelectValue placeholder="Selecionar documento...">
                {selectedDocumentEdition && (() => {
                  const selectedEdition = documentEditions?.find(edition => edition.id === selectedDocumentEdition);
                  if (selectedEdition) {
                    return `${selectedEdition.templateCode ? `[${selectedEdition.templateCode}] - ` : ''}${selectedEdition.documentObject || 'Documento sem título'}`;
                  }
                  return "Selecionar documento...";
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="font-mono">
              {documentEditions?.map((edition) => (
                <SelectItem key={edition.id} value={edition.id} className="font-mono">
                  {edition.templateCode ? `[${edition.templateCode}] - ` : ''}{edition.documentObject || 'Documento sem título'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          <LayoutTemplate className="h-4 w-4 text-gray-500" />
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-[200px] font-mono">
              <SelectValue placeholder="Selecionar template..." />
            </SelectTrigger>
            <SelectContent className="font-mono">
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id} className="font-mono">
                  {template.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4 max-h-full overflow-y-auto">
        {isMarkdownView ? (
          /* Visualização Markdown */
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 leading-relaxed">
              {generateMarkdown()}
            </pre>
          </div>
        ) : templateSections.length > 0 ? (
          /* Layout com seções do template */
          <div className="space-y-4">

            {/* Tabela de campos do header */}
            {headerFields.length > 0 && (
              <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 font-mono">Campos do Documento</h3>
                </div>
                <div className="bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 font-mono w-1/3">Campo</th>
                        <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 font-mono">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headerFields.map((field, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 font-mono bg-gray-25">
                            {field.key}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateHeaderField(index, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              placeholder={`Digite ${field.key}...`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {templateSections.map((section, index) => (
              <Collapsible
                key={index}
                open={section.isOpen}
                onOpenChange={() => toggleSection(index)}
                className="border border-gray-200 rounded-lg"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 transition-colors">
                  <h3 className="text-base font-bold text-gray-900 font-mono">
                    {section.name}
                  </h3>
                  {section.isOpen ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t border-gray-200">
                  {/* Se a seção tem campos específicos, renderizar como tabela */}
                  {section.fields && section.fields.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Campos da Seção</h4>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                                Campo
                              </th>
                              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.fields.map((field, fieldIndex) => (
                              <tr key={fieldIndex} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                                  {field.key}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => updateSectionField(index, fieldIndex, e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                    placeholder={`Digite ${field.key}...`}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                  ) : (
                    /* Se não há campos específicos, usar apenas editor de texto */
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
                      placeholder={`Escreva o conteúdo para ${section.name}...`}
                      className="w-full h-32 min-h-[8rem] resize-y border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                    />
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : content.trim() === '' ? (
          /* Estado vazio - mostra ícone centralizado */
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
            <FileCode2 className="w-24 h-24 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              Selecione um documento ou template para começar a editar...
            </p>
          </div>
        ) : (
          /* Editor simples quando não há template selecionado mas há conteúdo */
          <textarea
            id="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comece a escrever seu documento ou selecione um template..."
            className="w-full min-h-[300px] resize-none border-none outline-none text-gray-900 placeholder-gray-400 text-left"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          />
        )}
      </div>

      <PluginModal
        plugin={selectedPlugin}
        isOpen={isPluginModalOpen}
        onClose={handlePluginClose}
        onImageExport={handleImageExport}
      />
    </div>
  );
}