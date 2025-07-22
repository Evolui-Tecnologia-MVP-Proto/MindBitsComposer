import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { Node } from 'reactflow';

interface NodeInspectorProps {
  selectedNode: Node | null;
  nodes: Node[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  getNodeMetadata: (nodeType: string) => any;
  savedFlows: any[];
  templatesData: any[];
  applyInspectorChanges: () => void;
  onNodeChange?: () => void;
}

export function NodeInspector({
  selectedNode,
  nodes,
  setNodes,
  getNodeMetadata,
  savedFlows,
  templatesData,
  applyInspectorChanges,
  onNodeChange
}: NodeInspectorProps) {
  if (!selectedNode) {
    return (
      <div className="w-full h-full bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="text-center text-gray-500 mt-8">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Selecione um nó para editar suas propriedades</p>
        </div>
      </div>
    );
  }

  const nodeMetadata = getNodeMetadata(selectedNode.type);
  
  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Cabeçalho fixo */}
      <div className="p-4 border-b pb-2 flex-shrink-0">
        <h3 className="text-lg font-semibold">Inspector de Propriedades</h3>
        <p className="text-sm text-gray-600 font-mono">
          {nodeMetadata?.label || selectedNode.type} - {selectedNode.id}
        </p>
      </div>
      
      {/* Área da tabela com rolagem */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-24" />
                <col />
              </colgroup>
              <tbody>
                {/* Linha fixa: label */}
                <tr className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">label</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <div className="text-xs text-gray-900 font-mono bg-gray-50 px-1 py-0.5 rounded">
                      {selectedNode.data.label || nodeMetadata?.label || '-'}
                    </div>
                  </td>
                </tr>
                
                {/* Linha fixa: type */}
                <tr className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">type</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <div className="text-xs text-gray-900 font-mono bg-gray-50 px-1 py-0.5 rounded">
                      {selectedNode.type}
                    </div>
                  </td>
                </tr>

                {/* Propriedades dinâmicas baseadas em metadata */}
                {nodeMetadata?.metadata && Object.entries(nodeMetadata.metadata).map(([key, value]) => {
            console.log('Processando campo:', key, 'valor:', value, 'tipo:', typeof value);
            
            // Verificar se é uma string vazia - criar linha com campo de input
            if (typeof value === 'string' && value === '') {
              return (
                <tr key={key} className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <Input 
                      value={selectedNode.data[key] || ''} 
                      onChange={(e) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: e.target.value } }
                            : node
                        ));
                        onNodeChange?.();
                      }}
                      className="!text-xs font-mono h-6 px-1 text-left"
                      placeholder={`Digite o valor para ${key}`}
                    />
                  </td>
                </tr>
              );
            }
            
            // Verificar se é uma string com conteúdo (não vazia) - renderizar como Input para edição
            if (typeof value === 'string' && value !== '' && !value.includes('{{')) {
              return (
                <tr key={key} className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <Input 
                      value={selectedNode.data[key] || value} 
                      onChange={(e) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: e.target.value } }
                            : node
                        ));
                        onNodeChange?.();
                      }}
                      className="!text-xs font-mono h-6 px-1 text-left"
                      placeholder={`Digite o valor para ${key}`}
                    />
                  </td>
                </tr>
              );
            }
            
            // Verificar se é um campo de referência com marcadores {{ }}
            if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
              console.log('Campo com marcadores detectado:', key, value);
              
              // Para campos que referenciam documents_flows
              if (value.includes('documents_flows')) {
                return (
                  <tr key={key} className="bg-white border-b border-gray-100">
                    <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                      <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                    </td>
                    <td className="px-2 py-1.5 text-left">
                      <Select 
                        value={selectedNode.data[key] || ''} 
                        onValueChange={(newValue) => {
                          const selectedFlow = savedFlows?.find((flow: any) => flow.id === newValue);
                          setNodes(nds => nds.map(node => 
                            node.id === selectedNode.id 
                              ? { 
                                  ...node, 
                                  data: { 
                                    ...node.data, 
                                    [key]: newValue,
                                    To_Flow_code: selectedFlow?.code || '',
                                    To_Flow_name: selectedFlow?.name || '',
                                    configured: true,
                                    showLabel: false,
                                    // Se for EndNode e FromType = 'Init' (Encerramento Direto), limpar To_Flow_id
                                    ...(selectedNode.type === 'endNode' && key === 'FromType' && newValue === 'Init' 
                                      ? { To_Flow_id: '', To_Flow_code: '', To_Flow_name: '' } 
                                      : {})
                                  }
                                }
                              : node
                          ));
                          onNodeChange?.();
                        }}
                      >
                        <SelectTrigger className="!text-xs font-mono h-6 px-1 text-left">
                          <SelectValue placeholder="Selecione o fluxo" />
                        </SelectTrigger>
                        <SelectContent className="!text-xs">
                          {savedFlows && savedFlows.map((flow: any) => (
                            <SelectItem key={flow.id} value={flow.id} className="!text-xs font-mono">
                              [{flow.code}] - {flow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              }
              
              // Para campos que referenciam templates
              if (value.includes('templates')) {
                // Parse da definição do template
                const templateMatch = value.match(/{{templates\.([^}]+)}}/);
                if (templateMatch) {
                  const templateDef = templateMatch[1];
                  const parts = templateDef.split(',');
                  let displayFormat = '{code}-{name}';
                  let filterCriteria: any = {};
                  
                  // Processar cada parte da definição
                  parts.forEach(part => {
                    const trimmedPart = part.trim();
                    if (trimmedPart.includes('-')) {
                      // Formato de exibição (ex: cod-name)
                      displayFormat = trimmedPart;
                    } else if (trimmedPart.includes('=')) {
                      // Critério de filtro (ex: type=struct)
                      const [filterKey, filterValue] = trimmedPart.split('=');
                      filterCriteria[filterKey.trim()] = filterValue.trim();
                    }
                  });

                  return (
                    <tr key={key} className="bg-white border-b border-gray-100">
                      <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                        <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                      </td>
                      <td className="px-2 py-1.5 text-left">
                        <Select 
                          value={selectedNode.data[key] || ''} 
                          onValueChange={(newValue) => {
                            const selectedTemplate = templatesData?.find((template: any) => template.id === newValue);
                            setNodes(nds => nds.map(node => 
                              node.id === selectedNode.id 
                                ? { 
                                    ...node, 
                                    data: { 
                                      ...node.data, 
                                      [key]: newValue,
                                      ...(selectedTemplate ? {
                                        template_code: selectedTemplate.code,
                                        template_name: selectedTemplate.name
                                      } : {}),
                                      configured: true,
                                      showLabel: false
                                    }
                                  }
                                : node
                            ));
                          }}
                        >
                          <SelectTrigger className="!text-xs font-mono h-6 px-1 text-left">
                            <SelectValue placeholder="Selecione template" />
                          </SelectTrigger>
                          <SelectContent className="!text-xs">
                            {templatesData && templatesData
                              .filter((template: any) => {
                                // Aplicar filtros se definidos
                                return Object.keys(filterCriteria).every(filterKey => 
                                  template[filterKey] === filterCriteria[filterKey]
                                );
                              })
                              .map((template: any) => (
                                <SelectItem key={template.id} value={template.id} className="!text-xs font-mono">
                                  [{template.code}] - {template.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                }
              }
            }
            
            // Verificar se é um objeto com opções (como FromType)
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const options = Object.entries(value);
              if (options.length > 0) {
                return (
                  <tr key={key} className="bg-white border-b border-gray-100">
                    <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                      <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                    </td>
                    <td className="px-2 py-1.5 text-left">
                      <Select 
                        value={selectedNode.data[key] || ''} 
                        onValueChange={(newValue) => {
                          setNodes(nds => nds.map(node => 
                            node.id === selectedNode.id 
                              ? { 
                                  ...node, 
                                  data: { 
                                    ...node.data, 
                                    [key]: newValue, 
                                    configured: true, 
                                    showLabel: false,
                                    // Se for EndNode e To_Type = 'Direct_finish' (Encerramento Direto), limpar To_Flow_id
                                    ...(selectedNode.type === 'endNode' && key === 'To_Type' && newValue === 'Direct_finish' 
                                      ? { To_Flow_id: '' } 
                                      : {})
                                  }
                                }
                              : node
                          ));
                        }}
                      >
                        <SelectTrigger className="!text-xs font-mono h-6 px-1 text-left">
                          <SelectValue placeholder="Selecione opção" />
                        </SelectTrigger>
                        <SelectContent className="!text-xs">
                          {options.map(([optionKey, optionValue]) => (
                            <SelectItem 
                              key={optionKey} 
                              value={optionKey}
                              className="!text-xs font-mono"
                            >
                              {String(optionValue)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              }
            }
            
            if (Array.isArray(value)) {
              // Renderizar como Select para arrays simples
              return (
                <tr key={key} className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <Select 
                      value={selectedNode.data[key] || ''} 
                      onValueChange={(newValue) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: newValue } }
                            : node
                        ));
                      }}
                    >
                      <SelectTrigger className="!text-xs font-mono h-6 px-1 text-left">
                        <SelectValue placeholder="Selecione valor" />
                      </SelectTrigger>
                      <SelectContent className="!text-xs">
                        {value.map((option: any, index: number) => {
                          if (typeof option === 'string') {
                            return (
                              <SelectItem key={index} value={option} className="!text-xs font-mono">
                                {option}
                              </SelectItem>
                            );
                          } else if (option.type && option.name) {
                            // Para docType que tem estrutura {type, name, template}
                            return (
                              <SelectItem key={index} value={option.type} className="!text-xs font-mono">
                                {option.name} ({option.type})
                              </SelectItem>
                            );
                          }
                          return null;
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            } else if (typeof value === 'object' && value !== null) {
              // Renderizar como Select para objetos (chave-valor)
              return (
                <tr key={key} className="bg-white border-b border-gray-100">
                  <td className="px-2 py-1.5 border-r border-gray-200 text-left">
                    <div className="text-xs font-medium text-gray-700 font-mono">{key}</div>
                  </td>
                  <td className="px-2 py-1.5 text-left">
                    <Select 
                      value={selectedNode.data[key] || ''} 
                      onValueChange={(newValue) => {
                        setNodes(nds => nds.map(node => 
                          node.id === selectedNode.id 
                            ? { ...node, data: { ...node.data, [key]: newValue } }
                            : node
                        ));
                      }}
                    >
                      <SelectTrigger className="!text-xs font-mono h-6 px-1 text-left">
                        <SelectValue placeholder="Selecione valor" />
                      </SelectTrigger>
                      <SelectContent className="!text-xs">
                        {Object.entries(value as Record<string, any>).map(([optKey, optValue]) => (
                          <SelectItem key={optKey} value={optKey} className="!text-xs font-mono">
                            {String(optValue)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            }
            return null;
          })}
              </tbody>
            </table>
        </div>
      </div>

      {/* Rodapé fixo com botões */}
      <div className="p-4 border-t flex justify-end flex-shrink-0">
        <Button 
          onClick={applyInspectorChanges}
          className="w-auto"
          size="sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Aplicar Alterações
        </Button>
      </div>
    </div>
  );
}