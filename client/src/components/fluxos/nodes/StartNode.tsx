import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Play } from 'lucide-react';

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.FromType === 'Init') {
      return 'bg-[#22c55e]'; // Verde para início direto
    } else if (data.FromType) {
      return 'bg-[#3b82f6]'; // Azul para outros tipos
    }
    return 'bg-white'; // Estado padrão: fundo branco
  };

  const getTextColor = () => {
    if (data.FromType === 'Init' || data.FromType) {
      return 'text-white'; // Texto branco para fundos coloridos
    }
    return 'text-black'; // Texto preto para fundo branco
  };

  return (
  <div className={`relative px-4 py-2 rounded-full shadow-md min-w-[100px] text-center transition-all duration-200 ${
    getBackgroundColor()
  } ${
    getTextColor()
  } ${
    selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300 scale-105 border-4' : 'border-black border-2'
  }`}>
    <Play className="absolute -top-4 -left-3 h-6 w-6 text-green-600" />
    {data.showLabel !== false && (
      <div className="font-medium font-mono">{data.label}</div>
    )}
    {data.configured && data.showLabel === false && (
      <div className="text-xs font-medium font-mono">
        {data.FromType && (
          <div className={`px-2 py-1 rounded font-mono ${
            data.FromType === 'Init' ? 'bg-[#22c55e] text-white' : 'bg-[#3b82f6] text-white'
          }`}>
            {data.FromType === 'Init' ? 'Início Direto' : 
             data.FromType === 'flow_init' ? 'Transferência de Fluxo' : data.FromType}
          </div>
        )}
        {data.integrType && <div className="font-mono">{data.integrType}</div>}
        {data.service && <div className="font-mono">{data.service}</div>}
        {data.actionType && <div className="font-mono">{data.actionType}</div>}
        {data.docType && <div className="font-mono">{data.docType}</div>}
        {!data.FromType && !data.integrType && !data.service && !data.actionType && !data.docType && <div className="font-mono">✓ Início</div>}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
  );
});