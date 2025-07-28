import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
} from 'lexical';

import {
  $isElementNode,
  ElementNode,
} from 'lexical';

export type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean;
  },
  SerializedElementNode
>;

export function $convertCollapsibleContainerElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const isOpen = domNode.getAttribute('data-open') === 'true';
  const node = $createCollapsibleContainerNode(isOpen);
  return {
    node,
  };
}

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  static getType(): string {
    return 'collapsible-container';
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add(
      'Collapsible__container',
      'p-4',
      'border',
      'border-gray-200',
      'dark:border-[#374151]',
      'rounded-lg',
      'my-2',
      'bg-gray-50',
      'dark:bg-[#111827]'
    );
    
    // Adicionar atributo para controlar estado aberto/fechado
    if (this.__open) {
      dom.setAttribute('data-open', 'true');
    } else {
      dom.setAttribute('data-open', 'false');
    }

    // Debug logs para container
    dom.addEventListener('click', (e) => {
      console.log('🔍 CONTAINER: Click no container div', e.target);
    });

    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__open !== this.__open) {
      if (this.__open) {
        dom.setAttribute('data-open', 'true');
      } else {
        dom.setAttribute('data-open', 'false');
      }
    }

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (domNode.classList.contains('Collapsible__container')) {
          return {
            conversion: $convertCollapsibleContainerElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    const node = $createCollapsibleContainerNode(serializedNode.open);
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('details');
    element.classList.add('Collapsible__container');
    element.setAttribute('open', this.__open.toString());
    return { element };
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
      type: 'collapsible-container',
      version: 1,
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(
  isOpen: boolean,
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}