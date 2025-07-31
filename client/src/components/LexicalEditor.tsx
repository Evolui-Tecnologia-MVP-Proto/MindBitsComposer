import React, { useCallback, useEffect, useState } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type TextFormatType, $createParagraphNode, $createTextNode, $insertNodes, $isParagraphNode, UNDO_COMMAND, REDO_COMMAND, COMMAND_PRIORITY_LOW, PASTE_COMMAND, $isTextNode, type LexicalNode } from 'lexical';

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
import { CollapsibleContainerNode, $createCollapsibleContainerNode, $isCollapsibleContainerNode } from './lexical/CollapsibleNode';
import { CollapsibleTitleNode, $createCollapsibleTitleNode, $isCollapsibleTitleNode } from './lexical/CollapsibleTitleNode';
import { CollapsibleContentNode, $createCollapsibleContentNode, $isCollapsibleContentNode } from './lexical/CollapsibleContentNode';
import CollapsiblePlugin, { INSERT_COLLAPSIBLE_COMMAND } from './lexical/CollapsiblePlugin';
import EditProtectionPlugin from './lexical/EditProtectionPlugin';

// Import dos nós e plugin de imagem
import { ImageNode, $createImageNode } from './lexical/ImageNode';
import { ImageWithMetadataNode, $createImageWithMetadataNode, type ImageWithMetadataPayload } from './lexical/ImageWithMetadataNode';
import ImagePlugin, { useImageUpload } from './lexical/ImagePlugin';

// Import do nó de campos do header
import { HeaderFieldNode, $createHeaderFieldNode, $isHeaderFieldNode } from './lexical/HeaderFieldNode';

// Import do plugin customizado de tabela
import CustomTablePlugin, { INSERT_CUSTOM_TABLE_COMMAND } from './lexical/TablePlugin';

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import MarkdownPreview from './MarkdownPreview';
import PluginModal from './plugin-modal';
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
          <div className="flex items-center gap-1 ml-2 text-xs">
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
              className="w-8 h-6 px-1 border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-[#1E293B] text-gray-900 dark:text-[#E5E7EB] rounded text-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-400"
              title="Linhas"
            />
            <span className="text-blue-600 dark:text-blue-400 font-bold">×</span>
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
              className="w-8 h-6 px-1 border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-[#1E293B] text-gray-900 dark:text-[#E5E7EB] rounded text-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-400"
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

// Função para processar formatação inline e criar TextNodes corretos
function processInlineFormatting(text: string): any[] {
  const result: any[] = [];
  
  // Lista de marcadores ordenados por prioridade (código primeiro para evitar conflitos)
  const markers = [
    { regex: /`([^`]+)`/g, format: 'code' },
    { regex: /\*\*(.*?)\*\*/g, format: 'bold' },
    { regex: /~~(.*?)~~/g, format: 'strikethrough' },
    { regex: /\*(.*?)\*/g, format: 'italic' }
  ];
  
  // Encontrar todas as ocorrências de formatação
  const matches: Array<{start: number, end: number, text: string, format: string}> = [];
  
  markers.forEach(marker => {
    let match: RegExpExecArray | null;
    // Reset regex para garantir que começamos do início
    marker.regex.lastIndex = 0;
    while ((match = marker.regex.exec(text)) !== null) {
      // Verificar se este match não sobrepõe com matches existentes
      const overlaps = matches.some(existingMatch => 
        (match!.index >= existingMatch.start && match!.index < existingMatch.end) ||
        (match!.index + match![0].length > existingMatch.start && match!.index + match![0].length <= existingMatch.end) ||
        (match!.index <= existingMatch.start && match!.index + match![0].length >= existingMatch.end)
      );
      
      if (!overlaps) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          format: marker.format
        });
      }
    }
  });
  
  // Ordenar por posição
  matches.sort((a, b) => a.start - b.start);
  
  // Se não há matches, retornar texto simples
  if (matches.length === 0) {
    result.push($createTextNode(text));
    return result;
  }
  
  // Processar matches sem sobreposição
  let lastEnd = 0;
  
  matches.forEach(match => {
    // Adicionar texto antes do match
    if (match.start > lastEnd) {
      const beforeText = text.substring(lastEnd, match.start);
      if (beforeText) {
        result.push($createTextNode(beforeText));
      }
    }
    
    // Criar node formatado
    const formattedNode = $createTextNode(match.text);
    formattedNode.setFormat(match.format as any);
    result.push(formattedNode);
    
    lastEnd = match.end;
  });
  
  // Adicionar texto restante após o último match
  if (lastEnd < text.length) {
    const remainingText = text.substring(lastEnd);
    if (remainingText) {
      result.push($createTextNode(remainingText));
    }
  }
  
  return result;
}

// Função para converter conteúdo markdown em nodes Lexical completos
function convertMarkdownToLexicalNodes(markdownContent: string): any[] {
  const lines = markdownContent.split('\n');
  const nodes: any[] = [];
  let isInCodeBlock = false;
  let codeBlockContent: string[] = [];
  
  for (const line of lines) {
    // Processar blocos de código
    if (line.trim().startsWith('```')) {
      if (isInCodeBlock) {
        // Finalizar bloco de código
        const codeContent = codeBlockContent.join('\n');
        const codeBlock = $createCodeNode(codeContent);
        nodes.push(codeBlock);
        codeBlockContent = [];
        isInCodeBlock = false;
      } else {
        // Iniciar bloco de código
        isInCodeBlock = true;
      }
      continue;
    }
    
    if (isInCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Linha vazia
    if (line.trim() === '') {
      const emptyParagraph = $createParagraphNode();
      nodes.push(emptyParagraph);
      continue;
    }
    
    // Processar cabeçalhos
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '');
      const heading = $createHeadingNode(`h${Math.min(level, 6)}` as any);
      const textNodes = processInlineFormatting(text);
      textNodes.forEach(node => heading.append(node));
      nodes.push(heading);
      continue;
    }
    
    // Processar linha normal com formatação
    const paragraph = $createParagraphNode();
    const textNodes = processInlineFormatting(line);
    textNodes.forEach(node => paragraph.append(node));
    nodes.push(paragraph);
  }
  
  // Finalizar bloco de código se ainda estiver aberto
  if (isInCodeBlock && codeBlockContent.length > 0) {
    const codeContent = codeBlockContent.join('\n');
    const codeBlock = $createCodeNode(codeContent);
    nodes.push(codeBlock);
  }
  
  return nodes;
}

// Função para parsear o md_file_old e extrair seções
function parseMdFileOldSections(mdFileOld: string): Map<string, string> {
  const sectionsMap = new Map<string, string>();
  
  if (!mdFileOld || mdFileOld.trim() === '') {
    return sectionsMap;
  }
  
  // Dividir o conteúdo pelas seções (## seguido de texto)
  const lines = mdFileOld.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Se havia uma seção anterior, salvar
      if (currentSection && currentContent.length > 0) {
        sectionsMap.set(currentSection, currentContent.join('\n').trim());
      }
      
      // Começar nova seção
      currentSection = line.substring(3).trim(); // Remove "## "
      currentContent = [];
    } else if (currentSection) {
      // Adicionar linha ao conteúdo da seção atual
      currentContent.push(line);
    }
  }
  
  // Adicionar a última seção se existir
  if (currentSection && currentContent.length > 0) {
    sectionsMap.set(currentSection, currentContent.join('\n').trim());
  }
  
  console.log('🔍 MD_FILE_OLD: Seções extraídas:', Array.from(sectionsMap.keys()));
  
  return sectionsMap;
}

// Função para remover numeração do início das seções (ex: "2. RESPOSTA / DESCRIÇÃO" -> "RESPOSTA / DESCRIÇÃO")
function removeNumberingFromSection(sectionName: string): string {
  // Remove padrão "número. " do início
  return sectionName.replace(/^\d+\.\s*/, '').trim();
}

// Função para mapear nome da seção do Lexical para possíveis nomes no md_file_old
function findMatchingSectionContent(lexicalSectionName: string, mdSections: Map<string, string>): string | null {
  // Remover numeração da seção do Lexical para mapeamento
  const cleanLexicalName = removeNumberingFromSection(lexicalSectionName);
  
  console.log(`🔍 MD_FILE_OLD: Mapeando "${lexicalSectionName}" -> "${cleanLexicalName}"`);
  
  // Caso especial para FAQ - PERGUNTA (mesmo após limpeza de numeração)
  if (cleanLexicalName === "FAQ - PERGUNTA") {
    // Procurar por "PERGUNTA" exata
    if (mdSections.has("PERGUNTA")) {
      console.log(`🔍 MD_FILE_OLD: Encontrado match exato "PERGUNTA" para "${lexicalSectionName}"`);
      return mdSections.get("PERGUNTA") || null;
    }
    
    // Procurar por padrão "[n] PERGUNTA" onde n é um número
    for (const sectionEntry of Array.from(mdSections.entries())) {
      const [sectionName, content] = sectionEntry;
      if (/^\[\d+\]\s*PERGUNTA$/.test(sectionName)) {
        console.log(`🔍 MD_FILE_OLD: Encontrado match pattern "${sectionName}" para "${lexicalSectionName}"`);
        return content;
      }
    }
  }
  
  // Mapeamento direto por nome limpo
  if (mdSections.has(cleanLexicalName)) {
    console.log(`🔍 MD_FILE_OLD: Encontrado match direto "${cleanLexicalName}" para "${lexicalSectionName}"`);
    return mdSections.get(cleanLexicalName) || null;
  }
  
  // Procurar por match parcial (sem case sensitivity) usando nome limpo
  const normalizedTarget = cleanLexicalName.toLowerCase().trim();
  for (const sectionEntry of Array.from(mdSections.entries())) {
    const [sectionName, content] = sectionEntry;
    if (sectionName.toLowerCase().trim() === normalizedTarget) {
      console.log(`🔍 MD_FILE_OLD: Encontrado match insensitive "${sectionName}" para "${lexicalSectionName}"`);
      return content;
    }
  }
  
  console.log(`🔍 MD_FILE_OLD: Nenhum match encontrado para "${lexicalSectionName}" (limpo: "${cleanLexicalName}")`);
  return null;
}

// Plugin para inserir seções de template automaticamente e popular com md_file_old
function TemplateSectionsPlugin({ sections, mdFileOld }: { sections?: string[], mdFileOld?: string }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const sectionsRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    console.log('🔥 TemplateSectionsPlugin - useEffect executado', { sections, sectionsLength: sections?.length, hasMdFileOld: !!mdFileOld });
    
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
          
          console.log('🔥 TemplateSectionsPlugin - Verificando conteúdo existente');
          
          // Parse do md_file_old para extrair seções
          const mdSections = parseMdFileOldSections(mdFileOld || '');
          
          // Mapear containers existentes para preservar conteúdo
          const children = root.getChildren();
          let headerFieldsContainer = null;
          const existingSections = new Map();
          
          children.forEach(child => {
            if ($isCollapsibleContainerNode(child)) {
              const childNodes = child.getChildren();
              const title = childNodes[0];
              if ($isCollapsibleTitleNode(title)) {
                const titleText = title.getTextContent();
                if (titleText.includes('Document Header') || titleText.includes('Campos') || titleText.includes('Template')) {
                  headerFieldsContainer = child;
                } else {
                  // Guardar containers de seções existentes
                  existingSections.set(titleText, child);
                }
              }
            }
          });
          
          console.log('🔥 TemplateSectionsPlugin - Seções existentes encontradas:', Array.from(existingSections.keys()));
          
          // Verificar se todas as seções já existem
          const missingSeções = sections.filter(sectionName => !existingSections.has(sectionName));
          const hasAllSections = missingSeções.length === 0;
          
          if (hasAllSections && headerFieldsContainer) {
            console.log('🔥 TemplateSectionsPlugin - Template já aplicado, preservando conteúdo');
            return; // Não fazer nada, template já está aplicado
          }
          
          // Limpar apenas se precisar aplicar o template
          root.clear();
          
          // Restaurar campos de header se existiam
          if (headerFieldsContainer) {
            root.append(headerFieldsContainer);
            console.log('🔥 TemplateSectionsPlugin - Campos de header preservados');
          }
          
          sections.forEach((sectionName) => {
            // Usar container existente se disponível, senão criar novo
            if (existingSections.has(sectionName)) {
              const existingContainer = existingSections.get(sectionName);
              root.append(existingContainer);
              console.log(`🔥 TemplateSectionsPlugin - Seção "${sectionName}" preservada com conteúdo`);
            } else {
              // Criar novo container apenas se não existir
              const title = $createCollapsibleTitleNode(sectionName);
              const content = $createCollapsibleContentNode();
              
              // Tentar encontrar conteúdo correspondente no md_file_old
              const matchingContent = findMatchingSectionContent(sectionName, mdSections);
              
              if (matchingContent && matchingContent.trim() !== '') {
                console.log(`🔍 MD_FILE_OLD: Conteúdo encontrado para seção "${sectionName}"`);
                
                // Converter markdown para Lexical nodes com formatação completa
                try {
                  const lexicalNodes = convertMarkdownToLexicalNodes(matchingContent);
                  
                  // Adicionar todos os nodes convertidos ao container
                  lexicalNodes.forEach(node => content.append(node));
                  
                  console.log(`✅ MD_FILE_OLD: Conteúdo com formatação inserido na seção "${sectionName}" (${lexicalNodes.length} nodes)`);
                } catch (error) {
                  console.error(`❌ MD_FILE_OLD: Erro ao converter markdown na seção "${sectionName}":`, error);
                  // Fallback: criar parágrafo vazio
                  const paragraph = $createParagraphNode();
                  content.append(paragraph);
                }
              } else {
                // Nenhum conteúdo encontrado - criar parágrafo vazio editável
                const paragraph = $createParagraphNode();
                content.append(paragraph);
                console.log(`🔍 MD_FILE_OLD: Nenhum conteúdo encontrado para seção "${sectionName}"`);
              }

              const container = $createCollapsibleContainerNode(false);
              container.append(title, content);
              
              root.append(container);
              console.log(`🔥 TemplateSectionsPlugin - Nova seção "${sectionName}" criada`);
            }
          });
          
          // Adicionar parágrafo final para permitir edição após os containers
          const finalParagraph = $createParagraphNode();
          root.append(finalParagraph);
        });
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, sections, mdFileOld]);

  return null;
}

// Plugin para garantir foco adequado quando carregando conteúdo existente
function FocusPlugin({ initialEditorState }: { initialEditorState?: string }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (initialEditorState) {
      // Aguardar um pouco para garantir que o conteúdo foi carregado
      const timeoutId = setTimeout(() => {
        console.log('🎯 InitialFocusPlugin: Iniciando busca por campo de header');
        
        editor.update(() => {
          const root = $getRoot();
          
          // Procurar primeiro por HeaderFieldNodes
          let firstHeaderField: HeaderFieldNode | null = null;
          
          const findFirstHeaderField = (node: LexicalNode): void => {
            if ($isHeaderFieldNode(node) && !firstHeaderField) {
              firstHeaderField = node as HeaderFieldNode;
              console.log('✅ Encontrado HeaderFieldNode:', (node as HeaderFieldNode).getLabel());
              return;
            }
            
            if ('getChildren' in node && typeof node.getChildren === 'function') {
              const children = (node as any).getChildren();
              for (const child of children) {
                findFirstHeaderField(child);
                if (firstHeaderField) break;
              }
            }
          };
          
          findFirstHeaderField(root);
          
          // Se encontrou um HeaderFieldNode, focar nele
          if (firstHeaderField) {
            // Aumentar delay e forçar foco múltiplas vezes
            const focusField = () => {
              const headerLabel = firstHeaderField!.getLabel();
              const inputElement = document.querySelector(`[data-label="${headerLabel}"] input`) as HTMLInputElement;
              if (inputElement) {
                console.log('🎯 Tentando focar no campo:', headerLabel);
                inputElement.focus();
                inputElement.click(); // Simular clique também
                
                // Verificar se o foco foi aplicado
                setTimeout(() => {
                  if (document.activeElement === inputElement) {
                    console.log('✅ Foco inicial aplicado com sucesso no campo:', headerLabel);
                  } else {
                    console.log('❌ Falha ao aplicar foco. Elemento ativo:', document.activeElement);
                  }
                }, 100);
              } else {
                console.log('❌ Input não encontrado para o campo:', headerLabel);
              }
            };
            
            // Tentar focar múltiplas vezes com delays diferentes
            // Delays aumentados para ocorrer após o grace period do EditProtectionPlugin
            setTimeout(focusField, 5100);  // Após 5s do grace period
            setTimeout(focusField, 2500);
            setTimeout(focusField, 3000);
          } else {
            console.log('❌ Nenhum HeaderFieldNode encontrado no documento');
            // Caso contrário, usar o comportamento padrão
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
          }
        });
        
        // Comentado - estava tirando o foco dos campos do header
        // setTimeout(() => {
        //   editor.focus();
        // }, 50);
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

// Plugin para enriquecer HeaderFieldNodes com informações de mapeamento
function HeaderFieldMappingPlugin({ templateMappings, documentData }: { templateMappings?: any; documentData?: any }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!templateMappings) return;

    // Função para extrair tipo e valor do mapeamento
    const extractMappingInfo = (mapping: any): { type: 'field' | 'formula' | 'plugin' | null; value: string } => {
      if (!mapping || mapping === '') {
        return { type: null, value: '' };
      }
      
      // Novo formato estruturado
      if (typeof mapping === 'object' && mapping.type && mapping.value) {
        return { type: mapping.type, value: mapping.value };
      }
      
      // Formato antigo - assumir como field
      return { type: 'field', value: mapping };
    };

    // Atualizar HeaderFieldNodes existentes com informações de mapeamento
    const updateHeaderFieldsWithMapping = () => {
      editor.update(() => {
        const root = $getRoot();
        
        console.log('🔍 HeaderFieldMappingPlugin: Starting update');
        console.log('📋 Template mappings:', templateMappings);
        
        // Função recursiva para percorrer todos os nodes
        const visitNodes = (node: LexicalNode) => {
          if (node.getType() === 'header-field') {
            const headerNode = node as HeaderFieldNode;
            const label = headerNode.getLabel();
            const headerKey = `header.${label}`;
            const mapping = templateMappings[headerKey];
            
            console.log(`🏷️ Found header field: "${label}", key: "${headerKey}"`);
            console.log(`📦 Mapping for this field:`, mapping);
            
            if (mapping) {
              const { type, value } = extractMappingInfo(mapping);
              
              console.log(`✅ Extracted mapping - Type: ${type}, Value: ${value}`);
              
              // Criar novo node com informações de mapeamento
              if (type && !headerNode.getMappingType()) {
                console.log(`🔄 Creating new node with mapping info for "${label}"`);
                const newNode = $createHeaderFieldNode(
                  label,
                  headerNode.getValue(),
                  headerNode.__placeholder,
                  type,
                  value
                );
                headerNode.replace(newNode);
              } else if (headerNode.getMappingType()) {
                console.log(`ℹ️ Node "${label}" already has mapping type: ${headerNode.getMappingType()}`);
              }
            } else {
              console.log(`❌ No mapping found for field "${label}"`);
            }
          }
          
          // Recursivamente visitar filhos
          if ('getChildren' in node && typeof node.getChildren === 'function') {
            const children = node.getChildren();
            children.forEach((child: LexicalNode) => visitNodes(child));
          }
        };
        
        // Começar a visita pela raiz
        visitNodes(root);
        console.log('✅ HeaderFieldMappingPlugin: Update complete');
      });
    };

    // Executar após um pequeno delay para garantir que o documento foi carregado
    const timeoutId = setTimeout(updateHeaderFieldsWithMapping, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [editor, templateMappings, documentData]);

  return null;
}

// Interface para campos do header
interface HeaderField {
  key: string;
  value: string;
}

// Interface para as props do LexicalEditor
interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onEditorStateChange?: (editorState: string) => void;
  onContentStatusChange?: (hasContent: boolean) => void;
  onEditorInstanceChange?: (instance: any) => void;
  className?: string;
  templateSections?: string[];
  templateStructure?: any; // Adicionar para processar header
  viewMode?: 'editor' | 'preview' | 'mdx';
  initialEditorState?: string;
  markdownContent?: string;
  mdFileOld?: string;
  isEnabled?: boolean;
  documentData?: any; // Dados do documento para preenchimento automático
  templateMappings?: any; // Mapeamentos do template
}

// Componente principal do editor Lexical completo
export default function LexicalEditor({ content = '', onChange, onEditorStateChange, onContentStatusChange, onEditorInstanceChange, className = '', templateSections, templateStructure, viewMode = 'editor', initialEditorState, markdownContent: mdxContent = '', mdFileOld = '', isEnabled = true, documentData, templateMappings }: LexicalEditorProps): JSX.Element {
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [tableRows, setTableRows] = useState(2);
  const [tableColumns, setTableColumns] = useState(3);
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);
  const [selectedTableElement, setSelectedTableElement] = useState<HTMLTableElement | null>(null);
  const [markdownViewMode, setMarkdownViewMode] = useState<'current' | 'old'>('current');
  const [headerFields, setHeaderFields] = useState<HeaderField[]>([]);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [currentFieldContext, setCurrentFieldContext] = useState<{label: string, nodeKey: string} | null>(null);
  const { toast } = useToast();
  
  // Função para processar fórmulas simples (SUBSTR, concatenação)
  const processFormula = (formula: string, data: any): string => {
    console.log(`🔍 DEBUG - processFormula: "${formula}"`);
    console.log(`🔍 DEBUG - dados disponíveis:`, data);
    console.log(`🔍 DEBUG - general_columns:`, data.general_columns);
    
    let result = formula;
    
    // Helper function to get field value from data
    const getFieldValue = (fieldName: string): string => {
      let value = '';
      
      // Primeiro tentar diretamente no data
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        value = String(data[fieldName]);
        console.log(`🔍 DEBUG - Campo "${fieldName}" encontrado em data: "${value}"`);
      }
      // Depois tentar em general_columns
      else if (data.general_columns && data.general_columns[fieldName] !== undefined && data.general_columns[fieldName] !== null) {
        value = String(data.general_columns[fieldName]);
        console.log(`🔍 DEBUG - Campo "${fieldName}" encontrado em general_columns: "${value}"`);
      }
      // Tentar variações conhecidas
      else {
        switch (fieldName) {
          case 'id_origem_txt':
            value = String(data.id_origem_txt || data.idOrigemTxt || '');
            break;
          case 'created_at':
            value = String(data.created_at || data.createdAt || '');
            break;
          default:
            console.log(`❌ DEBUG - Campo "${fieldName}" não encontrado`);
            return fieldName; // Retornar o nome original se não encontrar
        }
      }
      
      // Verificar se o valor é um datetime e formatá-lo para DD/MM/AAAA
      if (value && value !== fieldName) {
        // Tentar detectar formato de datetime (ISO, timestamp, etc.)
        const datePatterns = [
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
          /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/, // SQL datetime
          /^\d{4}-\d{2}-\d{2}$/, // Data simples YYYY-MM-DD
        ];
        
        const isDateTime = datePatterns.some(pattern => pattern.test(value)) || 
                          (!isNaN(Date.parse(value)) && value.includes('-') && value.length > 8);
        
        if (isDateTime) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              // Formatar para DD/MM/AAAA
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              value = `${day}/${month}/${year}`;
              
              console.log(`📅 DEBUG - DateTime "${fieldName}" formatado para "${value}"`);
            }
          } catch (error) {
            console.log(`⚠️ DEBUG - Erro ao formatar datetime "${fieldName}":`, error);
          }
        }
      }
      
      return value;
    };
    
    // Processar funções SUBSTR
    result = result.replace(/SUBSTR\(([^,]+),\s*(\d+),\s*(\d+)\)/g, (match, field, start, length) => {
      const fieldName = field.trim();
      const fieldValue = getFieldValue(fieldName);
      const substringResult = fieldValue.substring(parseInt(start), parseInt(start) + parseInt(length));
      console.log(`🔍 DEBUG - SUBSTR(${fieldName}, ${start}, ${length}) = "${substringResult}"`);
      return substringResult;
    });
    
    // Substituir campos por seus valores - múltiplas iterações
    const maxIterations = 10;
    let currentIteration = 0;
    
    while (currentIteration < maxIterations) {
      let hadReplacement = false;
      
      // Usar Object.keys para garantir que pegamos todos os campos disponíveis
      const allFields = new Set([
        ...Object.keys(data),
        ...(data.general_columns ? Object.keys(data.general_columns) : [])
      ]);
      
      // Ordenar campos por tamanho decrescente para evitar substituições parciais
      const sortedFields = Array.from(allFields).sort((a, b) => b.length - a.length);
      
      for (const fieldName of sortedFields) {
        const regex = new RegExp(`\\b${fieldName}\\b`, 'g');
        if (regex.test(result)) {
          const fieldValue = getFieldValue(fieldName);
          result = result.replace(regex, fieldValue);
          hadReplacement = true;
          console.log(`🔍 DEBUG - Substituindo campo "${fieldName}" por "${fieldValue}"`);
        }
      }
      
      // Verificar campos conhecidos adicionais
      const knownFields = ['responsavel', 'id_origem_txt', 'modulo', 'sistema', 'created_at'];
      for (const fieldName of knownFields) {
        if (!allFields.has(fieldName)) {
          const regex = new RegExp(`\\b${fieldName}\\b`, 'g');
          if (regex.test(result)) {
            const fieldValue = getFieldValue(fieldName);
            result = result.replace(regex, fieldValue);
            hadReplacement = true;
            console.log(`🔍 DEBUG - Substituindo campo conhecido "${fieldName}" por "${fieldValue}"`);
          }
        }
      }
      
      // Se não houve substituições nesta iteração, parar
      if (!hadReplacement) {
        break;
      }
      
      currentIteration++;
    }
    
    console.log(`🔍 DEBUG - Após substituição de campos: "${result}"`);
    
    // Processar concatenação (+) - remover aspas e juntar
    const parts = result.split(/\s*\+\s*/);
    result = parts.map(part => {
      // Remover aspas se existirem
      if (part.startsWith("'") && part.endsWith("'")) {
        return part.slice(1, -1);
      }
      return part;
    }).join('');
    
    console.log(`✅ DEBUG - Formula resultado final: "${result}"`);
    return result;
  };

  // Função para preencher campos automaticamente com base no mapeamento
  const populateFieldFromMapping = (fieldName: string): { value: string; type: 'field' | 'formula' | 'plugin' | null; mappingValue?: string } => {
    console.log(`🔍 DEBUG - populateFieldFromMapping: Iniciando para campo "${fieldName}"`);
    console.log(`🔍 DEBUG - templateMappings:`, templateMappings);
    console.log(`🔍 DEBUG - documentData:`, documentData);

    if (!templateMappings || !documentData) {
      console.log(`❌ DEBUG: Sem mapeamento ou dados - templateMappings: ${!!templateMappings}, documentData: ${!!documentData}`);
      return { value: '', type: null };
    }

    // Buscar por mapeamento de campo de header
    const headerKey = `header.${fieldName}`;
    console.log(`🔍 DEBUG: Procurando chave "${headerKey}" nos mapeamentos`);
    
    const mapping = templateMappings[headerKey];
    console.log(`🔍 DEBUG: Mapeamento encontrado:`, mapping);
    
    if (!mapping || mapping === '') {
      console.log(`❌ DEBUG: Sem mapeamento para campo "${fieldName}"`);
      return { value: '', type: null };
    }
    
    // Novo formato estruturado
    if (typeof mapping === 'object' && mapping.type && mapping.value) {
      const mappingType = mapping.type;
      const mappingValue = mapping.value;
      
      console.log(`🔍 DEBUG: Tipo de mapeamento: ${mappingType}, Valor: ${mappingValue}`);
      
      switch (mappingType) {
        case 'field':
          // Campo direto do documento
          let fieldValue = documentData[mappingValue];
          
          // Se não encontrou, tentar em general_columns
          if ((fieldValue === undefined || fieldValue === null) && documentData.general_columns) {
            fieldValue = documentData.general_columns[mappingValue];
          }
          
          // Se ainda não encontrou, tentar variações de nome
          if (fieldValue === undefined || fieldValue === null) {
            switch (mappingValue) {
              case 'id_origem_txt':
                fieldValue = documentData.id_origem_txt || documentData.idOrigemTxt || '';
                break;
              case 'created_at':
                fieldValue = documentData.created_at || documentData.createdAt || '';
                break;
              default:
                fieldValue = '';
            }
          }
          
          // Formatação de datetime para DD/MM/AAAA
          let formattedValue = String(fieldValue || '');
          if (formattedValue && formattedValue !== '') {
            // Tentar detectar formato de datetime
            const datePatterns = [
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime
              /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/, // SQL datetime
              /^\d{4}-\d{2}-\d{2}$/, // Data simples YYYY-MM-DD
            ];
            
            const isDateTime = datePatterns.some(pattern => pattern.test(formattedValue)) || 
                              (!isNaN(Date.parse(formattedValue)) && formattedValue.includes('-') && formattedValue.length > 8);
            
            if (isDateTime) {
              try {
                const date = new Date(formattedValue);
                if (!isNaN(date.getTime())) {
                  // Formatar para DD/MM/AAAA
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  formattedValue = `${day}/${month}/${year}`;
                  
                  console.log(`📅 DEBUG - DateTime "${fieldValue}" formatado para "${formattedValue}"`);
                }
              } catch (error) {
                console.log(`⚠️ DEBUG - Erro ao formatar datetime "${fieldValue}":`, error);
              }
            }
          }
          
          console.log(`✅ DEBUG: Campo ${mappingType} - valor: "${formattedValue}"`);
          return { value: formattedValue, type: 'field', mappingValue };
          
        case 'formula':
          // Processar fórmula
          const formulaResult = processFormula(mappingValue, documentData);
          console.log(`✅ DEBUG: Fórmula processada - resultado: "${formulaResult}"`);
          return { value: formulaResult, type: 'formula', mappingValue };
          
        case 'plugin':
          // Plugin - não preencher automaticamente, mas retornar info
          console.log(`✅ DEBUG: Plugin configurado - ID: "${mappingValue}"`);
          return { value: '', type: 'plugin', mappingValue };
          
        default:
          console.log(`❌ DEBUG: Tipo de mapeamento desconhecido: "${mappingType}"`);
          return { value: '', type: null };
      }
    }
    
    // Formato antigo (retrocompatibilidade) - assumir como field
    console.log(`⚠️ DEBUG: Formato antigo detectado, tratando como campo`);
    const mappedColumn = mapping;
    let value = '';
    
    // Primeiro tentar diretamente no documentData
    if (documentData[mappedColumn]) {
      value = documentData[mappedColumn];
    }
    // Depois tentar em general_columns
    else if (documentData.general_columns && documentData.general_columns[mappedColumn]) {
      value = documentData.general_columns[mappedColumn];
    }
    // Por último, tentar campos padrão
    else {
      switch (mappedColumn) {
        case 'objeto':
          value = documentData.objeto || '';
          break;
        case 'origem':
          value = documentData.origem || '';
          break;
        case 'responsavel':
          value = documentData.responsavel || '';
          break;
        case 'observacoes':
          value = documentData.observacoes || '';
          break;
        case 'id_origem_txt':
          value = documentData.id_origem_txt || documentData.idOrigemTxt || '';
          break;
        case 'created_at':
          value = documentData.created_at || documentData.createdAt || '';
          break;
        case 'sistema':
          value = documentData.sistema || '';
          break;
        case 'modulo':
          value = documentData.modulo || '';
          break;
        default:
          value = '';
      }
    }
    
    return { value: String(value || ''), type: 'field', mappingValue: mappedColumn };
  };

  // Event listeners para refresh e unplug dos campos de header
  useEffect(() => {
    const handleHeaderFieldRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { label, mappingType, mappingValue, nodeKey } = customEvent.detail;
      
      console.log('🔄 HeaderField Refresh Event:', customEvent.detail);
      console.log('📊 documentData atual:', documentData);
      console.log('📊 templateMappings atual:', templateMappings);
      
      if (!editorInstance || !documentData || !templateMappings) {
        console.log('❌ Cannot refresh: missing editor or data');
        return;
      }
      
      // Re-executar a lógica de preenchimento
      const mappingInfo = populateFieldFromMapping(label);
      
      console.log('🔍 Mapping info result:', mappingInfo);
      console.log('📝 Value to be set:', mappingInfo.value);
      
      // Sempre tentar atualizar, mesmo se o valor estiver vazio
      editorInstance.update(() => {
        const node = $getNodeByKey(nodeKey);
        console.log('🔍 Node encontrado:', node);
        console.log('🔍 Node type:', node?.getType());
        console.log('🔍 Node tem setValue:', node && 'setValue' in node);
        
        if (node && 'setValue' in node) {
          const newValue = mappingInfo.value || '';
          console.log(`📝 Chamando setValue com valor: "${newValue}"`);
          (node as any).setValue(newValue);
          console.log(`✅ Campo ${label} atualizado com valor: "${newValue}"`);
          
          // Verificar se o valor foi realmente atualizado
          const updatedValue = (node as any).getValue();
          console.log(`🔍 Valor após atualização: "${updatedValue}"`);
        } else {
          console.log(`❌ Não foi possível encontrar o nó ${nodeKey} ou ele não tem método setValue`);
        }
      });
    };
    
    const handleHeaderFieldUnplug = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { label, mappingType, mappingValue, nodeKey } = customEvent.detail;
      
      console.log('🔌 HeaderField Unplug Event:', customEvent.detail);
      
      // Verificar se é um mapeamento de plugin
      if (mappingType !== 'plugin') {
        console.log('❌ Mapeamento não é do tipo plugin');
        return;
      }
      
      // Buscar o plugin pelo ID (mappingValue)
      const pluginId = mappingValue;
      
      // Fazer requisição para verificar o status do plugin
      fetch(`/api/plugins/${pluginId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Plugin não encontrado');
          }
          return response.json();
        })
        .then(plugin => {
          console.log('🔍 Plugin encontrado:', plugin);
          console.log('🔍 Status do plugin:', `"${plugin.status}"`, typeof plugin.status);
          console.log('🔍 Comparação status:', plugin.status !== 'active', plugin.status === 'active');
          
          // Verificar se o plugin está ativo
          if (plugin.status !== 'active') {
            console.log('❌ Plugin não está ativo, status atual:', plugin.status);
            toast({
              title: "Plugin inativo",
              description: `O plugin "${plugin.name}" está inativo e não pode ser executado.`,
              variant: "destructive",
            });
            return;
          }
          
          // Verificar se o plugin tem página de execução
          if (!plugin.pageName || plugin.pageName.trim() === '') {
            toast({
              title: "Plugin sem execução",
              description: `O plugin "${plugin.name}" não possui página de execução configurada.`,
              variant: "destructive",
            });
            return;
          }
          
          // Se chegou até aqui, o plugin está válido - abrir modal
          console.log(`🚀 Abrindo plugin "${plugin.name}" para o campo "${label}"`);
          
          // Salvar o contexto do campo que invocou o plugin
          setCurrentFieldContext({ label, nodeKey });
          
          // Abrir o modal do plugin
          setSelectedPlugin(plugin);
          setIsPluginModalOpen(true);
        })
        .catch(error => {
          console.error('❌ Erro ao verificar plugin:', error);
          toast({
            title: "Erro no plugin",
            description: "Não foi possível verificar o status do plugin.",
            variant: "destructive",
          });
        });
    };
    
    window.addEventListener('headerFieldRefresh', handleHeaderFieldRefresh);
    window.addEventListener('headerFieldUnplug', handleHeaderFieldUnplug);
    
    return () => {
      window.removeEventListener('headerFieldRefresh', handleHeaderFieldRefresh);
      window.removeEventListener('headerFieldUnplug', handleHeaderFieldUnplug);
    };
  }, [editorInstance, documentData, templateMappings, toast]);

  // Processar template structure e inserir campos do header no editor
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect chamado', { 
      templateStructure: templateStructure, 
      editorInstance: !!editorInstance,
      templateType: typeof templateStructure,
      documentData: !!documentData,
      templateMappings: !!templateMappings
    });
    console.log('🔍 DEBUG: templateMappings completo:', templateMappings);
    console.log('🔍 DEBUG: documentData completo:', documentData);
    
    // Debug específico para os campos que deveriam ser preenchidos
    if (templateMappings && documentData) {
      console.log('🔍 DEBUG: Testando mapeamentos específicos:');
      console.log('🔍 DEBUG: header.RAG Index =>', templateMappings['header.RAG Index'], '-> valor:', documentData[templateMappings['header.RAG Index']]);
      console.log('🔍 DEBUG: header.Sistema =>', templateMappings['header.Sistema'], '-> valor:', documentData[templateMappings['header.Sistema']]);
      console.log('🔍 DEBUG: header.Módulo =>', templateMappings['header.Módulo'], '-> valor:', documentData[templateMappings['header.Módulo']]);
      
      // Verificar todas as propriedades do documentData
      console.log('🔍 DEBUG: Propriedades disponíveis no documentData:', Object.keys(documentData));
      
      // Verificar campos específicos que esperamos
      console.log('🔍 DEBUG: documentData.id_origem_txt:', documentData.id_origem_txt);
      console.log('🔍 DEBUG: documentData.sistema:', documentData.sistema);
      console.log('🔍 DEBUG: documentData.modulo:', documentData.modulo);
      
      // Verificar general_columns se existir
      if (documentData.general_columns) {
        console.log('🔍 DEBUG: general_columns disponíveis:', Object.keys(documentData.general_columns));
        console.log('🔍 DEBUG: general_columns.id_origem_txt:', documentData.general_columns.id_origem_txt);
        console.log('🔍 DEBUG: general_columns.sistema:', documentData.general_columns.sistema);
        console.log('🔍 DEBUG: general_columns.modulo:', documentData.general_columns.modulo);
      }
    }
    
    if (editorInstance && templateStructure) {
      console.log('🔍 DEBUG: Processando template...');
      
      // Inserir campos de exemplo para testar se funciona
      const testFields = {
        "RAG Index": "",
        "Titulo": "",
        "Data": "",
        "Sistema": "",
        "Módulo": "",
        "Caminho": ""
      };
      
      // Usar campos do template se existirem, senão usar campos de teste
      let fieldsToUse: Record<string, string> = testFields;
      
      if (templateStructure && typeof templateStructure === 'object' && templateStructure.header) {
        console.log('🔍 DEBUG: Template tem header:', templateStructure.header);
        fieldsToUse = templateStructure.header as Record<string, string>;
      } else {
        console.log('🔍 DEBUG: Usando campos de teste');
      }
      
      const headerKeys = Object.keys(fieldsToUse);
      console.log('🔍 DEBUG: Campos para inserir:', headerKeys);
      
      if (headerKeys.length > 0) {
        console.log('🔍 DEBUG: Iniciando inserção...');
        
        // Timeout maior para garantir que TemplateSectionsPlugin termine primeiro
        setTimeout(() => {
          try {
            editorInstance.update(() => {
              console.log('🔍 DEBUG: Dentro do editor.update() - APÓS TemplateSectionsPlugin');
              const root = $getRoot();
              
              const children = root.getChildren();
              console.log('🔍 DEBUG: Elementos existentes:', children.length);
              
              // Verificar se já existe container de campos
              let hasHeaderContainer = false;
              children.forEach(child => {
                if ($isCollapsibleContainerNode(child)) {
                  const childNodes = child.getChildren();
                  const title = childNodes[0];
                  if ($isCollapsibleTitleNode(title)) {
                    const titleText = title.getTextContent();
                    if (titleText.includes('Document Header') || titleText.includes('Campos') || titleText.includes('Template')) {
                      hasHeaderContainer = true;
                    }
                  }
                }
              });
              
              if (!hasHeaderContainer) {
                console.log('🔍 DEBUG: Criando container de campos...');
                
                // Criar título do container
                const title = $createCollapsibleTitleNode('Document Header');
                
                // Criar conteúdo do container
                const content = $createCollapsibleContentNode();
                
                // Criar campos para cada item
                headerKeys.forEach((key, index) => {
                  console.log(`🔍 DEBUG: Criando campo ${index + 1}/${headerKeys.length}: ${key}`);
                  try {
                    // Tentar preencher automaticamente com base no mapeamento
                    const mappingInfo = populateFieldFromMapping(key);
                    
                    // Se não tem mapeamento, preencher apenas campos vazios
                    let finalValue = '';
                    if (mappingInfo.type && mappingInfo.value !== '') {
                      finalValue = mappingInfo.value;
                    }
                    
                    console.log(`🔍 DEBUG: Campo ${key} - mapeamento:`, mappingInfo, `valor final: "${finalValue}"`);
                    
                    const fieldNode = $createHeaderFieldNode(
                      key,
                      finalValue,
                      `Digite ${key.toLowerCase()}...`,
                      mappingInfo.type,
                      mappingInfo.mappingValue
                    );
                    content.append(fieldNode);
                    console.log(`✅ DEBUG: Campo ${key} criado com sucesso`);
                  } catch (fieldError) {
                    console.error(`❌ DEBUG: Erro ao criar campo ${key}:`, fieldError);
                  }
                });
                
                // Criar container colapsível
                const container = $createCollapsibleContainerNode(true);
                container.append(title, content);
                
                // Inserir no INÍCIO do documento (antes de qualquer seção do template)
                if (root.getFirstChild()) {
                  root.getFirstChild()!.insertBefore(container);
                } else {
                  root.append(container);
                }
                
                console.log('✅ DEBUG: Container de campos inserido com sucesso APÓS template!');
                
                // Posicionar cursor no primeiro campo após criação
                setTimeout(() => {
                  try {
                    editorInstance.update(() => {
                      const root = $getRoot();
                      let firstHeaderField: any = null;
                      
                      // Buscar o primeiro HeaderFieldNode no documento
                      root.getChildren().forEach(child => {
                        if ($isCollapsibleContainerNode(child)) {
                          const childNodes = child.getChildren();
                          childNodes.forEach(node => {
                            if ($isCollapsibleContentNode(node)) {
                              const contentChildren = node.getChildren();
                              contentChildren.forEach((contentChild: any) => {
                                if (contentChild.getType() === 'header-field' && !firstHeaderField) {
                                  firstHeaderField = contentChild;
                                }
                              });
                            }
                          });
                        }
                      });
                      
                      if (firstHeaderField) {
                        console.log('✅ DEBUG: Posicionando cursor no primeiro campo do header');
                        firstHeaderField.selectStart();
                      }
                    });
                  } catch (error) {
                    console.error('❌ DEBUG: Erro ao posicionar cursor:', error);
                  }
                }, 2100); // Delay após grace period do EditProtectionPlugin
              } else {
                console.log('⚠️ DEBUG: Container de campos já existe');
                
                // Se já existe, ainda assim tentar posicionar cursor no primeiro campo
                setTimeout(() => {
                  try {
                    editorInstance.update(() => {
                      const root = $getRoot();
                      let firstHeaderField: any = null;
                      
                      // Buscar o primeiro HeaderFieldNode no documento
                      root.getChildren().forEach(child => {
                        if ($isCollapsibleContainerNode(child)) {
                          const childNodes = child.getChildren();
                          childNodes.forEach(node => {
                            if ($isCollapsibleContentNode(node)) {
                              const contentChildren = node.getChildren();
                              contentChildren.forEach((contentChild: any) => {
                                if (contentChild.getType() === 'header-field' && !firstHeaderField) {
                                  firstHeaderField = contentChild;
                                }
                              });
                            }
                          });
                        }
                      });
                      
                      if (firstHeaderField) {
                        console.log('✅ DEBUG: Posicionando cursor no primeiro campo do header (container existente)');
                        firstHeaderField.selectStart();
                      }
                    });
                  } catch (error) {
                    console.error('❌ DEBUG: Erro ao posicionar cursor:', error);
                  }
                }, 2100); // Delay após grace period do EditProtectionPlugin
              }
            });
          } catch (error) {
            console.error('❌ DEBUG: Erro durante inserção:', error);
          }
        }, 1000); // Timeout maior para executar DEPOIS do TemplateSectionsPlugin
        
        // Backup timeout maior
        setTimeout(() => {
          editorInstance.update(() => {
            const root = $getRoot();
            if (root.getChildren().length === 0) {
              console.log('🔄 DEBUG: Tentativa de backup - inserindo parágrafo vazio');
              const paragraph = $createParagraphNode();
              root.append(paragraph);
            }
          });
        }, 500);
      }
    }
  }, [templateStructure, editorInstance, documentData, templateMappings]);

  // Função para atualizar campo do header
  const updateHeaderField = (index: number, value: string) => {
    const updatedFields = [...headerFields];
    updatedFields[index].value = value;
    setHeaderFields(updatedFields);
  };


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

  // Effect para adicionar event listeners de clique nas tabelas
  React.useEffect(() => {
    if (!editorInstance) return;

    const handleTableClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tableElement = target.closest('table');
      
      if (tableElement) {
        // Remover seleção de todas as outras tabelas
        document.querySelectorAll('table.lexical-table-selected').forEach(table => {
          table.classList.remove('lexical-table-selected');
        });
        
        // Adicionar classe de seleção à tabela clicada
        tableElement.classList.add('lexical-table-selected');
        setSelectedTableElement(tableElement as HTMLTableElement);
        
        // Prevenir propagação para não desselecionar imediatamente
        event.stopPropagation();
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tableElement = target.closest('table');
      
      // Se clicou fora de qualquer tabela, desselecionar todas
      if (!tableElement) {
        document.querySelectorAll('table.lexical-table-selected').forEach(table => {
          table.classList.remove('lexical-table-selected');
        });
        setSelectedTableElement(null);
      }
    };

    // Adicionar listeners
    const editorContainer = editorInstance.getRootElement()?.parentElement;
    if (editorContainer) {
      editorContainer.addEventListener('click', handleTableClick);
      document.addEventListener('click', handleDocumentClick);
    }

    // Cleanup
    return () => {
      if (editorContainer) {
        editorContainer.removeEventListener('click', handleTableClick);
        document.removeEventListener('click', handleDocumentClick);
      }
    };
  }, [editorInstance]);
  
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
      HeaderFieldNode,
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

          {viewMode === 'editor' && isEnabled && (
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
          <div className="flex-1 p-4 dark:bg-[#020203] overflow-auto lexical-canvas h-full min-h-0" style={{ maxHeight: '100%' }}>
            {viewMode === 'editor' ? (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable 
                    className={`w-full outline-none resize-none text-gray-900 dark:text-[#E5E7EB] dark:bg-[#020203] ${!isEnabled ? 'pointer-events-none opacity-50' : ''}`}
                    style={{ 
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: '1.6',
                      minHeight: '400px',
                      height: 'auto',
                      overflow: 'visible'
                    }}
                    contentEditable={isEnabled}
                  />
                }
                placeholder={<Placeholder />}
                ErrorBoundary={LexicalErrorBoundary}
              />
            ) : viewMode === 'preview' ? (
              <div className="w-full h-full p-6 overflow-auto bg-slate-100 dark:bg-[#020203]">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-sm border border-gray-200 dark:border-[#374151] p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-[#374151]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E5E7EB]">Visualização Markdown</h3>
                          <p className="text-sm text-gray-600 dark:text-[#9CA3AF] mt-1">
                            {markdownViewMode === 'current' 
                              ? 'Representação em markdown do conteúdo em edição'
                              : 'Versão original do documento (backup)'}
                          </p>
                        </div>
                        {mdFileOld && mdFileOld.trim() !== '' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => setMarkdownViewMode('current')}
                              variant={markdownViewMode === 'current' ? "default" : "outline"}
                              size="sm"
                              className={markdownViewMode === 'current' 
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : "border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#374151]"}
                            >
                              Em Edição
                            </Button>
                            <Button
                              onClick={() => setMarkdownViewMode('old')}
                              variant={markdownViewMode === 'old' ? "default" : "outline"}
                              size="sm"
                              className={markdownViewMode === 'old' 
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : "border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#374151]"}
                            >
                              Original
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-900 dark:text-[#E5E7EB] bg-gray-50 dark:bg-[#1B2028] p-4 rounded-md border border-gray-300 dark:border-[#374151] overflow-x-auto">
                      {markdownViewMode === 'current' 
                        ? (currentMarkdown || '// Nenhum conteúdo para visualizar\n// Adicione texto no editor para ver a conversão markdown')
                        : (mdFileOld || '// Nenhuma versão original disponível')}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full p-6 overflow-auto bg-slate-100 dark:bg-[#020203]">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white dark:bg-[#1B2028] rounded-lg shadow-sm border border-gray-200 dark:border-[#374151] p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-[#374151]">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E5E7EB]">Preview MDX</h3>
                      <p className="text-sm text-gray-600 dark:text-[#9CA3AF] mt-1">Visualização renderizada do conteúdo markdown</p>
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
          <TemplateSectionsPlugin sections={templateSections} mdFileOld={mdFileOld} />
          {/* <EditProtectionPlugin /> - Temporariamente desabilitado para resolver problema dos campos do header */}
          <HeaderFieldMappingPlugin templateMappings={templateMappings} documentData={documentData} />
          <EditorInstancePlugin setEditorInstance={(editor) => {
            setEditorInstance(editor);
            if (onEditorInstanceChange) {
              onEditorInstanceChange(editor);
            }
          }} />
          {/* <AutoFocusPlugin /> - Comentado porque estava interferindo com o foco dos campos do header */}
          <FocusPlugin initialEditorState={initialEditorState} />
        </div>
      </LexicalComposer>
      
      {/* Plugin Modal */}
      <PluginModal
        isOpen={isPluginModalOpen}
        onClose={() => {
          setIsPluginModalOpen(false);
          setCurrentFieldContext(null);
          setSelectedPlugin(null);
        }}
        plugin={selectedPlugin}
        onDataExchange={(data) => {
          console.log('🔄 Plugin data exchange recebido:', data);
          
          // Verificar se temos contexto do campo que invocou o plugin
          if (!currentFieldContext || !editorInstance) {
            console.log('❌ Contexto do campo ou editor não disponível');
            return;
          }
          
          const { label, nodeKey } = currentFieldContext;
          console.log(`🎯 Atualizando campo "${label}" (nodeKey: ${nodeKey}) com dados do plugin`);
          
          // Extrair o valor do plugin dependendo do formato dos dados
          let pluginValue = '';
          if (typeof data === 'string') {
            pluginValue = data;
          } else if (data && typeof data === 'object') {
            // Se o plugin retornou um objeto, tentar extrair o valor
            if (data.value) {
              pluginValue = String(data.value);
            } else if (data.closeModal !== undefined) {
              // Caso especial onde só há flag de fechar modal
              pluginValue = data.value || '';
            } else {
              // Converter objeto para string se necessário
              pluginValue = JSON.stringify(data);
            }
          }
          
          console.log(`📝 Valor extraído do plugin: "${pluginValue}"`);
          
          // Atualizar o campo HeaderField no editor
          editorInstance.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node && 'setValue' in node) {
              (node as any).setValue(pluginValue);
              console.log(`✅ Campo "${label}" atualizado com sucesso!`);
            } else {
              console.log(`❌ Não foi possível encontrar o nó ${nodeKey} ou ele não tem método setValue`);
            }
          });
          
          // Fechar o modal e limpar contexto
          if (data && typeof data === 'object' && data.closeModal) {
            setIsPluginModalOpen(false);
            setCurrentFieldContext(null);
            setSelectedPlugin(null);
          }
        }}
      />
    </div>
  );
}