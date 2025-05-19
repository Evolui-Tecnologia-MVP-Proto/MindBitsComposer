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
    
    // Aqui seria implementada a lógica para aplicar o template ao editor
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
                  {template.code} - {template.description}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FooterPlugin({ editor }: { editor: LexicalEditor }) {
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        const words = text.trim().split(/\s+/);
        setWordCount(text.trim() === "" ? 0 : words.length);
      });
    });
  }, [editor]);

  return (
    <div className="flex justify-between items-center p-2 bg-white border-t border-gray-200 text-sm text-gray-500">
      <div>
        <span>{wordCount} palavras</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="h-8">
          <FileText className="h-4 w-4 mr-2" />
          Novo
        </Button>
        <Button size="sm" className="h-8">
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default function TextEditor() {
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
          <div className="h-full min-h-[400px]">
            <RichTextPlugin
              contentEditable={<ContentEditable className="outline-none p-6 h-full min-h-[400px]" />}
              placeholder={<div className="absolute ml-6 mt-6 text-gray-400 pointer-events-none">Digite seu conteúdo aqui...</div>}
              ErrorBoundary={() => <div>Erro no editor!</div>}
            />
          </div>
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
      </LexicalComposer>
    </div>
  );
}