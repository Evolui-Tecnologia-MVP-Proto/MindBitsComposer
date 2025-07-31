import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  NodeKey,
  $getNodeByKey,
} from 'lexical';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { useEffect } from 'react';

import {
  $createCollapsibleContainerNode,
  $isCollapsibleContainerNode,
  CollapsibleContainerNode,
} from './CollapsibleNode';
import {
  $createCollapsibleTitleNode,
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from './CollapsibleTitleNode';
import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
  CollapsibleContentNode,
} from './CollapsibleContentNode';

export const INSERT_COLLAPSIBLE_COMMAND: LexicalCommand<boolean> = createCommand(
  'INSERT_COLLAPSIBLE_COMMAND',
);

export const TOGGLE_COLLAPSIBLE_COMMAND: LexicalCommand<NodeKey> = createCommand(
  'TOGGLE_COLLAPSIBLE_COMMAND',
);

export const EDIT_COLLAPSIBLE_TITLE_COMMAND: LexicalCommand<NodeKey> = createCommand(
  'EDIT_COLLAPSIBLE_TITLE_COMMAND',
);

export const DELETE_COLLAPSIBLE_COMMAND: LexicalCommand<NodeKey> = createCommand(
  'DELETE_COLLAPSIBLE_COMMAND',
);

export function $insertCollapsibleContainer(isOpen = true, fromToolbar = false): void {
  const title = $createCollapsibleTitleNode('Container Colapsável');
  const content = $createCollapsibleContentNode();
  const paragraph = $createParagraphNode();
  content.append(paragraph);

  const container = $createCollapsibleContainerNode(isOpen, fromToolbar);
  container.append(title, content);

  $insertNodeToNearestRoot(container);
}

export default function CollapsiblePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CollapsibleContainerNode, CollapsibleTitleNode, CollapsibleContentNode])) {
      throw new Error(
        'CollapsiblePlugin: CollapsibleContainerNode, CollapsibleTitleNode, or CollapsibleContentNode not registered on editor',
      );
    }

    const removeInsertCollapsibleCommand = editor.registerCommand(
      INSERT_COLLAPSIBLE_COMMAND,
      (isOpen: boolean) => {
        editor.update(() => {
          $insertCollapsibleContainer(isOpen);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeToggleCollapsibleCommand = editor.registerCommand(
      TOGGLE_COLLAPSIBLE_COMMAND,
      (nodeKey: NodeKey) => {
        editor.update(() => {
          // Simplified toggle functionality
          console.log('Toggle collapsible with key:', nodeKey);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeEditCollapsibleTitleCommand = editor.registerCommand(
      EDIT_COLLAPSIBLE_TITLE_COMMAND,
      (nodeKey: NodeKey) => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isCollapsibleTitleNode(node)) {
            // Fazer o título editável temporariamente
            const newText = prompt('Digite o novo título:', node.getTextContent());
            if (newText !== null && newText.trim() !== '') {
              node.setTextContent(newText.trim());
            }
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeDeleteCollapsibleCommand = editor.registerCommand(
      DELETE_COLLAPSIBLE_COMMAND,
      (nodeKey: NodeKey) => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if (node && $isCollapsibleContainerNode(node)) {
            if (confirm('Tem certeza que deseja excluir este container?')) {
              node.remove();
            }
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // Event listeners para eventos personalizados do DOM
    const handleEditCollapsibleTitle = (event: any) => {
      if (event.detail && event.detail.nodeKey) {
        editor.dispatchCommand(EDIT_COLLAPSIBLE_TITLE_COMMAND, event.detail.nodeKey);
      }
    };

    const handleDeleteCollapsibleContainer = (event: any) => {
      if (event.detail && event.detail.nodeKey) {
        editor.dispatchCommand(DELETE_COLLAPSIBLE_COMMAND, event.detail.nodeKey);
      }
    };

    document.addEventListener('editCollapsibleTitle', handleEditCollapsibleTitle);
    document.addEventListener('deleteCollapsibleContainer', handleDeleteCollapsibleContainer);

    return () => {
      removeInsertCollapsibleCommand();
      removeToggleCollapsibleCommand();
      removeEditCollapsibleTitleCommand();
      removeDeleteCollapsibleCommand();
      document.removeEventListener('editCollapsibleTitle', handleEditCollapsibleTitle);
      document.removeEventListener('deleteCollapsibleContainer', handleDeleteCollapsibleContainer);
    };
  }, [editor]);

  return null;
}