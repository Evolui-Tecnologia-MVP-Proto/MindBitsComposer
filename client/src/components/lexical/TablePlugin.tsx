import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, $isRangeSelection, $getSelection } from 'lexical';
import { $createTableNode, $createTableRowNode, $createTableCellNode, TableNode } from '@lexical/table';
import { $createParagraphNode, $createTextNode } from 'lexical';
import { useEffect } from 'react';

export const INSERT_CUSTOM_TABLE_COMMAND = 'INSERT_CUSTOM_TABLE_COMMAND';

export default function CustomTablePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_CUSTOM_TABLE_COMMAND as any,
      (payload: { rows: number; columns: number }) => {
        const { rows, columns } = payload;
        
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Criar tabela customizada
            const tableNode = $createTableNode();
            
            for (let row = 0; row < rows; row++) {
              const rowNode = $createTableRowNode();
              
              for (let col = 0; col < columns; col++) {
                const cellNode = $createTableCellNode(0);
                const paragraphNode = $createParagraphNode();
                const textNode = $createTextNode('');
                
                paragraphNode.append(textNode);
                cellNode.append(paragraphNode);
                rowNode.append(cellNode);
              }
              
              tableNode.append(rowNode);
            }
            
            $insertNodes([tableNode]);
          }
        });
        
        return true;
      },
      0
    );
  }, [editor]);

  return null;
}