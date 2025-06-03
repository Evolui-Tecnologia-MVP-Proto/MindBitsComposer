import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Square } from 'lucide-react';

export const EndNode = memo(({ data, selected }: NodeProps) => {
  const getBackgroundColor = () => {
    if (data.To_Type === 'Direct_finish') {
      return 'bg-[#ef4444]'; // Vermelho para encerramento direto
    } else if (data.To_Type) {
      return 'bg-[#3b82f6]'; // Azul para outros tipos
    }
    return 'bg-white'; // Estado padrão: fundo branco
  };

  const getTextColor = () => {
    if (data.To_Type === 'Direct_finish' || data.To_Type) {
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
    <Square className="absolute -top-4 -left-5 h-6 w-6 text-red-600" />
    {data.showLabel !== false && (
      <div className="font-medium font-mono">{data.label}</div>
    )}
    {data.configured && data.showLabel === false && (
      <div className="text-xs font-medium font-mono">
        {data.To_Type && (
          <div className={`px-2 py-1 rounded font-mono ${
            data.To_Type === 'Direct_finish' ? 'bg-[#ef4444] text-white' : 'bg-[#3b82f6] text-white'
          }`}>
            {data.To_Type === 'Direct_finish' ? 'Encerramento Direto' : 
             data.To_Type === 'flow_Finish' ? 'Transferência para Fluxo' : data.To_Type}
          </div>
        )}
        {data.To_Flow_id && (
          <div className={`mt-1 px-2 py-1 rounded font-mono ${
            data.To_Type === 'Direct_finish' ? 'bg-[#ef4444] text-white' : 'bg-[#3b82f6] text-white'
          }`}>
            {data.To_Flow_code && data.To_Flow_name ? (
              <>
                <div className="font-bold">{data.To_Flow_code}</div>
                <div className="text-[10px] leading-tight">{data.To_Flow_name}</div>
              </>
            ) : (
              <div className="text-xs">Fluxo: {data.To_Flow_id}</div>
            )}
          </div>
        )}
        {!data.To_Type && !data.To_Flow_id && <div className="font-mono">✓ Configurado</div>}
      </div>
    )}
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
  </div>
  );
});