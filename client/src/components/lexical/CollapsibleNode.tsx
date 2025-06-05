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
  const isOpen = domNode.hasAttribute('open');
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
    const dom = document.createElement('details');
    dom.classList.add(
      'Collapsible__container',
      'p-4',
      'border',
      'border-gray-200',
      'rounded-lg',
      'my-2',
      'bg-gray-50'
    );
    dom.open = this.__open;

    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__open !== this.__open) {
      (dom as HTMLDetailsElement).open = this.__open;
    }

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      details: (domNode: HTMLElement) => {
        return {
          conversion: $convertCollapsibleContainerElement,
          priority: 1,
        };
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