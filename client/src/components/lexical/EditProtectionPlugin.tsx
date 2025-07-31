import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  PASTE_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  SELECTION_CHANGE_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  LexicalNode,
  ElementNode,
  $isElementNode
} from 'lexical';
import { $isCollapsibleContainerNode } from './CollapsibleNode';
import { $isCollapsibleContentNode } from './CollapsibleContentNode';
import { $isCollapsibleTitleNode } from './CollapsibleTitleNode';
import { $isHeaderFieldNode, HeaderFieldNode } from './HeaderFieldNode';

// Plugin que protege contra edição fora dos containers colapsíveis
export default function EditProtectionPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Flag para controlar se a proteção está ativa
    let protectionActive = false;
    
    // Verificar se o foco está em um input do header field
    const isHeaderFieldInputFocused = () => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('data-header-field-input') === 'true';
    };
    
    // Ativar proteção após 5 segundos para permitir foco inicial e carregamento completo
    const activationTimeout = setTimeout(() => {
      protectionActive = true;
      console.log('🛡️ EditProtectionPlugin: Proteção ativada após delay inicial de 5s');
    }, 5000);
    
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
        
        // Se estamos em um HeaderFieldNode ou seus filhos, permitir edição
        if ($isHeaderFieldNode(currentNode)) {
          return true;
        }
        
        // Se chegamos ao root sem encontrar um nó válido, bloquear
        if (currentNode === $getRoot()) {
          // Verificar se o nó original está dentro de um HeaderFieldNode
          let parent = node.getParent();
          while (parent && parent !== $getRoot()) {
            if ($isHeaderFieldNode(parent)) {
              return true;
            }
            parent = parent.getParent();
          }
          return false;
        }
        
        // Subir na hierarquia
        currentNode = currentNode.getParent();
      }
      
      return false;
    };

    // Comando para interceptar tentativas de inserção de parágrafo
    const handleInsertParagraph = () => {
      if (!protectionActive) return false; // Permitir durante grace period
      
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
      if (!protectionActive) return false; // Permitir durante grace period
      
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
      if (!protectionActive) return false; // Permitir durante grace period
      
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
      if (!protectionActive) return false; // Permitir durante grace period
      
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de colar fora de container');
          shouldBlock = true;
        }
      });
      return shouldBlock;
    };

    // Variável para rastrear se estamos digitando
    let isTyping = false;
    let typingTimeout: NodeJS.Timeout | null = null;
    
    // Interceptar mudanças de seleção para posicionar cursor adequadamente
    const handleSelectionChange = () => {
      // Não fazer nada se a proteção ainda não está ativa
      if (!protectionActive) return;
      
      // Se estamos digitando, não reposicionar o cursor
      if (isTyping) return;
      
      // Se o foco está em um input do header field, não interferir
      if (isHeaderFieldInputFocused()) return;
      
      // Verificar se clicamos em um botão - não interferir com cliques em botões
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'BUTTON' || activeElement?.closest('button')) {
        return;
      }
      
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor.getNode();
          
          // Se a seleção está fora de um container válido E não é uma seleção colapsada (cursor),
          // mover para o primeiro container válido
          if (!isNodeInValidContainer(anchor) && selection.isCollapsed()) {
            const root = $getRoot();
            let firstValidContainer: LexicalNode | null = null;
            let firstHeaderField: HeaderFieldNode | null = null;
            
            // Buscar primeiro por HeaderFieldNodes
            const findFirstEditableArea = (node: LexicalNode): void => {
              // Priorizar HeaderFieldNodes
              if ($isHeaderFieldNode(node) && !firstHeaderField) {
                firstHeaderField = node as HeaderFieldNode;
                return;
              }
              
              // Se não encontrou HeaderField, buscar CollapsibleContentNode
              if ($isCollapsibleContentNode(node) && !firstValidContainer && !firstHeaderField) {
                firstValidContainer = node;
                return;
              }
              
              if ($isElementNode(node)) {
                const children = node.getChildren();
                for (const child of children) {
                  findFirstEditableArea(child);
                  if (firstHeaderField) break; // Parar se encontrou HeaderField
                }
              }
            };
            
            findFirstEditableArea(root);
            
            // Priorizar HeaderField se encontrado
            if (firstHeaderField) {
              console.log('📍 Focando em HeaderField');
              // Não fazer nada aqui - deixar o campo do header manter seu foco natural
              // Os campos do header gerenciam seu próprio foco através de seus inputs
            } else if (firstValidContainer && $isElementNode(firstValidContainer)) {
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
    
    // Detectar quando o usuário está digitando
    const handleBeforeInput = () => {
      isTyping = true;
      
      // Limpar timeout anterior se existir
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Definir novo timeout para resetar flag de digitação
      typingTimeout = setTimeout(() => {
        isTyping = false;
      }, 500); // 500ms após parar de digitar
      
      return false; // Permitir input normal
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

    // Registrar handler para detectar quando está digitando
    const unregisterTextInsertion = editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        handleBeforeInput();
        return false; // Permitir inserção de texto normal
      },
      COMMAND_PRIORITY_HIGH
    );
    
    // TEMPORARIAMENTE DESABILITADO: Está interferindo com os campos do header
    // Monitorar apenas mudanças de seleção (não a cada keystroke)
    /*
    const unregisterSelectionListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        handleSelectionChange();
        return false; // Permitir que outros listeners processem o comando
      },
      COMMAND_PRIORITY_LOW
    );
    */

    console.log('✅ Plugin de proteção de edição ativado');

    // Cleanup
    return () => {
      clearTimeout(activationTimeout);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      unregisterInsertParagraph();
      unregisterEnter();
      unregisterTab();
      unregisterPaste();
      unregisterLineBreak();
      unregisterTextInsertion();
      // unregisterSelectionListener(); // Desabilitado temporariamente
    };
  }, [editor]);

  return null;
}