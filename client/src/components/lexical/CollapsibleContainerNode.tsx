import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, ElementNode as BaseElementNode } from 'lexical';

export type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean;
  },
  SerializedElementNode
>;

export function $convertCollapsibleContainerElement(
  domNode: Node,
): null | DOMConversionOutput {
  const node = $createCollapsibleContainerNode(true);
  return {
    node,
  };
}

export class CollapsibleContainerNode extends BaseElementNode {
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
    dom.classList.add('Collapsible__container');
    dom.setAttribute('open', this.__open.toString());
    if (this.__open) {
      dom.setAttribute('open', '');
    }
    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLDetailsElement): boolean {
    const wasOpen = prevNode.__open;
    const isOpen = this.__open;

    if (wasOpen !== isOpen) {
      if (isOpen) {
        dom.setAttribute('open', '');
      } else {
        dom.removeAttribute('open');
      }
    }

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      details: (domNode: Node) => {
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
    if (this.__open) {
      element.setAttribute('open', '');
    }
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
  return $applyNodeReplacement(new CollapsibleContainerNode(isOpen));
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}