import React from 'react';
import {
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  DecoratorNode,
  $getNodeByKey,
} from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RefreshCw, Unplug } from 'lucide-react';

export type SerializedHeaderFieldNode = Spread<
  {
    label: string;
    value: string;
    placeholder: string;
    mappingType?: 'field' | 'formula' | 'plugin' | null;
    mappingValue?: string;
    type: 'header-field';
    version: 1;
  },
  SerializedLexicalNode
>;

export function $convertHeaderFieldElement(domNode: HTMLElement): DOMConversionOutput | null {
  const label = domNode.getAttribute('data-label') || '';
  const value = domNode.getAttribute('data-value') || '';
  const placeholder = domNode.getAttribute('data-placeholder') || '';
  const node = $createHeaderFieldNode(label, value, placeholder);
  return {
    node,
  };
}

export class HeaderFieldNode extends DecoratorNode<JSX.Element> {
  __label: string;
  __value: string;
  __placeholder: string;
  __mappingType: 'field' | 'formula' | 'plugin' | null;
  __mappingValue: string | undefined;

  static getType(): string {
    return 'header-field';
  }

  static clone(node: HeaderFieldNode): HeaderFieldNode {
    return new HeaderFieldNode(
      node.__label,
      node.__value,
      node.__placeholder,
      node.__mappingType,
      node.__mappingValue,
      node.__key,
    );
  }

  constructor(
    label: string, 
    value: string, 
    placeholder: string, 
    mappingType: 'field' | 'formula' | 'plugin' | null = null,
    mappingValue?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__label = label;
    this.__value = value;
    this.__placeholder = placeholder;
    this.__mappingType = mappingType;
    this.__mappingValue = mappingValue;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add(
      'HeaderField__container',
      'mb-3'
    );
    dom.setAttribute('data-label', this.__label);
    dom.setAttribute('data-value', this.__value);
    dom.setAttribute('data-placeholder', this.__placeholder);
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  getValue(): string {
    return this.__value;
  }

  setValue(value: string): void {
    console.log(`🔧 HeaderFieldNode.setValue called with value: "${value}" for label: "${this.__label}"`);
    const writableNode = this.getWritable();
    writableNode.__value = value;
  }

  getLabel(): string {
    return this.__label;
  }

  setLabel(label: string): void {
    const writableNode = this.getWritable();
    writableNode.__label = label;
  }

  getMappingType(): 'field' | 'formula' | 'plugin' | null {
    return this.__mappingType;
  }

  getMappingValue(): string | undefined {
    return this.__mappingValue;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (domNode.classList.contains('HeaderField__container')) {
          return {
            conversion: $convertHeaderFieldElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  static importJSON(serializedNode: SerializedHeaderFieldNode): HeaderFieldNode {
    const { label, value, placeholder, mappingType, mappingValue } = serializedNode;
    const node = $createHeaderFieldNode(label, value, placeholder, mappingType, mappingValue);
    return node;
  }

  exportJSON(): SerializedHeaderFieldNode {
    return {
      label: this.__label,
      value: this.__value,
      placeholder: this.__placeholder,
      mappingType: this.__mappingType || null,
      mappingValue: this.__mappingValue,
      type: 'header-field',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.classList.add('HeaderField__container');
    element.setAttribute('data-label', this.__label);
    element.setAttribute('data-value', this.__value);
    element.setAttribute('data-placeholder', this.__placeholder);
    return { element };
  }

  decorate(_editor: any, config: EditorConfig): JSX.Element {
    return <HeaderFieldComponent node={this} />;
  }

  isInline(): false {
    return false;
  }

  isKeyboardSelectable(): true {
    return true;
  }
}

function HeaderFieldComponent({ node }: { node: HeaderFieldNode }): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [value, setValue] = React.useState(node.getValue());
  const mappingType = node.getMappingType();
  const mappingValue = node.getMappingValue();
  
  console.log(`🏷️ HeaderFieldComponent renderizado - label: "${node.getLabel()}", mappingType: "${mappingType}", mappingValue: "${mappingValue}"`);
  
  


  // Sincronizar valor quando o nó for atualizado
  React.useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const nodeKey = node.getKey();
        const currentNode = $getNodeByKey(nodeKey);
        
        if (currentNode && $isHeaderFieldNode(currentNode)) {
          const nodeValue = currentNode.getValue();
          console.log(`🔄 HeaderFieldComponent sync - label: "${currentNode.getLabel()}", nodeValue: "${nodeValue}", currentValue: "${value}"`);
          if (nodeValue !== value) {
            console.log(`✅ Atualizando valor do componente de "${value}" para "${nodeValue}"`);
            setValue(nodeValue);
          }
        } else {
          console.log(`❌ Não foi possível encontrar o node ${nodeKey} no update listener`);
        }
      });
    });
    
    return () => {
      unregister();
    };
  }, [editor, node.getKey()]);

  // REMOVIDO: Foco automático no primeiro campo estava interferindo com edição nos containers
  /*
  React.useEffect(() => {
    const checkAndFocus = () => {
      const allHeaderInputs = document.querySelectorAll('.header-field-input');
      if (allHeaderInputs.length > 0 && inputRef.current === allHeaderInputs[0]) {
        console.log('🎯 Focando automaticamente no primeiro campo do header');
        console.log('🔍 Estado do input:', {
          disabled: inputRef.current.disabled,
          readOnly: inputRef.current.readOnly,
          value: inputRef.current.value,
          placeholder: inputRef.current.placeholder
        });
        inputRef.current.focus();
        
        // Verificar se conseguiu focar
        setTimeout(() => {
          if (document.activeElement === inputRef.current) {
            console.log('✅ Campo focado com sucesso');
          } else {
            console.log('❌ Não conseguiu focar. Elemento ativo:', document.activeElement);
          }
        }, 100);
      }
    };
    
    // Tentar focar com delay
    const timeouts = [100, 500, 1000, 2000];
    const timers = timeouts.map(delay => setTimeout(checkAndFocus, delay));
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);
  */

  const handleChange = (newValue: string) => {
    console.log('📝 handleChange chamado com:', newValue);
    setValue(newValue);
    editor.update(() => {
      node.setValue(newValue);
      console.log('✅ Valor do nó atualizado para:', newValue);
    });
  };
  


  const handleRefresh = () => {
    console.log('🔄 BOTÃO REFRESH CLICADO!');
    console.log('🔄 Refresh clicked - mappingType:', mappingType, 'mappingValue:', mappingValue);
    console.log('🔄 Label:', node.getLabel());
    console.log('🔄 NodeKey:', node.getKey());
    console.log('🔍 Valor ANTES do refresh:', value);
    console.log('🔍 Valor no node ANTES do refresh:', node.getValue());
    
    // Salvar referência do input antes de disparar o evento
    const inputElement = document.querySelector(`[data-label="${node.getLabel()}"] input`) as HTMLInputElement;
    
    // Disparar evento customizado para o LexicalEditor lidar
    const event = new CustomEvent('headerFieldRefresh', {
      detail: {
        label: node.getLabel(),
        mappingType,
        mappingValue,
        nodeKey: node.getKey()
      }
    });
    console.log('🔄 Disparando evento headerFieldRefresh:', event.detail);
    window.dispatchEvent(event);
    
    // Verificar se o valor mudou após um delay maior
    setTimeout(() => {
      console.log('🔍 Verificando após 500ms:');
      console.log('  - Valor no componente (state):', value);
      console.log('  - Valor no node:', node.getValue());
      console.log('  - Valor no input DOM:', inputElement?.value);
      
      if (inputElement) {
        inputElement.focus();
        // Posicionar cursor no final do texto
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
        
        // Forçar o editor a reconhecer que estamos em uma área editável
        editor.focus();
      }
    }, 500);
  };

  const handleUnplug = () => {
    console.log('🔌 Unplug clicked - mappingType:', mappingType, 'mappingValue:', mappingValue);
    
    // Salvar referência do input antes de disparar o evento
    const inputElement = document.querySelector(`[data-label="${node.getLabel()}"] input`) as HTMLInputElement;
    
    // Disparar evento customizado para o LexicalEditor lidar
    const event = new CustomEvent('headerFieldUnplug', {
      detail: {
        label: node.getLabel(),
        mappingType,
        mappingValue,
        nodeKey: node.getKey()
      }
    });
    window.dispatchEvent(event);
    
    // Restaurar foco após um pequeno delay para garantir que a atualização foi concluída
    setTimeout(() => {
      if (inputElement) {
        inputElement.focus();
        // Posicionar cursor no final do texto
        inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
        
        // Forçar o editor a reconhecer que estamos em uma área editável
        editor.focus();
      }
    }, 50);
  };

  // Ref para o input
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [hasFocus, setHasFocus] = React.useState(false);
  const lastFocusTime = React.useRef<number>(0);
  
  // Handler para clique no container
  const handleContainerClick = (e: React.MouseEvent) => {
    console.log('🎯 Container clicado', e.target);
    // Se o clique não foi no input, focar no input
    if (e.target !== inputRef.current && inputRef.current) {
      console.log('🎯 Tentando focar no input');
      inputRef.current.focus();
      // Forçar seleção
      inputRef.current.select();
    }
  };
  
  // Adicionar log quando o componente montar
  React.useEffect(() => {
    console.log('🔧 HeaderFieldComponent montado:', {
      label: node.getLabel(),
      value: value,
      placeholder: node.__placeholder,
      inputRef: inputRef.current,
      mappingType: mappingType,
      mappingValue: mappingValue,
      hasButton: mappingType === 'field' || mappingType === 'formula' || mappingType === 'plugin'
    });
  }, []);
  
  // REMOVIDO: Monitor que mantinha cursor visível estava interferindo com edição nos containers
  // O setInterval chamava focus() a cada segundo, causando roubo de foco dos containers
  /*
  React.useEffect(() => {
    if (!hasFocus) return;
    
    // Manter foco atualizado periodicamente quando o campo está ativo
    const interval = setInterval(() => {
      if (hasFocus && inputRef.current && document.activeElement === inputRef.current) {
        // Campo ainda tem foco, garantir que cursor está visível
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          console.log('🔍 Cursor ainda visível no campo:', node.getLabel());
        } else {
          console.log('⚠️ Cursor pode ter desaparecido, restaurando seleção...');
          inputRef.current.focus(); // ESTAVA CAUSANDO ROUBO DE FOCO DOS CONTAINERS!
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }
    }, 1000); // Verificar a cada segundo
    
    return () => clearInterval(interval);
  }, [hasFocus, node]);
  */

  return (
    <div 
      className="flex items-center mb-3 border border-gray-300 dark:border-[#374151] rounded-md header-field-container" 
      style={{ borderRadius: '6px', cursor: 'text' }}
      onClick={handleContainerClick}
      contentEditable={false}
    >
      <div 
        className="px-4 py-2 text-sm font-medium text-white min-w-[120px] flex-shrink-0 border-r border-white"
        style={{ backgroundColor: '#111827' }}
      >
        {node.getLabel()}
      </div>
      <div className="flex-1 flex items-center bg-white dark:bg-[#0F172A]" style={{ borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onInput={(e) => {
            e.stopPropagation();
            const newValue = e.currentTarget.value;
            console.log('🎯 Input digitado (onInput):', newValue);
            handleChange(newValue);
          }}
          onFocus={(e) => {
            e.stopPropagation();
            console.log('🎯 Input focado:', node.getLabel());
            setHasFocus(true);
            lastFocusTime.current = Date.now();
          }}
          onBlur={(e) => {
            e.stopPropagation();
            console.log('🎯 Input desfocado:', node.getLabel());
            setHasFocus(false);
            // REMOVIDO: Lógica de restauração automática de foco - estava interferindo com edição em containers
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('🎯 Input clicado');
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            console.log('🎯 Mouse down no input');
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            console.log('🎯 Tecla pressionada:', e.key);
          }}
          className="header-field-input flex-1 px-3 py-2 text-sm border-0 outline-none
                     bg-transparent text-gray-900 dark:text-gray-200
                     focus:ring-0 focus:border-0"
          style={{
            pointerEvents: 'auto',
            userSelect: 'text',
            cursor: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            caretColor: 'auto', // Garantir que o cursor seja visível
            color: 'inherit'   // Herdar a cor do texto
          }}
          placeholder={node.__placeholder}
          data-header-field-input="true"
          autoComplete="off"
        />
        
        {/* Botões de ação baseados no tipo de mapeamento */}
        {mappingType && (
          <div className="pr-2">
            {(mappingType === 'field' || mappingType === 'formula') && (
              <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Recarregar valor"
                  type="button"
                  style={{ 
                    pointerEvents: 'auto', 
                    position: 'relative', 
                    zIndex: 9999,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                </button>
            )}
            {mappingType === 'plugin' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUnplug();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Executar plugin"
                type="button"
              >
                <Unplug className="w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function $createHeaderFieldNode(
  label: string,
  value: string = '',
  placeholder: string = '',
  mappingType: 'field' | 'formula' | 'plugin' | null = null,
  mappingValue?: string
): HeaderFieldNode {
  return new HeaderFieldNode(label, value, placeholder, mappingType, mappingValue);
}

export function $isHeaderFieldNode(
  node: LexicalNode | null | undefined
): node is HeaderFieldNode {
  return node instanceof HeaderFieldNode;
}