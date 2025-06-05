import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from 'lexical';

export type SerializedCollapsibleTitleNode = Spread<
  {
    type: 'collapsible-title';
    version: 1;
  },
  SerializedTextNode
>;

export function $convertCollapsibleTitleElement(): DOMConversionOutput | null {
  const node = $createCollapsibleTitleNode();
  return {
    node,
  };
}

export class CollapsibleTitleNode extends TextNode {
  static getType(): string {
    return 'collapsible-title';
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('summary');
    dom.classList.add(
      'Collapsible__title',
      'font-semibold',
      'text-gray-800',
      'cursor-pointer',
      'hover:text-blue-600',
      'flex',
      'items-center',
      'p-2'
    );
    
    // Adicionar ícone de expansão/contração
    const icon = document.createElement('span');
    icon.classList.add('mr-2', 'transition-transform', 'duration-200');
    icon.innerHTML = '▶'; // Seta para a direita
    
    dom.appendChild(icon);
    
    const textSpan = document.createElement('span');
    textSpan.textContent = this.getTextContent();
    dom.appendChild(textSpan);

    return dom;
  }

  updateDOM(prevNode: CollapsibleTitleNode, dom: HTMLElement): boolean {
    const textSpan = dom.querySelector('span:last-child');
    if (textSpan) {
      textSpan.textContent = this.getTextContent();
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      summary: () => ({
        conversion: $convertCollapsibleTitleElement,
        priority: 1,
      }),
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleTitleNode,
  ): CollapsibleTitleNode {
    const node = $createCollapsibleTitleNode();
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('summary');
    element.classList.add('Collapsible__title');
    element.textContent = this.getTextContent();
    return { element };
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    };
  }
}

export function $createCollapsibleTitleNode(text = 'Título Colapsável'): CollapsibleTitleNode {
  const node = new CollapsibleTitleNode(text);
  return $applyNodeReplacement(node);
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}