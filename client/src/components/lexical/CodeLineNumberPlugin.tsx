import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export default function CodeLineNumberPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const updateLineNumbers = () => {
      // Processar diretamente os elementos DOM com classe editor-code
      setTimeout(() => {
        const codeBlocks = editor.getRootElement()?.querySelectorAll('.editor-code');
        
        codeBlocks?.forEach((codeBlock) => {
          const textContent = codeBlock.textContent || '';
          if (textContent) {
            const lines = textContent.split('\n');
            const lineNumbers = lines.map((_, index) => (index + 1).toString().padStart(2, ' ')).join('\n');
            (codeBlock as HTMLElement).setAttribute('data-gutter', lineNumbers);
          }
        });
      }, 100);
    };

    // Atualizar numeração quando o conteúdo mudar
    const unregisterListener = editor.registerUpdateListener(() => {
      updateLineNumbers();
    });

    // Atualizar uma vez na inicialização
    updateLineNumbers();

    return () => {
      unregisterListener();
    };
  }, [editor]);

  return null;
}