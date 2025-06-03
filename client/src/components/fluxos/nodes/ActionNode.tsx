import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Zap } from 'lucide-react';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  // Função para obter o texto descritivo do actionType
  const getActionTypeText = (actionTypeId: string) => {
    const actionTypeMap: { [key: string]: string } = {
      'Aprove_Doc': 'Análise Externa',
      'Intern_Aprove': 'Análise Interna', 
      'Complete_Form': 'Preencher Formulário'
    };
    return actionTypeMap[actionTypeId] || actionTypeId;
  };

  return (
    <div className={`relative px-4 py-2 rounded-lg shadow-md min-w-[120px] text-center transition-all duration-200 ${
      data.configured ? 'bg-green-200 text-green-800' : 'bg-white text-black'
    } ${
      selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300 scale-105 border-4' : 'border-black border-2'
    }`}>
      <Zap className="absolute top-1 left-0 h-6 w-6 text-yellow-600" />
      {data.showLabel !== false && (
        <div className="font-medium font-mono">{data.label}</div>
      )}
      {data.configured && data.showLabel === false && (
        <div className="text-xs font-medium font-mono">
          {data.actionType && <div className="font-mono">{getActionTypeText(data.actionType)}</div>}
          {!data.actionType && <div className="font-mono">✓ Ação</div>}
          {data.description && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 border max-w-[200px]">
              <div className="whitespace-pre-wrap break-words">{data.description}</div>
            </div>
          )}
        </div>
      )}
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
    </div>
  );
});