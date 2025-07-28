import { useEffect } from 'react';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { CollapsibleContainerNode, $createCollapsibleContainerNode } from './lexical/CollapsibleNode';
import { CollapsibleTitleNode, $createCollapsibleTitleNode } from './lexical/CollapsibleTitleNode';
import { CollapsibleContentNode, $createCollapsibleContentNode } from './lexical/CollapsibleContentNode';

const theme = {
  // Tema vazio para teste
};

const nodes = [
  CollapsibleContainerNode,
  CollapsibleTitleNode,
  CollapsibleContentNode,
];

function TestContentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      
      // Criar container colapsível simples para teste
      const title = $createCollapsibleTitleNode('TESTE EDIÇÃO');
      const content = $createCollapsibleContentNode();
      
      // Adicionar parágrafo de teste editável
      const paragraph = $createParagraphNode();
      const text = $createTextNode('Clique aqui para testar edição - deve funcionar!');
      paragraph.append(text);
      content.append(paragraph);
      
      const container = $createCollapsibleContainerNode(true);
      container.append(title, content);
      
      root.append(container);
      
      console.log('🔍 TESTE: Container criado com parágrafo editável');
    });
  }, [editor]);

  return null;
}

export function TestEditableComponent() {
  const initialConfig = {
    namespace: 'TestEditor',
    theme,
    onError: (error: Error) => {
      console.error('Erro no editor de teste:', error);
    },
    nodes,
  };

  return (
    <div className="border p-4 m-4 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-2">Teste de Edição Collapsible</h3>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="min-h-32 p-3 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500" 
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
                Teste de edição...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={(editorState) => {
            console.log('🔍 TESTE: Editor state changed');
          }} />
          <TestContentPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}