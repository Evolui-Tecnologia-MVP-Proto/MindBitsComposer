import React, { useCallback, useEffect, useState } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type TextFormatType, $createParagraphNode, $createTextNode, $insertNodes, $isParagraphNode, UNDO_COMMAND, REDO_COMMAND, COMMAND_PRIORITY_LOW, PASTE_COMMAND, $isTextNode } from 'lexical';
import { createMarkdownConverter } from './markdown-converter';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, $createListNode, $createListItemNode } from '@lexical/list';
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
import { ImageWithMetadataNode, $createImageWithMetadataNode, type ImageWithMetadataPayload } from './lexical/ImageWithMetadataNode';
import ImagePlugin, { useImageUpload } from './lexical/ImagePlugin';

// Import do plugin customizado de tabela
import CustomTablePlugin, { INSERT_CUSTOM_TABLE_COMMAND } from './lexical/TablePlugin';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MarkdownPreview from './MarkdownPreview';
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
  Edit,
  Undo,
  Redo
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
      const { src, altText, artifactId } = event.detail;
      
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Gerar ID único para a imagem
          const imageId = Math.floor(Math.random() * 10000000000).toString();
          
          // Criar URL HTTPS pública usando o artifact ID
          let httpsUrl = src;
          if (artifactId) {
            // Gerar URL pública que funciona externamente
            httpsUrl = `${window.location.origin}/api/public/images/${artifactId}`;
          }
          
          const metadataText = `[image_id: ${imageId}] - [${httpsUrl}]`;
          
          // Criar nó de imagem com metadata (oculto no editor)
          const imageWithMetadataPayload: ImageWithMetadataPayload = {
            src,
            altText,
            imageId,
            metadataText,
          };
          
          const imageWithMetadataNode = $createImageWithMetadataNode(imageWithMetadataPayload);
          
          // Inserir apenas o nó composto (sem texto separado visível)
          $insertNodes([imageWithMetadataNode]);
        }
      });
    };

    const handleInsertMermaidTable = (event: CustomEvent) => {
      console.log('🎯 handleInsertMermaidTable event received:', event.detail);
      const { imageUrl, altText, artifactId, mermaidCode } = event.detail;
      
      editor.update(() => {
        console.log('🔄 Starting editor update for Mermaid table insertion');
        const selection = $getSelection();
        console.log('📍 Current selection:', selection);
        
        if ($isRangeSelection(selection)) {
          console.log('✅ Range selection confirmed, creating table...');
          
          // Create table with 2 rows and 2 columns (header + content)
          const table = $createTableNode();
          
          // Create header row
          const headerRow = $createTableRowNode();
          
          // Header cell 1: "Diagrama"
          const headerCell1 = $createTableCellNode(1); // 1 indicates header cell
          const headerText1 = $createTextNode('Diagrama');
          const headerParagraph1 = $createParagraphNode();
          headerParagraph1.append(headerText1);
          headerCell1.append(headerParagraph1);
          
          // Header cell 2: "Semantica"
          const headerCell2 = $createTableCellNode(1); // 1 indicates header cell
          const headerText2 = $createTextNode('Semantica');
          const headerParagraph2 = $createParagraphNode();
          headerParagraph2.append(headerText2);
          headerCell2.append(headerParagraph2);
          
          // Add header cells to header row
          headerRow.append(headerCell1, headerCell2);
          
          // Create content row
          const contentRow = $createTableRowNode();
          
          // First column: Image
          const imageCell = $createTableCellNode(0);
          
          // Generate unique ID for the image
          const imageId = Math.floor(Math.random() * 10000000000).toString();
          
          // Create HTTPS public URL using artifact ID
          let httpsUrl = imageUrl;
          if (artifactId) {
            httpsUrl = `${window.location.origin}/api/public/images/${artifactId}`;
          }
          
          const metadataText = `[image_id: ${imageId}] - [${httpsUrl}]`;
          
          // Create image with metadata
          const imageWithMetadataPayload: ImageWithMetadataPayload = {
            src: imageUrl,
            altText: altText || 'Diagrama Mermaid',
            imageId,
            metadataText,
          };
          
          console.log('🖼️ Creating image node with payload:', imageWithMetadataPayload);
          const imageWithMetadataNode = $createImageWithMetadataNode(imageWithMetadataPayload);
          imageCell.append(imageWithMetadataNode);
          
          // Second column: Mermaid code as code block
          const codeCell = $createTableCellNode(0);
          const codeNode = $createCodeNode();
          
          // Create a text node with the Mermaid code and append it to the code node
          const textNode = $createTextNode(mermaidCode || '// Código Mermaid não disponível');
          codeNode.append(textNode);
          codeCell.append(codeNode);
          
          console.log('📝 Created code node with text:', mermaidCode);
          
          // Add cells to content row
          contentRow.append(imageCell, codeCell);
          
          // Add both rows to table (header first, then content)
          table.append(headerRow, contentRow);
          
          console.log('📋 Table structure created with header, inserting into document...');
          
          // Insert table into document
          $insertNodes([table]);
          
          console.log('✅ Mermaid table inserted successfully!');
        } else {
          console.log('❌ No valid range selection found');
        }
      });
    };

    // Escutar eventos customizados
    window.addEventListener('insertImage', handleInsertImage as EventListener);
    window.addEventListener('insertMermaidTable', handleInsertMermaidTable as EventListener);

    return () => {
      window.removeEventListener('insertImage', handleInsertImage as EventListener);
      window.removeEventListener('insertMermaidTable', handleInsertMermaidTable as EventListener);
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
function EditorInstancePlugin({ setEditorInstance }: { setEditorInstance: (editor: any) => void }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    setEditorInstance(editor);
  }, [editor, setEditorInstance]);

  return <></>;
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
    <div className="flex items-center gap-1 p-3 border-b bg-gray-50 dark:bg-[#111827] border-gray-200 dark:border-[#374151]">
      {/* Undo/Redo buttons */}
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Desfazer (Ctrl+Z)"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Refazer (Ctrl+Y)"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
      
      <Separator orientation="vertical" className="h-6 mx-1 dark:bg-[#374151]" />
      
      {/* Text formatting buttons */}
      <div className="flex items-center gap-1 mr-3">
        <Button
          variant={isBold ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB] dark:data-[state=active]:bg-[#1E40AF]"
          title="Negrito"
          onClick={() => formatText('bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant={isItalic ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB] dark:data-[state=active]:bg-[#1E40AF]"
          title="Itálico"
          onClick={() => formatText('italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant={isUnderline ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB] dark:data-[state=active]:bg-[#1E40AF]"
          title="Sublinhado"
          onClick={() => formatText('underline')}
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          variant={isStrikethrough ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB] dark:data-[state=active]:bg-[#1E40AF]"
          title="Tachado"
          onClick={() => formatText('strikethrough')}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          variant={isCode ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB] dark:data-[state=active]:bg-[#1E40AF]"
          title="Código Inline"
          onClick={() => formatText('code')}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 dark:bg-[#374151]" />

      <div className="flex items-center gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Título 1"
          onClick={() => insertHeading('h1')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Título 2"
          onClick={() => insertHeading('h2')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Título 3"
          onClick={() => insertHeading('h3')}
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 dark:bg-[#374151]" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Citação"
          onClick={insertQuote}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Bloco de Código"
          onClick={insertCodeBlock}
        >
          <Code2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Lista"
          onClick={insertBulletList}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Lista Numerada"
          onClick={insertOrderedList}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Container Colapsível"
          onClick={insertCollapsible}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs hover:bg-gray-100 dark:hover:bg-[#374151] dark:text-[#E5E7EB]"
          title="Inserir Tabela"
          onClick={insertTable}
        >
          <Table className="w-4 h-4" />
        </Button>
        
        {/* Controles de dimensionamento da tabela - apenas quando uma tabela está selecionada */}
        {selectedTableKey && (
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
        )}
        
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
    return <></>;
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
  onEditorInstanceChange?: (editor: any) => void;
  className?: string;
  templateSections?: string[];
  viewMode?: 'editor' | 'preview' | 'mdx';
  initialEditorState?: string; // Estado serializado do Lexical para restaurar
  markdownContent?: string;
}

// Função para converter conteúdo Lexical para markdown com limpeza
function convertToMarkdown(editorState: any): string {
  const converter = createMarkdownConverter();
  
  const rawMarkdown = editorState.read(() => {
    const root = $getRoot();
    return converter.convert(root);
  });
  
  // Aplicar limpeza consistente do markdown
  return cleanMarkdownContent(rawMarkdown);
}

// Função para limpar conteúdo markdown de forma consistente
function cleanMarkdownContent(markdown: string): string {
  if (!markdown?.trim()) return markdown;
  
  // Simply trim whitespace and limit excessive newlines without aggressive regex
  return markdown
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing whitespace only
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n') // Limit to max 3 consecutive newlines
    .trim();
}

// Plugin para inserir seções de template automaticamente
function TemplateSectionsPlugin({ sections }: { sections?: string[] }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const sectionsRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    console.log('🔥 TemplateSectionsPlugin - useEffect executado', { sections, sectionsLength: sections?.length });
    
    // Aplicar seções sempre que elas existirem
    if (sections && sections.length > 0) {
      
      console.log('🔥 TemplateSectionsPlugin - Aplicando seções do template:', sections);
      console.log('🔥 TemplateSectionsPlugin - Seções anteriores:', sectionsRef.current);
      console.log('🔥 TemplateSectionsPlugin - Comparação JSON:', {
        current: JSON.stringify(sections),
        previous: JSON.stringify(sectionsRef.current),
        different: JSON.stringify(sections) !== JSON.stringify(sectionsRef.current)
      });
      
      sectionsRef.current = sections;
      
      // Usar setTimeout para evitar conflitos com outros plugins
      const timeoutId = setTimeout(() => {
        console.log('🔥 TemplateSectionsPlugin - setTimeout executado, iniciando editor.update');
        
        editor.update(() => {
          console.log('🔥 TemplateSectionsPlugin - Dentro do editor.update');
          const root = $getRoot();
          
          console.log('🔥 TemplateSectionsPlugin - Aplicando template ao editor, limpando conteúdo existente');
          
          // Limpar sempre o conteúdo para aplicar o template
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
          
          sections.forEach((sectionName) => {
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
        });
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, sections]);

  return null;
}

// Plugin para garantir foco adequado quando carregando conteúdo existente
function FocusPlugin({ initialEditorState }: { initialEditorState?: string }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (initialEditorState) {
      // Aguardar um pouco para garantir que o conteúdo foi carregado
      const timeoutId = setTimeout(() => {
        editor.update(() => {
          // Mover cursor para o final do documento
          const root = $getRoot();
          const lastChild = root.getLastChild();
          
          if (lastChild) {
            // Se o último nó é um parágrafo, colocar cursor no final dele
            if ($isParagraphNode(lastChild)) {
              lastChild.selectEnd();
            } else {
              // Caso contrário, criar um novo parágrafo e focar nele
              const newParagraph = $createParagraphNode();
              root.append(newParagraph);
              newParagraph.select();
            }
          } else {
            // Se não há conteúdo, criar parágrafo inicial
            const newParagraph = $createParagraphNode();
            root.append(newParagraph);
            newParagraph.select();
          }
        });
        
        // Focar o editor após a atualização
        setTimeout(() => {
          editor.focus();
        }, 50);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, initialEditorState]);

  return null;
}

// Plugin para detectar e converter automaticamente [Imagem_ID: numeroimagem] para código inline
function ImageIdAutoConvertPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        
        // Verificar se o texto contém o padrão [Imagem_ID: numero]
        const imageIdPattern = /\[Imagem_ID:\s*\d+\]/;
        
        if (imageIdPattern.test(text)) {
          event.preventDefault();
          
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;

            // Criar nó de texto com formatação de código
            const codeNode = $createTextNode(text);
            codeNode.setFormat('code');
            selection.insertNodes([codeNode]);
          });
          
          return true;
        }
        
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}

// Componente principal do editor Lexical completo
export default function LexicalEditor({ content = '', onChange, onEditorStateChange, onContentStatusChange, onEditorInstanceChange, className = '', templateSections, viewMode = 'editor', initialEditorState, markdownContent: mdxContent = '' }: LexicalEditorProps): JSX.Element {
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
  
  // State para controlar o markdown atual
  const [currentMarkdown, setCurrentMarkdown] = useState('');
  
  // Hook para capturar markdown quando mudar para preview
  React.useEffect(() => {
    if (viewMode === 'preview' && editorInstance) {
      editorInstance.getEditorState().read(() => {
        const markdown = convertToMarkdown(editorInstance.getEditorState());
        setCurrentMarkdown(markdown);
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
          // Verificar se o parágrafo tem texto ou contém imagens
          const hasText = child.getTextContent().trim().length > 0;
          const hasImages = (child as any).getChildren().some((innerChild: any) => 
            innerChild.getType() === 'image' || innerChild.getType() === 'image-with-metadata'
          );
          return hasText || hasImages;
        }
        // Outros tipos de nós (tabelas, imagens, collapsibles, etc.) sempre contam como conteúdo
        return true;
      });
      
      // Notificar mudança de status de conteúdo
      if (onContentStatusChange) {
        onContentStatusChange(hasRealContent);
      }
      
      // Gerar markdown em tempo real
      const markdown = convertToMarkdown(editorState);

      setCurrentMarkdown(markdown);
      
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
          {viewMode === 'editor' && (
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
          )}
          <div className="flex-1 p-4 dark:bg-[#020203] overflow-y-auto">
            {viewMode === 'editor' ? (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className="w-full outline-none resize-none text-gray-900 dark:text-[#E5E7EB] dark:bg-[#020203]"
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
            ) : viewMode === 'preview' ? (
              <div className="w-full h-full p-6 overflow-auto bg-slate-100">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Visualização Markdown</h3>
                      <p className="text-sm text-gray-600 mt-1">Representação em markdown do conteúdo do editor</p>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-300 overflow-x-auto">
                      {currentMarkdown || '// Nenhum conteúdo para visualizar\n// Adicione texto no editor para ver a conversão markdown'}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full p-6 overflow-auto bg-slate-100">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">Preview MDX</h3>
                      <p className="text-sm text-gray-600 mt-1">Visualização renderizada do conteúdo markdown</p>
                    </div>
                    <MarkdownPreview 
                      content={currentMarkdown} 
                      className="prose prose-lg max-w-none"
                    />
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
          <ImageIdAutoConvertPlugin />
          <TemplateSectionsPlugin sections={templateSections} />
          <EditorInstancePlugin setEditorInstance={(editor) => {
            setEditorInstance(editor);
            if (onEditorInstanceChange) {
              onEditorInstanceChange(editor);
            }
          }} />
          <AutoFocusPlugin />
          <FocusPlugin initialEditorState={initialEditorState} />
        </div>
      </LexicalComposer>
    </div>
  );
}