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

// Helper function to create Lucide icons as SVG elements
function createLucideIcon(iconName: 'square-pen' | 'trash-2'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (iconName === 'square-pen') {
    // Square pen icon paths
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '14');
    rect.setAttribute('height', '14');
    rect.setAttribute('x', '3');
    rect.setAttribute('y', '3');
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm21 21-6-6m-5-5-4-4');
    svg.appendChild(path);

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'm9 7 4 4');
    svg.appendChild(path2);
  } else if (iconName === 'trash-2') {
    // Trash 2 icon paths
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 6h18');
    svg.appendChild(path1);

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6');
    svg.appendChild(path2);

    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2');
    svg.appendChild(path3);

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '10');
    line1.setAttribute('x2', '10');
    line1.setAttribute('y1', '11');
    line1.setAttribute('y2', '17');
    svg.appendChild(line1);

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '14');
    line2.setAttribute('x2', '14');
    line2.setAttribute('y1', '11');
    line2.setAttribute('y2', '17');
    svg.appendChild(line2);
  }

  return svg;
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
        const editIcon = createLucideIcon('square-pen');
        // Prevenir que o SVG intercepte os eventos de click
        editIcon.style.pointerEvents = 'none';
        editButton.appendChild(editIcon);
        editButton.title = 'Editar título';
        editButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Tornar o título editável temporariamente
          if (textSpan) {
            const currentText = textSpan.textContent || '';
            
            // Criar input temporário
            const input = document.createElement('input');
            input.value = currentText;
            input.className = 'bg-transparent border border-blue-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
            
            // Substituir o span pelo input temporariamente
            textSpan.style.display = 'none';
            textSpan.parentNode?.insertBefore(input, textSpan);
            input.focus();
            input.select();
            
            const finishEdit = () => {
              const newText = input.value.trim();
              if (newText && newText !== currentText) {
                // Atualizar o texto no node
                const editor = config.editor;
                if (editor) {
                  editor.update(() => {
                    this.setTextContent(newText);
                  });
                }
                textSpan.textContent = newText;
              }
              
              // Remover input e mostrar span novamente
              input.remove();
              textSpan.style.display = '';
            };
            
            // Finalizar edição ao pressionar Enter ou perder foco
            input.addEventListener('keydown', (event) => {
              if (event.key === 'Enter') {
                finishEdit();
              } else if (event.key === 'Escape') {
                input.remove();
                textSpan.style.display = '';
              }
            });
            
            input.addEventListener('blur', finishEdit);
          }
        };
        
        // Botão de Excluir
        const deleteButton = document.createElement('button');
        deleteButton.classList.add(
          'p-1', 'rounded', 'hover:bg-red-200', 'dark:hover:bg-red-600',
          'text-red-600', 'dark:text-red-400', 'transition-colors'
        );
        const deleteIcon = createLucideIcon('trash-2');
        // Prevenir que o SVG intercepte os eventos de click
        deleteIcon.style.pointerEvents = 'none';
        deleteButton.appendChild(deleteIcon);
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