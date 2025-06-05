import React from 'react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { TRANSFORMERS } from '@lexical/markdown';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered
} from "lucide-react";

// Tema customizado para o Lexical
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

// Função para lidar com erros
function onError(error: Error): void {
  console.error('Erro no editor Lexical:', error);
}

// Plugin da barra de ferramentas
function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag));
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  };

  const formatList = (type: 'bullet' | 'number') => {
    if (type === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  return (
    <div className="flex items-center gap-1 p-3 border-b bg-gray-50">
      {/* Formatação de texto */}
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('underline')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Sublinhado"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('strikethrough')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Riscado"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('code')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Código inline"
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Títulos */}
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h1')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h2')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatHeading('h3')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Elementos de bloco */}
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={formatQuote}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Citação"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={formatCodeBlock}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Bloco de código"
        >
          <Code2 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Listas */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatList('bullet')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Lista com marcadores"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatList('number')}
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente placeholder
function Placeholder(): JSX.Element {
  return (
    <div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none">
      Digite seu texto aqui...
    </div>
  );
}

// Interface das props do componente
interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  className?: string;
}

// Componente principal do editor Lexical
export default function LexicalEditor({ content = '', onChange, className = '' }: LexicalEditorProps): JSX.Element {
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
    ],
  };

  const handleChange = (editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();
      if (onChange) {
        onChange(textContent);
      }
    });
  };

  return (
    <div className={`lexical-editor-container w-full h-full ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
          <ToolbarPlugin />
          <div className="editor-inner relative flex-1">
            <RichTextPlugin
              contentEditable={
                <ContentEditable 
                  className="editor-input min-h-[400px] p-4 outline-none resize-none text-gray-900 h-full"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                />
              }
              placeholder={<Placeholder />}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <LinkPlugin />
            <ListPlugin />
            <TabIndentationPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}