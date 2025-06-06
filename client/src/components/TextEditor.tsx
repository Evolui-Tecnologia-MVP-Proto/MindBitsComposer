import { useEffect, useState, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

import { Button } from "@/components/ui/button";
import { Bold, Italic, List, FileText, Save, Undo, Redo, Link as LinkIcon, ChevronDown, LayoutTemplate, Palette, ChevronRight } from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, FORMAT_TEXT_COMMAND, LexicalEditor, $createParagraphNode, $createTextNode } from "lexical";
import { $createLinkNode } from "@lexical/link";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Template, Plugin } from "@shared/schema";
import PluginModal from "@/components/plugin-modal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [structTemplates, setStructTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageData, setSelectedImageData] = useState<any>(null);
  const { toast } = useToast();

  // Função para renderizar conteúdo com badges de TAG
  const renderContentWithTags = (content: string, sectionName: string) => {
    if (!content) {
      return <span className="text-gray-400">{`Conteúdo de ${sectionName}...`}</span>;
    }

    const tagRegex = /\[🖼️ IMAGEM: ([^-]+) - (\d+x\d+)px - Clique para visualizar\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
      // Adicionar texto antes da TAG
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>
        );
      }

      // Adicionar badge da TAG
      const filename = match[1];
      const dimensions = match[2];
      const imageUrl = `${window.location.origin}/uploads/canvas/${filename}`;
      
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
          onClick={() => {
            const globalWindow = window as any;
            globalWindow.imageData = globalWindow.imageData || {};
            globalWindow.imageData[filename] = { url: imageUrl };
            setSelectedImageData({ url: imageUrl });
            setIsImageModalOpen(true);
          }}
          title="Clique para visualizar a imagem"
        >
          🖼️ IMAGEM: {dimensions}px
          <button
            className="ml-1 text-blue-600 hover:text-red-600 font-bold"
            onClick={(e) => {
              e.stopPropagation();
              // Remover a TAG do conteúdo
              const tagToRemove = match[0];
              const textarea = document.querySelector(`[data-section="${sectionName}"]`) as HTMLTextAreaElement;
              if (textarea) {
                const newValue = textarea.value.replace(tagToRemove, '');
                textarea.value = newValue;
                const changeEvent = new Event('change', { bubbles: true });
                textarea.dispatchEvent(changeEvent);
              }
            }}
            title="Remover imagem"
          >
            ×
          </button>
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < content.length) {
      parts.push(
        <span key={lastIndex}>{content.slice(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : <span className="text-gray-400">{`Conteúdo de ${sectionName}...`}</span>;
  };
  
  // Função para lidar com cliques nas TAGs de imagem
  const handleImageTagClick = (filename: string) => {
    const globalWindow = window as any;
    if (globalWindow.imageData && globalWindow.imageData[filename]) {
      setSelectedImageData(globalWindow.imageData[filename]);
      setIsImageModalOpen(true);
    } else {
      toast({
        title: "Imagem não encontrada",
        description: "Não foi possível encontrar os dados da imagem.",
        variant: "destructive"
      });
    }
  };

  // Adicionar event listener para cliques no editor
  useEffect(() => {
    const editorElement = document.querySelector('[data-lexical-editor="true"]');
    if (editorElement) {
      const handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        const text = target.textContent || '';
        
        // Verificar se o clique foi numa TAG de imagem
        const imageTagMatch = text.match(/\[🖼️ IMAGEM: (.*?) - \d+x\d+px - Clique para visualizar\]/);
        if (imageTagMatch) {
          const filename = imageTagMatch[1];
          handleImageTagClick(filename);
        }
      };

      editorElement.addEventListener('click', handleClick);
      return () => {
        editorElement.removeEventListener('click', handleClick);
      };
    }
  }, []);

  // Buscar templates estruturais
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const response = await apiRequest("GET", "/api/templates/struct");
        if (response.ok) {
          const data = await response.json();
          setStructTemplates(data);
        } else {
          console.error("Erro ao buscar templates", response.statusText);
        }
      } catch (error) {
        console.error("Erro ao carregar templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    fetchTemplates();
  }, []);

  // Buscar plugins ativos
  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const response = await apiRequest("GET", "/api/plugins");
        if (response.ok) {
          const data = await response.json();
          console.log("Todos os plugins:", data);
          console.log("Status dos plugins:", data.map((p: any) => ({ name: p.name, status: p.status })));
          setPlugins(data.filter((plugin: Plugin) => plugin.status === "active"));
          console.log("Plugins ativos carregados:", data.filter((plugin: Plugin) => plugin.status === "active"));
        }
      } catch (error) {
        console.error("Erro ao carregar plugins:", error);
      }
    };
    
    fetchPlugins();
  }, []);
  
  const onBoldClick = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  };

  const onItalicClick = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  };

  // Undo/Redo
  const onUndoClick = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
    // UNDO não está implementado corretamente aqui
  };

  // Função para abrir plugin FreeHand Canvas
  const openFreeHandCanvas = () => {
    const freeHandPlugin = plugins.find(plugin => plugin.name === "Freehand Canvas");
    if (freeHandPlugin) {
      setSelectedPlugin(freeHandPlugin);
      setIsPluginModalOpen(true);
    }
  };

  // Verificar se o plugin FreeHand Canvas está ativo
  const freeHandCanvasPlugin = plugins.find(plugin => plugin.name === "Freehand Canvas");

  const onRedoClick = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
    // REDO não está implementado corretamente aqui
  };
  
  // Função para aplicar o template selecionado
  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) return;
    
    const selectedTemplate = structTemplates.find(t => t.id === templateId);
    if (!selectedTemplate) return;
    
    // Mostrar notificação de que o template foi aplicado
    toast({
      title: "Template aplicado",
      description: `Template "${selectedTemplate.description}" foi aplicado`
    });
    
    // Enviar evento para o EditorContext para aplicar o template
    const customEvent = new CustomEvent('applyTemplate', { 
      detail: selectedTemplate 
    });
    window.dispatchEvent(customEvent);
    
    console.log("Template selecionado:", selectedTemplate);
  };

  return (
    <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBoldClick}
          className="h-8 px-2"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onItalicClick}
          className="h-8 px-2"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 px-2"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onUndoClick}
          className="h-8 px-2"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRedoClick}
          className="h-8 px-2"
        >
          <Redo className="h-4 w-4" />
        </Button>
        
        {/* Botão do plugin FreeHand Canvas se estiver ativo */}
        {freeHandCanvasPlugin && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openFreeHandCanvas}
              className="h-8 px-2"
              title="Abrir FreeHand Canvas"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      
      {/* Combo de seleção de template */}
      <div className="flex items-center">
        <div className="flex items-center mr-2">
          <FileText className="h-4 w-4 text-gray-500 mr-1" />
          <span className="text-xs text-gray-600">Template:</span>
        </div>
        <Select onValueChange={handleTemplateSelect}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder="Selecionar template..." />
          </SelectTrigger>
          <SelectContent>
            {isLoadingTemplates ? (
              <SelectItem value="loading" disabled>Carregando templates...</SelectItem>
            ) : structTemplates.length === 0 ? (
              <SelectItem value="empty" disabled>Nenhum template disponível</SelectItem>
            ) : (
              structTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.code}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* Modal do Plugin */}
      {selectedPlugin && (
        <PluginModal
          pluginName={selectedPlugin.pageName}
          isOpen={isPluginModalOpen}
          onClose={() => {
            setIsPluginModalOpen(false);
            setSelectedPlugin(null);
          }}
          onDataExchange={(data) => {
            console.log('Dados recebidos do plugin:', data);
            
            // Verificar se é uma imagem exportada do FreeHand Canvas
            if (data && data.type === 'selection_image' && data.data?.success && data.data?.response?.url) {
              // Construir URL completa para acessar a imagem
              const imageUrl = `${window.location.origin}${data.data.response.url}`;
              console.log('URL da imagem construída:', imageUrl);
              
              // Inserir link da imagem FreeHand no editor
              const linkText = "Imagem FreeHand";
              
              // Verificar se há seções ativas (template carregado)
              setTimeout(() => {
                const activeTextarea = document.querySelector('[data-state="open"] textarea');
                
                if (activeTextarea) {
                  console.log('Textarea ativo encontrado, inserindo link da imagem');
                  
                  // Inserir link diretamente no textarea ativo
                  const textarea = activeTextarea as HTMLTextAreaElement;
                  const currentValue = textarea.value || '';
                  const linkMarkdown = `\n[${linkText}](${imageUrl})\n`;
                  const newValue = currentValue + linkMarkdown;
                  
                  console.log('Inserindo link:', linkMarkdown);
                  
                  // Atualizar o valor do textarea
                  textarea.value = newValue;
                  
                  // Disparar eventos para atualizar o estado React
                  const inputEvent = new Event('input', { bubbles: true });
                  textarea.dispatchEvent(inputEvent);
                  
                  const changeEvent = new Event('change', { bubbles: true });
                  textarea.dispatchEvent(changeEvent);
                  
                  console.log('Link da imagem inserido com sucesso!');
                } else {
                  console.log('Inserindo link no editor Lexical principal');
                  // Inserir no editor Lexical principal como link clicável
                  editor.update(() => {
                    const selection = $getSelection();
                    if (selection) {
                      // Inserir quebra de linha
                      selection.insertText('\n');
                      
                      // Criar nó de link
                      const linkNode = $createLinkNode(imageUrl);
                      linkNode.append($createTextNode(linkText));
                      
                      // Inserir o link
                      selection.insertNodes([linkNode]);
                      
                      // Inserir quebra de linha final
                      selection.insertText('\n');
                      
                      console.log('Link inserido com sucesso!');
                    }
                  });
                }
              }, 100);
              
              // Armazenar dados da imagem para uso posterior
              const globalWindow = window as any;
              globalWindow.imageData = globalWindow.imageData || {};
              globalWindow.imageData[data.data.response.filename] = {
                url: imageUrl,
                filename: data.data.response.filename,
                selection: data.data.selection,
                timestamp: data.data.response.timestamp
              };
              
              toast({
                title: "Imagem inserida",
                description: "A imagem foi inserida no editor com sucesso!",
              });
            }
          }}
        />
      )}
      
      {/* Modal de Visualização de Imagem */}
      {isImageModalOpen && selectedImageData && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <VisuallyHidden>
              <DialogTitle>Visualizar Imagem do FreeHand Canvas</DialogTitle>
            </VisuallyHidden>
            <div className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">🖼️ Imagem do FreeHand Canvas</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedImageData.filename} - {Math.round(selectedImageData.selection.width)}x{Math.round(selectedImageData.selection.height)}px
                </p>
              </div>
              <div className="flex justify-center">
                <img 
                  src={selectedImageData.url} 
                  alt="Imagem do FreeHand Canvas"
                  className="max-w-full max-h-[60vh] object-contain border rounded-lg shadow-lg"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(selectedImageData.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}



export default function TextEditor() {
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  // Escutar o evento de aplicação de template
  useEffect(() => {
    const handleApplyTemplate = (event: CustomEvent<Template>) => {
      const template = event.detail;
      
      try {
        if (template.structure && typeof template.structure === 'object') {
          const structure = template.structure as any;
          
          // Verifica se é o formato com array de seções
          if (structure.sections && Array.isArray(structure.sections)) {
            // Definir as seções do template
            setSections(structure.sections);
            
            // Inicializar conteúdos das seções vazios
            const initialContents: Record<string, string> = {};
            structure.sections.forEach((section: string) => {
              initialContents[section] = '';
            });
            setSectionContents(initialContents);
            
            // Ativar a primeira seção se houver
            if (structure.sections.length > 0) {
              setActiveSection(structure.sections[0]);
            }
            
            toast({
              title: "Seções criadas",
              description: `${structure.sections.length} seções foram criadas com base no template.`
            });
          } 
          // Verifica se é o formato com objeto de seções
          else if (structure.sections && typeof structure.sections === 'object') {
            // Extrair as chaves do objeto sections como um array
            const sectionKeys = Object.keys(structure.sections);
            setSections(sectionKeys);
            
            // Ativar a primeira seção se houver
            if (sectionKeys.length > 0) {
              setActiveSection(sectionKeys[0]);
            }
            
            toast({
              title: "Seções criadas",
              description: `${sectionKeys.length} seções foram criadas com base no template.`
            });
          } else {
            console.error("Formato de template inválido: não contém sections compatível");
            toast({
              title: "Erro ao aplicar template",
              description: "O template não possui um formato válido para seções",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error("Erro ao processar template:", error);
        toast({
          title: "Erro ao aplicar template",
          description: "Ocorreu um erro ao processar o template",
          variant: "destructive"
        });
      }
    };
    
    // Registrar o listener de evento
    window.addEventListener('applyTemplate', handleApplyTemplate as EventListener);
    
    // Limpar o listener quando o componente for desmontado
    return () => {
      window.removeEventListener('applyTemplate', handleApplyTemplate as EventListener);
    };
  }, [toast]);


  
  const initialConfig = {
    namespace: "EvoMindBitsEditor",
    theme: {
      root: "p-4 border-0 focus:outline-none h-full min-h-[400px] font-mono text-base text-gray-700",
      link: "cursor-pointer text-blue-600 underline",
      heading: {
        h1: "text-3xl font-bold",
        h2: "text-2xl font-bold",
        h3: "text-xl font-bold",
      },
      list: {
        ol: "list-decimal pl-5",
        ul: "list-disc pl-5",
      },
      quote: "border-l-4 border-gray-300 pl-4 italic",
    },
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode
    ]
  };

  return (
    <div className="flex flex-col h-full w-full border-0 rounded-none bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="border-t-0 border-l-0 border-r-0 border-b border-gray-200">
          <ToolbarPlugin />
        </div>
        <div className="flex-1 overflow-auto">
          {sections.length > 0 ? (
            <Accordion type="single" collapsible defaultValue={sections[0]} className="p-4">
              {sections.map((section, index) => (
                <AccordionItem key={section} value={section} className="border rounded-md mb-3">
                  <AccordionTrigger className="px-4 py-3 bg-gray-50 hover:bg-gray-100 font-medium">
                    {section}
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pt-2">
                    <div className="min-h-[150px]">
                      <textarea
                        className="w-full min-h-[150px] px-4 py-2 font-mono text-base text-gray-700 border-0 outline-none resize-none"
                        placeholder={`Conteúdo de ${section}...`}
                        value={sectionContents[section] || ''}
                        data-section={section}
                        onChange={(e) => {
                          setSectionContents(prev => ({
                            ...prev,
                            [section]: e.target.value
                          }));
                        }}
                        onInput={(e) => {
                          setSectionContents(prev => ({
                            ...prev,
                            [section]: (e.target as HTMLTextAreaElement).value
                          }));
                        }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="h-full min-h-[400px]">
              <RichTextPlugin
                contentEditable={<ContentEditable className="outline-none p-6 h-full min-h-[400px] font-mono" />}
                placeholder={<div className="absolute ml-6 mt-6 text-gray-400 pointer-events-none font-mono">Selecione um template estrutural ou digite seu conteúdo aqui...</div>}
                ErrorBoundary={() => <div>Erro no editor!</div>}
              />
            </div>
          )}
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />

      </LexicalComposer>
    </div>
  );
}