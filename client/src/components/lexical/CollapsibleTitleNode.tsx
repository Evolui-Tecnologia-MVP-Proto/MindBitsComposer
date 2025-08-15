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

    // Container direito para botões de ação (apenas para containers de template)
    const rightContainer = document.createElement('div');
    rightContainer.classList.add('flex', 'items-center', 'gap-1');
    
    // Adicionar o container direito imediatamente
    dom.appendChild(rightContainer);
    
    // DEBUG: Adicionar botão de refresh em TODOS os containers para teste
    // Criar botão de refresh diretamente sem verificações
    console.log('🔍 RefreshButton DEBUG: Criando botão SEMPRE para:', textSpan.textContent);
    
    const refreshButton = document.createElement('button');
    refreshButton.classList.add(
      'refresh-section-btn',
      'ml-2',
      'p-1',
      'rounded',
      'bg-blue-100',
      'dark:bg-blue-900',
      'hover:bg-blue-200',
      'dark:hover:bg-blue-800',
      'transition-colors',
      'text-blue-600',
      'dark:text-blue-400',
      'w-7',
      'h-7',
      'flex',
      'items-center',
      'justify-center',
      'flex-shrink-0',
      'border',
      'border-blue-300',
      'dark:border-blue-700'
    );
    refreshButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
        <path d="M21 21v-5h-5"/>
      </svg>
    `;
    refreshButton.title = 'Recarregar conteúdo original desta seção';
    refreshButton.style.visibility = 'visible';
    refreshButton.style.display = 'flex';
    
    // Adicionar event listener para o refresh
    refreshButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔄 RefreshButton: Clicado para seção:', textSpan.textContent);
      
      // Disparar evento customizado para recarregar seção
      const sectionTitle = textSpan.textContent || '';
      const refreshEvent = new CustomEvent('refreshSectionContent', {
        detail: { sectionTitle },
        bubbles: true
      });
      dom.dispatchEvent(refreshEvent);
    });
    
    rightContainer.appendChild(refreshButton);
    console.log('✅ RefreshButton DEBUG: Botão adicionado SEMPRE ao container:', rightContainer);
    console.log('✅ RefreshButton DEBUG: Container direito tem filhos:', rightContainer.children.length);

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

    // Verificar se precisa adicionar botão de refresh (caso não exista ainda)
    const existingRefreshButton = dom.querySelector('.refresh-section-btn');
    if (!existingRefreshButton) {
      console.log('🔍 RefreshButton (updateDOM): Verificando se precisa adicionar botão para:', this.getTextContent());
      
      // Encontrar o container pai CollapsibleContainerNode
      const parentDetails = dom.closest('.Collapsible__container');
      console.log('🔍 RefreshButton (updateDOM): Parent details encontrado:', !!parentDetails);
      
      if (parentDetails) {
        // Verificar se é um container de template (não inserido via toolbar)
        const hasFromToolbarAttr = parentDetails.hasAttribute('data-from-toolbar');
        console.log('🔍 RefreshButton (updateDOM): Has data-from-toolbar:', hasFromToolbarAttr);
        
        const isFromTemplate = !hasFromToolbarAttr;
        console.log('🔍 RefreshButton (updateDOM): É container de template?', isFromTemplate);
        
        if (isFromTemplate) {
          console.log('✅ RefreshButton (updateDOM): Criando botão de refresh para:', this.getTextContent());
          
          // Encontrar ou criar container direito
          let rightContainer = dom.querySelector('div:last-child');
          if (!rightContainer || !rightContainer.classList.contains('flex')) {
            rightContainer = document.createElement('div');
            rightContainer.classList.add('flex', 'items-center', 'gap-1');
            dom.appendChild(rightContainer);
          }
          
          // Criar botão de refresh
          const refreshButton = document.createElement('button');
          refreshButton.classList.add(
            'refresh-section-btn',
            'ml-2',
            'p-1',
            'rounded',
            'bg-blue-100',
            'dark:bg-blue-900',
            'hover:bg-blue-200',
            'dark:hover:bg-blue-800',
            'transition-colors',
            'text-blue-600',
            'dark:text-blue-400',
            'w-7',
            'h-7',
            'flex',
            'items-center',
            'justify-center',
            'flex-shrink-0',
            'border',
            'border-blue-300',
            'dark:border-blue-700'
          );
          refreshButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M21 21v-5h-5"/>
            </svg>
          `;
          refreshButton.title = 'Recarregar conteúdo original desta seção';
          refreshButton.style.visibility = 'visible';
          refreshButton.style.display = 'flex';
          
          // Adicionar event listener para o refresh
          refreshButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔄 RefreshButton (updateDOM): Clicado para seção:', this.getTextContent());
            
            // Disparar evento customizado para recarregar seção
            const sectionTitle = this.getTextContent();
            const refreshEvent = new CustomEvent('refreshSectionContent', {
              detail: { sectionTitle },
              bubbles: true
            });
            dom.dispatchEvent(refreshEvent);
          });
          
          rightContainer.appendChild(refreshButton);
          console.log('✅ RefreshButton (updateDOM): Botão adicionado com sucesso');
        }
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