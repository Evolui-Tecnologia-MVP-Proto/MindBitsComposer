import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const SwitchNode = memo(({ data, selected }: NodeProps) => {
  // Calcular tamanho dinâmico baseado no texto, mantendo proporção do paralelogramo
  const hasText = data.switchField && data.switchField.length > 0;
  const textLength = hasText ? data.switchField.length : 0;
  
  // Tamanho base aumenta conforme o texto, mantendo formato quadrado para o paralelogramo
  const baseSize = Math.max(100, Math.min(200, 100 + (textLength * 6)));
  const dynamicWidth = baseSize;
  const dynamicHeight = baseSize; // Altura igual à largura para manter proporção do paralelogramo
  
  // Determinar cores dos handles baseado nas propriedades leftSwitch e rightSwitch
  const getHandleColor = (switchValue: any) => {
    if (!switchValue) return 'gray'; // Se não está definido, cinza
    
    if (Array.isArray(switchValue)) {
      // Se for array, verifica o primeiro valor
      const firstValue = switchValue[0];
      if (firstValue === 'TRUE') return 'green';
      if (firstValue === 'FALSE') return 'red';
      return 'gray'; // Se não for TRUE nem FALSE, cinza
    }
    
    // Se for string ou outro valor
    if (switchValue === 'TRUE') return 'green';
    if (switchValue === 'FALSE') return 'red';
    return 'gray'; // Se não for TRUE nem FALSE, cinza
  };
  
  const leftHandleColor = getHandleColor(data.leftSwitch);
  const rightHandleColor = getHandleColor(data.rightSwitch);
  
  return (
    <div className="relative" style={{ width: `${dynamicWidth}px`, height: `${dynamicHeight}px` }}>
    <GitBranch className="absolute top-1 left-1 h-6 w-6 text-blue-600 z-20" />
    <div
      className={`absolute transition-all duration-200 ${selected ? 'scale-105' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: data.configured ? '#dcfce7' : 'white', // Verde claro quando configurado
        border: selected ? '4px solid orange' : '2px solid black',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(60deg) rotateZ(45deg)',
        boxShadow: selected ? '0 8px 12px -2px rgba(255, 165, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        filter: selected ? 'drop-shadow(0 0 8px rgba(255, 165, 0, 0.4))' : 'none'
      }}
    >
      <div 
        className="absolute inset-0 flex flex-col justify-between"
        style={{ opacity: 0.2, padding: '5px' }}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-full h-px bg-black" />
        ))}
      </div>
    </div>
    
    <div className="absolute inset-0 flex items-center justify-center z-10">
      {data.showLabel !== false && (
        <div className="font-medium font-mono text-black text-sm">{data.label}</div>
      )}
      {data.configured && data.showLabel === false && data.switchField && (
        <div className="text-xs text-green-800 font-medium font-mono text-center">
          <div>{data.switchField}</div>
        </div>
      )}
    </div>
    
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-4 h-4 bg-white border-2 border-blue-500" 
      style={{ top: '2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Right} 
      className={`w-4 h-4 bg-white border-4 ${
        rightHandleColor === 'green' ? 'border-green-500' : 
        rightHandleColor === 'red' ? 'border-red-500' : 
        'border-gray-400'
      }`}
      id="a"
      style={{ top: '50%', right: '-33px', transform: 'translateY(-50%)' }}
    />
    <Handle 
      type="source" 
      position={Position.Left} 
      className={`w-4 h-4 bg-white border-4 ${
        leftHandleColor === 'green' ? 'border-green-500' : 
        leftHandleColor === 'red' ? 'border-red-500' : 
        'border-gray-400'
      }`}
      id="c"
      style={{ top: '50%', left: '-33px', transform: 'translateY(-50%)' }}
    />
    
    {/* Mostrar valores dos switches abaixo dos nós de saída */}
    {data.configured && data.rightSwitch && (
      <div 
        className={`absolute text-xs font-mono px-1 rounded ${
          rightHandleColor === 'green' ? 'text-green-700 bg-green-100' : 
          rightHandleColor === 'red' ? 'text-red-700 bg-red-100' : 
          'text-gray-700 bg-gray-100'
        }`}
        style={{ top: 'calc(75% - 11px)', right: '-45px', transform: 'translateX(50%)', whiteSpace: 'nowrap' }}
      >
        {Array.isArray(data.rightSwitch) ? data.rightSwitch.join(',') : data.rightSwitch}
      </div>
    )}
    {data.configured && data.leftSwitch && (
      <div 
        className={`absolute text-xs font-mono px-1 rounded ${
          leftHandleColor === 'green' ? 'text-green-700 bg-green-100' : 
          leftHandleColor === 'red' ? 'text-red-700 bg-red-100' : 
          'text-gray-700 bg-gray-100'
        }`}
        style={{ top: 'calc(75% - 11px)', left: '-45px', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
      >
        {Array.isArray(data.leftSwitch) ? data.leftSwitch.join(',') : data.leftSwitch}
      </div>
    )}
  </div>
  );
});