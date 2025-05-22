import { useState, useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, List, FileText, Save, Undo, Redo, Link as LinkIcon, Palette } from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, FORMAT_TEXT_COMMAND, $createTextNode } from "lexical";
import { $createLinkNode } from "@lexical/link";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Template, Plugin } from "@shared/schema";
import PluginModal from "@/components/plugin-modal";

const theme = {
  root: "prose max-w-none focus:outline-none",
  link: "text-blue-600 hover:text-blue-800 underline cursor-pointer",
  heading: {
    h1: "text-3xl font-bold mb-4",
    h2: "text-2xl font-bold mb-3",
    h3: "text-xl font-bold mb-2",
  },
  list: {
    ol: "list-decimal list-inside",
    ul: "list-disc list-inside",
  },
  quote: "border-l-4 border-gray-300 pl-4 italic text-gray-600",
};

function onError(error: Error) {
  console.error("Lexical Error:", error);
}

const initialConfig = {
  namespace: "TextEditor",
  theme,
  onError,
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
    LinkNode,
  ],
};

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);

  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  };

  const insertFreeHandLink = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        const linkNode = $createLinkNode("http://example.com/freehand-image");
        linkNode.append($createTextNode("Imagem FreeHand"));
        selection.insertNodes([linkNode]);
      }
    });
  };

  const openFreeHandCanvas = () => {
    // Buscar o plugin FreeHand Canvas
    const freeHandPlugin: Plugin = {
      id: "freehand-canvas",
      name: "FreeHand Canvas",
      description: "Canvas de desenho livre",
      type: "UTILITY",
      status: "ACTIVE",
      version: "1.0.0",
      author: "Sistema",
      icon: "palette",
      pageName: "freehand-canvas-plugin",
      configuration: {},
      endpoints: [],
      permissions: [],
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSelectedPlugin(freeHandPlugin);
    setIsPluginModalOpen(true);
  };

  const handlePluginClose = () => {
    setIsPluginModalOpen(false);
    setSelectedPlugin(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={formatBold}
          className="flex items-center gap-1"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={formatItalic}
          className="flex items-center gap-1"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={openFreeHandCanvas}
          className="flex items-center gap-1"
          title="Abrir FreeHand Canvas"
        >
          <Palette className="h-4 w-4" />
        </Button>

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

      <PluginModal
        plugin={selectedPlugin}
        isOpen={isPluginModalOpen}
        onClose={handlePluginClose}
      />
    </>
  );
}

export default function SimpleTextEditor() {
  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[400px] p-4 focus:outline-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                Comece a escrever seu documento...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <LinkPlugin />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </div>
      </LexicalComposer>
    </div>
  );
}