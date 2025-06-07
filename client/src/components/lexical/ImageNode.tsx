import {
  $applyNodeReplacement,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  $createNodeSelection,
  $isNodeSelection,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  DecoratorNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useState, useEffect } from 'react';

export interface ImagePayload {
  altText: string;
  height?: number;
  key?: NodeKey;
  src: string;
  width?: number;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    src: string;
    width?: number;
  },
  SerializedLexicalNode
>;

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode;
    const node = $createImageNode({ altText, src });
    return { node };
  }
  return null;
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, src } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      src,
      width,
    });
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    element.setAttribute('width', this.__width.toString());
    element.setAttribute('height', this.__height.toString());
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  decorate(): JSX.Element {
    return <ImageComponent node={this} />;
  }
}

// Componente de imagem com funcionalidade de seleção e deleção
function ImageComponent({ node }: { node: ImageNode }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Image clicked, node key:', node.getKey());
    
    editor.update(() => {
      // Criar seleção de nó para esta imagem
      const nodeSelection = $createNodeSelection();
      nodeSelection.add(node.getKey());
      $setSelection(nodeSelection);
      console.log('Node selection created and set');
    });
    
    // Forçar estado selecionado imediatamente para feedback visual rápido
    setIsSelected(true);
  }, [editor, node]);

  // Monitorar mudanças de seleção para atualizar o estado visual
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        console.log('Selection update:', selection);
        
        if ($isNodeSelection(selection)) {
          const selectedNodeKeys = selection.getNodes().map(n => n.getKey());
          const isNodeSelected = selectedNodeKeys.includes(node.getKey());
          console.log('Node selection detected, selected keys:', selectedNodeKeys, 'current node:', node.getKey(), 'is selected:', isNodeSelected);
          setIsSelected(isNodeSelected);
        } else {
          console.log('No node selection, clearing selection state');
          setIsSelected(false);
        }
      });
    });
    
    return unregister;
  }, [editor, node]);

  // Adicionar listener para tecla DEL
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key, 'Image selected:', isSelected);
      if ((event.key === 'Delete' || event.key === 'Backspace') && isSelected) {
        event.preventDefault();
        console.log('Deleting image node');
        editor.update(() => {
          node.remove();
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, node, isSelected]);

  const handleResize = useCallback((scale: number) => {
    editor.update(() => {
      // Se as dimensões são 'inherit', vamos obter as dimensões naturais da imagem
      if (node.__width === 'inherit' || node.__height === 'inherit') {
        // Para imagens com inherit, usar proporções padrão 4:3
        const baseWidth = 300;
        const baseHeight = 225; // 300 * 3/4 para manter proporção 4:3
        
        const newWidth = Math.max(50, Math.min(800, baseWidth * scale));
        const newHeight = Math.max(38, Math.min(600, baseHeight * scale)); // 38 = 50 * 3/4
        
        node.setWidthAndHeight(newWidth, newHeight);
      } else {
        // Para imagens com dimensões definidas, manter a proporção atual
        const currentWidth = node.__width as number;
        const currentHeight = node.__height as number;
        const aspectRatio = currentWidth / currentHeight;
        
        const newWidth = Math.max(50, Math.min(800, currentWidth * scale));
        const newHeight = Math.max(50, Math.min(600, newWidth / aspectRatio));
        
        node.setWidthAndHeight(newWidth, newHeight);
      }
    });
  }, [editor, node]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={node.getSrc()}
        alt={node.getAltText()}
        onClick={handleClick}
        style={{
          height: node.__height === 'inherit' ? 'inherit' : node.__height,
          width: node.__width === 'inherit' ? 'inherit' : node.__width,
          maxWidth: '100%',
          borderRadius: '8px',
          margin: '8px 0',
          cursor: 'pointer',
          border: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease',
          display: 'block',
        }}
        className="lexical-image"
        draggable="false"
      />
      
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            gap: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '6px',
            padding: '4px',
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleResize(0.8);
            }}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              width: '24px',
              height: '24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Diminuir imagem"
          >
            −
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleResize(1.25);
            }}
            style={{
              background: '#22c55e',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              width: '24px',
              height: '24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Aumentar imagem"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export function $createImageNode({
  altText,
  height,
  src,
  width,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(src, altText, width, height, key),
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}