import React, { useCallback, useEffect, useState } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type TextFormatType, $createParagraphNode, $createTextNode, $insertNodes } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CodeNode, $createCodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { TableNode, TableRowNode, TableCellNode, $createTableNodeWithDimensions, INSERT_TABLE_COMMAND, $createTableNode, $createTableRowNode, $createTableCellNode } from '@lexical/table';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';


// Import dos nós e plugin de container colapsável
import { CollapsibleContainerNode } from './lexical/CollapsibleNode';
import { CollapsibleTitleNode } from './lexical/CollapsibleTitleNode';
import { CollapsibleContentNode } from './lexical/CollapsibleContentNode';
import CollapsiblePlugin, { INSERT_COLLAPSIBLE_COMMAND } from './lexical/CollapsiblePlugin';

// Import dos nós e plugin de imagem
import { ImageNode } from './lexical/ImageNode';
import ImagePlugin, { useImageUpload } from './lexical/ImagePlugin';

// Import do plugin customizado de tabela
import CustomTablePlugin, { INSERT_CUSTOM_TABLE_COMMAND } from './lexical/TablePlugin';

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
  ListOrdered,
  Table,
  ChevronDown,
  Image,
  Eye,
  Edit
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
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
};

// Função para lidar com erros
function onError(error: Error): void {
  console.error('Erro no editor Lexical:', error);
}

// Barra de ferramentas interativa
function ToolbarPlugin({ 
  viewMode, 
  setViewMode, 
  setMarkdownContent 
}: { 
  viewMode: 'editor' | 'preview';
  setViewMode: (mode: 'editor' | 'preview') => void;
  setMarkdownContent: (content: string) => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const { fileInputRef, openFileDialog, handleFileChange } = useImageUpload();

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const insertHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const headingNode = $createHeadingNode(headingSize);
        $insertNodes([headingNode]);
      }
    });
  };

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const quoteNode = $createQuoteNode();
        $insertNodes([quoteNode]);
      }
    });
  };

  const insertCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const codeNode = $createCodeNode();
        $insertNodes([codeNode]);
      }
    });
  };

  const insertBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const insertOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const insertTable = () => {
    editor.update(() => {
      const tableNode = $createTableNode();

      // Criar 2 linhas com 3 colunas cada
      for (let i = 0; i < 2; i++) {
        const rowNode = $createTableRowNode();

        for (let j = 0; j < 3; j++) {
          const cellNode = $createTableCellNode(0); // nova célula
          const paragraphNode = $createParagraphNode(); // novo parágrafo
          const textNode = $createTextNode(`Linha ${i + 1}, Coluna ${j + 1}`);
          paragraphNode.append(textNode);
          cellNode.append(paragraphNode);
          rowNode.append(cellNode); // célula adicionada à linha
        }

        tableNode.append(rowNode);
      }

      $getRoot().append(tableNode);
    });
  };

  const insertCollapsible = () => {
    editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, true);
  };

  return (
    <div className="flex items-center gap-1 p-3 border-b bg-gray-50">
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant={isBold ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Negrito"
          onClick={() => formatText('bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant={isItalic ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Itálico"
          onClick={() => formatText('italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant={isUnderline ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Sublinhado"
          onClick={() => formatText('underline')}
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          variant={isStrikethrough ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Tachado"
          onClick={() => formatText('strikethrough')}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          variant={isCode ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Código Inline"
          onClick={() => formatText('code')}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 1"
          onClick={() => insertHeading('h1')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 2"
          onClick={() => insertHeading('h2')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Título 3"
          onClick={() => insertHeading('h3')}
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
          onClick={insertQuote}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Bloco de Código"
          onClick={insertCodeBlock}
        >
          <Code2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Lista"
          onClick={insertBulletList}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Lista Numerada"
          onClick={insertOrderedList}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Inserir Tabela"
          onClick={insertTable}
        >
          <Table className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Container Colapsável"
          onClick={insertCollapsible}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Inserir Imagem"
          onClick={openFileDialog}
        >
          <Image className="w-4 h-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={viewMode === 'editor' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-2 text-xs"
          title="Modo Editor"
          onClick={() => setViewMode('editor')}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-2 text-xs"
          title="Visualizar Markdown"
          onClick={() => {
            if (viewMode === 'editor') {
              // Capturar o estado atual do editor e converter para markdown
              editor.getEditorState().read(() => {
                const markdown = convertToMarkdown(editor.getEditorState());
                setMarkdownContent(markdown);
              });
            }
            setViewMode('preview');
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente placeholder
function Placeholder(): JSX.Element {
  return (
    <div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none">
    </div>
  );
}

// Interface das props do componente
interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  className?: string;
}

// Função para converter conteúdo Lexical para markdown
function convertToMarkdown(editorState: any): string {
  let markdown = '';
  
  editorState.read(() => {
    const root = $getRoot();
    const children = root.getChildren();
    
    children.forEach((node: any) => {
      if (node.getType() === 'heading') {
        const level = node.getTag().replace('h', '');
        const text = node.getTextContent();
        markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
      } else if (node.getType() === 'quote') {
        const text = node.getTextContent();
        markdown += '> ' + text + '\n\n';
      } else if (node.getType() === 'list') {
        const items = node.getChildren();
        items.forEach((item: any, index: number) => {
          const text = item.getTextContent();
          if (node.getListType() === 'bullet') {
            markdown += '- ' + text + '\n';
          } else {
            markdown += (index + 1) + '. ' + text + '\n';
          }
        });
        markdown += '\n';
      } else if (node.getType() === 'code') {
        const text = node.getTextContent();
        markdown += '```\n' + text + '\n```\n\n';
      } else if (node.getType() === 'paragraph') {
        const text = node.getTextContent();
        if (text.trim()) {
          markdown += text + '\n\n';
        }
      } else if (node.getType() === 'image') {
        const src = node.getSrc();
        const alt = node.getAltText();
        markdown += `![${alt}](${src})\n\n`;
      } else {
        const text = node.getTextContent();
        if (text.trim()) {
          markdown += text + '\n\n';
        }
      }
    });
  });
  
  return markdown.trim();
}

// Componente principal do editor Lexical completo
export default function LexicalEditor({ content = '', onChange, className = '' }: LexicalEditorProps): JSX.Element {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [markdownContent, setMarkdownContent] = useState('');
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      CollapsibleContainerNode,
      CollapsibleTitleNode,
      CollapsibleContentNode,
      ImageNode,
    ],
  };

  const handleChange = (editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();
      
      // Gerar markdown em tempo real
      const markdown = convertToMarkdown(editorState);
      setMarkdownContent(markdown);
      
      if (onChange) {
        onChange(textContent);
      }
    });
  };

  return (
    <div className={`lexical-editor-container w-full h-full flex flex-col ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="w-full h-full flex flex-col">
          <ToolbarPlugin 
            viewMode={viewMode}
            setViewMode={setViewMode}
            setMarkdownContent={setMarkdownContent}
          />
          <div className="flex-1 relative overflow-hidden">
            {viewMode === 'editor' ? (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className="w-full h-full p-4 outline-none resize-none text-gray-900 overflow-auto"
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      minHeight: '100%',
                      lineHeight: '1.6'
                    }}
                  />
                }
                placeholder={<Placeholder />}
                ErrorBoundary={LexicalErrorBoundary}
              />
            ) : (
              <div className="w-full h-full p-6 overflow-auto bg-slate-100">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Visualização Markdown</h3>
                      <p className="text-sm text-gray-600 mt-1">Representação em markdown do conteúdo do editor</p>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-300 overflow-x-auto">
                      {markdownContent || '// Nenhum conteúdo para visualizar\n// Adicione texto no editor para ver a conversão markdown'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <ListPlugin />
          <TablePlugin />
          <CollapsiblePlugin />
          <ImagePlugin />
          <AutoFocusPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}