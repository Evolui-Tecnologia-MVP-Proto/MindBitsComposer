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
    
    // Verificar se o container pai foi inserido pela toolbar
    const parent = this.getParent();
    if (parent && parent.getType() === 'collapsible-container') {
      const containerNode = parent as any; // CollapsibleContainerNode
      if (containerNode.getFromToolbar && containerNode.getFromToolbar()) {
        // Container direito para botões de ação
        const rightContainer = document.createElement('div');
        rightContainer.classList.add('flex', 'items-center', 'gap-1', 'ml-2');
        
        // Botão de Editar
        const editButton = document.createElement('button');
        editButton.classList.add(
          'p-1', 'rounded', 'hover:bg-gray-200', 'dark:hover:bg-gray-600',
          'text-blue-600', 'dark:text-blue-400', 'transition-colors'
        );
        editButton.innerHTML = '✏️';
        editButton.title = 'Editar título';
        editButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Disparar evento personalizado para editar título
          const event = new CustomEvent('editCollapsibleTitle', {
            detail: { nodeKey: this.getKey() }
          });
          document.dispatchEvent(event);
        };
        
        // Botão de Excluir
        const deleteButton = document.createElement('button');
        deleteButton.classList.add(
          'p-1', 'rounded', 'hover:bg-red-200', 'dark:hover:bg-red-600',
          'text-red-600', 'dark:text-red-400', 'transition-colors'
        );
        deleteButton.innerHTML = '🗑️';
        deleteButton.title = 'Excluir container';
        deleteButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Disparar evento personalizado para excluir container
          const event = new CustomEvent('deleteCollapsibleContainer', {
            detail: { nodeKey: parent.getKey() }
          });
          document.dispatchEvent(event);
        };
        
        rightContainer.appendChild(editButton);
        rightContainer.appendChild(deleteButton);
        dom.appendChild(rightContainer);
      }
    }

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
    
    // Verificar se precisa adicionar/remover botões baseado no container pai
    const parent = this.getParent();
    const hasButtons = dom.querySelector('div:last-child button');
    const shouldHaveButtons = parent && 
      parent.getType() === 'collapsible-container' && 
      (parent as any).getFromToolbar && 
      (parent as any).getFromToolbar();

    // Se deveria ter botões mas não tem, ou vice-versa, retorna true para recriar DOM
    if (!!hasButtons !== !!shouldHaveButtons) {
      return true;
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