import {
  $createParagraphNode,
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
  ElementNode,
} from 'lexical';

export type SerializedCollapsibleContentNode = Spread<
  {
    type: 'collapsible-content';
    version: 1;
  },
  SerializedElementNode
>;

export function $convertCollapsibleContentElement(): DOMConversionOutput | null {
  const node = $createCollapsibleContentNode();
  return {
    node,
  };
}

export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return 'collapsible-content';
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add(
      'Collapsible__content',
      'mt-2',
      'p-3',
      'bg-white',
      'dark:bg-[#020203]',
      'border-t',
      'border-gray-200',
      'dark:border-[#374151]',
      'text-gray-900',
      'dark:text-white'
    );
    
    // Tornar editável mas não diretamente - o Lexical vai gerenciar
    dom.removeAttribute('contenteditable');
    dom.setAttribute('data-lexical-content', 'true');
    
    // Debug logs
    dom.addEventListener('click', (e) => {
      console.log('🔍 EDIT: Click no CollapsibleContent', e.target);
    });
    
    dom.addEventListener('mousedown', (e) => {
      console.log('🔍 EDIT: MouseDown no CollapsibleContent');
    });
    
    return dom;
  }

  updateDOM(prevNode: CollapsibleContentNode, dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContentNode,
  ): CollapsibleContentNode {
    return $createCollapsibleContentNode();
  }

  isShadowRoot(): boolean {
    return false;
  }
  
  // Garantir que seja editável
  isInline(): boolean {
    return false;
  }
  
  canBeEmpty(): boolean {
    return true;
  }
  
  canIndent(): boolean {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.classList.add('Collapsible__content');
    return { element };
  }

  exportJSON(): SerializedCollapsibleContentNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-content',
      version: 1,
    };
  }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  return new CollapsibleContentNode();
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}