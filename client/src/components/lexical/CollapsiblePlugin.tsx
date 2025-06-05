import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  NodeKey,
} from 'lexical';
import { $wrapNodes } from '@lexical/selection';
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

export function $insertCollapsibleContainer(isOpen = true): void {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }

  const title = $createCollapsibleTitleNode('Container Colapsável');
  const content = $createCollapsibleContentNode();
  const paragraph = $createParagraphNode();
  content.append(paragraph);

  const container = $createCollapsibleContainerNode(isOpen);
  container.append(title, content);

  $wrapNodes(selection, () => container);
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
          const node = editor.getEditorState().read(() => {
            return editor.getElementByKey(nodeKey);
          });
          if ($isCollapsibleContainerNode(node)) {
            node.toggleOpen();
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      removeInsertCollapsibleCommand();
      removeToggleCollapsibleCommand();
    };
  }, [editor]);

  return null;
}