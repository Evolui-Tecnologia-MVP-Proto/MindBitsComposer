import { useEffect, useState } from "react";
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
import { Bold, Italic, List, FileText, Save, Undo, Redo, Link as LinkIcon, ChevronDown, LayoutTemplate } from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, FORMAT_TEXT_COMMAND, LexicalEditor } from "lexical";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Template } from "@shared/schema";
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
  const { toast } = useToast();
  
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
    </div>
  );
}



export default function TextEditor() {
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
      root: "p-4 border-0 focus:outline-none h-full min-h-[400px] font-sans text-base text-gray-700",
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
                      <RichTextPlugin
                        contentEditable={<ContentEditable className="outline-none px-4 py-2 min-h-[150px]" />}
                        placeholder={<div className="absolute ml-4 mt-2 text-gray-400 pointer-events-none">Conteúdo de {section}...</div>}
                        ErrorBoundary={() => <div>Erro no editor!</div>}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="h-full min-h-[400px]">
              <RichTextPlugin
                contentEditable={<ContentEditable className="outline-none p-6 h-full min-h-[400px]" />}
                placeholder={<div className="absolute ml-6 mt-6 text-gray-400 pointer-events-none">Selecione um template estrutural ou digite seu conteúdo aqui...</div>}
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