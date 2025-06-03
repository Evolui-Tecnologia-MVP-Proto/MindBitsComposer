import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Link } from 'lucide-react';

export const IntegrationNode = memo(({ data, selected }: NodeProps) => (
  <div className="relative" style={{ width: '140px', height: '80px' }}>
    {/* SVG para contorno do paralelogramo */}
    <svg 
      className="absolute inset-0 pointer-events-none"
      width="140" 
      height="80" 
      viewBox="0 0 140 80"
    >
      <polygon
        points="28,0 140,0 112,80 0,80"
        fill={data.configured ? "#dcfce7" : "white"}
        stroke={selected ? "orange" : "black"}
        strokeWidth={selected ? "4" : "2"}
        style={{
          filter: selected ? 'drop-shadow(0 4px 8px rgba(255, 165, 0, 0.4))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
    </svg>
    {/* Ícone no canto superior esquerdo */}
    <Link className="absolute top-1 right-3 h-6 w-6 text-orange-600 z-10" />
    {/* Conteúdo do nó */}
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
        selected ? 'scale-105' : ''
      }`}
      style={{
        clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
        pointerEvents: 'none'
      }}
    >
      <div className="text-center">
        {data.showLabel !== false && (
          <div className={`font-medium font-mono text-sm ${data.configured ? 'text-green-800' : 'text-black'}`}>{data.label}</div>
        )}
        {data.configured && data.showLabel === false && (
          <div className="text-xs text-green-800 font-medium font-mono">
            {data.integrType && <div className="font-mono">{data.integrType}</div>}
            {data.service && <div className="font-mono">{data.service}</div>}
            {!data.integrType && !data.service && <div className="font-mono">✓ Integração</div>}
          </div>
        )}
      </div>
    </div>
    <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
    <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
  </div>
));