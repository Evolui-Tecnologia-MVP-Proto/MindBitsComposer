import React from 'react';
import { $getRoot } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';

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

// Tema simplificado para o Lexical
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
};

// Função para lidar com erros
function onError(error: Error): void {
  console.error('Erro no editor Lexical:', error);
}

// Barra de ferramentas simplificada
function SimpleToolbar(): JSX.Element {
  return (
    <div className="flex items-center gap-1 p-3 border-b bg-gray-50">
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Sublinhado"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Citação"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Código"
        >
          <Code2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Lista"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente placeholder
function Placeholder(): JSX.Element {
  return (
    <div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none">
      Digite seu texto aqui no editor Lexical...
    </div>
  );
}

// Interface das props do componente
interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  className?: string;
}

// Componente principal do editor Lexical simplificado
export default function LexicalEditor({ content = '', onChange, className = '' }: LexicalEditorProps): JSX.Element {
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
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
          <SimpleToolbar />
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
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}