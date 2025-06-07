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
import { TableNode, TableRowNode, TableCellNode, $createTableNodeWithDimensions, INSERT_TABLE_COMMAND, $createTableNode, $createTableRowNode, $createTableCellNode, $isTableNode, $getTableRowIndexFromTableCellNode, $getTableColumnIndexFromTableCellNode, $insertTableRow__EXPERIMENTAL, $insertTableColumn__EXPERIMENTAL, $deleteTableRow__EXPERIMENTAL, $deleteTableColumn__EXPERIMENTAL } from '@lexical/table';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { $getNodeByKey, $getSelection as $getLexicalSelection, $setSelection, $createRangeSelection, NodeSelection, $createNodeSelection } from 'lexical';


// Import dos nós e plugin de container colapsível
import { CollapsibleContainerNode, $createCollapsibleContainerNode } from './lexical/CollapsibleNode';
import { CollapsibleTitleNode, $createCollapsibleTitleNode } from './lexical/CollapsibleTitleNode';
import { CollapsibleContentNode, $createCollapsibleContentNode } from './lexical/CollapsibleContentNode';
import CollapsiblePlugin, { INSERT_COLLAPSIBLE_COMMAND } from './lexical/CollapsiblePlugin';

// Import dos nós e plugin de imagem
import { ImageNode, $createImageNode } from './lexical/ImageNode';
import { ImageWithMetadataNode } from './lexical/ImageWithMetadataNode';
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
  Trash2,
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

// Plugin para seleção de tabelas com sincronização dos controles
function TableSelectionPlugin({ 
  onTableSelect, 
  tableRows, 
  tableColumns, 
  setTableRows, 
  setTableColumns 
}: { 
  onTableSelect?: (tableKey: string | null) => void;
  tableRows: number;
  tableColumns: number;
  setTableRows: (rows: number) => void;
  setTableColumns: (columns: number) => void;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const updateTableSelection = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        
        // Remove seleção anterior
        const previousSelected = document.querySelector('.lexical-table-selected');
        if (previousSelected) {
          previousSelected.classList.remove('lexical-table-selected');
        }

        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          let currentNode = anchorNode;
          
          // Encontrar a tabela pai
          while (currentNode) {
            if ($isTableNode(currentNode)) {
              const tableElement = editor.getElementByKey(currentNode.getKey());
              if (tableElement) {
                tableElement.classList.add('lexical-table-selected');
              }

              // Calcular dimensões da tabela selecionada
              const rows = currentNode.getChildren();
              const rowCount = rows.length;
              let columnCount = 0;
              
              if (rows.length > 0) {
                const firstRow = rows[0] as TableRowNode;
                columnCount = firstRow.getChildren().length;
              }

              // Sincronizar com os controles da toolbar
              setTableRows(rowCount);
              setTableColumns(columnCount);
              
              if (onTableSelect) {
                onTableSelect(currentNode.getKey());
              }
              
              break;
            }
            const parentNode = currentNode.getParent();
            if (!parentNode) break;
            currentNode = parentNode;
          }
        } else {
          // Nenhuma tabela selecionada
          if (onTableSelect) {
            onTableSelect(null);
          }
        }
      });
    };

    // Registrar listener para mudanças de seleção
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateTableSelection();
      });
    });

    // Registrar listener para cliques
    const handleClick = () => {
      setTimeout(updateTableSelection, 0);
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('click', handleClick);
    }

    return () => {
      unregister();
      if (editorElement) {
        editorElement.removeEventListener('click', handleClick);
      }
    };
  }, [editor, onTableSelect, setTableRows, setTableColumns]);

  return null;
}

// Plugin para capturar instância do editor
function EditorInstancePlugin({ setEditorInstance }: { setEditorInstance: (editor: any) => void }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    setEditorInstance(editor);
  }, [editor, setEditorInstance]);

  return null;
}

// Barra de ferramentas interativa
function ToolbarPlugin({ 
  tableRows, 
  setTableRows, 
  tableColumns, 
  setTableColumns, 
  selectedTableKey,
  resizeSelectedTable,
  onTableSelect,
  deleteSelectedTable
}: {
  tableRows: number;
  setTableRows: (rows: number) => void;
  tableColumns: number;
  setTableColumns: (columns: number) => void;
  selectedTableKey: string | null;
  resizeSelectedTable: (rows: number, columns: number) => void;
  onTableSelect: (tableKey: string | null) => void;
  deleteSelectedTable: () => void;
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
    
    // Check for table selection
    let currentTableKey = null;
    
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let node = anchorNode;
      while (node) {
        if ($isTableNode(node)) {
          currentTableKey = node.getKey();
          break;
        }
        const parentNode = node.getParent();
        if (!parentNode) break;
        node = parentNode;
      }
    }
    
    onTableSelect(currentTableKey);
  }, [onTableSelect]);

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

      // Criar parágrafo vazio antes da tabela
      const paragraphBefore = $createParagraphNode();
      
      const tableNode = $createTableNode();

      // Criar linhas e colunas conforme definido nos controles
      for (let i = 0; i < tableRows; i++) {
        const rowNode = $createTableRowNode();

        for (let j = 0; j < tableColumns; j++) {
          const cellNode = $createTableCellNode(0); // nova célula
          const paragraphNode = $createParagraphNode(); // novo parágrafo
          cellNode.append(paragraphNode);
          rowNode.append(cellNode); // célula adicionada à linha
        }

        tableNode.append(rowNode);
      }

      // Criar parágrafo vazio depois da tabela
      const paragraphAfter = $createParagraphNode();

      // Inserir parágrafo, tabela e parágrafo na posição do cursor
      $insertNodes([paragraphBefore, tableNode, paragraphAfter]);
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
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Inserir Tabela"
          onClick={insertTable}
        >
          <Table className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 ml-2 text-xs text-gray-600">
          <input
            type="number"
            min="1"
            max="20"
            value={tableRows}
            onChange={(e) => {
              const newRows = Math.max(1, parseInt(e.target.value) || 1);
              setTableRows(newRows);
              if (selectedTableKey) {
                setTimeout(() => resizeSelectedTable(newRows, tableColumns), 0);
              }
            }}
            className="w-8 h-6 px-1 border border-gray-300 rounded text-center text-xs"
            title="Linhas"
          />
          <span className="text-gray-400">×</span>
          <input
            type="number"
            min="1"
            max="20"
            value={tableColumns}
            onChange={(e) => {
              const newColumns = Math.max(1, parseInt(e.target.value) || 1);
              setTableColumns(newColumns);
              if (selectedTableKey) {
                setTimeout(() => resizeSelectedTable(tableRows, newColumns), 0);
              }
            }}
            className="w-8 h-6 px-1 border border-gray-300 rounded text-center text-xs"
            title="Colunas"
          />
        </div>
        
        {/* Botão para excluir tabela selecionada */}
        {selectedTableKey && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs hover:bg-red-100 text-red-600 hover:text-red-700"
            title="Excluir Tabela"
            onClick={deleteSelectedTable}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100"
          title="Container Colapsível"
          onClick={insertCollapsible}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>

      </div>
    </div>
  );
}

// Componente placeholder
function Placeholder(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        
        // Verifica se há conteúdo real (não apenas parágrafos vazios)
        const hasRealContent = children.some(child => {
          if (child.getType() === 'paragraph') {
            return child.getTextContent().trim().length > 0;
          }
          // Outros tipos de nós (tabelas, imagens, etc.) sempre contam como conteúdo
          return child.getType() !== 'paragraph';
        });
        
        setHasContent(hasRealContent);
      });
    });
  }, [editor]);

  if (hasContent) {
    return null;
  }

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
  onContentStatusChange?: (hasContent: boolean) => void;
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
      } else if (node.getType() === 'image-with-metadata') {
        const src = node.getSrc();
        const alt = node.getAltText();
        const metadataText = node.getMetadataText();
        const imageId = node.getImageId();
        markdown += `![${imageId}](${src})\n\n`;
        markdown += `${metadataText}\n\n`;
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
export default function LexicalEditor({ content = '', onChange, onEditorStateChange, onContentStatusChange, className = '', templateSections, viewMode = 'editor', initialEditorState }: LexicalEditorProps): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState('');
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [tableRows, setTableRows] = useState(2);
  const [tableColumns, setTableColumns] = useState(3);
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);

  // Função para excluir tabela selecionada
  const deleteSelectedTable = useCallback(() => {
    if (!selectedTableKey || !editorInstance) return;

    editorInstance.update(() => {
      const tableNode = $getNodeByKey(selectedTableKey);
      if ($isTableNode(tableNode)) {
        tableNode.remove();
        setSelectedTableKey(null); // Limpar seleção
      }
    });
  }, [selectedTableKey, editorInstance]);

  // Função para redimensionar tabela existente
  const resizeSelectedTable = useCallback((newRows: number, newColumns: number) => {
    if (!selectedTableKey || !editorInstance) return;

    editorInstance.update(() => {
      const tableNode = $getNodeByKey(selectedTableKey);
      if (!$isTableNode(tableNode)) return;

      const currentRows = tableNode.getChildren();
      const currentRowCount = currentRows.length;
      const currentColumnCount = currentRows.length > 0 ? (currentRows[0] as TableRowNode).getChildren().length : 0;

      // Ajustar número de linhas
      if (newRows > currentRowCount) {
        // Adicionar linhas
        for (let i = currentRowCount; i < newRows; i++) {
          const newRow = $createTableRowNode();
          for (let j = 0; j < newColumns; j++) {
            const newCell = $createTableCellNode(0);
            const newParagraph = $createParagraphNode();
            newCell.append(newParagraph);
            newRow.append(newCell);
          }
          tableNode.append(newRow);
        }
      } else if (newRows < currentRowCount) {
        // Remover linhas
        for (let i = currentRowCount - 1; i >= newRows; i--) {
          const rowToRemove = currentRows[i];
          rowToRemove.remove();
        }
      }

      // Ajustar número de colunas
      const updatedRows = tableNode.getChildren();
      updatedRows.forEach((row) => {
        const rowNode = row as TableRowNode;
        const cells = rowNode.getChildren();
        const currentCellCount = cells.length;

        if (newColumns > currentCellCount) {
          // Adicionar células
          for (let j = currentCellCount; j < newColumns; j++) {
            const newCell = $createTableCellNode(0);
            const newParagraph = $createParagraphNode();
            newCell.append(newParagraph);
            rowNode.append(newCell);
          }
        } else if (newColumns < currentCellCount) {
          // Remover células
          for (let j = currentCellCount - 1; j >= newColumns; j--) {
            cells[j].remove();
          }
        }
      });
    });
    
    // Manter seleção visual após redimensionamento
    requestAnimationFrame(() => {
      if (editorInstance && selectedTableKey) {
        const tableElement = editorInstance.getElementByKey(selectedTableKey);
        if (tableElement) {
          tableElement.classList.add('lexical-table-selected');
        }
      }
    });
  }, [selectedTableKey, editorInstance]);
  
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
      ImageWithMetadataNode,
    ],
  };

  const handleChange = (editorState: any, editor: any) => {
    // Capturar instância do editor se ainda não temos
    if (!editorInstance) {
      setEditorInstance(editor);
    }
    
    editorState.read(() => {
      const root = $getRoot();
      const textContent = root.getTextContent();
      const children = root.getChildren();
      
      // Verificar se há conteúdo real (não apenas parágrafos vazios)
      const hasRealContent = children.some(child => {
        if (child.getType() === 'paragraph') {
          return child.getTextContent().trim().length > 0;
        }
        // Outros tipos de nós (tabelas, imagens, etc.) sempre contam como conteúdo
        return child.getType() !== 'paragraph';
      });
      
      // Notificar mudança de status de conteúdo
      if (onContentStatusChange) {
        onContentStatusChange(hasRealContent);
      }
      
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
          <ToolbarPlugin 
            tableRows={tableRows}
            setTableRows={setTableRows}
            tableColumns={tableColumns}
            setTableColumns={setTableColumns}
            selectedTableKey={selectedTableKey}
            resizeSelectedTable={resizeSelectedTable}
            onTableSelect={setSelectedTableKey}
            deleteSelectedTable={deleteSelectedTable}
          />
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
          <TableSelectionPlugin 
            onTableSelect={setSelectedTableKey}
            tableRows={tableRows}
            tableColumns={tableColumns}
            setTableRows={setTableRows}
            setTableColumns={setTableColumns}
          />
          <CollapsiblePlugin />
          <ImagePlugin />
          <ImageEventListenerPlugin />
          <TemplateSectionsPlugin sections={templateSections} />
          <EditorInstancePlugin setEditorInstance={setEditorInstance} />
          <AutoFocusPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}