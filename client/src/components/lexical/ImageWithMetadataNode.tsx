import {
  $applyNodeReplacement,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  $createNodeSelection,
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

export interface ImageWithMetadataPayload {
  src: string;
  altText: string;
  imageId: string;
  metadataText: string;
  height?: number;
  width?: number;
}

export type SerializedImageWithMetadataNode = Spread<
  {
    src: string;
    altText: string;
    imageId: string;
    metadataText: string;
    height?: number;
    width?: number;
  },
  SerializedLexicalNode
>;

export class ImageWithMetadataNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __imageId: string;
  __metadataText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;

  static getType(): string {
    return 'image-with-metadata';
  }

  static clone(node: ImageWithMetadataNode): ImageWithMetadataNode {
    return new ImageWithMetadataNode(
      node.__src,
      node.__altText,
      node.__imageId,
      node.__metadataText,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageWithMetadataNode): ImageWithMetadataNode {
    const { src, altText, imageId, metadataText, height, width } = serializedNode;
    const node = $createImageWithMetadataNode({
      src,
      altText,
      imageId,
      metadataText,
      height,
      width,
    });
    return node;
  }

  exportJSON(): SerializedImageWithMetadataNode {
    return {
      src: this.__src,
      altText: this.__altText,
      imageId: this.__imageId,
      metadataText: this.__metadataText,
      height: this.__height === 'inherit' ? 0 : this.__height,
      width: this.__width === 'inherit' ? 0 : this.__width,
      type: 'image-with-metadata',
      version: 1,
    };
  }

  constructor(
    src: string,
    altText: string,
    imageId: string,
    metadataText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__imageId = imageId;
    this.__metadataText = metadataText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportDOM(): DOMExportOutput {
    // Para exportação markdown, incluir tanto a imagem quanto o metadata
    const container = document.createElement('div');
    
    const img = document.createElement('img');
    img.setAttribute('src', this.__src);
    img.setAttribute('alt', this.__altText);
    if (this.__width !== 'inherit') img.setAttribute('width', this.__width.toString());
    if (this.__height !== 'inherit') img.setAttribute('height', this.__height.toString());
    
    const metadata = document.createElement('p');
    metadata.textContent = this.__metadataText;
    metadata.style.display = 'none'; // Oculto por padrão
    metadata.setAttribute('data-metadata', 'true');
    
    container.appendChild(img);
    container.appendChild(metadata);
    
    return { element: container };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    const theme = config.theme;
    const className = theme.imageWithMetadata || theme.image;
    if (className !== undefined) {
      div.className = className;
    }
    return div;
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

  getImageId(): string {
    return this.__imageId;
  }

  getMetadataText(): string {
    return this.__metadataText;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  decorate(): JSX.Element {
    return <ImageWithMetadataComponent node={this} />;
  }
}

// Componente de imagem com metadata e funcionalidade de seleção e deleção
function ImageWithMetadataComponent({ node }: { node: ImageWithMetadataNode }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Image with metadata clicked, node key:', node.getKey());
    
    editor.update(() => {
      const nodeSelection = $createNodeSelection();
      nodeSelection.add(node.getKey());
      $setSelection(nodeSelection);
      console.log('Node selection created and set');
    });
    
    setIsSelected(true);
  }, [editor, node]);

  // Monitorar mudanças de seleção para atualizar o estado visual
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        
        if ($isNodeSelection(selection)) {
          const selectedNodeKeys = selection.getNodes().map(n => n.getKey());
          const isNodeSelected = selectedNodeKeys.includes(node.getKey());
          setIsSelected(isNodeSelected);
        } else {
          setIsSelected(false);
        }
      });
    });
    
    return unregister;
  }, [editor, node]);

  // Adicionar listener para tecla DEL
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && isSelected) {
        event.preventDefault();
        console.log('Deleting image with metadata node');
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
      let aspectRatio = 1;

      if (naturalDimensions) {
        aspectRatio = naturalDimensions.width / naturalDimensions.height;
      } else if (node.__width !== 'inherit' && node.__height !== 'inherit') {
        aspectRatio = (node.__width as number) / (node.__height as number);
      }

      const currentWidth = node.__width === 'inherit' ? 
        (naturalDimensions?.width || 300) : 
        (node.__width as number);
      
      const newWidth = Math.max(50, Math.min(800, currentWidth * scale));
      const newHeight = Math.max(50, Math.min(600, newWidth / aspectRatio));
      
      console.log('Resizing image with metadata:', {
        currentWidth,
        newWidth,
        newHeight,
        aspectRatio,
        naturalDimensions,
        scale
      });
      
      node.setWidthAndHeight(newWidth, newHeight);
    });
  }, [editor, node, naturalDimensions]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={node.getSrc()}
        alt={node.getAltText()}
        onClick={handleClick}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setNaturalDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          console.log('Image loaded, natural dimensions:', {
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        }}
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
        className="lexical-image-with-metadata"
        draggable="false"
      />
      
      {/* Texto metadata oculto no editor, mas disponível para exportação */}
      <span 
        style={{ display: 'none' }}
        data-metadata="true"
        data-image-id={node.getImageId()}
      >
        {node.getMetadataText()}
      </span>
      
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
              const imageId = node.getImageId();
              navigator.clipboard.writeText(imageId).then(() => {
                console.log('ID da imagem copiado para área de transferência:', imageId);
              }).catch(err => {
                console.error('Erro ao copiar ID da imagem:', err);
              });
            }}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 6px',
              maxWidth: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={`Copiar ID: ${node.getImageId()}`}
          >
            {node.getImageId().substring(0, 6)}...
          </button>
          
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

export function $createImageWithMetadataNode(payload: ImageWithMetadataPayload): ImageWithMetadataNode {
  return $applyNodeReplacement(
    new ImageWithMetadataNode(
      payload.src,
      payload.altText,
      payload.imageId,
      payload.metadataText,
      payload.width,
      payload.height,
    ),
  );
}

export function $isImageWithMetadataNode(
  node: LexicalNode | null | undefined,
): node is ImageWithMetadataNode {
  return node instanceof ImageWithMetadataNode;
}