import { useQuery } from "@tanstack/react-query";
import { useReactFlow, Handle, Position } from 'reactflow';
import { 
  Play, 
  Square, 
  Zap, 
  FileText, 
  Link, 
  Network, 
  CircleCheck, 
  X 
} from 'lucide-react';

export const StartNodeComponent = (props: any) => {
  const isSelected = props.selected;
  
  const getBackgroundColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'bg-[#21639a]';
    if (props.data.isPendingConnected) return 'bg-yellow-200';
    return 'bg-white dark:bg-[#292C33]';
  };

  const getTextColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'text-white';
    if (props.data.isPendingConnected) return 'text-black'; // Preto para pendente em qualquer tema
    return 'text-black dark:text-white';
  };
  
  // Classes para realce do nó selecionado
  const selectionStyle = isSelected 
    ? 'ring-4 ring-orange-400 ring-opacity-75 shadow-lg shadow-orange-200 scale-105' 
    : '';
  const borderStyle = isSelected 
    ? 'border-orange-500 border-4' 
    : 'border-black border-2';

  return (
    <div className={`relative px-4 py-2 rounded-full shadow-md min-w-[100px] text-center transition-all duration-200 ${
      getBackgroundColor()
    } ${
      getTextColor()
    } ${borderStyle} ${selectionStyle}`}>
      <Play className="absolute -top-4 -left-3 h-6 w-6 text-green-600" />
      {props.data.showLabel !== false && (
        <div className="font-medium font-mono">{props.data.label}</div>
      )}
      {props.data.configured && props.data.showLabel === false && (
        <div className="text-xs font-medium font-mono">
          {props.data.FromType && (
            <div className={`px-2 py-1 rounded font-mono ${getTextColor()}`}>
              {props.data.FromType === 'Init' ? 'Início Direto' : 
               props.data.FromType === 'flow_init' ? 'Transferência de Fluxo' : props.data.FromType}
            </div>
          )}
          {!props.data.FromType && <div className={`font-mono ${getTextColor()}`}>✓ Início</div>}
        </div>
      )}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-white border-2 border-blue-500" 
        style={{ bottom: '-8px' }} 
      />
    </div>
  );
};

export const EndNodeComponent = (props: any) => {
  const isSelected = props.selected;
  
  const getBackgroundColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'bg-[#21639a]';
    if (props.data.isPendingConnected) return 'bg-yellow-200';
    return 'bg-white dark:bg-[#292C33]';
  };

  const getTextColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'text-white';
    if (props.data.isPendingConnected) return 'text-black'; // Preto para pendente em qualquer tema
    return 'text-black dark:text-white';
  };
  
  // Classes para realce do nó selecionado
  const selectionStyle = isSelected 
    ? 'ring-4 ring-orange-400 ring-opacity-75 shadow-lg shadow-orange-200 scale-105' 
    : '';
  const borderStyle = isSelected 
    ? 'border-orange-500 border-4' 
    : 'border-black border-2';

  // Hook para buscar fluxos de documentos
  const { data: documentsFlowsList } = useQuery({
    queryKey: ['/api/documents-flows'],
    enabled: true
  });

  // Função para obter informações do fluxo selecionado
  const getFlowInfo = (flowId: string) => {
    if (!documentsFlowsList || !flowId) return null;
    const flow = (documentsFlowsList as any[]).find((f: any) => f.id === flowId);
    return flow ? { code: flow.code, name: flow.name } : null;
  };

  const flowInfo = props.data.To_Flow_id ? getFlowInfo(props.data.To_Flow_id) : null;

  return (
    <div className={`relative px-4 py-2 rounded-full shadow-md min-w-[100px] text-center transition-all duration-200 ${
      getBackgroundColor()
    } ${
      getTextColor()
    } ${borderStyle} ${selectionStyle}`}>
      <Square className="absolute -top-4 -left-5 h-6 w-6 text-red-600" />
      {props.data.showLabel !== false && (
        <div className="font-medium font-mono">{props.data.label}</div>
      )}
      {props.data.configured && props.data.showLabel === false && (
        <div className="text-xs font-medium font-mono">
          {props.data.To_Type && (
            <div className={`px-2 py-1 rounded font-mono ${getTextColor()}`}>
              {props.data.To_Type === 'Direct_finish' ? 'Encerramento Direto' : 
               props.data.To_Type === 'flow_Finish' ? 'Transferência para Fluxo' : props.data.To_Type}
            </div>
          )}
          {props.data.To_Flow_id && (
            <div className={`mt-1 px-2 py-1 rounded font-mono ${getTextColor()}`}>
              {flowInfo ? (
                <>
                  <div className="font-bold">{flowInfo.code}</div>
                  <div className="text-[10px] leading-tight">{flowInfo.name}</div>
                </>
              ) : (
                <div className="text-xs">Fluxo: {props.data.To_Flow_id}</div>
              )}
            </div>
          )}

        </div>
      )}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-white border-2 border-blue-500" 
        style={{ top: '-8px' }} 
      />
    </div>
  );
};

export const ActionNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  const { getNodes, setNodes } = useReactFlow();
  
  let backgroundClass = 'bg-white dark:bg-[#292C33]';
  if (isExecuted) backgroundClass = 'bg-[#21639a]';
  else if (isPendingConnected) backgroundClass = 'bg-yellow-200';
  
  const textClass = isExecuted ? 'text-white' : isPendingConnected ? 'text-black' : 'text-black dark:text-white';
  
  // Classes para realce do nó selecionado
  const selectionStyle = isSelected 
    ? 'ring-4 ring-orange-400 ring-opacity-75 shadow-lg shadow-orange-200 scale-105' 
    : '';
  const borderStyle = isSelected 
    ? 'border-orange-500 border-4' 
    : 'border-black border-2';

  // Função para atualizar o status de aprovação diretamente no nó
  const updateApprovalStatus = (newStatus: string) => {
    const currentNodes = getNodes();
    const updatedNodes = currentNodes.map(node => {
      if (node.id === props.id) {
        return {
          ...node,
          data: {
            ...node.data,
            isAproved: newStatus
          }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
  };
  
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
    <div className={`relative px-4 py-2 rounded-lg shadow-md min-w-[120px] text-center transition-all duration-200 ${backgroundClass} ${textClass} ${borderStyle} ${selectionStyle}`}>
      <Zap className="absolute top-1 left-0 h-6 w-6 text-yellow-600" />
      
      {/* Checkboxes de aprovação - apenas se o nó tem campo isAproved */}
      {props.data.isAproved !== undefined && !props.data.isReadonly && (
        <div className="absolute top-1 right-1 flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateApprovalStatus('TRUE');
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              props.data.isAproved === 'TRUE'
                ? 'bg-green-500 border-green-600 text-white'
                : 'bg-white border-gray-400 hover:border-green-500'
            }`}
            title="Aprovar"
          >
            {props.data.isAproved === 'TRUE' && <CircleCheck className="w-3 h-3" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateApprovalStatus('FALSE');
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              props.data.isAproved === 'FALSE'
                ? 'bg-red-500 border-red-600 text-white'
                : 'bg-white border-gray-400 hover:border-red-500'
            }`}
            title="Rejeitar"
          >
            {props.data.isAproved === 'FALSE' && <X className="w-3 h-3" />}
          </button>
        </div>
      )}
      
      {props.data.showLabel !== false && (
        <div className="font-medium font-mono">{props.data.label}</div>
      )}
      {props.data.configured && props.data.showLabel === false && (
        <div className={`text-xs font-medium font-mono ${textClass}`}>
          {props.data.actionType && <div className="font-mono">{getActionTypeText(props.data.actionType)}</div>}
          {!props.data.actionType && <div className="font-mono">✓ Ação</div>}
          {props.data.description && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-[#474A52] rounded text-xs text-gray-700 dark:text-gray-200 border dark:border-gray-600 max-w-[200px]">
              <div className="whitespace-pre-wrap break-words">{props.data.description}</div>
            </div>
          )}
        </div>
      )}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-white border-2 border-blue-500" 
        style={{ top: '-8px' }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 bg-white border-2 border-blue-500" 
        style={{ bottom: '-8px' }} 
      />
    </div>
  );
};

export const DocumentNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  // Detectar modo escuro e aplicar cor adequada
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  let fillColor = isDarkMode ? '#292C33' : 'white';
  if (isExecuted) fillColor = '#21639a';
  else if (isPendingConnected) fillColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : isPendingConnected ? 'text-black' : isDarkMode ? 'text-white' : 'text-black';
  
  // Configurações para realce do nó selecionado
  const strokeColor = isSelected ? '#f97316' : 'black'; // laranja quando selecionado
  const strokeWidth = isSelected ? '4' : '2';
  const dropShadowFilter = isSelected 
    ? 'drop-shadow(0 4px 8px rgba(249, 115, 22, 0.4))' 
    : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))';
  const scaleTransform = isSelected ? 'scale(1.05)' : 'scale(1)';
  
  // Hook para buscar templates
  const { data: templatesList } = useQuery({
    queryKey: ['/api/templates/struct'],
    enabled: true
  });

  // Função para obter informações do template selecionado
  const getTemplateInfo = (templateId: string) => {
    if (!templatesList || !templateId) return null;
    const template = (templatesList as any[]).find((t: any) => t.id === templateId);
    return template ? { code: template.code, name: template.name } : null;
  };

  const templateInfo = props.data.docType ? getTemplateInfo(props.data.docType) : null;

  // Calcular altura dinâmica baseada no conteúdo
  const calculateHeight = () => {
    if (!props.data.configured || props.data.showLabel !== false) {
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
    <div className="relative transition-transform duration-200" style={{ width: '140px', height: `${dynamicHeight}px`, transform: scaleTransform }}>
      <svg 
        className="absolute inset-0 pointer-events-none"
        width="140" 
        height={dynamicHeight} 
        viewBox={`0 0 140 ${dynamicHeight}`}
      >
        <polygon
          points={`0,0 140,0 140,${dynamicHeight - 16} 112,${dynamicHeight} 28,${dynamicHeight - 16} 0,${dynamicHeight - 16}`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{
            filter: dropShadowFilter
          }}
        />
      </svg>
    <FileText className="absolute top-1 left-1 h-6 w-6 text-purple-600 z-10" />
    
    {/* Badge no canto superior direito - Discarted tem prioridade sobre In Progress */}
    {props.data.isDiscarted === 'TRUE' ? (
      <div className="absolute -top-1 -right-1 z-20">
        <div className="bg-red-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shadow-md border border-red-600">
          Discarted
        </div>
      </div>
    ) : props.data.isInProcess === 'TRUE' ? (
      <div className="absolute -top-1 -right-1 z-20">
        <div className="bg-purple-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shadow-md border border-purple-600">
          In Progress
        </div>
      </div>
    ) : null}
    
    <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
      <div className="text-center pt-2">
        {props.data.showLabel !== false && (
          <div className={`font-medium font-mono text-sm ${textClass}`}>{props.data.label}</div>
        )}
        {props.data.configured && props.data.showLabel === false && (
          <div className={`text-xs font-medium font-mono px-2 ${textClass}`}>
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
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-4 h-4 bg-white border-2 border-blue-500" 
      style={{ top: '-8px' }} 
    />
    <Handle 
      type="source" 
      position={Position.Bottom} 
      className="w-4 h-4 bg-white border-2 border-blue-500" 
      style={{ bottom: '-8px' }} 
    />
  </div>
  );
};

export const IntegrationNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  // Detectar modo escuro e aplicar cor adequada
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  let fillColor = isDarkMode ? '#292C33' : 'white';
  if (isExecuted) fillColor = '#21639a';
  else if (isPendingConnected) fillColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : isPendingConnected ? 'text-black' : isDarkMode ? 'text-white' : 'text-black';
  
  // Configurações para realce do nó selecionado
  const strokeColor = isSelected ? '#f97316' : 'black'; // laranja quando selecionado
  const strokeWidth = isSelected ? '4' : '2';
  const dropShadowFilter = isSelected 
    ? 'drop-shadow(0 4px 8px rgba(249, 115, 22, 0.4))' 
    : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))';
  const scaleTransform = isSelected ? 'scale(1.05)' : 'scale(1)';
  
  return (
    <div className="relative transition-transform duration-200" style={{ width: '140px', height: '80px', transform: scaleTransform }}>
      <svg 
        className="absolute inset-0 pointer-events-none"
        width="140" 
        height="80" 
        viewBox="0 0 140 80"
      >
        <polygon
          points="28,0 140,0 112,80 0,80"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{
            filter: dropShadowFilter
          }}
        />
      </svg>
    <Link className="absolute top-1 right-3 h-6 w-6 text-orange-600 z-10" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        {props.data.showLabel !== false && (
          <div className={`font-medium font-mono text-sm ${textClass}`}>{props.data.label}</div>
        )}
        {props.data.configured && props.data.showLabel === false && (
          <div className={`text-xs font-medium font-mono ${textClass}`}>
            {props.data.integrType && <div className="font-mono">{props.data.integrType}</div>}
            {props.data.service && <div className="font-mono">{props.data.service}</div>}
            {!props.data.integrType && !props.data.service && <div className="font-mono">✓ Integração</div>}
          </div>
        )}
      </div>
    </div>
    <Handle
      type="target"
      position={Position.Top}
      className="w-4 h-4 bg-white border-2 border-blue-500"
      style={{ top: '-8px', zIndex: 10 }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-4 h-4 bg-white border-2 border-blue-500"
      style={{ bottom: '-8px', zIndex: 10 }}
    />
  </div>
  );
};

export const SwitchNodeComponent = (props: any) => {
  // Calcular tamanho dinâmico baseado no texto, mantendo proporção do paralelogramo
  const hasText = props.data.switchField && props.data.switchField.length > 0;
  const textLength = hasText ? props.data.switchField.length : 0;
  
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
  
  const leftHandleColor = getHandleColor(props.data.leftSwitch);
  const rightHandleColor = getHandleColor(props.data.rightSwitch);
  
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  // Detectar modo escuro e aplicar cor adequada
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  let backgroundColor = isDarkMode ? '#292C33' : 'white';
  if (isExecuted) backgroundColor = '#21639a';
  else if (isPendingConnected) backgroundColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : isPendingConnected ? 'text-black' : isDarkMode ? 'text-white' : 'text-black';
  
  // Configurações para realce do nó selecionado
  const borderStyle = isSelected ? '4px solid #f97316' : '2px solid black';
  const boxShadowStyle = isSelected 
    ? '0 8px 12px -2px rgba(249, 115, 22, 0.3), 0 4px 8px rgba(249, 115, 22, 0.4)' 
    : '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
  const scaleTransform = isSelected ? 'scale(1.05)' : 'scale(1)';
  const containerTransform = `${scaleTransform}`;
  const nodeTransform = isSelected 
    ? 'rotateX(60deg) rotateZ(45deg) scale(1.02)' 
    : 'rotateX(60deg) rotateZ(45deg)';
  
  return (
    <div className="relative transition-transform duration-200" style={{ width: `${dynamicWidth}px`, height: `${dynamicHeight}px`, transform: containerTransform }}>
      <Network className="absolute top-1 left-1 h-6 w-6 text-blue-600 z-20" />
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 bg-white border-2 border-blue-500" 
        style={{ top: '2px', left: '50%', transform: 'translateX(-50%)' }}
      />
      <div
        className="absolute transition-all duration-200"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: backgroundColor,
          border: borderStyle,
          transformStyle: 'preserve-3d',
          transform: nodeTransform,
          boxShadow: boxShadowStyle,
        }}
      >
        <div 
          className="absolute inset-0 flex flex-col justify-between"
          style={{ opacity: 0.2, padding: '4px' }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-full h-px bg-black" />
          ))}
        </div>
      </div>
      
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center">
          {props.data.showLabel !== false && (
            <div className={`font-medium font-mono ${textClass} text-sm`}>{props.data.label}</div>
          )}
          {props.data.configured && props.data.showLabel === false && (
            <div className={`text-xs font-medium font-mono ${textClass}`}>
              {props.data.switchField && <div className="font-mono">{props.data.switchField}</div>}
              {!props.data.switchField && <div className="font-mono">✓ Switch</div>}
            </div>
          )}
        </div>
      </div>
      
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
      {props.data.configured && props.data.rightSwitch && (
        <div 
          className={`absolute text-xs font-mono px-1 rounded ${
            rightHandleColor === 'green' ? 'text-green-700 bg-green-100' : 
            rightHandleColor === 'red' ? 'text-red-700 bg-red-100' : 
            'text-gray-700 bg-gray-100'
          }`}
          style={{ top: 'calc(75% - 11px)', right: '-45px', transform: 'translateX(50%)', whiteSpace: 'nowrap' }}
        >
          {Array.isArray(props.data.rightSwitch) ? props.data.rightSwitch.join(',') : props.data.rightSwitch}
        </div>
      )}
      {props.data.configured && props.data.leftSwitch && (
        <div 
          className={`absolute text-xs font-mono px-1 rounded ${
            leftHandleColor === 'green' ? 'text-green-700 bg-green-100' : 
            leftHandleColor === 'red' ? 'text-red-700 bg-red-100' : 
            'text-gray-700 bg-gray-100'
          }`}
          style={{ top: 'calc(75% - 11px)', left: '-45px', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          {Array.isArray(props.data.leftSwitch) ? props.data.leftSwitch.join(',') : props.data.leftSwitch}
        </div>
      )}
    </div>
  );
};