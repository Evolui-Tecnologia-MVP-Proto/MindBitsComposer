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
function createLucideIcon(iconName: 'square-pen' | 'trash-2' | 'save'): SVGSVGElement {
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
  } else if (iconName === 'save') {
    // Save icon paths
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M17 21v-8H7v8');
    svg.appendChild(path1);
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M7 3v5h8');
    svg.appendChild(path2);
    
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z');
    svg.appendChild(path3);
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
        rightContainer.classList.add('flex', 'items-center', 'gap-1', 'ml-2', 'relative');
        
        // Obter o texto atual do span
        const textSpanElement = leftContainer.querySelector('span');
        let currentText = textSpanElement ? textSpanElement.textContent || 'Container Colapsável' : 'Container Colapsável';
        
        // Dropdown panel de edição
        const editDropdown = document.createElement('div');
        editDropdown.className = 'absolute top-full right-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 hidden';
        editDropdown.style.minWidth = '250px';
        
        // Input de edição dentro do dropdown
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = currentText;
        editInput.className = 'w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2';
        
        // Container dos botões do dropdown
        const dropdownButtons = document.createElement('div');
        dropdownButtons.className = 'flex gap-2 justify-end';
        
        // Botão Cancelar
        const cancelButton = document.createElement('button');
        cancelButton.className = 'px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors';
        cancelButton.textContent = 'Cancelar';
        
        // Botão Salvar
        const saveButton = document.createElement('button');
        saveButton.className = 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
        saveButton.textContent = 'Salvar';
        
        dropdownButtons.appendChild(cancelButton);
        dropdownButtons.appendChild(saveButton);
        editDropdown.appendChild(editInput);
        editDropdown.appendChild(dropdownButtons);
        
        // Estado de edição
        let isEditing = false;
        
        // Função para abrir/fechar dropdown
        const toggleDropdown = (show: boolean) => {
          isEditing = show;
          if (show) {
            editDropdown.classList.remove('hidden');
            // Obter o texto atual novamente ao abrir
            const span = leftContainer.querySelector('span');
            currentText = span ? span.textContent || '' : '';
            editInput.value = currentText;
            setTimeout(() => {
              editInput.focus();
              editInput.select();
            }, 10);
          } else {
            editDropdown.classList.add('hidden');
          }
        };
        
        // Função para salvar
        const saveTitle = () => {
          const newText = editInput.value.trim();
          if (newText && newText !== currentText) {
            const nodeKey = this.getKey();
            const event = new CustomEvent('updateCollapsibleTitle', {
              detail: { nodeKey, newText }
            });
            window.dispatchEvent(event);
            console.log('💾 Título salvo:', newText);
          }
          toggleDropdown(false);
        };
        
        // Botão de Editar
        const editButton = document.createElement('button');
        editButton.classList.add(
          'p-1', 'rounded', 'hover:bg-gray-200', 'dark:hover:bg-gray-600',
          'text-blue-600', 'dark:text-blue-400', 'transition-colors'
        );
        const editIcon = createLucideIcon('square-pen');
        editIcon.style.pointerEvents = 'none';
        editButton.appendChild(editIcon);
        editButton.title = 'Editar título';
        
        editButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleDropdown(!isEditing);
        };
        
        // Eventos do input
        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleDropdown(false);
          }
        });
        
        // Eventos dos botões
        cancelButton.onclick = () => toggleDropdown(false);
        saveButton.onclick = saveTitle;
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
          if (isEditing && !editDropdown.contains(e.target as Node) && e.target !== editButton) {
            toggleDropdown(false);
          }
        });
        
        // Adicionar elementos ao container
        rightContainer.appendChild(editButton);
        rightContainer.appendChild(editDropdown);
        
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