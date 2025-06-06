import React, { useCallback, useEffect, useState } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type TextFormatType, $createParagraphNode, $createTextNode, $insertNodes, $isParagraphNode } from 'lexical';
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


// Import dos nós e plugin de container colapsível
import { CollapsibleContainerNode, $createCollapsibleContainerNode } from './lexical/CollapsibleNode';
import { CollapsibleTitleNode, $createCollapsibleTitleNode } from './lexical/CollapsibleTitleNode';
import { CollapsibleContentNode, $createCollapsibleContentNode } from './lexical/CollapsibleContentNode';
import CollapsiblePlugin, { INSERT_COLLAPSIBLE_COMMAND } from './lexical/CollapsiblePlugin';

// Import dos nós e plugin de imagem
import { ImageNode, $createImageNode } from './lexical/ImageNode';
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

// Plugin para escutar eventos de inserção de imagem
function ImageEventListenerPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleInsertImage = (event: CustomEvent) => {
      const { src, altText } = event.detail;
      
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Gerar ID único para a imagem
          const imageId = Math.floor(Math.random() * 10000000000).toString();
          
          // Criar nó de imagem
          const imageNode = $createImageNode({
            src,
            altText,
          });
          
          // Criar parágrafo com informações da imagem
          const infoParagraph = $createParagraphNode();
          
          // Criar URL blob acessível para navegadores externos
          let displayUrl = src;
          if (src.startsWith('data:')) {
            try {
              // Converter data URL para blob
              const byteString = atob(src.split(',')[1]);
              const mimeString = src.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], { type: mimeString });
              displayUrl = URL.createObjectURL(blob);
            } catch (error) {
              displayUrl = `blob:${window.location.origin}/${imageId}`;
            }
          }
          
          const infoText = $createTextNode(`[image_id: ${imageId}] - [${displayUrl}]`);
          infoParagraph.append(infoText);
          
          // Inserir a imagem e o texto informativo
          $insertNodes([imageNode, infoParagraph]);
        }
      });
    };

    // Escutar evento customizado de inserção de imagem
    window.addEventListener('insertImage', handleInsertImage as EventListener);

    return () => {
      window.removeEventListener('insertImage', handleInsertImage as EventListener);
    };
  }, [editor]);

  return null;
}

// Barra de ferramentas interativa
function ToolbarPlugin(): JSX.Element {
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
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

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

      // Inserir tabela na posição do cursor usando insertNodes
      $insertNodes([tableNode]);
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
  onEditorStateChange?: (serializedState: string) => void;
  className?: string;
  templateSections?: string[];
  viewMode?: 'editor' | 'preview';
  initialEditorState?: string; // Estado serializado do Lexical para restaurar
}

// Função para converter conteúdo Lexical para markdown
function convertToMarkdown(editorState: any): string {
  let markdown = '';
  let imageCounter = 1;
  
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
        const imageId = `img_${imageCounter}`;
        markdown += `![${imageId}](${src})\n\n`;
        imageCounter++;
      } else if (node.getType() === 'table') {
        // Processar tabela para markdown
        const rows = node.getChildren();
        if (rows.length > 0) {
          rows.forEach((row: any, rowIndex: number) => {
            const cells = row.getChildren();
            let rowContent = '|';
            
            cells.forEach((cell: any) => {
              const cellText = cell.getTextContent() || ' ';
              rowContent += ` ${cellText} |`;
            });
            
            markdown += rowContent + '\n';
            
            // Adicionar linha separadora após o cabeçalho (primeira linha)
            if (rowIndex === 0) {
              let separator = '|';
              cells.forEach(() => {
                separator += ' --- |';
              });
              markdown += separator + '\n';
            }
          });
          markdown += '\n';
        }
      } else if (node.getType() === 'collapsible-container') {
        // Processar container colapsível
        const containerChildren = node.getChildren();
        containerChildren.forEach((child: any) => {
          if (child.getType() === 'collapsible-title') {
            const titleText = child.getTextContent();
            markdown += `# ${titleText}\n\n`;
          } else if (child.getType() === 'collapsible-content') {
            // Processar conteúdo do container recursivamente
            const contentChildren = child.getChildren();
            contentChildren.forEach((contentChild: any) => {
              if (contentChild.getType() === 'table') {
                // Processar tabela dentro do container
                const rows = contentChild.getChildren();
                if (rows.length > 0) {
                  rows.forEach((row: any, rowIndex: number) => {
                    const cells = row.getChildren();
                    let rowContent = '|';
                    
                    cells.forEach((cell: any) => {
                      const cellText = cell.getTextContent() || ' ';
                      rowContent += ` ${cellText} |`;
                    });
                    
                    markdown += rowContent + '\n';
                    
                    // Adicionar linha separadora após o cabeçalho (primeira linha)
                    if (rowIndex === 0) {
                      let separator = '|';
                      cells.forEach(() => {
                        separator += ' --- |';
                      });
                      markdown += separator + '\n';
                    }
                  });
                  markdown += '\n';
                }
              } else if (contentChild.getType() === 'image') {
                const src = contentChild.getSrc();
                const alt = contentChild.getAltText();
                const imageId = `img_${imageCounter}`;
                markdown += `![${imageId}](${src})\n\n`;
                imageCounter++;
              } else {
                const contentText = contentChild.getTextContent();
                if (contentText.trim()) {
                  markdown += contentText + '\n\n';
                }
              }
            });
          }
        });
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

// Plugin para inserir seções de template automaticamente
function TemplateSectionsPlugin({ sections }: { sections?: string[] }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const sectionsRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    // Evitar re-aplicar as mesmas seções
    if (sections && sections.length > 0 && 
        JSON.stringify(sections) !== JSON.stringify(sectionsRef.current)) {
      
      sectionsRef.current = sections;
      
      // Usar setTimeout para evitar conflitos com outros plugins
      const timeoutId = setTimeout(() => {
        editor.update(() => {
          const root = $getRoot();
          
          // Verificar se o root já tem conteúdo dos templates
          const children = root.getChildren();
          const hasTemplateContent = children.some(child => 
            child.getType() === 'collapsible-container'
          );
          
          if (!hasTemplateContent) {
            root.clear();
            
            // Criar container de cabeçalho padrão
            const headerTitle = $createCollapsibleTitleNode();
            headerTitle.setTextContent('Conteúdo de cabeçalho');
            
            const headerContent = $createCollapsibleContentNode();
            const headerParagraph = $createParagraphNode();
            headerContent.append(headerParagraph);
            
            const headerContainer = $createCollapsibleContainerNode(false);
            headerContainer.append(headerTitle, headerContent);
            root.append(headerContainer);
            
            sections.forEach((sectionName, index) => {
              // Criar container colapsível
              const title = $createCollapsibleTitleNode(sectionName);
              const content = $createCollapsibleContentNode();
              
              // Adicionar parágrafo editável dentro do conteúdo
              const paragraph = $createParagraphNode();
              content.append(paragraph);

              const container = $createCollapsibleContainerNode(false);
              container.append(title, content);
              
              root.append(container);
            });
            
            // Adicionar parágrafo final para permitir edição após os containers
            const finalParagraph = $createParagraphNode();
            root.append(finalParagraph);
          }
        }, { discrete: true });
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, sections]);

  return null;
}

// Componente principal do editor Lexical completo
export default function LexicalEditor({ content = '', onChange, onEditorStateChange, className = '', templateSections, viewMode = 'editor', initialEditorState }: LexicalEditorProps): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState('');
  const [editorInstance, setEditorInstance] = useState<any>(null);
  
  // Hook para capturar markdown quando mudar para preview
  React.useEffect(() => {
    if (viewMode === 'preview' && editorInstance) {
      editorInstance.getEditorState().read(() => {
        const markdown = convertToMarkdown(editorInstance.getEditorState());
        setMarkdownContent(markdown);
      });
    }
  }, [viewMode, editorInstance]);

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    editorState: initialEditorState ? initialEditorState : undefined,
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
      
      // Salvar estado serializado do editor para onEditorStateChange
      if (onEditorStateChange) {
        const serializedState = JSON.stringify(editorState.toJSON());
        onEditorStateChange(serializedState);
      }
    });
  };

  return (
    <div className={`lexical-editor-container w-full h-full flex flex-col ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="w-full h-full flex flex-col min-h-0">
          <ToolbarPlugin />
          <div className="p-4" style={{ height: 'calc(100vh - 350px)', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
            {viewMode === 'editor' ? (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className="w-full outline-none resize-none text-gray-900"
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6',
                      minHeight: '400px',
                      height: 'auto'
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
          <ImageEventListenerPlugin />
          <TemplateSectionsPlugin sections={templateSections} />
          <AutoFocusPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}