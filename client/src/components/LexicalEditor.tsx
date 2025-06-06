import React, { useState, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection,
  $createParagraphNode,
  TextFormatType
} from 'lexical';
import { 
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list';
import { 
  $createHeadingNode, 
  $createQuoteNode, 
  $isHeadingNode 
} from '@lexical/rich-text';
import { 
  INSERT_TABLE_COMMAND
} from '@lexical/table';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { 
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND
} from 'lexical';

// Importar componentes customizados
import { ImageNode, $createImageNode } from './lexical/ImageNode';
import { CollapsibleContentNode, $createCollapsibleContentNode } from './lexical/CollapsibleContentNode';
import { CollapsibleTitleNode, $createCollapsibleTitleNode } from './lexical/CollapsibleTitleNode';

// Função auxiliar para inserir nós
function $insertNodes(nodes: any[]) {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    nodes.forEach(node => {
      selection.insertNodes([node]);
    });
  }
}

// Tema do editor
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

function onError(error: Error): void {
  console.error(error);
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
          const imageNode = $createImageNode({
            src,
            altText,
          });
          $insertNodes([imageNode]);
        }
      });
    };

    window.addEventListener('insertImage', handleInsertImage as EventListener);

    return () => {
      window.removeEventListener('insertImage', handleInsertImage as EventListener);
    };
  }, [editor]);

  return null;
}

// Barra de ferramentas
function ToolbarPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = React.useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          updateToolbar();
          return false;
        },
        1,
      ),
    );
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      $setBlocksType(selection, () => $createParagraphNode());
    });
  };

  const formatHeading = (headingSize: string) => {
    if (headingSize === 'h1' || headingSize === 'h2' || headingSize === 'h3') {
      editor.update(() => {
        const selection = $getSelection();
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      });
    }
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      $setBlocksType(selection, () => $createQuoteNode());
    });
  };

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: '3',
      rows: '3',
      includeHeaders: true,
    });
  };

  return (
    <div className="toolbar flex items-center gap-2 p-3 border-b bg-gray-50">
      <button
        onClick={formatParagraph}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        Parágrafo
      </button>

      <button
        onClick={() => formatHeading('h1')}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        H1
      </button>

      <button
        onClick={() => formatHeading('h2')}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        H2
      </button>

      <button
        onClick={() => formatHeading('h3')}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        H3
      </button>

      <div className="w-px h-6 bg-gray-300"></div>

      <button
        onClick={() => formatText('bold')}
        className={`px-3 py-1 text-sm border rounded hover:bg-gray-100 ${
          isBold ? 'bg-blue-100 border-blue-300' : ''
        }`}
      >
        <strong>B</strong>
      </button>

      <button
        onClick={() => formatText('italic')}
        className={`px-3 py-1 text-sm border rounded hover:bg-gray-100 ${
          isItalic ? 'bg-blue-100 border-blue-300' : ''
        }`}
      >
        <em>I</em>
      </button>

      <button
        onClick={() => formatText('underline')}
        className={`px-3 py-1 text-sm border rounded hover:bg-gray-100 ${
          isUnderline ? 'bg-blue-100 border-blue-300' : ''
        }`}
      >
        <u>U</u>
      </button>

      <div className="w-px h-6 bg-gray-300"></div>

      <button
        onClick={formatBulletList}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        • Lista
      </button>

      <button
        onClick={formatNumberedList}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        1. Lista
      </button>

      <button
        onClick={insertTable}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        Tabela
      </button>

      <button
        onClick={formatQuote}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
      >
        Citação
      </button>
    </div>
  );
}

function Placeholder(): JSX.Element {
  return <div className="editor-placeholder">Digite seu texto aqui...</div>;
}

interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onEditorStateChange?: (serializedState: string) => void;
  className?: string;
  templateSections?: string[];
  viewMode?: 'editor' | 'preview';
  initialEditorState?: string;
}

// Função auxiliar para processar nós recursivamente
function processNodeRecursively(node: any, imageCounter: { count: number }): string {
  let markdown = '';
  
  console.log('🔍 Processando nó tipo:', node.getType(), 'Nó:', node);
  
  if (node.getType() === 'image') {
    console.log('🖼️ Processando imagem no markdown:', node);
    const src = node.getSrc();
    const alt = node.getAltText();
    const imageId = `img_${imageCounter.count}`;
    console.log('🖼️ Dados da imagem:', { src: src?.substring(0, 50) + '...', alt, imageId });
    markdown += `![${imageId}](${src})\n\n`;
    imageCounter.count++;
  } else if (node.getType() === 'heading') {
    const level = node.getTag().replace('h', '');
    const text = node.getTextContent();
    markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
  } else if (node.getType() === 'quote') {
    const text = node.getTextContent();
    markdown += '> ' + text + '\n\n';
  } else if (node.getType() === 'list') {
    const items = node.getChildren();
    items.forEach((item: any) => {
      const text = item.getTextContent();
      if (node.getListType() === 'bullet') {
        markdown += '- ' + text + '\n';
      } else {
        markdown += '1. ' + text + '\n';
      }
    });
    markdown += '\n';
  } else if (node.getType() === 'paragraph') {
    // Processar filhos do parágrafo para encontrar imagens
    const children = node.getChildren();
    if (children && children.length > 0) {
      children.forEach((child: any) => {
        markdown += processNodeRecursively(child, imageCounter);
      });
    } else {
      const text = node.getTextContent();
      if (text.trim()) {
        markdown += text + '\n\n';
      }
    }
  } else if (node.getType() === 'collapsible-container') {
    // Processar containers colapsáveis
    const children = node.getChildren();
    children.forEach((child: any) => {
      markdown += processNodeRecursively(child, imageCounter);
    });
  } else if (node.getType() === 'collapsible-title') {
    const titleText = node.getTextContent();
    markdown += `# ${titleText}\n\n`;
  } else if (node.getType() === 'collapsible-content') {
    // Processar conteúdo do container recursivamente
    const contentChildren = node.getChildren();
    contentChildren.forEach((contentChild: any) => {
      markdown += processNodeRecursively(contentChild, imageCounter);
    });
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
  } else {
    // Para outros tipos de nó, tentar processar filhos se existirem
    const children = node.getChildren ? node.getChildren() : [];
    if (children && children.length > 0) {
      children.forEach((child: any) => {
        markdown += processNodeRecursively(child, imageCounter);
      });
    } else {
      const text = node.getTextContent ? node.getTextContent() : '';
      if (text.trim()) {
        markdown += text + '\n\n';
      }
    }
  }
  
  return markdown;
}

// Função para converter conteúdo Lexical para markdown
function convertToMarkdown(editorState: any): string {
  let markdown = '';
  const imageCounter = { count: 1 };
  
  editorState.read(() => {
    const root = $getRoot();
    const children = root.getChildren();
    
    console.log('📄 Total de nós filhos encontrados:', children.length);
    
    children.forEach((node: any) => {
      markdown += processNodeRecursively(node, imageCounter);
    });
  });
  
  return markdown;
}

// Plugin para inserir seções de template automaticamente
function TemplateSectionsPlugin({ sections }: { sections?: string[] }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const sectionsRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    if (sections && sections.length > 0 && 
        JSON.stringify(sections) !== JSON.stringify(sectionsRef.current)) {
      
      sectionsRef.current = sections;
      
      const timeoutId = setTimeout(() => {
        editor.update(() => {
          const root = $getRoot();
          
          const children = root.getChildren();
          const hasTemplateContent = children.some(child => 
            child.getType() === 'collapsible-container'
          );
          
          if (!hasTemplateContent) {
            root.clear();
            
            const headerTitle = $createCollapsibleTitleNode();
            headerTitle.setTextContent('Conteúdo de cabeçalho');
            
            const headerContent = $createCollapsibleContentNode();
            const headerParagraph = $createParagraphNode();
            headerContent.append(headerParagraph);
            
            const headerContainer = $createCollapsibleContainerNode(false);
            headerContainer.append(headerTitle, headerContent);
            root.append(headerContainer);
            
            sections.forEach((sectionName, index) => {
              const title = $createCollapsibleTitleNode(sectionName);
              const content = $createCollapsibleContentNode();
              
              const paragraph = $createParagraphNode();
              content.append(paragraph);

              const container = $createCollapsibleContainerNode(false);
              container.append(title, content);
              
              root.append(container);
            });
            
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

// Componente principal do editor Lexical
export default function LexicalEditor({ 
  content = '', 
  onChange, 
  onEditorStateChange, 
  className = '', 
  templateSections, 
  viewMode = 'editor', 
  initialEditorState 
}: LexicalEditorProps): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState('');
  const [editorInstance, setEditorInstance] = useState<any>(null);
  
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
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
      CollapsibleContainerNode,
      CollapsibleContentNode,
      CollapsibleTitleNode,
    ],
  };

  const handleEditorChange = React.useCallback((editorState: any, editor: any) => {
    setEditorInstance(editor);
    
    if (onEditorStateChange) {
      const serializedState = JSON.stringify(editorState.toJSON());
      onEditorStateChange(serializedState);
    }
    
    if (onChange) {
      editorState.read(() => {
        const markdown = convertToMarkdown(editorState);
        onChange(markdown);
      });
    }
  }, [onChange, onEditorStateChange]);

  if (viewMode === 'preview') {
    return (
      <div className={`prose max-w-none ${className}`}>
        <div 
          dangerouslySetInnerHTML={{ 
            __html: markdownContent.replace(/\n/g, '<br>') 
          }}
        />
      </div>
    );
  }

  return (
    <div className={`lexical-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container border rounded-lg overflow-hidden">
          <ToolbarPlugin />
          <div className="editor-inner relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input min-h-[300px] p-4 outline-none"
                  aria-placeholder="Digite seu texto aqui..."
                  placeholder={<Placeholder />}
                />
              }
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin />
            <TabIndentationPlugin />
            <TablePlugin />
            <ImageEventListenerPlugin />
            <TemplateSectionsPlugin sections={templateSections} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}