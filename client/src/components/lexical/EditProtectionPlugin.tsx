import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';

// Plugin que protege contra edição fora dos containers colapsíveis
export default function EditProtectionPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();
  const lastToastTime = useRef<number>(0);
  
  // Função para mostrar toast com debounce
  const showProtectionToast = () => {
    const now = Date.now();
    if (now - lastToastTime.current > 2000) { // Mostrar no máximo 1 toast a cada 2 segundos
      lastToastTime.current = now;
      toast({
        title: "Área protegida",
        description: "A edição só é permitida dentro dos containers do documento",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Flag para controlar se a proteção está ativa
    let protectionActive = false;
    
    // Verificar se o foco está em um input do header field
    const isHeaderFieldInputFocused = () => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('data-header-field-input') === 'true';
    };
    
    // Verificar se estamos editando um título de container
    const isTitleEditingActive = () => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('data-editing-title') === 'true';
    };
    
    // Ativar proteção após 2 segundos para permitir foco inicial e carregamento completo
    const activationTimeout = setTimeout(() => {
      protectionActive = true;
      console.log('🛡️ EditProtectionPlugin: Proteção ativada após delay inicial de 2s');
    }, 2000);
    
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
      
      // Permitir se estamos editando título ou header field
      if (isTitleEditingActive() || isHeaderFieldInputFocused()) {
        return false; // Permitir comando
      }
      
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de inserir parágrafo fora de container');
          shouldBlock = true;
        }
      });
      
      if (shouldBlock) {
        showProtectionToast();
        return true; // Bloquear comando
      }
      
      return false; // Permitir comando
    };

    // Comando para interceptar Enter
    const handleEnterKey = (): boolean => {
      if (!protectionActive) return false; // Permitir durante grace period
      
      // Permitir se estamos editando título ou header field
      if (isTitleEditingActive() || isHeaderFieldInputFocused()) {
        return false; // Permitir comando
      }
      
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de usar Enter fora de container');
          shouldBlock = true;
        }
      });
      
      if (shouldBlock) {
        showProtectionToast();
      }
      
      return shouldBlock;
    };

    // Comando para interceptar Tab
    const handleTabKey = (): boolean => {
      if (!protectionActive) return false; // Permitir durante grace period
      
      // Permitir se estamos editando título ou header field
      if (isTitleEditingActive() || isHeaderFieldInputFocused()) {
        return false; // Permitir comando
      }
      
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de usar Tab fora de container');
          shouldBlock = true;
        }
      });
      
      if (shouldBlock) {
        showProtectionToast();
      }
      
      return shouldBlock;
    };

    // Comando para interceptar Paste
    const handlePaste = (): boolean => {
      if (!protectionActive) return false; // Permitir durante grace period
      
      // Permitir se estamos editando título ou header field
      if (isTitleEditingActive() || isHeaderFieldInputFocused()) {
        return false; // Permitir comando
      }
      
      let shouldBlock = false;
      editor.update(() => {
        if (!isSelectionInValidContainer()) {
          console.log('🚫 Edição bloqueada: tentativa de colar fora de container');
          shouldBlock = true;
        }
      });
      
      if (shouldBlock) {
        showProtectionToast();
      }
      
      return shouldBlock;
    };

    // Variável para rastrear se estamos digitando
    let isTyping = false;
    let typingTimeout: NodeJS.Timeout | null = null;
    
    // COMPLETAMENTE DESABILITADO - Não interferir com mudanças de seleção
    /*
    const handleSelectionChange = () => {
      // Função desabilitada para evitar interferências
      return;
    };
    */
    
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

    // Registrar handler para detectar e bloquear inserção de texto fora de containers
    const unregisterTextInsertion = editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        handleBeforeInput();
        
        // Se a proteção está ativa, verificar se a edição é permitida
        if (protectionActive) {
          // Permitir se estamos editando título ou header field
          if (isTitleEditingActive() || isHeaderFieldInputFocused()) {
            return false; // Permitir inserção de texto
          }
          
          let shouldBlock = false;
          editor.getEditorState().read(() => {
            if (!isSelectionInValidContainer()) {
              console.log('🚫 Edição bloqueada: tentativa de inserir texto fora de container');
              shouldBlock = true;
            }
          });
          
          if (shouldBlock) {
            showProtectionToast();
            return true; // Bloquear inserção de texto
          }
        }
        
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