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

export type SerializedHeaderFieldNode = Spread<
  {
    label: string;
    value: string;
    placeholder: string;
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

  static getType(): string {
    return 'header-field';
  }

  static clone(node: HeaderFieldNode): HeaderFieldNode {
    return new HeaderFieldNode(
      node.__label,
      node.__value,
      node.__placeholder,
      node.__key,
    );
  }

  constructor(label: string, value: string, placeholder: string, key?: NodeKey) {
    super(key);
    this.__label = label;
    this.__value = value;
    this.__placeholder = placeholder;
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
    const { label, value, placeholder } = serializedNode;
    const node = $createHeaderFieldNode(label, value, placeholder);
    return node;
  }

  exportJSON(): SerializedHeaderFieldNode {
    return {
      label: this.__label,
      value: this.__value,
      placeholder: this.__placeholder,
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

  const handleChange = (newValue: string) => {
    setValue(newValue);
    editor.update(() => {
      node.setValue(newValue);
    });
  };

  return (
    <div className="flex items-center mb-3 border border-gray-300 dark:border-[#374151] rounded-md overflow-hidden" style={{ borderRadius: '6px' }}>
      <div 
        className="px-4 py-2 text-sm font-medium text-white min-w-[120px] flex-shrink-0 border-r border-white"
        style={{ backgroundColor: '#111827' }}
      >
        {node.getLabel()}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border-0 outline-none
                   bg-white dark:bg-[#0F172A] text-gray-900 dark:text-gray-200
                   focus:ring-0 focus:border-0
                   lexical-header-field"
        style={{ 
          borderBottomRightRadius: '6px !important',
          borderTopRightRadius: '0px !important',
          borderTopLeftRadius: '0px !important',
          borderBottomLeftRadius: '0px !important'
        }}
        placeholder={node.__placeholder}
      />
    </div>
  );
}

export function $createHeaderFieldNode(
  label: string,
  value: string = '',
  placeholder: string = ''
): HeaderFieldNode {
  return new HeaderFieldNode(label, value, placeholder);
}

export function $isHeaderFieldNode(
  node: LexicalNode | null | undefined,
): node is HeaderFieldNode {
  return node instanceof HeaderFieldNode;
}