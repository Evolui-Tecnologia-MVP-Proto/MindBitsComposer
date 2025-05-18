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
import { Bold, Italic, List, FileText, Save, Undo, Redo, Link as LinkIcon } from "lucide-react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, FORMAT_TEXT_COMMAND, LexicalEditor } from "lexical";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  
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

  return (
    <div className="flex items-center space-x-2 p-2 bg-white border-b border-gray-200">
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
    <div className="flex flex-col h-full border-0 rounded-none bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none h-full min-h-[calc(100vh-280px)] px-0" />}
            placeholder={<div className="absolute top-[76px] left-4 text-gray-400 pointer-events-none">Comece a escrever...</div>}
          />
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
      </LexicalComposer>
    </div>
  );
}