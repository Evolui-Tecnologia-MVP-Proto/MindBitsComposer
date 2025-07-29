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

  // Sincronizar valor quando o nó for atualizado
  React.useEffect(() => {
    const unregister = editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const nodeValue = node.getValue();
        if (nodeValue !== value) {
          setValue(nodeValue);
        }
      });
    });
    
    return () => {
      unregister();
    };
  }, [editor, node, value]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    editor.update(() => {
      node.setValue(newValue);
    });
  };

  const handleRefresh = () => {
    console.log('🔄 Refresh clicked - mappingType:', mappingType, 'mappingValue:', mappingValue);
    
    // Disparar evento customizado para o LexicalEditor lidar
    const event = new CustomEvent('headerFieldRefresh', {
      detail: {
        label: node.getLabel(),
        mappingType,
        mappingValue,
        nodeKey: node.getKey()
      }
    });
    window.dispatchEvent(event);
  };

  const handleUnplug = () => {
    console.log('🔌 Unplug clicked - mappingType:', mappingType, 'mappingValue:', mappingValue);
    
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
  };

  return (
    <div className="flex items-center mb-3 border border-gray-300 dark:border-[#374151] rounded-md header-field-container" style={{ borderRadius: '6px' }}>
      <div 
        className="px-4 py-2 text-sm font-medium text-white min-w-[120px] flex-shrink-0 border-r border-white"
        style={{ backgroundColor: '#111827' }}
      >
        {node.getLabel()}
      </div>
      <div className="flex-1 flex items-center bg-white dark:bg-[#0F172A]" style={{ borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="header-field-input flex-1 px-3 py-2 text-sm border-0 outline-none
                     bg-transparent text-gray-900 dark:text-gray-200
                     focus:ring-0 focus:border-0"
          placeholder={node.__placeholder}
        />
        
        {/* Botões de ação baseados no tipo de mapeamento */}
        {mappingType && (
          <div className="pr-2">
            {(mappingType === 'field' || mappingType === 'formula') && (
              <button
                onClick={handleRefresh}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Recarregar valor"
              >
                <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {mappingType === 'plugin' && (
              <button
                onClick={handleUnplug}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Executar plugin"
              >
                <Unplug className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
  node: LexicalNode | null | undefined,
): node is HeaderFieldNode {
  return node instanceof HeaderFieldNode;
}