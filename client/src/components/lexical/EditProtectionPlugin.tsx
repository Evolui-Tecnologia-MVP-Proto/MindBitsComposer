import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  PASTE_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  LexicalNode,
  ElementNode,
  $isElementNode
} from 'lexical';
import { $isCollapsibleContainerNode } from './CollapsibleNode';
import { $isCollapsibleContentNode } from './CollapsibleContentNode';
import { $isCollapsibleTitleNode } from './CollapsibleTitleNode';

// Plugin que protege contra edição fora dos containers colapsíveis
export default function EditProtectionPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Função para verificar se a seleção atual está dentro de um container colapsível
    const isSelectionInValidContainer = (): boolean => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const anchor = selection.anchor.getNode();
      const focus = selection.focus.getNode();
      
      // Verificar se ambos os pontos da seleção estão em containers válidos
      return isNodeInValidContainer(anchor) && isNodeInValidContainer(focus);
    };

    // Função para verificar se um nó está dentro de um container colapsível válido
    const isNodeInValidContainer = (node: LexicalNode): boolean => {
      let currentNode: LexicalNode | null = node;
      
      while (currentNode) {
        // Se estamos diretamente em um CollapsibleContentNode, permitir edição
        if ($isCollapsibleContentNode(currentNode)) {
          return true;
        }
        
        // Se chegamos ao root sem encontrar um CollapsibleContentNode, bloquear
        if (currentNode === $getRoot()) {
          return false;
        }
        
        // Subir na hierarquia
        currentNode = currentNode.getParent();
      }
      
      return false;
    };

    // Comando para interceptar tentativas de inserção de parágrafo
    const handleInsertParagraph = () => {
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de inserir parágrafo fora de container');
          return true; // Bloquear comando
        }
      });
      return false; // Permitir comando
    };

    // Comando para interceptar Enter
    const handleEnterKey = (): boolean => {
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de usar Enter fora de container');
          shouldBlock = true;
        }
      });
      return shouldBlock;
    };

    // Comando para interceptar Tab
    const handleTabKey = (): boolean => {
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de usar Tab fora de container');
          shouldBlock = true;
        }
      });
      return shouldBlock;
    };

    // Comando para interceptar Paste
    const handlePaste = (): boolean => {
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de colar fora de container');
          shouldBlock = true;
        }
      });
      return shouldBlock;
    };

    // Interceptar mudanças de seleção para posicionar cursor adequadamente
    const handleSelectionChange = () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor.getNode();
          
          // Se a seleção está fora de um container válido, mover para o primeiro container válido
          if (!isNodeInValidContainer(anchor)) {
            const root = $getRoot();
            let firstValidContainer: LexicalNode | null = null;
            
            // Buscar o primeiro CollapsibleContentNode
            const findFirstValidContainer = (node: LexicalNode): void => {
              if ($isCollapsibleContentNode(node) && !firstValidContainer) {
                firstValidContainer = node;
                return;
              }
              
              if ($isElementNode(node)) {
                const children = node.getChildren();
                for (const child of children) {
                  findFirstValidContainer(child);
                  if (firstValidContainer) break;
                }
              }
            };
            
            findFirstValidContainer(root);
            
            if (firstValidContainer && $isElementNode(firstValidContainer)) {
              const elementNode = firstValidContainer as ElementNode;
              const firstChild = elementNode.getFirstChild();
              if (firstChild) {
                firstChild.selectStart();
                console.log('📍 Cursor reposicionado para área editável válida');
              }
            }
          }
        }
      });
    };

    // Registrar comandos com alta prioridade para interceptar antes de outros plugins
    const unregisterInsertParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      handleInsertParagraph,
      COMMAND_PRIORITY_HIGH
    );

    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      handleEnterKey,
      COMMAND_PRIORITY_HIGH
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      handleTabKey,
      COMMAND_PRIORITY_HIGH
    );

    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      handlePaste,
      COMMAND_PRIORITY_HIGH
    );

    const unregisterLineBreak = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      handleInsertParagraph,
      COMMAND_PRIORITY_HIGH
    );

    // Monitorar mudanças no editor para aplicar proteção
    const unregisterUpdateListener = editor.registerUpdateListener(() => {
      handleSelectionChange();
    });

    console.log('✅ Plugin de proteção de edição ativado');

    // Cleanup
    return () => {
      unregisterInsertParagraph();
      unregisterEnter();
      unregisterTab();
      unregisterPaste();
      unregisterLineBreak();
      unregisterUpdateListener();
    };
  }, [editor]);

  return null;
}