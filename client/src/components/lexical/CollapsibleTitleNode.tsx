/**
 * Copyright (c) Advanced Business Management, Inc. All rights reserved.
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from 'lexical';

import { TextNode, $applyNodeReplacement } from 'lexical';

type SerializedCollapsibleTitleNode = Spread<
  {
    type: 'collapsible-title';
  },
  SerializedTextNode
>;

function $convertCollapsibleTitleElement(): DOMConversionOutput | null {
  return { node: $createCollapsibleTitleNode() };
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

  // Tornar o nó somente leitura
  isToken(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isTextEntity(): boolean {
    return true;
  }

  // Prevenir seleção e edição
  isSelectable(): boolean {
    return false;
  }

  // Preservar o texto durante transformações
  getTextContent(): string {
    return this.__text;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('summary');
    dom.classList.add(
      'Collapsible__title',
      'font-semibold',
      'text-gray-800',
      'dark:text-white',
      'cursor-pointer',
      'hover:text-blue-600',
      'dark:hover:text-blue-400',
      'flex',
      'items-center',
      'justify-between',
      'p-2'
    );
    
    // Tornar não editável por padrão
    dom.contentEditable = 'false';
    dom.setAttribute('data-lexical-editor', 'false');
    
    // Container esquerdo para ícone e texto
    const leftContainer = document.createElement('div');
    leftContainer.classList.add('flex', 'items-center');
    
    // Adicionar ícone de expansão/contração
    const icon = document.createElement('span');
    icon.classList.add('mr-2', 'transition-transform', 'duration-200');
    icon.innerHTML = '▶'; // Seta para a direita
    leftContainer.appendChild(icon);
    
    const textSpan = document.createElement('span');
    textSpan.textContent = this.getTextContent();
    leftContainer.appendChild(textSpan);
    
    dom.appendChild(leftContainer);

    return dom;
  }

  updateDOM(prevNode: CollapsibleTitleNode, dom: HTMLElement): boolean {
    // Encontrar o container de texto dentro do container esquerdo
    const leftContainer = dom.querySelector('div');
    if (leftContainer) {
      const textSpan = leftContainer.querySelector('span:last-child');
      if (textSpan) {
        textSpan.textContent = this.getTextContent();
      }
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
    element.textContent = this.__text;
    return { element };
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
    };
  }
}

export function $createCollapsibleTitleNode(text = 'Sub Sessão'): CollapsibleTitleNode {
  return $applyNodeReplacement(new CollapsibleTitleNode(text));
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}