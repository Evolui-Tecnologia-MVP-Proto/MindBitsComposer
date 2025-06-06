import React, { useState, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
// Simple error boundary wrapper
function SimpleErrorBoundary({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection,
  $createParagraphNode
} from 'lexical';

// Importar apenas os componentes que existem
import { ImageNode, $createImageNode } from './lexical/ImageNode';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

function onError(error: Error): void {
  console.error(error);
}

// Plugin para escutar eventos de inserção de imagem
function ImageEventListenerPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleInsertImage = (event: CustomEvent) => {
      const { src, altText } = event.detail;
      
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const imageNode = $createImageNode({
            src,
            altText: altText || 'Imagem inserida',
          });
          selection.insertNodes([imageNode]);
        }
      });
    };

    window.addEventListener('insertImage', handleInsertImage as EventListener);

    return () => {
      window.removeEventListener('insertImage', handleInsertImage as EventListener);
    };
  }, [editor]);

  return null;
}

function Placeholder(): JSX.Element {
  return <div className="editor-placeholder">Digite seu texto aqui...</div>;
}

interface LexicalEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onEditorStateChange?: (serializedState: string) => void;
  className?: string;
  templateSections?: string[];
  viewMode?: 'editor' | 'preview';
  initialEditorState?: string;
}

// Função simplificada para processar nós recursivamente
function processNodeRecursively(node: any, imageCounter: { count: number }): string {
  let markdown = '';
  
  console.log('🔍 Processando nó tipo:', node.getType(), 'Nó:', node);
  
  if (node.getType() === 'image') {
    console.log('🖼️ Processando imagem no markdown:', node);
    const src = node.getSrc();
    const alt = node.getAltText();
    const imageId = `img_${imageCounter.count}`;
    console.log('🖼️ Dados da imagem:', { src: src?.substring(0, 50) + '...', alt, imageId });
    markdown += `![${imageId}](${src})\n\n`;
    imageCounter.count++;
  } else if (node.getType() === 'paragraph') {
    // Processar filhos do parágrafo para encontrar imagens
    const children = node.getChildren();
    if (children && children.length > 0) {
      children.forEach((child: any) => {
        markdown += processNodeRecursively(child, imageCounter);
      });
    } else {
      const text = node.getTextContent();
      if (text.trim()) {
        markdown += text + '\n\n';
      }
    }
  } else {
    // Para outros tipos de nó, tentar processar filhos se existirem
    const children = node.getChildren ? node.getChildren() : [];
    if (children && children.length > 0) {
      children.forEach((child: any) => {
        markdown += processNodeRecursively(child, imageCounter);
      });
    } else {
      const text = node.getTextContent ? node.getTextContent() : '';
      if (text.trim()) {
        markdown += text + '\n\n';
      }
    }
  }
  
  return markdown;
}

// Função para converter conteúdo Lexical para markdown
function convertToMarkdown(editorState: any): string {
  let markdown = '';
  const imageCounter = { count: 1 };
  
  editorState.read(() => {
    const root = $getRoot();
    const children = root.getChildren();
    
    console.log('📄 Total de nós filhos encontrados:', children.length);
    
    children.forEach((node: any) => {
      markdown += processNodeRecursively(node, imageCounter);
    });
  });
  
  return markdown;
}

// Componente principal do editor Lexical simplificado
export default function LexicalEditor({ 
  content = '', 
  onChange, 
  onEditorStateChange, 
  className = '', 
  templateSections, 
  viewMode = 'editor', 
  initialEditorState 
}: LexicalEditorProps): JSX.Element {
  const [markdownContent, setMarkdownContent] = useState('');
  const [editorInstance, setEditorInstance] = useState<any>(null);
  
  React.useEffect(() => {
    if (viewMode === 'preview' && editorInstance) {
      editorInstance.getEditorState().read(() => {
        const markdown = convertToMarkdown(editorInstance.getEditorState());
        setMarkdownContent(markdown);
      });
    }
  }, [viewMode, editorInstance]);

  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError,
    editorState: initialEditorState ? initialEditorState : undefined,
    nodes: [
      ImageNode,
    ],
  };

  const handleEditorChange = React.useCallback((editorState: any, editor: any) => {
    setEditorInstance(editor);
    
    if (onEditorStateChange) {
      const serializedState = JSON.stringify(editorState.toJSON());
      onEditorStateChange(serializedState);
    }
    
    if (onChange) {
      editorState.read(() => {
        const markdown = convertToMarkdown(editorState);
        onChange(markdown);
      });
    }
  }, [onChange, onEditorStateChange]);

  if (viewMode === 'preview') {
    return (
      <div className={`prose max-w-none ${className}`}>
        <div 
          dangerouslySetInnerHTML={{ 
            __html: markdownContent.replace(/\n/g, '<br>') 
          }}
        />
      </div>
    );
  }

  return (
    <div className={`lexical-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container border rounded-lg overflow-hidden">
          <div className="editor-inner relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input min-h-[300px] p-4 outline-none"
                  aria-placeholder="Digite seu texto aqui..."
                  placeholder={<Placeholder />}
                />
              }
              placeholder={null}
              ErrorBoundary={SimpleErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ImageEventListenerPlugin />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}