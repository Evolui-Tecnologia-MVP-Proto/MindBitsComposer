import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const DocumentNode = memo(({ data, selected, ...nodeProps }: NodeProps) => {
  // Hook para buscar templates
  const { data: templatesList } = useQuery({
    queryKey: ['/api/templates/struct'],
    enabled: true
  });

  // Função para obter informações do template selecionado
  const getTemplateInfo = (templateId: string) => {
    if (!templatesList || !templateId) return null;
    const template = templatesList.find((t: any) => t.id === templateId);
    return template ? { code: template.code, name: template.name } : null;
  };

  const templateInfo = data.docType ? getTemplateInfo(data.docType) : null;

  // Calcular altura dinâmica baseada no conteúdo
  const calculateHeight = () => {
    if (!data.configured || data.showLabel !== false) {
      return 80; // Altura padrão
    }
    
    if (templateInfo) {
      const codeLength = templateInfo.code.length;
      const nameLength = templateInfo.name.length;
      const maxLineLength = Math.max(codeLength, nameLength);
      
      // Altura base + espaço adicional para texto longo
      const baseHeight = 80;
      const additionalHeight = Math.max(0, (maxLineLength - 15) * 2); // 2px por caractere extra
      const nameLines = Math.ceil(nameLength / 18); // Quebra de linha a cada ~18 caracteres
      const multiLineHeight = nameLines > 1 ? (nameLines - 1) * 12 : 0;
      
      return Math.min(baseHeight + additionalHeight + multiLineHeight, 120); // Máximo de 120px
    }
    
    return 80;
  };

  const dynamicHeight = calculateHeight();

  return (
    <div className="relative" style={{ width: '140px', height: `${dynamicHeight}px` }}>
      {/* SVG para contorno do documento com base ondulada */}
      <svg 
        className="absolute inset-0 pointer-events-none"
        width="140" 
        height={dynamicHeight} 
        viewBox={`0 0 140 ${dynamicHeight}`}
      >
        <polygon
          points={`0,0 140,0 140,${dynamicHeight - 16} 112,${dynamicHeight} 28,${dynamicHeight - 16} 0,${dynamicHeight - 16}`}
          fill={data.configured ? "#dcfce7" : "white"}
          stroke={selected ? "orange" : "black"}
          strokeWidth={selected ? "4" : "2"}
          style={{
            filter: selected ? 'drop-shadow(0 4px 8px rgba(255, 165, 0, 0.4))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        />
      </svg>
      {/* Ícone no canto superior esquerdo */}
      <FileText className="absolute top-1 left-1 h-6 w-6 text-purple-600 z-10" />
      
      {/* Badge "In Progress" no canto superior direito */}
      {data.isInProcess === "TRUE" && (
        <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] font-mono px-2 py-1 rounded-md shadow-md z-20 whitespace-nowrap">
          In Progress
        </div>
      )}
      {/* Conteúdo do nó */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
          selected ? 'scale-105' : ''
        }`}
        style={{
          pointerEvents: 'none'
        }}
      >
        <div className="text-center pt-2">
          {data.showLabel !== false && (
            <div className={`font-medium font-mono text-sm ${data.configured ? 'text-green-800' : 'text-black'}`}>{data.label}</div>
          )}
          {data.configured && data.showLabel === false && (
            <div className="text-xs text-green-800 font-medium font-mono px-2">
              {templateInfo ? (
                <>
                  <div className="font-mono font-bold text-center">{templateInfo.code}</div>
                  <div className="font-mono text-[9px] leading-tight mt-1 text-center break-words whitespace-normal px-1">
                    {templateInfo.name}
                  </div>
                </>
              ) : (
                <div className="font-mono text-center">✓ Documento</div>
              )}
            </div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ top: '-8px' }} />
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500" style={{ bottom: '-8px' }} />
    </div>
  );
});