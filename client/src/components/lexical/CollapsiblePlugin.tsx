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
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  const { toast } = useToast();

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
        console.log('🎯 EDIT_COLLAPSIBLE_TITLE_COMMAND executado com nodeKey:', nodeKey);
        
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          console.log('🔍 Node encontrado:', node);
          console.log('🔍 É CollapsibleTitleNode?', $isCollapsibleTitleNode(node));
          
          if ($isCollapsibleTitleNode(node)) {
            const currentText = node.getTextContent();
            console.log('📝 Texto atual:', currentText);
            
            // Fazer o título editável temporariamente
            const newText = prompt('Digite o novo título:', currentText);
            console.log('📝 Novo texto inserido:', newText);
            
            if (newText !== null && newText.trim() !== '') {
              node.setTextContent(newText.trim());
              console.log('✅ Texto definido para:', newText.trim());
              
              // Forçar atualização do DOM
              editor.update(() => {
                console.log('🔄 Forçando atualização do DOM');
              });
            } else {
              console.log('❌ Novo texto inválido ou cancelado');
            }
          } else {
            console.log('❌ Node não é CollapsibleTitleNode');
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeDeleteCollapsibleCommand = editor.registerCommand(
      DELETE_COLLAPSIBLE_COMMAND,
      (nodeKey: NodeKey) => {
        // Mostrar toast de confirmação em vez de confirm() do navegador
        const toastInstance = toast({
          title: "Confirmação de Exclusão",
          description: "A Exclusão do container excluira também todo o seu conteúdo. Confirma a exclusão?",
          variant: "destructive",
          action: (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Fechar o toast sem ação adicional
                  toastInstance.dismiss();
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  // Executar exclusão do container
                  editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if (node && $isCollapsibleContainerNode(node)) {
                      node.remove();
                    }
                  });
                  // Fechar o toast após a exclusão
                  toastInstance.dismiss();
                }}
              >
                Confirmar
              </Button>
            </div>
          ),
        });
        
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    // Event listeners para eventos personalizados do DOM
    const handleEditCollapsibleTitle = (event: any) => {
      console.log('📥 Evento editCollapsibleTitle recebido:', event.detail);
      if (event.detail && event.detail.nodeKey) {
        console.log('🚀 Disparando EDIT_COLLAPSIBLE_TITLE_COMMAND com nodeKey:', event.detail.nodeKey);
        editor.dispatchCommand(EDIT_COLLAPSIBLE_TITLE_COMMAND, event.detail.nodeKey);
      } else {
        console.log('❌ Evento sem nodeKey válido');
      }
    };

    const handleDeleteCollapsibleContainer = (event: any) => {
      if (event.detail && event.detail.nodeKey) {
        editor.dispatchCommand(DELETE_COLLAPSIBLE_COMMAND, event.detail.nodeKey);
      }
    };

    const handleUpdateCollapsibleTitle = (event: any) => {
      console.log('📨 Evento updateCollapsibleTitle recebido:', event.detail);
      if (event.detail && event.detail.nodeKey && event.detail.newText) {
        const { nodeKey, newText } = event.detail;
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          console.log('🔍 Nó encontrado:', node);
          if (node && $isCollapsibleTitleNode(node)) {
            node.setTextContent(newText);
            console.log('✅ Texto do título atualizado para:', newText);
          }
        });
      }
    };

    document.addEventListener('editCollapsibleTitle', handleEditCollapsibleTitle);
    document.addEventListener('deleteCollapsibleContainer', handleDeleteCollapsibleContainer);
    window.addEventListener('updateCollapsibleTitle', handleUpdateCollapsibleTitle);

    return () => {
      removeInsertCollapsibleCommand();
      removeToggleCollapsibleCommand();
      removeEditCollapsibleTitleCommand();
      removeDeleteCollapsibleCommand();
      document.removeEventListener('editCollapsibleTitle', handleEditCollapsibleTitle);
      document.removeEventListener('deleteCollapsibleContainer', handleDeleteCollapsibleContainer);
      window.removeEventListener('updateCollapsibleTitle', handleUpdateCollapsibleTitle);
    };
  }, [editor]);

  return null;
}