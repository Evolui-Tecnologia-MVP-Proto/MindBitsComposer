import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactFlow, { 
  Node, 
  Edge, 
  ReactFlowProvider, 
  useReactFlow, 
  Controls, 
  Background,
  Handle,
  Position 
} from 'reactflow';
// Importing icons for custom nodes
import { Play, Square, Cloud, Pin, X } from 'lucide-react';
import 'reactflow/dist/style.css';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FileExplorer from "@/components/FileExplorer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  File,
  Clock,
  CircleCheck,
  CircleX,
  AlertCircle,
  Loader2,
  Paperclip,
  Upload,
  Download,
  ChevronUp,
  ChevronDown,
  Database,
  Image,
  BookOpen,
  Zap,
  GitBranch,
  FileText,
  Link,
  Check,
} from "lucide-react";
import {
  type Documento,
  type InsertDocumento,
  type DocumentArtifact,
  type InsertDocumentArtifact,
} from "@shared/schema";

// Custom node components for React Flow
const StartNodeComponent = (props: any) => {
  const isSelected = props.selected;
  
  const getBackgroundColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'bg-[#21639a]';
    if (props.data.isPendingConnected) return 'bg-yellow-200';
    return 'bg-white';
  };

  const getTextColor = () => {
    return props.data.isExecuted === 'TRUE' ? 'text-white' : 'text-black';
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

const EndNodeComponent = (props: any) => {
  const isSelected = props.selected;
  
  const getBackgroundColor = () => {
    if (props.data.isExecuted === 'TRUE') return 'bg-[#21639a]';
    if (props.data.isPendingConnected) return 'bg-yellow-200';
    return 'bg-white';
  };

  const getTextColor = () => {
    return props.data.isExecuted === 'TRUE' ? 'text-white' : 'text-black';
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
          {props.data.FromType && (
            <div className="px-2 py-1 rounded font-mono bg-white text-black">
              {props.data.FromType === 'Init' ? 'Encerramento Direto' : 
               props.data.FromType === 'flow_init' ? 'Transferência para Fluxo' : props.data.FromType}
            </div>
          )}
          {props.data.To_Flow_id && (
            <div className="mt-1 px-2 py-1 rounded font-mono bg-white text-black">
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
          {!props.data.FromType && !props.data.To_Flow_id && <div className="font-mono text-black">✓ Configurado</div>}
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

const ActionNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  const { getNodes, setNodes } = useReactFlow();
  
  let backgroundClass = 'bg-white';
  if (isExecuted) backgroundClass = 'bg-[#21639a]';
  else if (isPendingConnected) backgroundClass = 'bg-yellow-200';
  
  const textClass = isExecuted ? 'text-white' : 'text-black';
  
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
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 border max-w-[200px]">
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

const DocumentNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  let fillColor = 'white';
  if (isExecuted) fillColor = '#21639a';
  else if (isPendingConnected) fillColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : 'text-black';
  
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

const IntegrationNodeComponent = (props: any) => {
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  let fillColor = 'white';
  if (isExecuted) fillColor = '#21639a';
  else if (isPendingConnected) fillColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : 'text-black';
  
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

const SwitchNodeComponent = (props: any) => {
  // Calcular tamanho dinâmico baseado no texto, mantendo proporção do paralelogramo
  const hasText = props.data.switchField && props.data.switchField.length > 0;
  const textLength = hasText ? props.data.switchField.length : 0;
  
  // Tamanho base aumenta conforme o texto, mantendo formato quadrado para o paralelogramo
  const baseSize = Math.max(100, Math.min(200, 100 + (textLength * 6)));
  const dynamicWidth = baseSize;
  const dynamicHeight = baseSize; // Altura igual à largura para manter proporção do paralelogramo
  
  const isExecuted = props.data.isExecuted === 'TRUE';
  const isPendingConnected = props.data.isPendingConnected;
  const isSelected = props.selected;
  
  let backgroundColor = 'white';
  if (isExecuted) backgroundColor = '#21639a';
  else if (isPendingConnected) backgroundColor = '#fef3cd'; // amarelo claro
  
  const textClass = isExecuted ? 'text-white' : 'text-black';
  
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
      <GitBranch className="absolute top-1 left-1 h-6 w-6 text-blue-600 z-20" />
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
        className="w-4 h-4 bg-white border-4 border-red-500" 
        id="a"
        style={{ top: '50%', right: '-33px', transform: 'translateY(-50%)' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        className="w-4 h-4 bg-white border-4 border-green-500" 
        id="c"
        style={{ top: '50%', left: '-33px', transform: 'translateY(-50%)' }}
      />
      
      {/* Mostrar valores dos switches abaixo dos nós de saída */}
      {props.data.configured && props.data.redSwitch && (
        <div 
          className="absolute text-xs font-mono text-red-700 bg-red-100 px-1 rounded"
          style={{ top: 'calc(75% - 11px)', right: '-45px', transform: 'translateX(50%)', whiteSpace: 'nowrap' }}
        >
          {Array.isArray(props.data.redSwitch) ? props.data.redSwitch.join(',') : props.data.redSwitch}
        </div>
      )}
      {props.data.configured && props.data.greenSwitch && (
        <div 
          className="absolute text-xs font-mono text-green-700 bg-green-100 px-1 rounded"
          style={{ top: 'calc(75% - 11px)', left: '-45px', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          {Array.isArray(props.data.greenSwitch) ? props.data.greenSwitch.join(',') : props.data.greenSwitch}
        </div>
      )}
    </div>
  );
};

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("incluidos");
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddArtifactModalOpen, setIsAddArtifactModalOpen] = useState(false);
  const [isEditArtifactModalOpen, setIsEditArtifactModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteArtifactConfirmOpen, setIsDeleteArtifactConfirmOpen] =
    useState(false);
  const [isDocumentationModalOpen, setIsDocumentationModalOpen] =
    useState(false);
  const [optimisticSyncState, setOptimisticSyncState] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");


  const [editingDocument, setEditingDocument] = useState<Documento | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<Documento | null>(
    null,
  );
  const [artifactToDelete, setArtifactToDelete] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] =
    useState<DocumentArtifact | null>(null);
  const [githubRepoFiles, setGithubRepoFiles] = useState<any[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<any[]>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);
  const [currentCreatedDocumentId, setCurrentCreatedDocumentId] = useState<
    string | null
  >(null);
  const [isEscopoExpanded, setIsEscopoExpanded] = useState(false);
  const [isPessoasExpanded, setIsPessoasExpanded] = useState(false);
  const [createModalActiveTab, setCreateModalActiveTab] =
    useState("dados-gerais");
  const [isLoadingMondayAttachments, setIsLoadingMondayAttachments] =
    useState(false);
  const [mondayAttachmentsPreview, setMondayAttachmentsPreview] = useState<
    any[]
  >([]);
  const [artifactFormData, setArtifactFormData] =
    useState<InsertDocumentArtifact>({
      documentoId: "",
      name: "",
      fileData: "",
      fileName: "",
      fileSize: "",
      mimeType: "",
      type: "",
    });

  // Estado para modal de visualização de arquivo
  const [filePreviewModal, setFilePreviewModal] = useState<{
    isOpen: boolean;
    fileName: string;
    mimeType: string;
    fileUrl: string;
  }>({
    isOpen: false,
    fileName: "",
    mimeType: "",
    fileUrl: "",
  });

  // Estado para o sistema de aprovação
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);

  // Estado para modal do diagrama de fluxo
  const [flowDiagramModal, setFlowDiagramModal] = useState<{
    isOpen: boolean;
    flowData: any;
    documentTitle: string;
  }>({
    isOpen: false,
    flowData: null,
    documentTitle: "",
  });
  
  // Estado simples para forçar re-render
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [currentFlowData, setCurrentFlowData] = useState<any>(null);
  const [currentDocTitle, setCurrentDocTitle] = useState("");

  // Estado para controlar o side panel do inspector
  const [showFlowInspector, setShowFlowInspector] = useState(false);
  const [selectedFlowNode, setSelectedFlowNode] = useState<any>(null);
  const [isFlowInspectorPinned, setIsFlowInspectorPinned] = useState(false);
  // Função para resetar o formulário
  const resetFormData = () => {
    console.log("🧹 LIMPANDO CAMPOS DO FORMULÁRIO");
    console.log("📋 Dados antes da limpeza:", formData);
    setFormData({
      origem: "CPx", // Sempre CPx para novos documentos
      objeto: "",
      tipo: "",
      cliente: "",
      responsavel: "",
      sistema: "",
      modulo: "",
      descricao: "",
      status: "Incluido", // Sempre "Incluido" para novos documentos
      statusOrigem: "Manual", // Sempre "Manual" para novos documentos
      solicitante: "",
      aprovador: "",
      agente: "",
    });
    setCurrentCreatedDocumentId(null); // Reset do documento criado
    setCreateModalActiveTab("dados-gerais"); // Resetar aba para dados-gerais
    setIsEscopoExpanded(false); // Frames sempre recolhidos
    setIsPessoasExpanded(false); // Frames sempre recolhidos
    console.log("✅ Campos limpos!");
  };

  // Função para verificar se o MIME type é suportado pelo browser para visualização
  const isMimeTypeViewable = (mimeType: string): boolean => {
    const viewableMimeTypes = [
      // Imagens
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // PDFs
      "application/pdf",
      // Texto
      "text/plain",
      "text/html",
      "text/css",
      "text/javascript",
      "text/xml",
      "application/json",
      "application/xml",
      // Vídeos (alguns browsers)
      "video/mp4",
      "video/webm",
      "video/ogg",
      // Áudios (alguns browsers)
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
    ];

    return viewableMimeTypes.includes(mimeType.toLowerCase());
  };

  const [formData, setFormData] = useState<InsertDocumento>({
    origem: "CPx", // Sempre CPx para novos documentos
    objeto: "",
    tipo: "",
    cliente: "",
    responsavel: "",
    sistema: "",
    modulo: "",
    descricao: "",
    status: "Incluido", // Sempre "Incluido" para novos documentos
    statusOrigem: "Manual", // Sempre "Manual" para novos documentos
  });

  const queryClient = useQueryClient();

  const { toast } = useToast();

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    responsavel: "__todos__",
    modulo: "__todos__",
    cliente: "__todos__",
    statusOrigem: "__todos__",
    arquivos: "__todos__", // "sem-arquivos", "a-sincronizar", "sincronizados"
    nome: "",
  });

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar fluxos disponíveis
  const { data: documentsFlows = [] } = useQuery({
    queryKey: ["/api/documents-flows"],
  });

  // Buscar execuções de fluxo ativas
  const { data: flowExecutions = [] } = useQuery({
    queryKey: ["/api/document-flow-executions"],
  });

  // Buscar contagem de anexos para todos os documentos
  const { data: artifactCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/documentos/artifacts-count"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const documento of documentos) {
        try {
          const response = await fetch(
            `/api/documentos/${documento.id}/artifacts`,
          );
          if (response.ok) {
            const artifacts = await response.json();
            counts[documento.id] = artifacts.length;
          } else {
            counts[documento.id] = 0;
          }
        } catch {
          counts[documento.id] = 0;
        }
      }
      return counts;
    },
    enabled: documentos.length > 0,
  });

  // Buscar conexões de serviço para obter o repositório GitHub
  const { data: serviceConnections = [] } = useQuery({
    queryKey: ["/api/service-connections"],
  });

  // Buscar estrutura local do repositório
  const { data: repoStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/repo-structure"],
  });

  // Buscar mapeamentos Monday para obter as colunas
  const { data: mondayMappings = [] } = useQuery({
    queryKey: ["/api/monday/mappings"],
  });

  // Buscar todas as colunas Monday de todos os mapeamentos
  const { data: allMondayColumns = [] } = useQuery({
    queryKey: ["/api/monday/columns/all"],
    queryFn: async () => {
      const columns = [];
      for (const mapping of mondayMappings) {
        try {
          const response = await fetch(
            `/api/monday/mappings/${mapping.id}/columns`,
          );
          if (response.ok) {
            const mappingColumns = await response.json();
            columns.push(...mappingColumns);
          }
        } catch (error) {
          console.warn(
            `Erro ao buscar colunas do mapeamento ${mapping.id}:`,
            error,
          );
        }
      }
      return columns;
    },
    enabled: mondayMappings.length > 0,
  });

  // Criar um mapa de columnId para title para lookup rápido
  const columnTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    allMondayColumns.forEach((column: any) => {
      map[column.columnId] = column.title;
    });
    return map;
  }, [allMondayColumns]);

  // Função para obter o título descritivo da coluna
  const getColumnTitle = (columnId: string): string => {
    return columnTitleMap[columnId] || columnId;
  };

  // Mutation para sincronizar estrutura do GitHub para o banco local
  const syncFromGitHubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/repo-structure/sync-from-github",
      );
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída!",
        description: `${data.importedCount || 0} pasta(s) importadas e ${data.updatedCount || 0} pasta(s) atualizadas.`,
      });

      // Atualizar dados locais
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });

      // Atualizar estrutura do GitHub também
      fetchGithubRepoStructure();

      // Forçar re-fetch após um pequeno delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao importar estrutura do GitHub",
        variant: "destructive",
      });
    },
  });

  // Mutation para sincronizar todas as pastas não sincronizadas com GitHub
  const syncAllToGitHubMutation = useMutation({
    mutationFn: async () => {
      console.log("🔄 INICIANDO SINCRONIZAÇÃO - Botão clicado!");
      const unsyncedFolders = repoStructures.filter(
        (folder: any) =>
          !folder.isSync &&
          (!folder.linkedTo ||
            repoStructures.some(
              (parent: any) => parent.uid === folder.linkedTo,
            )),
      );
      console.log(
        "📁 Pastas para sincronizar:",
        unsyncedFolders.map((f) => f.folderName),
      );
      const results = [];

      for (const folder of unsyncedFolders) {
        console.log(
          `🚀 Sincronizando pasta: ${folder.folderName} (${folder.uid})`,
        );
        try {
          const res = await apiRequest(
            "POST",
            `/api/repo-structure/${folder.uid}/sync-github`,
          );
          const result = await res.json();
          console.log(`✅ Sucesso para ${folder.folderName}:`, result);
          results.push({
            folder: folder.folderName,
            success: true,
            message: result.message,
          });
        } catch (error: any) {
          console.log(`❌ Erro para ${folder.folderName}:`, error);
          results.push({
            folder: folder.folderName,
            success: false,
            message: error.message,
          });
        }
      }

      console.log("🏁 SINCRONIZAÇÃO FINALIZADA - Resultados:", results);
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast({
          title: `${successCount} pasta(s) sincronizada(s)!`,
          description:
            errorCount > 0
              ? `${errorCount} pasta(s) falharam na sincronização.`
              : "Todas as pastas foram enviadas para o GitHub com sucesso.",
        });
      }

      if (errorCount > 0) {
        const failedFolders = results
          .filter((r) => !r.success)
          .map((r) => r.folder)
          .join(", ");
        toast({
          title: "Algumas pastas falharam",
          description: `Pastas com erro: ${failedFolders}`,
          variant: "destructive",
        });
      }

      // Atualizar imediatamente a estrutura local
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });

      // Forçar múltiplas atualizações para garantir sincronização visual
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 500);

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1500);

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 3500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar pastas com GitHub.",
        variant: "destructive",
      });
    },
  });

  // Função para buscar arquivos de uma pasta específica no GitHub
  const fetchFolderFiles = async (folderPath: string) => {
    if (!folderPath) return;

    setIsLoadingFolderFiles(true);
    try {
      const githubConnection = (serviceConnections as any[])?.find(
        (conn: any) => conn.serviceName === "github",
      );

      if (!githubConnection) return;

      const repo = githubConnection.parameters?.[0];
      if (!repo) return;

      const response = await fetch(
        `https://api.github.com/repos/${repo}/contents/${folderPath}`,
        {
          headers: {
            Authorization: `token ${githubConnection.token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
        },
      );

      if (response.ok) {
        const files = await response.json();
        // Filtrar arquivos, excluindo .gitkeep que são apenas para sincronização
        const fileList = Array.isArray(files)
          ? files.filter(
              (item: any) => item.type === "file" && item.name !== ".gitkeep",
            )
          : [];
        setSelectedFolderFiles(fileList);
      } else if (response.status === 404) {
        // Pasta vazia ou não existe - mostrar mensagem apropriada
        console.log("Pasta vazia ou não encontrada:", folderPath);
        setSelectedFolderFiles([]);
      } else {
        console.error("Erro ao buscar arquivos da pasta:", response.status);
        setSelectedFolderFiles([]);
      }
    } catch (error) {
      console.error("Erro ao buscar arquivos da pasta:", error);
      setSelectedFolderFiles([]);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  // Função para carregar visualização da estrutura do repositório
  const fetchGithubRepoStructure = async () => {
    const githubConnection = serviceConnections.find(
      (conn: any) => conn.serviceName === "github",
    );

    if (!githubConnection || !githubConnection.token) {
      console.log("Conexão GitHub não encontrada");
      return [];
    }

    const repoParam = githubConnection.parameters?.[0];
    if (!repoParam) {
      console.log("Repositório não configurado");
      return [];
    }

    const [owner, repo] = repoParam.split("/");
    console.log("Carregando visualização do repositório:", repoParam);

    setIsLoadingRepo(true);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        {
          headers: {
            Authorization: `Bearer ${githubConnection.token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
        },
      );

      if (response.ok) {
        const contents = await response.json();
        const fileStructure = await buildSimpleFileTree(contents);
        setGithubRepoFiles(fileStructure);
        return fileStructure;
      } else {
        console.error("Erro ao carregar repositório:", response.status);
        return [];
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      return [];
    } finally {
      setIsLoadingRepo(false);
    }
  };

  // Função simples para criar estrutura de visualização
  const buildSimpleFileTree = async (items: any[]) => {
    return items.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "folder" : "file",
      size: item.size || 0,
      children: [],
    }));
  };

  // Função para construir estrutura hierárquica
  const buildFileTree = async (
    items: any[],
    token: string,
    owner: string,
    repo: string,
    path: string = "",
  ) => {
    const tree: any[] = [];

    for (const item of items) {
      if (item.type === "dir") {
        // Para pastas, buscar conteúdo recursivamente
        try {
          const subResponse = await fetch(item.url, {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (subResponse.ok) {
            const subContents = await subResponse.json();
            const children = await buildFileTree(
              subContents,
              token,
              owner,
              repo,
              item.path,
            );

            tree.push({
              id: item.path,
              name: item.name,
              type: "folder",
              path: item.path,
              children: children,
            });
          }
        } catch (error) {
          // Se falhar, adicionar pasta vazia
          tree.push({
            id: item.path,
            name: item.name,
            type: "folder",
            path: item.path,
            children: [],
          });
        }
      } else {
        // Para arquivos
        tree.push({
          id: item.path,
          name: item.name,
          type: "file",
          path: item.path,
          size: formatFileSize(item.size),
          modified: new Date(item.sha).toLocaleDateString("pt-BR"),
        });
      }
    }

    return tree;
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Função para criar arquivo README.md no repositório
  const createReadmeFile = async (
    token: string,
    owner: string,
    repo: string,
  ) => {
    const readmeContent = `# ${repo}

Este repositório foi criado para armazenar documentação técnica e empresarial do sistema ${repo}.

## Estrutura

- \`docs/\` - Documentação técnica
- \`specs/\` - Especificações e requisitos
- \`templates/\` - Templates de documentos

## EVO-MindBits Composer

Este repositório está integrado com o EVO-MindBits Composer para gestão automatizada de documentação.
`;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
          body: JSON.stringify({
            message: "Criar README.md inicial via EVO-MindBits Composer",
            content: btoa(readmeContent), // Base64 encode
          }),
        },
      );

      if (response.ok) {
        console.log("README.md criado com sucesso!");
        return true;
      } else {
        const errorText = await response.text();
        console.error("Erro ao criar README.md:", response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error("Erro na criação do README.md:", error);
      return false;
    }
  };

  // Carregar estrutura do repositório quando houver conexão GitHub
  useEffect(() => {
    if (
      serviceConnections &&
      serviceConnections.length > 0 &&
      activeTab === "repositorio"
    ) {
      fetchGithubRepoStructure();
    }
  }, [serviceConnections, activeTab]);

  // Buscar artefatos do documento selecionado (para visualização ou edição)
  const currentDocumentId = selectedDocument?.id || editingDocument?.id;
  const { data: artifacts = [], isLoading: isLoadingArtifacts } = useQuery<
    DocumentArtifact[]
  >({
    queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
    queryFn: async () => {
      if (!currentDocumentId) return [];
      const response = await fetch(
        `/api/documentos/${currentDocumentId}/artifacts`,
      );
      if (!response.ok) throw new Error("Erro ao buscar anexos");
      return response.json();
    },
    enabled: !!currentDocumentId,
  });

  // Buscar anexos para o documento criado no modal (modal de criação)
  const { data: createdDocumentArtifacts = [] } = useQuery<DocumentArtifact[]>({
    queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
    queryFn: async () => {
      if (!currentCreatedDocumentId) return [];
      const response = await fetch(
        `/api/documentos/${currentCreatedDocumentId}/artifacts`,
      );
      if (!response.ok) throw new Error("Erro ao buscar anexos");
      return response.json();
    },
    enabled: !!currentCreatedDocumentId,
  });

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: async (data: InsertDocumento) => {
      // Sempre define origem como "CPx" para novos documentos
      const documentoData = { ...data, origem: "CPx" };
      const response = await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documentoData),
      });
      if (!response.ok) throw new Error("Erro ao criar documento");
      return response.json();
    },
    onSuccess: (createdDocument) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      // Armazenar o ID do documento criado e NÃO fechar o modal
      setCurrentCreatedDocumentId(createdDocument.id);
      // Mudar automaticamente para a aba de anexos
      setCreateModalActiveTab("anexos");
      // Manter os dados do formulário para permitir edições
      toast({
        title: "Documento criado!",
        description: "Agora você pode adicionar anexos.",
      });
    },
  });

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertDocumento }) => {
      console.log("Atualizando documento:", id, data);
      try {
        const response = await fetch(`/api/documentos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        console.log("Status da resposta:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro na atualização:", response.status, errorText);
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("Documento atualizado com sucesso:", result);
        return result;
      } catch (error) {
        console.error("Erro completo na mutação:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("OnSuccess disparado:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });

      // Se está salvando um documento criado no modal de criação, fechar o modal de criação
      if (
        currentCreatedDocumentId &&
        variables.id === currentCreatedDocumentId
      ) {
        setIsCreateModalOpen(false);
        setCurrentCreatedDocumentId(null);
        resetFormData();
        toast({
          title: "Documento salvo!",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        // Modal de edição normal
        setIsEditModalOpen(false);
        setEditingDocument(null);
        setFormData({
          origem: "",
          objeto: "",
          cliente: "",
          responsavel: "",
          sistema: "",
          modulo: "",
          descricao: "",
          status: "Integrado",
          statusOrigem: "Incluido",
        });
        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso!",
        });
      }
      console.log("Modal deve estar fechada agora");
    },
    onError: (error) => {
      console.error("Erro na mutação:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar documento",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir documento");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setIsDeleteConfirmOpen(false);
      setDocumentToDelete(null);
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    },
  });

  // Mutation para iniciar documentação
  const startDocumentationMutation = useMutation({
    mutationFn: async ({ documentId, flowId }: { documentId: string; flowId: string }) => {
      const response = await fetch("/api/documentos/start-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          flowId
        }),
      });
      if (!response.ok) throw new Error("Erro ao iniciar documentação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/document-flow-executions"] });
      setIsDocumentationModalOpen(false);
      setSelectedFlowId("");
      toast({
        title: "Documentação iniciada!",
        description: "O processo de documentação foi iniciado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar documentação",
        description: error.message || "Erro ao iniciar o processo de documentação",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar artefato
  const createArtifactMutation = useMutation({
    mutationFn: async (data: InsertDocumentArtifact) => {
      const response = await fetch(
        `/api/documentos/${data.documentoId}/artifacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("Erro ao criar artefato");
      return response.json();
    },
    onSuccess: (newArtifact, variables) => {
      // Invalidar cache para o documento atual (edição)
      if (currentDocumentId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
        });
      }
      // Invalidar cache para o documento criado (modal de criação)
      if (currentCreatedDocumentId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
        });
      }
      // Invalidar contagem de anexos
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });
      setIsAddArtifactModalOpen(false);
      resetArtifactForm();
      toast({
        title: "Anexo adicionado!",
        description: "O anexo foi criado com sucesso.",
      });
    },
  });

  // Mutation para atualizar artefato
  const updateArtifactMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DocumentArtifact>;
    }) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar artefato");
      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache para todos os possíveis documentos
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"],
      });

      setIsEditArtifactModalOpen(false);
      resetArtifactForm();

      toast({
        title: "Anexo atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações do anexo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para integrar anexos do Monday.com
  const integrateAttachmentsMutation = useMutation({
    mutationFn: async (documentoId: string) => {
      console.log(
        "🚀 FRONTEND: Iniciando integração para documento:",
        documentoId,
      );
      try {
        // Fazer requisição usando fetch diretamente para debug
        const response = await fetch(
          `/api/documentos/${documentoId}/integrate-attachments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          },
        );
        console.log("📡 FRONTEND: Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ FRONTEND: Erro na resposta:", errorText);

          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Erro ao integrar anexos");
          } catch {
            throw new Error(errorText || "Erro ao integrar anexos");
          }
        }

        const responseText = await response.text();
        console.log("📄 FRONTEND: Texto da resposta:", responseText);

        try {
          const result = JSON.parse(responseText);
          console.log("✅ FRONTEND: Resultado da integração:", result);
          return result;
        } catch (parseError) {
          console.error(
            "❌ FRONTEND: Erro ao fazer parse do JSON:",
            parseError,
          );
          console.error("❌ FRONTEND: Resposta recebida:", responseText);
          throw new Error("Resposta do servidor não é JSON válido");
        }
      } catch (error) {
        console.error("🔥 FRONTEND: Erro na mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Atualizar o documento selecionado localmente para refletir que está sincronizado
      if (selectedDocument?.id) {
        setSelectedDocument({
          ...selectedDocument,
          assetsSynced: true
        });
        
        // Invalidar cache dos artifacts para o documento específico
        queryClient.invalidateQueries({
          queryKey: ["/api/documentos", selectedDocument.id, "artifacts"],
        });
      }

      // Invalidar cache de contagem de artifacts para atualizar badges
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos/artifacts-count"],
      });

      // Invalidar cache da lista de documentos para atualizar badges na tabela
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos"],
      });

      // Limpar estado otimístico após todas as atualizações
      setOptimisticSyncState(null);

      toast({
        title: "Anexos integrados!",
        description:
          data.message ||
          `${data.attachmentsCreated} anexos foram integrados com sucesso.`,
      });
    },
    onError: (error: any) => {
      // Limpar estado otimístico em caso de erro
      setOptimisticSyncState(null);
      
      toast({
        title: "Erro ao integrar anexos",
        description:
          error.message || "Não foi possível integrar os anexos do Monday.com.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir artefato
  const deleteArtifactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao excluir artefato");
    },
    onSuccess: () => {
      // Invalidar cache para todos os possíveis documentos
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", currentCreatedDocumentId, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", selectedDocument?.id, "artifacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/documentos", editingDocument?.id, "artifacts"],
      });

      setIsDeleteArtifactConfirmOpen(false);
      setArtifactToDelete(null);

      toast({
        title: "Anexo excluído!",
        description: "O anexo foi removido com sucesso.",
      });
    },
  });

  // Filtrar documentos por status
  const documentosIntegrados = useMemo(
    () => documentos.filter((doc) => doc.status === "Integrado"),
    [documentos],
  );
  const documentosProcessando = useMemo(
    () => documentos.filter((doc) => doc.status === "Em Processo"),
    [documentos],
  );
  const documentosConcluidos = useMemo(
    () => documentos.filter((doc) => doc.status === "Concluido"),
    [documentos],
  );

  const handleCreateDocument = () => {
    createDocumentoMutation.mutate(formData);
  };

  const openEditModal = (documento: Documento) => {
    setEditingDocument(documento);
    setFormData({
      origem: documento.origem,
      objeto: documento.objeto,
      tipo: documento.tipo || "",
      cliente: documento.cliente,
      responsavel: documento.responsavel,
      sistema: documento.sistema,
      modulo: documento.modulo,
      descricao: documento.descricao,
      status: documento.status,
      statusOrigem: documento.statusOrigem,
      solicitante: documento.solicitante || "",
      aprovador: documento.aprovador || "",
      agente: documento.agente || "",
    });
    setIsEscopoExpanded(false); // Frames sempre recolhidos
    setIsPessoasExpanded(false); // Frames sempre recolhidos
    setIsEditModalOpen(true);
  };

  const handleUpdateDocument = () => {
    if (editingDocument) {
      updateDocumentoMutation.mutate({
        id: editingDocument.id,
        data: formData,
      });
    }
  };

  // Funções auxiliares para artefatos
  const resetArtifactForm = () => {
    setArtifactFormData({
      documentoId: "",
      name: "",
      fileData: "",
      fileName: "",
      fileSize: "",
      mimeType: "",
      type: "",
    });
    setSelectedArtifact(null);
  };

  const openAddArtifactModal = () => {
    resetArtifactForm();
    setArtifactFormData((prev) => ({
      ...prev,
      documentoId: selectedDocument?.id || "",
    }));
    setIsAddArtifactModalOpen(true);
  };

  const openEditArtifactModal = (artifact: DocumentArtifact) => {
    setSelectedArtifact(artifact);
    setArtifactFormData({
      documentoId: artifact.documentoId,
      name: artifact.name,
      fileData: artifact.fileData,
      fileName: artifact.fileName,
      fileSize: artifact.fileSize || "",
      mimeType: artifact.mimeType,
      type: artifact.type,
    });
    setIsEditArtifactModalOpen(true);
  };

  const handleCreateArtifact = () => {
    createArtifactMutation.mutate(artifactFormData);
  };

  const handleUpdateArtifact = () => {
    if (selectedArtifact) {
      updateArtifactMutation.mutate({
        id: selectedArtifact.id,
        data: artifactFormData,
      });
    }
  };

  const handleDeleteArtifact = (artifactId: string) => {
    setArtifactToDelete(artifactId);
    setIsDeleteArtifactConfirmOpen(true);
  };

  const confirmDeleteArtifact = () => {
    console.log("🗑️ CONFIRMANDO EXCLUSÃO DE ANEXO:", artifactToDelete);
    if (artifactToDelete) {
      console.log("✅ Executando exclusão via mutation...");
      deleteArtifactMutation.mutate(artifactToDelete);
    } else {
      console.log("❌ Nenhum anexo selecionado para exclusão");
    }
  };

  const cancelDeleteArtifact = () => {
    console.log("❌ CANCELANDO EXCLUSÃO DE ANEXO");
    setIsDeleteArtifactConfirmOpen(false);
    setArtifactToDelete(null);
  };

  const getFileTypeIcon = (type: string) => {
    if (!type) return <File className="h-4 w-4 text-gray-400" />;

    switch (type.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "doc":
      case "docx":
        return <File className="h-4 w-4 text-blue-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <File className="h-4 w-4 text-green-500" />;
      case "txt":
        return <File className="h-4 w-4 text-gray-500" />;
      case "json":
        return <File className="h-4 w-4 text-orange-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Integrado":
        return <CircleCheck className="h-3 w-3" />;
      case "Processando":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "Concluido":
        return <CircleCheck className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Integrado":
        return "default";
      case "Processando":
        return "secondary";
      case "Concluido":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getStatusOrigemBadgeVariant = (statusOrigem: string) => {
    switch (statusOrigem) {
      case "Incluido":
        return "default";
      case "Em CRP":
        return "secondary";
      case "Em Aprovação":
        return "outline";
      case "Em DRP":
        return "secondary";
      case "Concluido":
        return "default";
      default:
        return "destructive";
    }
  };

  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
  };

  // Função para obter o fluxo ativo de um documento
  const getActiveFlow = (documentId: string) => {
    return flowExecutions.find((execution: any) => 
      execution.documentId === documentId && execution.status === "initiated"
    );
  };

  // Função para abrir modal do diagrama de fluxo
  const openFlowDiagramModal = (execution: any) => {
    console.log("🔴 Dados recebidos na função:", execution);
    if (execution) {
      setFlowDiagramModal({
        isOpen: true,
        flowData: execution.flowTasks || execution,
        documentTitle: execution.document?.objeto || execution.flowName || "Documento"
      });
      console.log("🔴 Estado atualizado:", {
        isOpen: true,
        flowData: execution.flowTasks || execution,
        documentTitle: execution.document?.objeto || execution.flowName || "Documento"
      });
    }
  };

  const handleDeleteDocument = (documento: Documento) => {
    toast({
      title: "⚠️ Confirmar Exclusão",
      description: `Tem certeza que deseja excluir "${documento.objeto}"? Esta ação não pode ser desfeita.`,
      action: (
        <div className="flex gap-2">
          <button
            onClick={() => deleteDocumentoMutation.mutate(documento.id)}
            disabled={deleteDocumentoMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            {deleteDocumentoMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3" />
                Excluir
              </>
            )}
          </button>
        </div>
      ),
      duration: 8000,
    });
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocumentoMutation.mutate(documentToDelete.id);
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setDocumentToDelete(null);
  };

  // Função para converter arquivo em Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:tipo/mime;base64," para armazenar apenas o Base64
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Função para processar upload de arquivo
  const handleFileUpload = async (file: File) => {
    try {
      const base64Data = await convertFileToBase64(file);
      const fileSizeInBytes = file.size.toString();

      setArtifactFormData({
        ...artifactFormData,
        fileData: base64Data,
        fileName: file.name,
        fileSize: fileSizeInBytes,
        mimeType: file.type,
        type: getFileTypeFromMime(file.type),
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      alert("Erro ao processar o arquivo");
    }
  };

  // Função para determinar tipo do arquivo baseado no MIME type
  const getFileTypeFromMime = (mimeType: string): string => {
    // PDFs
    if (mimeType.includes("pdf")) return "pdf";

    // Documentos Word
    if (
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("ms-word") ||
      mimeType.includes("officedocument.wordprocessingml")
    )
      return "docx";

    // Planilhas Excel
    if (
      mimeType.includes("excel") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("officedocument.spreadsheetml")
    )
      return "xlsx";

    // Imagens
    if (mimeType.startsWith("image/jpeg") || mimeType.startsWith("image/jpg"))
      return "jpg";
    if (mimeType.startsWith("image/png")) return "png";
    if (mimeType.startsWith("image/")) return "img";

    // Texto
    if (mimeType.includes("text/plain")) return "txt";
    if (mimeType.includes("json")) return "json";
    if (mimeType.includes("xml")) return "xml";

    // Compactados
    if (mimeType.includes("zip") || mimeType.includes("compressed"))
      return "zip";

    // Outros documentos
    if (mimeType.includes("rtf")) return "doc";

    return "outros";
  };

  const renderDocumentosTable = (documentos: Documento[]) => {
    if (activeTab === "integrados") {
      return (
        <div className="border rounded-lg">
          <div className="max-h-[calc(100vh-450px)] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="bg-gray-50 border-b w-[130px]">
                    Origem
                  </TableHead>
                  <TableHead className="bg-gray-50 border-b">Nome</TableHead>
                  <TableHead className="bg-gray-50 border-b">Status</TableHead>
                  <TableHead className="bg-gray-50 border-b w-[155px]">
                    Data Integração
                  </TableHead>
                  <TableHead className="bg-gray-50 border-b">
                    Status Origem
                  </TableHead>
                  <TableHead className="bg-gray-50 border-b">Anexos</TableHead>
                  <TableHead className="bg-gray-50 border-b text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="table-compact">
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {documento.origem === "Monday" ? (
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Monday
                          </div>
                        ) : (
                          <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                            {documento.origem}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {documento.objeto}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(documento.status) as any}
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        {getStatusIcon(documento.status)}
                        {documento.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDate(documento.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getStatusOrigemBadgeVariant(
                            documento.statusOrigem,
                          ) as any
                        }
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        {documento.statusOrigem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          // Verificar se monday_item_values tem conteúdo
                          const hasMonValues =
                            documento.mondayItemValues &&
                            Array.isArray(documento.mondayItemValues) &&
                            documento.mondayItemValues.length > 0;

                          if (!hasMonValues) {
                            // Badge cinza com "none" para monday_item_values vazio
                            return (
                              <Badge
                                variant="outline"
                                className="bg-gray-100 text-gray-500 border-gray-300"
                              >
                                none
                              </Badge>
                            );
                          } else {
                            // Badge amarelo com "files" quando tem conteúdo
                            return (
                              <Badge
                                variant="outline"
                                className="bg-yellow-100 text-yellow-700 border-yellow-300"
                              >
                                files
                              </Badge>
                            );
                          }
                        })()}

                        {/* Badge sync verde quando assets_synced é true */}
                        {documento.assetsSynced && (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-300"
                          >
                            sync
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {activeTab === "integrados" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                console.log(
                                  "Botão documentação clicado",
                                  documento,
                                );
                                console.log(
                                  "Estado atual da modal:",
                                  isDocumentationModalOpen,
                                );
                                setSelectedDocument(documento);
                                
                                // Forçar atualização dos dados necessários para a modal
                                queryClient.invalidateQueries({
                                  queryKey: ["/api/documentos", documento.id, "artifacts"],
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["/api/documentos/artifacts-count"],
                                });
                                
                                setIsDocumentationModalOpen(true);
                                console.log("Tentando abrir modal...");
                              }}
                              title="Iniciar Documentação"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>


                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewModal(documento)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {documentos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-gray-500"
                    >
                      Nenhum documento encontrado nesta categoria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Incluído</TableHead>
            <TableHead>Iniciado</TableHead>
            <TableHead>Fluxo Atual</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
              <TableCell>
                <div className="flex items-center">
                  {documento.origem === "Monday" ? (
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      Monday
                    </div>
                  ) : (
                    <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                      {documento.origem}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{documento.objeto}</TableCell>
              <TableCell>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatDate(documento.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatDate(documento.updatedAt)}
                </div>
              </TableCell>
              <TableCell>
                {(() => {
                  const activeFlow = getActiveFlow(documento.id);
                  if (activeFlow) {
                    return (
                      <div className="flex items-center text-gray-500 text-sm">
                        [{activeFlow.flowCode}] - {activeFlow.flowName}
                      </div>
                    );
                  }
                  return (
                    <div className="text-xs text-gray-400">
                      -
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell>
                <Badge
                  variant={getStatusBadgeVariant(documento.status) as any}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  {getStatusIcon(documento.status)}
                  {documento.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openViewModal(documento)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {activeTab === "em-processo" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        console.log("🔴 BOTÃO CLICADO! Documento:", documento.objeto);
                        const activeFlow = getActiveFlow(documento.id);
                        console.log("🔴 Active flow encontrado:", activeFlow);
                        if (activeFlow) {
                          console.log("🔴 Abrindo modal com fluxo ativo");
                          openFlowDiagramModal({
                            flowTasks: activeFlow,
                            document: { objeto: documento.objeto }
                          });
                        } else {
                          console.log("🔴 Nenhum fluxo ativo encontrado para:", documento.id);
                        }
                      }}
                      title="Mostrar diagrama do fluxo"
                    >
                      <GitBranch className="h-4 w-4 text-purple-500" />
                    </Button>
                  )}
                  {activeTab !== "integrados" && activeTab !== "em-processo" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(documento)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteDocument(documento)}
                        disabled={deleteDocumentoMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {documentos.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={activeTab === "integrados" ? 8 : 7}
                className="text-center py-6 text-gray-500"
              >
                Nenhum documento encontrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  // Função para verificar se monday_item_values tem conteúdo JSON válido
  const hasMondayItemValues = (documento: Documento): boolean => {
    if (!documento.mondayItemValues) return false;

    try {
      const parsed = Array.isArray(documento.mondayItemValues)
        ? documento.mondayItemValues
        : JSON.parse(JSON.stringify(documento.mondayItemValues));

      return (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.some((item) => item.value && item.value.trim() !== "")
      );
    } catch {
      return false;
    }
  };

  // Função para filtrar e ordenar documentos
  const filteredAndSortedDocumentos = useMemo(() => {
    let filtered = documentos.filter((doc) => {
      // Filtro por responsável
      if (
        filtros.responsavel !== "__todos__" &&
        filtros.responsavel &&
        !doc.responsavel
          ?.toLowerCase()
          .includes(filtros.responsavel.toLowerCase())
      ) {
        return false;
      }

      // Filtro por módulo
      if (
        filtros.modulo !== "__todos__" &&
        filtros.modulo &&
        !doc.modulo?.toLowerCase().includes(filtros.modulo.toLowerCase())
      ) {
        return false;
      }

      // Filtro por cliente
      if (
        filtros.cliente !== "__todos__" &&
        filtros.cliente &&
        !doc.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())
      ) {
        return false;
      }

      // Filtro por status origem
      if (
        filtros.statusOrigem !== "__todos__" &&
        filtros.statusOrigem &&
        doc.statusOrigem !== filtros.statusOrigem
      ) {
        return false;
      }

      // Filtro por nome/objeto
      if (
        filtros.nome &&
        !doc.objeto?.toLowerCase().includes(filtros.nome.toLowerCase())
      ) {
        return false;
      }

      // Filtro por arquivos
      if (filtros.arquivos !== "__todos__" && filtros.arquivos) {
        const artifactCount = artifactCounts[doc.id] || 0;
        const hasMondayData = hasMondayItemValues(doc);

        switch (filtros.arquivos) {
          case "sem-arquivos":
            // Badge "none" - documentos sem dados do Monday e sem arquivos
            return !hasMondayData && artifactCount === 0;
          case "a-sincronizar":
            // Badge "files" apenas - documentos com dados do Monday mas sem arquivos sincronizados
            return hasMondayData && artifactCount === 0;
          case "sincronizados":
            // Badge "files" + "sync" - documentos com arquivos sincronizados
            return artifactCount > 0;
          default:
            break;
        }
      }

      return true;
    });

    // Ordenação alfabética por nome (objeto)
    filtered.sort((a, b) => {
      const nomeA = a.objeto?.toLowerCase() || "";
      const nomeB = b.objeto?.toLowerCase() || "";
      return nomeA.localeCompare(nomeB);
    });

    return filtered;
  }, [documentos, filtros, artifactCounts]);

  // Obter listas únicas para os filtros
  const responsaveisUnicos = useMemo(() => {
    const responsaveis = documentos
      .map((doc) => doc.responsavel)
      .filter(Boolean);
    return [...new Set(responsaveis)].sort();
  }, [documentos]);

  const modulosUnicos = useMemo(() => {
    const modulos = documentos.map((doc) => doc.modulo).filter(Boolean);
    return [...new Set(modulos)].sort();
  }, [documentos]);

  const clientesUnicos = useMemo(() => {
    const clientes = documentos.map((doc) => doc.cliente).filter(Boolean);
    return [...new Set(clientes)].sort();
  }, [documentos]);

  const statusOrigensUnicos = useMemo(() => {
    const statusOrigens = documentos
      .map((doc) => doc.statusOrigem)
      .filter(Boolean);
    return [...new Set(statusOrigens)].sort();
  }, [documentos]);

  const renderViewModal = () => {
    if (!selectedDocument) return null;

    const showAnexosTab = hasMondayItemValues(selectedDocument);
    const gridCols = showAnexosTab ? "grid-cols-3" : "grid-cols-2";

    return (
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5 text-blue-500" />
              <span>{selectedDocument.objeto}</span>
            </DialogTitle>
            <DialogDescription>
              Detalhes e anexos do documento
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados-gerais" className="w-full">
            <TabsList className={`grid w-full ${gridCols}`}>
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="general-fields">General Fields</TabsTrigger>
              {showAnexosTab && (
                <TabsTrigger value="anexos">Anexos</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dados-gerais" className="mt-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Origem
                    </p>
                    <p className="text-sm">{selectedDocument.origem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Cliente
                    </p>
                    <p className="text-sm">{selectedDocument.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Responsável
                    </p>
                    <p className="text-sm">{selectedDocument.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Sistema
                    </p>
                    <p className="text-sm">{selectedDocument.sistema}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Módulo
                    </p>
                    <p className="text-sm">{selectedDocument.modulo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Status
                    </p>
                    <div>
                      <Badge
                        variant={
                          getStatusBadgeVariant(selectedDocument.status) as any
                        }
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        {getStatusIcon(selectedDocument.status)}
                        {selectedDocument.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Status Origem
                    </p>
                    <div>
                      <Badge
                        variant={
                          getStatusOrigemBadgeVariant(
                            selectedDocument.statusOrigem,
                          ) as any
                        }
                        className="flex items-center gap-1 whitespace-nowrap"
                      >
                        {selectedDocument.statusOrigem}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Data Criação
                    </p>
                    <p className="text-sm">
                      {formatDate(selectedDocument.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Descrição
                  </p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 min-h-[80px]">
                    {selectedDocument.descricao}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="general-fields" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">Campos Gerais</h3>
                  <Badge variant="outline" className="text-xs">
                    {selectedDocument.generalColumns ? "JSON" : "Vazio"}
                  </Badge>
                </div>

                {selectedDocument.generalColumns &&
                Object.keys(selectedDocument.generalColumns).length > 0 ? (
                  <div className="grid gap-4">
                    {Object.entries(selectedDocument.generalColumns).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="grid grid-cols-3 gap-4 items-center"
                        >
                          <div className="bg-gray-50 p-2 rounded border">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Campo
                            </p>
                            <p className="text-sm font-mono text-gray-800">
                              {key}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Valor
                            </p>
                            <div className="bg-white border rounded p-2 min-h-[40px] flex items-center">
                              <p className="text-sm text-gray-700 break-words">
                                {typeof value === "object"
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Database className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      Nenhum campo geral encontrado
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Os campos gerais são armazenados no formato JSON
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {showAnexosTab && (
              <TabsContent value="anexos" className="mt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      Anexos (Assets) na Origem
                    </h4>

                    <Button
                      onClick={() => {
                        if (selectedDocument?.id) {
                          integrateAttachmentsMutation.mutate(
                            selectedDocument.id,
                          );
                        }
                      }}
                      disabled={
                        integrateAttachmentsMutation.isPending ||
                        (artifacts && artifacts.length > 0)
                      }
                      className={
                        artifacts && artifacts.length > 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }
                      size="sm"
                    >
                      {integrateAttachmentsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Integrando...
                        </>
                      ) : artifacts && artifacts.length > 0 ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Já Integrado
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Integrar Anexos
                        </>
                      )}
                    </Button>
                  </div>

                  {(() => {
                    try {
                      let mondayData = null;
                      if (selectedDocument?.mondayItemValues) {
                        // Verificar se já é um objeto ou se é uma string JSON
                        if (
                          typeof selectedDocument.mondayItemValues === "string"
                        ) {
                          mondayData = JSON.parse(
                            selectedDocument.mondayItemValues,
                          );
                        } else {
                          mondayData = selectedDocument.mondayItemValues;
                        }
                      }

                      if (
                        !mondayData ||
                        !Array.isArray(mondayData) ||
                        mondayData.length === 0
                      ) {
                        return (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                            <Database className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              Nenhum dado do Monday.com encontrado
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {mondayData.map(
                            (column: any, columnIndex: number) => {
                              try {
                                const value = column.value
                                  ? JSON.parse(column.value)
                                  : {};
                                const files = value.files || [];

                                if (
                                  !Array.isArray(files) ||
                                  files.length === 0
                                ) {
                                  return null; // Pular colunas sem arquivos
                                }

                                return (
                                  <div
                                    key={columnIndex}
                                    className="bg-white border rounded-lg p-4"
                                  >
                                    <h5 className="text-sm font-medium mb-3 flex items-center gap-2 text-gray-700">
                                      <Paperclip className="h-4 w-4 text-blue-500" />
                                      {getColumnTitle(column.columnid)}
                                    </h5>

                                    <div className="w-full overflow-x-auto">
                                      <Table className="table-fixed min-w-full text-sm">
                                        <TableHeader>
                                          <TableRow className="h-8">
                                            <TableHead
                                              className="w-40 px-2 py-1 font-medium"
                                              style={{ fontSize: "14px" }}
                                            >
                                              Arquivo
                                            </TableHead>
                                            <TableHead
                                              className="w-40 px-2 py-1 font-medium"
                                              style={{ fontSize: "14px" }}
                                            >
                                              Asset ID
                                            </TableHead>
                                            <TableHead
                                              className="w-20 px-2 py-1 font-medium"
                                              style={{ fontSize: "14px" }}
                                            >
                                              Tipo
                                            </TableHead>
                                            <TableHead
                                              className="w-20 px-2 py-1 font-medium text-center"
                                              style={{ fontSize: "14px" }}
                                            >
                                              Ações
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {files.map(
                                            (file: any, fileIndex: number) => (
                                              <TableRow
                                                key={fileIndex}
                                                className="h-8"
                                              >
                                                <TableCell className="font-medium w-40 px-2 py-1">
                                                  <div className="flex items-center gap-1 min-w-0">
                                                    {file.isImage === "true" ||
                                                    file.isImage === true ? (
                                                      <Image className="h-3 w-3 text-green-500 flex-shrink-0" />
                                                    ) : (
                                                      <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                                    )}
                                                    <span
                                                      className="truncate text-xs"
                                                      title={file.name || "N/A"}
                                                    >
                                                      {file.name || "N/A"}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell
                                                  className="font-mono text-xs w-40 px-2 py-1"
                                                  title={
                                                    file.assetId
                                                      ? String(file.assetId)
                                                      : "N/A"
                                                  }
                                                >
                                                  {file.assetId
                                                    ? String(file.assetId)
                                                    : "N/A"}
                                                </TableCell>
                                                <TableCell className="w-28 px-2 py-1">
                                                  <div className="flex items-center justify-center space-x-1">
                                                    {file.isImage === "true" ||
                                                    file.isImage === true ? (
                                                      <>
                                                        <span className="text-sm">
                                                          📷
                                                        </span>
                                                        <span className="text-xs text-green-600">
                                                          Imagem
                                                        </span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <span className="text-sm">
                                                          📄
                                                        </span>
                                                        <span className="text-xs text-gray-600">
                                                          Arquivo
                                                        </span>
                                                      </>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="w-20 px-2 py-1">
                                                  <div className="flex justify-center">
                                                    {file.assetId &&
                                                      artifacts?.find(
                                                        (artifact) =>
                                                          artifact.originAssetId ===
                                                          file.assetId?.toString(),
                                                      ) && (
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 w-6 p-0"
                                                          onClick={async () => {
                                                            // Encontrar o artifact correspondente pelo originAssetId
                                                            const correspondingArtifact =
                                                              artifacts?.find(
                                                                (artifact) =>
                                                                  artifact.originAssetId ===
                                                                  file.assetId?.toString(),
                                                              );

                                                            if (
                                                              correspondingArtifact
                                                            ) {
                                                              try {
                                                                // Fazer download do arquivo via fetch
                                                                const response =
                                                                  await fetch(
                                                                    `/api/artifacts/${correspondingArtifact.id}/file`,
                                                                  );

                                                                if (
                                                                  !response.ok
                                                                ) {
                                                                  throw new Error(
                                                                    "Erro ao carregar arquivo",
                                                                  );
                                                                }

                                                                const blob =
                                                                  await response.blob();
                                                                const url =
                                                                  URL.createObjectURL(
                                                                    blob,
                                                                  );

                                                                // Abrir em nova aba
                                                                window.open(
                                                                  url,
                                                                  "_blank",
                                                                );

                                                                // Limpar URL após um tempo
                                                                setTimeout(
                                                                  () =>
                                                                    URL.revokeObjectURL(
                                                                      url,
                                                                    ),
                                                                  10000,
                                                                );
                                                              } catch (error) {
                                                                console.error(
                                                                  "Erro ao carregar arquivo:",
                                                                  error,
                                                                );
                                                                alert(
                                                                  "Erro ao carregar arquivo",
                                                                );
                                                              }
                                                            } else {
                                                              alert(
                                                                "Arquivo não encontrado nos artifacts integrados",
                                                              );
                                                            }
                                                          }}
                                                          title="Visualizar arquivo integrado"
                                                        >
                                                          <Eye className="h-3 w-3 text-blue-500" />
                                                        </Button>
                                                      )}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            ),
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                );
                              } catch (err) {
                                console.error(
                                  "Erro ao processar coluna:",
                                  column,
                                  err,
                                );
                                return (
                                  <div
                                    key={columnIndex}
                                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                                  >
                                    <p className="text-sm text-red-600">
                                      Erro ao processar coluna {column.columnid}
                                      :{" "}
                                      {err instanceof Error
                                        ? err.message
                                        : "Erro desconhecido"}
                                    </p>
                                  </div>
                                );
                              }
                            },
                          )}

                          {mondayData.every((column: any) => {
                            try {
                              const value = column.value
                                ? JSON.parse(column.value)
                                : {};
                              const files = value.files || [];
                              return (
                                !Array.isArray(files) || files.length === 0
                              );
                            } catch {
                              return true;
                            }
                          }) && (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                              <Database className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">
                                Nenhum arquivo encontrado nos dados do
                                Monday.com
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      console.error(
                        "Erro ao processar monday_item_values:",
                        error,
                      );
                      return (
                        <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
                          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600">
                            Erro ao processar dados do Monday.com
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            Formato de dados inválido:{" "}
                            {error instanceof Error
                              ? error.message
                              : "Erro desconhecido"}
                          </p>
                          {selectedDocument?.mondayItemValues && (
                            <details className="mt-3 text-left">
                              <summary className="text-xs text-red-500 cursor-pointer">
                                Ver dados brutos
                              </summary>
                              <pre className="text-xs bg-white p-2 rounded border mt-2 overflow-x-auto text-gray-700">
                                {typeof selectedDocument.mondayItemValues ===
                                "string"
                                  ? selectedDocument.mondayItemValues
                                  : JSON.stringify(
                                      selectedDocument.mondayItemValues,
                                      null,
                                      2,
                                    )}
                              </pre>
                            </details>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal para criar novo documento
  const renderCreateModal = () => (
    <Dialog
      open={isCreateModalOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetFormData();
        }
        setIsCreateModalOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            {currentCreatedDocumentId
              ? "Criar Novo Documento"
              : "Criar Novo Documento"}
          </DialogTitle>
          <DialogDescription>
            {currentCreatedDocumentId
              ? "Documento criado com sucesso! Gerencie os dados e anexos"
              : "Preencha os dados do novo documento"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={createModalActiveTab}
          onValueChange={setCreateModalActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
            <TabsTrigger
              value="anexos"
              disabled={!currentCreatedDocumentId}
              className={
                !currentCreatedDocumentId ? "opacity-50 cursor-not-allowed" : ""
              }
            >
              Anexos {currentCreatedDocumentId ? "✅" : "🔒"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados-gerais" className="mt-6">
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="objeto">Objeto da Task</Label>
                  <Input
                    id="objeto"
                    value={formData.objeto}
                    onChange={(e) =>
                      setFormData({ ...formData, objeto: e.target.value })
                    }
                    placeholder="Nome do documento"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRP-Req.Cliente">
                        CRP-Req.Cliente
                      </SelectItem>
                      <SelectItem value="RRP-Impl.Roadmap">
                        RRP-Impl.Roadmap
                      </SelectItem>
                      <SelectItem value="ODI-Instr.Oper.">
                        ODI-Instr.Oper.
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-blue-700">Escopo</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEscopoExpanded(!isEscopoExpanded)}
                    className="h-6 w-6 p-0 hover:bg-blue-100"
                  >
                    {isEscopoExpanded ? (
                      <ChevronUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-600" />
                    )}
                  </Button>
                </div>
                {isEscopoExpanded && (
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="cliente">Cliente</Label>
                      <Input
                        id="cliente"
                        value={formData.cliente}
                        onChange={(e) =>
                          setFormData({ ...formData, cliente: e.target.value })
                        }
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sistema">Sistema</Label>
                        <Input
                          id="sistema"
                          value={formData.sistema}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sistema: e.target.value,
                            })
                          }
                          placeholder="Sistema"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modulo">Módulo</Label>
                        <Input
                          id="modulo"
                          value={formData.modulo}
                          onChange={(e) =>
                            setFormData({ ...formData, modulo: e.target.value })
                          }
                          placeholder="Módulo"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Pessoas</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPessoasExpanded(!isPessoasExpanded)}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    {isPessoasExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>
                {isPessoasExpanded && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input
                        id="responsavel"
                        value={formData.responsavel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            responsavel: e.target.value,
                          })
                        }
                        placeholder="Responsável"
                      />
                    </div>
                    <div>
                      <Label htmlFor="solicitante">Solicitante</Label>
                      <Input
                        id="solicitante"
                        value={formData.solicitante}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            solicitante: e.target.value,
                          })
                        }
                        placeholder="Solicitante"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aprovador">Aprovador</Label>
                      <Input
                        id="aprovador"
                        value={formData.aprovador}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            aprovador: e.target.value,
                          })
                        }
                        placeholder="Aprovador"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agente">Agente</Label>
                      <Input
                        id="agente"
                        value={formData.agente}
                        onChange={(e) =>
                          setFormData({ ...formData, agente: e.target.value })
                        }
                        placeholder="Agente"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="descricao">Detalhamento</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Detalhamento completo do documento..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="mt-6">
            <div className="space-y-4">
              {currentCreatedDocumentId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Anexos do Documento</h3>
                    <Button
                      onClick={() => {
                        setArtifactFormData({
                          documentoId: currentCreatedDocumentId,
                          name: "",
                          fileData: "",
                          fileName: "",
                          fileSize: "",
                          mimeType: "",
                          type: "",
                        });
                        setIsAddArtifactModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Anexo
                    </Button>
                  </div>

                  {/* Lista de anexos */}
                  {createdDocumentArtifacts &&
                  createdDocumentArtifacts.length > 0 ? (
                    <div className="space-y-2">
                      {createdDocumentArtifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <File className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">
                                {artifact.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {artifact.fileName} • {artifact.mimeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditArtifactModal(artifact)}
                              title="Editar anexo"
                            >
                              <Pencil className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log(
                                  "🗑️ EXCLUINDO ANEXO DIRETAMENTE:",
                                  artifact.id,
                                );
                                deleteArtifactMutation.mutate(artifact.id);
                              }}
                              title="Excluir anexo"
                              disabled={deleteArtifactMutation.isPending}
                            >
                              {deleteArtifactMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <Paperclip className="h-8 w-8 text-green-500 mx-auto mb-3" />
                      <p className="text-sm text-green-700 mb-3">
                        ✅ Documento criado com sucesso!
                      </p>
                      <p className="text-xs text-green-600">
                        Adicione anexos clicando no botão acima
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    Adicione anexos após criar o documento
                  </p>
                  <p className="text-xs text-gray-400">
                    Os anexos poderão ser gerenciados após a criação
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            {currentCreatedDocumentId ? "Fechar" : "Cancelar"}
          </Button>
          {!currentCreatedDocumentId ? (
            <Button
              onClick={handleCreateDocument}
              disabled={createDocumentoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Documento
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                // Salvar alterações no documento existente
                if (currentCreatedDocumentId) {
                  updateDocumentoMutation.mutate({
                    id: currentCreatedDocumentId,
                    data: formData,
                  });
                }
              }}
              disabled={updateDocumentoMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
          <Button
            onClick={() => {
              resetFormData();
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Incluir Documento
          </Button>
        </div>

        <Tabs
          defaultValue="incluidos"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="incluidos">Incluídos</TabsTrigger>
            <TabsTrigger value="integrados">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo">Em Processo</TabsTrigger>
            <TabsTrigger value="repositorio">Repositório</TabsTrigger>
          </TabsList>

          <TabsContent value="incluidos" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Status Origem</TableHead>
                    <TableHead>Anexos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos
                    ?.filter((doc) => doc.status === "Incluido")
                    .map((documento) => (
                      <TableRow key={documento.id}>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-800 border-purple-200"
                          >
                            {documento.origem}
                          </Badge>
                        </TableCell>
                        <TableCell>{documento.objeto}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            {documento.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {documento.statusOrigem}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {artifactCounts[documento.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {documento.createdAt
                            ? new Date(documento.createdAt).toLocaleDateString(
                                "pt-BR",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openViewModal(documento)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditModal(documento)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteDocument(documento)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}

            {documentos?.filter((doc) => doc.status === "Incluido").length ===
              0 &&
              !isLoading && (
                <div className="text-center py-12">
                  <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum documento incluído
                  </h3>
                  <p className="text-gray-500">
                    Documentos com status "Incluído" aparecerão aqui.
                  </p>
                </div>
              )}
          </TabsContent>

          <TabsContent value="integrados" className="slide-in">
            {/* Filtros */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFiltros({
                      responsavel: "",
                      modulo: "",
                      cliente: "",
                      statusOrigem: "",
                      arquivos: "",
                      nome: "",
                    })
                  }
                  className="text-xs"
                >
                  Limpar filtros
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Filtro por Nome */}
                <div>
                  <Label htmlFor="filtro-nome" className="text-xs">
                    Nome
                  </Label>
                  <Input
                    id="filtro-nome"
                    placeholder="Filtrar por nome..."
                    value={filtros.nome}
                    onChange={(e) =>
                      setFiltros((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>

                {/* Filtro por Responsável */}
                <div>
                  <Label htmlFor="filtro-responsavel" className="text-xs">
                    Responsável
                  </Label>
                  <Select
                    value={filtros.responsavel}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, responsavel: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {responsaveisUnicos.map((responsavel) => (
                        <SelectItem key={responsavel} value={responsavel}>
                          {responsavel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Módulo */}
                <div>
                  <Label htmlFor="filtro-modulo" className="text-xs">
                    Módulo
                  </Label>
                  <Select
                    value={filtros.modulo}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, modulo: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {modulosUnicos.map((modulo) => (
                        <SelectItem key={modulo} value={modulo}>
                          {modulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Cliente */}
                <div>
                  <Label htmlFor="filtro-cliente" className="text-xs">
                    Cliente
                  </Label>
                  <Select
                    value={filtros.cliente}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, cliente: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {clientesUnicos.map((cliente) => (
                        <SelectItem key={cliente} value={cliente}>
                          {cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Status Origem */}
                <div>
                  <Label htmlFor="filtro-status-origem" className="text-xs">
                    Status Origem
                  </Label>
                  <Select
                    value={filtros.statusOrigem}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, statusOrigem: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      {statusOrigensUnicos.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por Arquivos */}
                <div>
                  <Label htmlFor="filtro-arquivos" className="text-xs">
                    Arquivos
                  </Label>
                  <Select
                    value={filtros.arquivos}
                    onValueChange={(value) =>
                      setFiltros((prev) => ({ ...prev, arquivos: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      <SelectItem value="sem-arquivos">Sem arquivos</SelectItem>
                      <SelectItem value="a-sincronizar">
                        A sincronizar
                      </SelectItem>
                      <SelectItem value="sincronizados">
                        Sincronizados
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosIntegrados)
            )}
          </TabsContent>

          <TabsContent value="em-processo" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosProcessando)
            )}
          </TabsContent>

          <TabsContent value="distribuidos" className="slide-in">
            {isLoading ? (
              <div className="text-center py-6">Carregando documentos...</div>
            ) : (
              renderDocumentosTable(documentosConcluidos)
            )}
          </TabsContent>

          <TabsContent value="repositorio" className="slide-in">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Integração com Repositório GitHub
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gerencie documentos sincronizados com o repositório
                      configurado
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncFromGitHubMutation.mutate()}
                      disabled={syncFromGitHubMutation.isPending}
                    >
                      {syncFromGitHubMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={() => syncAllToGitHubMutation.mutate()}
                      disabled={
                        syncAllToGitHubMutation.isPending ||
                        repoStructures.filter(
                          (folder: any) =>
                            !folder.isSync &&
                            (!folder.linkedTo ||
                              repoStructures.some(
                                (parent: any) => parent.uid === folder.linkedTo,
                              )),
                        ).length === 0
                      }
                    >
                      {syncAllToGitHubMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {syncAllToGitHubMutation.isPending
                        ? "Enviando..."
                        : `Enviar para GitHub (${repoStructures.filter((folder: any) => !folder.isSync && (!folder.linkedTo || repoStructures.some((parent: any) => parent.uid === folder.linkedTo))).length})`}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">
                          Estrutura do Repositório
                        </h4>
                        {isLoadingRepo && (
                          <div className="flex items-center text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Carregando...
                          </div>
                        )}
                        {!isLoadingRepo && githubRepoFiles.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchGithubRepoStructure}
                          >
                            Atualizar
                          </Button>
                        )}
                      </div>

                      <div className="min-h-[400px]">
                        {githubRepoFiles.length > 0 ? (
                          <FileExplorer
                            data={githubRepoFiles}
                            onFileSelect={(file) => {
                              console.log("Arquivo selecionado:", file);
                            }}
                            onFolderToggle={(folder, isExpanded) => {
                              console.log(
                                "Pasta:",
                                folder.name,
                                "Expandida:",
                                isExpanded,
                              );
                              if (isExpanded && folder.type === "folder") {
                                const buildFullPath = (folderName: string) => {
                                  const structure = repoStructures.find(
                                    (s: any) => s.folderName === folderName,
                                  );
                                  if (!structure) return `/${folderName}/`;

                                  let path = structure.folderName;
                                  let current = structure;

                                  while (current.linkedTo) {
                                    const parent = repoStructures.find(
                                      (s: any) => s.uid === current.linkedTo,
                                    );
                                    if (parent) {
                                      path = `${parent.folderName}/${path}`;
                                      current = parent;
                                    } else {
                                      break;
                                    }
                                  }

                                  return `/${path}/`;
                                };

                                const fullPath = buildFullPath(folder.name);
                                setSelectedFolderPath(fullPath);
                                fetchFolderFiles(folder.path);
                              }
                            }}
                          />
                        ) : !isLoadingRepo ? (
                          <div className="border rounded-lg bg-gray-50 p-6 text-center">
                            <div className="text-gray-500 mb-2">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              Nenhum repositório conectado
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                              Configure uma conexão GitHub nas configurações
                              para ver a estrutura do repositório aqui.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={fetchGithubRepoStructure}
                            >
                              Tentar Conectar
                            </Button>
                          </div>
                        ) : (
                          <div className="border rounded-lg bg-white p-6">
                            <div className="animate-pulse space-y-3">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">
                        {selectedFolderPath ? (
                          <span>
                            Arquivos em:{" "}
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {selectedFolderPath}
                            </code>
                          </span>
                        ) : (
                          "Arquivos na pasta"
                        )}
                      </h4>
                      <div className="min-h-[400px] space-y-3">
                        {isLoadingFolderFiles ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-500">
                              Carregando arquivos...
                            </span>
                          </div>
                        ) : selectedFolderFiles.length > 0 ? (
                          selectedFolderFiles.map(
                            (file: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {file.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Tamanho: {(file.size / 1024).toFixed(1)}KB
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  GitHub
                                </Badge>
                              </div>
                            ),
                          )
                        ) : selectedFolderPath ? (
                          <div className="text-center py-8">
                            <div className="text-gray-500 text-sm">
                              📁 Pasta vazia
                              <br />
                              <span className="text-xs">
                                Esta pasta foi criada para organização mas ainda
                                não contém arquivos
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-gray-500 text-sm">
                              Clique em uma pasta para ver seus arquivos
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {renderViewModal()}
      {renderCreateModal()}
      {renderEditModal()}
      {renderAddArtifactModal()}
      {renderEditArtifactModal()}
      {renderDocumentationModal()}
      {renderFlowDiagramModal()}
    </div>
  );

  // Modal para editar documento
  function renderEditModal() {
    if (!editingDocument) return null;

    return (
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              {currentCreatedDocumentId
                ? "Criar Novo Documento"
                : `Editar Documento: ${editingDocument.objeto}`}
            </DialogTitle>
            <DialogDescription>
              {currentCreatedDocumentId
                ? "Complete os dados do documento e adicione anexos conforme necessário"
                : "Edite os dados do documento e gerencie seus anexos"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dados-gerais" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados-gerais">Dados Gerais</TabsTrigger>
              <TabsTrigger value="anexos">Anexos</TabsTrigger>
            </TabsList>

            <TabsContent value="dados-gerais" className="mt-6">
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-objeto">Objeto da Task</Label>
                    <Input
                      id="edit-objeto"
                      value={formData.objeto}
                      onChange={(e) =>
                        setFormData({ ...formData, objeto: e.target.value })
                      }
                      placeholder="Nome do documento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-tipo">Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) =>
                        setFormData({ ...formData, tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRP-Req.Cliente">
                          CRP-Req.Cliente
                        </SelectItem>
                        <SelectItem value="RRP-Impl.Roadmap">
                          RRP-Impl.Roadmap
                        </SelectItem>
                        <SelectItem value="ODI-Instr.Oper.">
                          ODI-Instr.Oper.
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-blue-700">
                      Escopo
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEscopoExpanded(!isEscopoExpanded)}
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                    >
                      {isEscopoExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      )}
                    </Button>
                  </div>
                  {isEscopoExpanded && (
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="edit-cliente">Cliente</Label>
                        <Input
                          id="edit-cliente"
                          value={formData.cliente}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              cliente: e.target.value,
                            })
                          }
                          placeholder="Nome do cliente"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-sistema">Sistema</Label>
                          <Input
                            id="edit-sistema"
                            value={formData.sistema}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sistema: e.target.value,
                              })
                            }
                            placeholder="Sistema"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-modulo">Módulo</Label>
                          <Input
                            id="edit-modulo"
                            value={formData.modulo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                modulo: e.target.value,
                              })
                            }
                            placeholder="Módulo"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      Pessoas
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPessoasExpanded(!isPessoasExpanded)}
                      className="h-6 w-6 p-0 hover:bg-gray-200"
                    >
                      {isPessoasExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  </div>
                  {isPessoasExpanded && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-responsavel">Responsável</Label>
                        <Input
                          id="edit-responsavel"
                          value={formData.responsavel}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              responsavel: e.target.value,
                            })
                          }
                          placeholder="Responsável"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-solicitante">Solicitante</Label>
                        <Input
                          id="edit-solicitante"
                          value={formData.solicitante}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              solicitante: e.target.value,
                            })
                          }
                          placeholder="Solicitante"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-aprovador">Aprovador</Label>
                        <Input
                          id="edit-aprovador"
                          value={formData.aprovador}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              aprovador: e.target.value,
                            })
                          }
                          placeholder="Aprovador"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-agente">Agente</Label>
                        <Input
                          id="edit-agente"
                          value={formData.agente}
                          onChange={(e) =>
                            setFormData({ ...formData, agente: e.target.value })
                          }
                          placeholder="Agente"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-descricao">Detalhamento</Label>
                  <Textarea
                    id="edit-descricao"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    placeholder="Detalhamento completo do documento..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="anexos" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Anexos do Documento</h3>
                  <Button
                    onClick={() => {
                      setArtifactFormData({
                        documentoId: editingDocument.id,
                        name: "",
                        fileData: "",
                        fileName: "",
                        fileSize: "",
                        mimeType: "",
                        type: "",
                      });
                      setIsAddArtifactModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Anexo
                  </Button>
                </div>

                {isLoadingArtifacts ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Carregando anexos...
                    </p>
                  </div>
                ) : artifacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artifacts.map((artifact) => (
                        <TableRow key={artifact.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileTypeIcon(artifact.type)}
                              <span className="text-xs font-medium uppercase">
                                {artifact.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {artifact.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm text-gray-600 truncate max-w-[200px]"
                                title={artifact.fileName}
                              >
                                {artifact.fileName}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEditArtifactModal(artifact)}
                              >
                                <Pencil className="h-3 w-3 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  console.log(
                                    "🗑️ EXCLUINDO ANEXO DIRETAMENTE NO MODAL DE EDIÇÃO:",
                                    artifact.id,
                                  );
                                  deleteArtifactMutation.mutate(artifact.id);
                                }}
                                title="Excluir anexo"
                                disabled={deleteArtifactMutation.isPending}
                              >
                                {deleteArtifactMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                    <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3">
                      Nenhum anexo encontrado
                    </p>
                    <Button
                      onClick={() => {
                        setArtifactFormData({
                          documentoId: editingDocument.id,
                          name: "",
                          file: "",
                          type: "",
                        });
                        setIsAddArtifactModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar primeiro anexo
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateDocument}
              disabled={updateDocumentoMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateDocumentoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para adicionar artefato
  function renderAddArtifactModal() {
    return (
      <Dialog
        open={isAddArtifactModalOpen}
        onOpenChange={setIsAddArtifactModalOpen}
      >
        <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-blue-500" />
              Adicionar Anexo
            </DialogTitle>
            <DialogDescription>
              Adicione um novo anexo ao documento
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="artifact-name">Nome do Anexo</Label>
              <Input
                id="artifact-name"
                value={artifactFormData.name}
                onChange={(e) =>
                  setArtifactFormData({
                    ...artifactFormData,
                    name: e.target.value,
                  })
                }
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>

            <div>
              <Label>Arquivo</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="file"
                    id="artifact-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("artifact-file")?.click()
                    }
                    className="px-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {/* Mostrar informações do arquivo selecionado */}
                {artifactFormData.fileName && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">
                      Arquivo selecionado:
                    </p>
                    <p className="text-sm text-gray-600">
                      {artifactFormData.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tipo detectado: {artifactFormData.type.toUpperCase()} |
                      Tamanho:{" "}
                      {(
                        parseInt(artifactFormData.fileSize || "0") / 1024
                      ).toFixed(2)}{" "}
                      KB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateArtifact}
              disabled={
                createArtifactMutation.isPending ||
                !artifactFormData.name ||
                !artifactFormData.fileData
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createArtifactMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Anexo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  function renderDocumentationModal() {
    return (
      <Dialog
        open={isDocumentationModalOpen}
        onOpenChange={setIsDocumentationModalOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Iniciar Documentação
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros para iniciar o processo de documentação do
              documento selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Documento selecionado */}
            {selectedDocument && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <File className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {selectedDocument.objeto}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Cliente:</span>{" "}
                        {selectedDocument.cliente}
                      </div>
                      <div>
                        <span className="font-medium">Responsável:</span>{" "}
                        {selectedDocument.responsavel}
                      </div>
                      <div>
                        <span className="font-medium">Sistema:</span>{" "}
                        {selectedDocument.sistema}
                      </div>
                      <div>
                        <span className="font-medium">Módulo:</span>{" "}
                        {selectedDocument.modulo}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso de anexos - não sincronizados ou já sincronizados */}
            {selectedDocument && (() => {
              const hasMondayData = hasMondayItemValues(selectedDocument);
              
              // Usar estado otimístico se disponível, senão usar o campo assetsSynced do documento
              const isOptimisticallySynced = optimisticSyncState === selectedDocument.id;
              const isSynced = isOptimisticallySynced || selectedDocument.assetsSynced;
              
              const hasUnsyncedAttachments = hasMondayData && !isSynced;
              const hasSyncedAttachments = hasMondayData && isSynced;
              
              if (hasUnsyncedAttachments) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800 mb-2">
                          Anexos não sincronizados
                        </h4>
                        <p className="text-sm text-amber-700 mb-4">
                          O item tem anexos que não foram sincronizados. Estes anexos podem ser úteis para o processo de análise e geração da documentação.
                        </p>
                        <Button
                          onClick={() => {
                            if (selectedDocument?.id) {
                              // Atualização otimística - definir como sincronizado imediatamente
                              setOptimisticSyncState(selectedDocument.id);
                              integrateAttachmentsMutation.mutate(selectedDocument.id);
                            }
                          }}
                          disabled={integrateAttachmentsMutation.isPending}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {integrateAttachmentsMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Sincronizar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (hasSyncedAttachments) {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800">
                          Anexos do item já sincronizados
                        </h4>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}

            {/* Seleção de Fluxo */}
            <div className="space-y-3">
              <Label htmlFor="flow-select" className="text-sm font-medium">
                Selecionar Fluxo de Documentação
              </Label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger id="flow-select">
                  <SelectValue placeholder="Escolha um fluxo para a documentação" />
                </SelectTrigger>
                <SelectContent>
                  {documentsFlows.map((flow: any) => (
                    <SelectItem key={flow.id} value={flow.id}>
                      {flow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFlowId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Fluxo selecionado
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {documentsFlows.find((flow: any) => flow.id === selectedFlowId)?.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDocumentationModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                console.log("Iniciar documentação para:", selectedDocument);
                console.log("Fluxo selecionado:", selectedFlowId);
                if (!selectedFlowId) {
                  toast({
                    title: "Fluxo obrigatório",
                    description: "Por favor, selecione um fluxo de documentação.",
                    variant: "destructive",
                  });
                  return;
                }
                if (selectedDocument) {
                  startDocumentationMutation.mutate({
                    documentId: selectedDocument.id,
                    flowId: selectedFlowId
                  });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!selectedFlowId || startDocumentationMutation.isPending}
            >
              {startDocumentationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal para editar artefato
  function renderEditArtifactModal() {
    return (
      <Dialog
        open={isEditArtifactModalOpen}
        onOpenChange={setIsEditArtifactModalOpen}
      >
        <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-500" />
              Editar Anexo
            </DialogTitle>
            <DialogDescription>Edite as informações do anexo</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-artifact-name">Nome do Anexo</Label>
              <Input
                id="edit-artifact-name"
                value={artifactFormData.name}
                onChange={(e) =>
                  setArtifactFormData({
                    ...artifactFormData,
                    name: e.target.value,
                  })
                }
                placeholder="Ex: Manual de usuário, Especificação técnica"
              />
            </div>

            <div>
              <Label>Arquivo/URL</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="edit-artifact-file"
                    value={artifactFormData.file}
                    onChange={(e) =>
                      setArtifactFormData({
                        ...artifactFormData,
                        file: e.target.value,
                      })
                    }
                    placeholder="Ex: /uploads/manual.pdf, https://exemplo.com/doc.pdf"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("edit-file-upload")?.click()
                    }
                    className="px-3"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <input
                  id="edit-file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.json,.xml,.xlsx,.zip"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const formData = new FormData();
                        formData.append("file", file);

                        const response = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });

                        if (response.ok) {
                          const result = await response.json();
                          setArtifactFormData({
                            ...artifactFormData,
                            file: result.path,
                            type:
                              file.name.split(".").pop()?.toLowerCase() || "",
                          });
                        } else {
                          alert("Erro ao fazer upload do arquivo");
                        }
                      } catch (error) {
                        alert("Erro ao fazer upload do arquivo");
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  Você pode inserir uma URL ou fazer upload de um arquivo local
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-artifact-type">Tipo do Arquivo</Label>
              <Select
                value={artifactFormData.type}
                onValueChange={(value) =>
                  setArtifactFormData({ ...artifactFormData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="zip">ZIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditArtifactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateArtifact}
              disabled={
                updateArtifactMutation.isPending || !artifactFormData.name
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateArtifactMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Componente interno que usa useReactFlow para fit view automático
  function FlowWithAutoFitView({ flowData, showFlowInspector, setShowFlowInspector, setSelectedFlowNode, selectedFlowNode, showApprovalAlert, setShowApprovalAlert, isPinned }: any) {
    const { fitView, getNodes, setNodes } = useReactFlow();
    
    // Estado para controlar os valores dos campos do formulário
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    
    // Estado para controlar resultado da execução de integração
    const [integrationResult, setIntegrationResult] = useState<{
      status: 'success' | 'error' | null;
      message: string;
    }>({ status: null, message: '' });
    
    // Carregar dados salvos quando um nó é selecionado
    useEffect(() => {
      if (selectedFlowNode && selectedFlowNode.data.formData) {
        console.log('🔄 Carregando dados salvos do formulário:', selectedFlowNode.data.formData);
        setFormValues(selectedFlowNode.data.formData);
      } else {
        // Limpar formulário se não há dados salvos
        setFormValues({});
      }
      
      // Limpar resultado da integração ao mudar de nó
      setIntegrationResult({ status: null, message: '' });
    }, [selectedFlowNode?.id, selectedFlowNode?.data.formData]);
    
    // Função helper para extrair dados do formulário
    const getFormFields = () => {
      try {
        if (!selectedFlowNode) {
          console.log('🔍 getFormFields: Nenhum nó selecionado');
          return {};
        }
        
        const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
        console.log('🔍 getFormFields: dados brutos', {
          nodeId: selectedFlowNode.id,
          attachedFormData,
          hasForm: !!attachedFormData
        });
        
        if (!attachedFormData) return {};
        
        // Corrigir o formato JSON malformado específico
        let correctedData = attachedFormData;
        
        // Verificar se precisa de correção de formato
        if (attachedFormData.includes('["') && attachedFormData.includes('": [')) {
          // Primeiro, substituir a estrutura Fields
          correctedData = attachedFormData.replace(
            /"Fields":\s*\[/g, 
            '"Fields":{'
          );
          
          // Corrigir os campos individuais
          correctedData = correctedData
            .replace(/\"([^"]+)\"\:\s*\[/g, '"$1":[')
            .replace(/\]\s*,\s*\"([^"]+)\"\:\s*\[/g, '],"$1":[')
            .replace(/\]\s*\]/g, ']}');
          
          console.log('🔍 getFormFields: dados corrigidos', correctedData);
        }
        
        const parsedData = JSON.parse(correctedData);
        const fields = parsedData.Fields || {};
        console.log('🔍 getFormFields: campos extraídos', fields);
        return fields;
      } catch (e) {
        console.log('🔍 getFormFields: erro', e);
        return {};
      }
    };

    // Função para verificar se todos os campos obrigatórios estão preenchidos
    const areAllFieldsFilled = () => {
      // Só valida se há um nó selecionado e é um actionNode
      if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
        return true;
      }

      // Só valida se o nó está pendente de execução
      if (!selectedFlowNode.data.isPendingConnected) {
        return true;
      }

      const fieldsData = getFormFields();
      const fieldNames = Object.keys(fieldsData);
      
      console.log('🔍 Validação de campos:', {
        nodeId: selectedFlowNode.id,
        nodeType: selectedFlowNode.type,
        isPending: selectedFlowNode.data.isPendingConnected,
        fieldsData,
        fieldNames,
        formValues,
        hasFields: fieldNames.length > 0
      });
      
      // Se não há campos, permite salvar
      if (fieldNames.length === 0) return true;
      
      // Verifica se todos os campos têm valores preenchidos
      const allFilled = fieldNames.every(fieldName => {
        const value = formValues[fieldName];
        // Para campos select, verificar se não está vazio ou "Selecione uma opção"
        const isFilled = value && value.trim() !== '' && value !== 'Selecione uma opção';
        console.log(`Campo ${fieldName}: valor="${value}", preenchido=${isFilled}`);
        return isFilled;
      });
      
      console.log('🔍 Resultado da validação:', allFilled);
      return allFilled;
    };

    // Função para alterar o status de aprovação (altera estado imediatamente e mostra alerta)
    const updateApprovalStatus = (nodeId: string, newStatus: string) => {
      const currentNodes = getNodes();
      const updatedNodes = currentNodes.map(node => {
        if (node.id === nodeId) {
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
      
      // Atualizar também o nó selecionado para refletir a mudança no painel
      if (selectedFlowNode && selectedFlowNode.id === nodeId) {
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isAproved: newStatus
          }
        });
      }

      // Mostrar alerta para persistir alterações
      console.log('🔴 Definindo showApprovalAlert para true');
      setShowApprovalAlert(true);
    };

    // Função para executar integração manual
    const executeManualIntegration = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'integrationNode') {
        console.log('Nenhum integrationNode selecionado');
        return;
      }

      console.log('Executando integração manual...');
      
      // Simular execução - 70% chance de sucesso
      const isSuccess = Math.random() > 0.3;
      
      if (isSuccess) {
        setIntegrationResult({
          status: 'success',
          message: `Integração executada com sucesso! A função ${selectedFlowNode.data.callType || 'callJob'} foi processada e ${selectedFlowNode.data.integrType || 'dados'} foram sincronizados com o serviço ${selectedFlowNode.data.service || 'externo'}.`
        });
        
        // Marcar o nó como executado
        const updatedNodes = [...nodes];
        const nodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            data: {
              ...updatedNodes[nodeIndex].data,
              isExecuted: 'TRUE',
              isPendingConnected: false
            }
          };
          setNodes(updatedNodes);
          
          // Atualizar nó selecionado
          setSelectedFlowNode({
            ...selectedFlowNode,
            data: {
              ...selectedFlowNode.data,
              isExecuted: 'TRUE',
              isPendingConnected: false
            }
          });
        }
      } else {
        setIntegrationResult({
          status: 'error',
          message: `Falha na execução da integração. Erro ao executar a função ${selectedFlowNode.data.callType || 'callJob'}. Verifique a conectividade com o serviço ${selectedFlowNode.data.service || 'externo'} e tente novamente.`
        });
      }
    };

    // Função para persistir as alterações no banco de dados
    const saveChangesToDatabase = async () => {
      if (!selectedFlowNode || selectedFlowNode.type !== 'actionNode') {
        console.log('Nenhum actionNode selecionado');
        return;
      }

      console.log('Salvando alterações no banco de dados...');
      console.log('selectedFlowNode:', selectedFlowNode);
      console.log('flowData:', flowData);
      
      try {
        // 1. Marcar o actionNode atual como executado, preservar o isAproved e salvar formValues
        const updatedNodes = [...nodes];
        const actionNodeIndex = updatedNodes.findIndex(n => n.id === selectedFlowNode.id);
        if (actionNodeIndex !== -1) {
          updatedNodes[actionNodeIndex] = {
            ...updatedNodes[actionNodeIndex],
            data: {
              ...updatedNodes[actionNodeIndex].data,
              isExecuted: 'TRUE',
              isAproved: selectedFlowNode.data.isAproved, // Preservar o valor de aprovação
              formData: formValues, // Salvar os dados do formulário
              isPendingConnected: false // Marcar como não mais editável
            }
          };
          console.log('Nó atual atualizado com isAproved:', selectedFlowNode.data.isAproved);
          console.log('Dados do formulário salvos:', formValues);
        }

        // 2. Encontrar nós conectados APENAS pelas conexões de SAÍDA do actionNode
        const outgoingConnections = edges.filter(edge => edge.source === selectedFlowNode.id);
        console.log('Conexões de saída do actionNode encontradas:', outgoingConnections);

        // 3. Processar apenas os nós que recebem conexões diretas do actionNode
        outgoingConnections.forEach(edge => {
          const targetNodeIndex = updatedNodes.findIndex(n => n.id === edge.target);
          if (targetNodeIndex !== -1) {
            const targetNode = updatedNodes[targetNodeIndex];
            
            // Se for switchNode, apenas definir inputSwitch (não marcar como executado ainda)
            if (targetNode.type === 'switchNode') {
              updatedNodes[targetNodeIndex] = {
                ...targetNode,
                data: {
                  ...targetNode.data,
                  isExecuted: 'TRUE',
                  inputSwitch: selectedFlowNode.data.isAproved
                }
              };
            } else {
              // Para outros tipos de nós, marcar como executado
              updatedNodes[targetNodeIndex] = {
                ...targetNode,
                data: {
                  ...targetNode.data,
                  isExecuted: 'TRUE'
                }
              };
            }
          }
        });

        // 4. Agora processar a lógica de "pendente conectado" baseada apenas nas conexões de SAÍDA
        const pendingConnectedNodeIds = new Set<string>();
        
        // Para cada conexão de saída do actionNode, verificar os nós conectados
        outgoingConnections.forEach(edge => {
          const connectedNode = updatedNodes.find(n => n.id === edge.target);
          
          if (connectedNode?.type === 'switchNode') {
            // Para switchNodes, encontrar as próximas conexões baseadas no inputSwitch
            const switchOutgoingEdges = edges.filter(e => e.source === connectedNode.id);
            
            switchOutgoingEdges.forEach(switchEdge => {
              const { inputSwitch, redSwitch, greenSwitch } = connectedNode.data;
              let shouldActivateConnection = false;
              
              // Verificar se a conexão deve estar ativa baseada no inputSwitch
              if (switchEdge.sourceHandle === 'a' && inputSwitch === redSwitch) {
                shouldActivateConnection = true;
              } else if (switchEdge.sourceHandle === 'c' && inputSwitch === greenSwitch) {
                shouldActivateConnection = true;
              }
              
              // Se a conexão deve estar ativa, marcar o nó de destino como pendente conectado
              if (shouldActivateConnection) {
                const finalTargetNode = updatedNodes.find(n => n.id === switchEdge.target);
                if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
                  pendingConnectedNodeIds.add(switchEdge.target);
                }
              }
            });
          } else {
            // Para outros tipos de nós, verificar suas conexões de saída
            const nodeOutgoingEdges = edges.filter(e => e.source === connectedNode.id);
            nodeOutgoingEdges.forEach(nodeEdge => {
              const finalTargetNode = updatedNodes.find(n => n.id === nodeEdge.target);
              if (finalTargetNode && finalTargetNode.data?.isExecuted !== 'TRUE') {
                pendingConnectedNodeIds.add(nodeEdge.target);
              }
            });
          }
        });

        // 5. Aplicar o status "pendente conectado" apenas aos nós identificados
        pendingConnectedNodeIds.forEach(nodeId => {
          const nodeIndex = updatedNodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex] = {
              ...updatedNodes[nodeIndex],
              data: {
                ...updatedNodes[nodeIndex].data,
                isPendingConnected: true
              }
            };
          }
        });

        console.log('Nós marcados como pendente conectado:', Array.from(pendingConnectedNodeIds));

        // 6. Preparar dados para envio ao servidor
        const updatedFlowTasks = {
          ...flowData.flowTasks,
          nodes: updatedNodes
        };

        // 5. Enviar para o servidor (atualizar execução do fluxo, não o template)
        const response = await fetch(`/api/document-flow-executions/${flowData.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            flowTasks: updatedFlowTasks
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao salvar alterações');
        }

        console.log('Alterações salvas com sucesso');
        console.log('Atualizando estado local com:', updatedFlowTasks);

        // 6. Atualizar estado local e recarregar diagrama
        setFlowDiagramModal(prev => ({
          ...prev,
          flowData: {
            ...prev.flowData,
            flowTasks: updatedFlowTasks
          }
        }));
        
        // 7. Atualizar o nó selecionado para refletir as mudanças imediatamente
        setSelectedFlowNode({
          ...selectedFlowNode,
          data: {
            ...selectedFlowNode.data,
            isExecuted: 'TRUE',
            formData: formValues,
            isPendingConnected: false
          }
        });

        // 8. Limpar o formValues para mostrar que foi salvo
        setFormValues({});
        
        console.log('Estado local atualizado');

        // Fechar o alerta
        setShowApprovalAlert(false);
        
        // Recarregar a lista de execuções de fluxo para atualizar dados
        queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
        
      } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        // Aqui poderia mostrar um toast de erro
      }
    };

    // Effect para executar fit view quando o painel inspector é aberto/fechado
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        fitView({
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 2,
          duration: 300
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [showFlowInspector, fitView]);

    // Implementar lógica de "pendente em processo"
    const nodes = flowData.flowTasks.nodes || [];
    const edges = flowData.flowTasks.edges || [];

    // Encontrar nós executados
    const executedNodes = new Set(
      nodes.filter((node: any) => node.data?.isExecuted === 'TRUE').map((node: any) => node.id)
    );

    // Encontrar nós pendentes conectados aos executados
    const pendingConnectedNodes = new Set<string>();
    
    for (const edge of edges) {
      // Se o nó de origem está executado e o nó de destino não está executado
      if (executedNodes.has(edge.source)) {
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        const targetNode = nodes.find((n: any) => n.id === edge.target);
        
        if (targetNode && targetNode.data?.isExecuted !== 'TRUE') {
          // Verificar se o nó de origem é um switchNode
          if (sourceNode?.type === 'switchNode') {
            // Para switchNodes, verificar se a conexão está no handle correto
            const { inputSwitch, redSwitch, greenSwitch } = sourceNode.data;
            
            // Determinar qual handle deveria estar ativo baseado no inputSwitch
            let shouldBeActive = false;
            if (edge.sourceHandle === 'a' && inputSwitch === redSwitch) {
              shouldBeActive = true; // Handle vermelho ativo
            } else if (edge.sourceHandle === 'c' && inputSwitch === greenSwitch) {
              shouldBeActive = true; // Handle verde ativo
            }
            
            // Apenas marcar como pendente se a conexão está no handle correto
            if (shouldBeActive) {
              pendingConnectedNodes.add(edge.target);
            }
          } else {
            // Para outros tipos de nós, aplicar lógica normal
            pendingConnectedNodes.add(edge.target);
          }
        }
      }
      
      // Se o nó de destino está executado e o nó de origem não está executado
      if (executedNodes.has(edge.target)) {
        const sourceNode = nodes.find((n: any) => n.id === edge.source);
        if (sourceNode && sourceNode.data?.isExecuted !== 'TRUE') {
          pendingConnectedNodes.add(edge.source);
        }
      }
    }

    // Processar nós para adicionar destaque amarelo aos pendentes conectados
    const processedNodes = nodes.map((node: any) => {
      const isSelected = selectedFlowNode?.id === node.id;
      
      if (pendingConnectedNodes.has(node.id)) {
        return {
          ...node,
          selected: isSelected,
          data: {
            ...node.data,
            isPendingConnected: true,
            isReadonly: true
          },
        };
      }
      return {
        ...node,
        selected: isSelected,
        data: { ...node.data, isReadonly: true }
      };
    });

    // Processar edges para colorir conexões e adicionar animação
    const processedEdges = edges.map((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      
      const sourceExecuted = sourceNode?.data?.isExecuted === 'TRUE';
      const targetExecuted = targetNode?.data?.isExecuted === 'TRUE';
      
      const sourcePending = pendingConnectedNodes.has(edge.source);
      const targetPending = pendingConnectedNodes.has(edge.target);
      
      let edgeColor = '#6b7280'; // cor padrão
      let shouldAnimate = false; // nova variável para controlar animação
      
      // PRIMEIRA PRIORIDADE: Lógica de execução/pendência (sempre tem precedência)
      // Se ambos os nós estão executados
      if (sourceExecuted && targetExecuted) {
        edgeColor = '#21639a';
        shouldAnimate = true; // animar conexões executadas (azuis)
      }
      // Se há conexão entre executado e pendente conectado (PRIORIDADE MÁXIMA)
      else if ((sourceExecuted && targetPending) || (sourcePending && targetExecuted)) {
        edgeColor = '#fbbf24'; // amarelo
        shouldAnimate = true; // animar conexões pendentes (amarelas)
      }
      // SEGUNDA PRIORIDADE: Verificar se a conexão parte de um SwitchNode e aplicar cor específica do handle
      else if (sourceNode?.type === 'switchNode') {
        // Verificar qual handle está sendo usado baseado no sourceHandle
        if (edge.sourceHandle === 'a') {
          edgeColor = '#dc2626'; // Vermelho para conector direito (id="a")
        } else if (edge.sourceHandle === 'c') {
          edgeColor = '#16a34a'; // Verde para conector esquerdo (id="c")
        }
      }
      
      return {
        ...edge,
        type: 'smoothstep', // garantir que o tipo seja definido
        animated: shouldAnimate, // aplicar animação baseada na lógica
        style: {
          stroke: edgeColor,
          strokeWidth: 3,
          strokeDasharray: 'none'
        },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
        },
      };
    });

    const nodeTypes = useMemo(() => ({
      startNode: StartNodeComponent,
      endNode: EndNodeComponent,
      actionNode: ActionNodeComponent,
      documentNode: DocumentNodeComponent,
      integrationNode: IntegrationNodeComponent,
      switchNode: SwitchNodeComponent
    }), []);

    const onNodeClick = (event: any, node: any) => {
      setSelectedFlowNode(node);
      setShowFlowInspector(true);
    };

    const onPaneClick = () => {
      if (!isPinned) {
        setShowFlowInspector(false);
        setSelectedFlowNode(null);
      }
    };

    // Log para debug das edges com animação
    console.log("🟢 FlowWithAutoFitView - Edges com animação:", processedEdges.filter(edge => edge.animated));

    return (
      <div className="flex-1 flex h-full w-full">
        <div className="flex-1 h-full w-full">
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{
              padding: 0.2,
              minZoom: 0.1,
              maxZoom: 2
            }}
            minZoom={0.1}
            maxZoom={2}
            attributionPosition="bottom-left"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
          >
            <Controls showInteractive={false} />
            <Background />
          </ReactFlow>
        </div>
        {showFlowInspector && selectedFlowNode && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto relative">
            <div className="space-y-4">
              <div className="border-b pb-2 relative">
                <h3 className="text-lg font-semibold">Execution Form</h3>
                <p className="text-sm text-gray-600 font-mono">
                  {(() => {
                    const typeMap: { [key: string]: string } = {
                      'startNode': 'Início',
                      'endNode': 'Fim',
                      'actionNode': 'Ação',
                      'documentNode': 'Documento',
                      'integrationNode': 'Integração',
                      'switchNode': 'Condição'
                    };
                    return typeMap[selectedFlowNode.type] || selectedFlowNode.type;
                  })()} - {selectedFlowNode.id}
                </p>
                <button
                  onClick={() => setIsFlowInspectorPinned(!isFlowInspectorPinned)}
                  className={`absolute top-0 right-0 p-1 rounded transition-colors ${
                    isFlowInspectorPinned 
                      ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title={isFlowInspectorPinned ? "Desafixar painel" : "Fixar painel"}
                >
                  <Pin 
                    className={`w-4 h-4 transition-transform ${isFlowInspectorPinned ? 'rotate-45' : 'rotate-0'}`}
                  />
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Status Exec./Tipo apenas para ActionNode */}
                {selectedFlowNode.type === 'actionNode' && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Status Exec.</p>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        selectedFlowNode.data.isExecuted === 'TRUE' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedFlowNode.data.isPendingConnected
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedFlowNode.data.isExecuted === 'TRUE' 
                          ? 'Executado' 
                          : selectedFlowNode.data.isPendingConnected
                          ? 'Pendente'
                          : 'N.Exec.'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Tipo Ação</p>
                      {selectedFlowNode.data.actionType && (
                        <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {selectedFlowNode.data.actionType}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Aprovação</p>
                      {selectedFlowNode.data.isAproved && (
                        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          selectedFlowNode.data.isAproved === 'TRUE' 
                            ? 'bg-green-100 text-green-800'
                            : selectedFlowNode.data.isAproved === 'FALSE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedFlowNode.data.isAproved === 'TRUE' 
                            ? 'SIM' 
                            : selectedFlowNode.data.isAproved === 'FALSE'
                            ? 'NÃO'
                            : 'UNDEF'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedFlowNode.data.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Descrição</p>
                    <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded border font-mono">
                      {selectedFlowNode.data.description}
                    </p>
                  </div>
                )}

                {/* Formulário dinâmico baseado no attached_Form */}
                {selectedFlowNode.type === 'actionNode' && (selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form) && (
                  <div>
                    {(() => {
                      try {
                        // Verifica tanto attached_Form (maiúsculo) quanto attached_form (minúsculo)
                        let attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                        console.log('🔍 Dados brutos do formulário:', attachedFormData);
                        
                        // Corrige formato malformado do JSON se necessário
                        if (typeof attachedFormData === 'string' && attachedFormData.includes('"Motivo de Recusa":') && attachedFormData.includes('"Detalhamento":')) {
                          // Converte o formato específico manualmente
                          const fixedJson = {
                            "Show_Condition": "FALSE",
                            "Fields": {
                              "Motivo de Recusa": ["Incompatível com processo", "Forma de operação", "Configuração de Sistema"],
                              "Detalhamento": ["default:", "type:longText"]
                            }
                          };
                          attachedFormData = JSON.stringify(fixedJson);
                        }
                        
                        console.log('🔍 Dados corrigidos:', attachedFormData);
                        const formData = JSON.parse(attachedFormData);
                        console.log('🔍 Dados parseados:', formData);
                        
                        // Verifica se é um formulário com condição
                        if (formData.Show_Condition !== undefined && formData.Fields) {
                          const showCondition = formData.Show_Condition;
                          const isApprovalNode = selectedFlowNode.data.actionType === 'Intern_Aprove';
                          const approvalStatus = selectedFlowNode.data.isAproved;
                          
                          // Determina se deve mostrar o formulário baseado na condição
                          let shouldShowForm = false;
                          if (isApprovalNode && approvalStatus !== 'UNDEF') {
                            if (showCondition === 'TRUE' && approvalStatus === 'TRUE') {
                              shouldShowForm = true;
                            } else if (showCondition === 'FALSE' && approvalStatus === 'FALSE') {
                              shouldShowForm = true;
                            } else if (showCondition === 'BOTH' && (approvalStatus === 'TRUE' || approvalStatus === 'FALSE')) {
                              shouldShowForm = true;
                            }
                          }
                          
                          if (!shouldShowForm) {
                            return null;
                          }
                          
                          // Converte Fields para objeto se for array - só processa se vai mostrar
                          let fieldsData = formData.Fields;
                          if (Array.isArray(formData.Fields)) {
                            fieldsData = {};
                            // Trata diferentes formatos de array
                            formData.Fields.forEach((item, index) => {
                              if (typeof item === 'string') {
                                // Formato: [fieldName1, fieldValue1, fieldName2, fieldValue2, ...]
                                const nextItem = formData.Fields[index + 1];
                                if (nextItem !== undefined && index % 2 === 0) {
                                  fieldsData[item] = nextItem;
                                }
                              } else if (typeof item === 'object' && item !== null) {
                                // Formato: [{fieldName: fieldValue}, ...]
                                Object.assign(fieldsData, item);
                              }
                            });
                          }
                          
                          console.log('🟡 Dados do formulário processados:', fieldsData);
                          
                          return (
                            <div className="bg-gray-50 p-4 rounded border space-y-4">
                              {Object.entries(fieldsData).map(([fieldName, fieldValue]) => {
                              // Verifica se é um array de configuração com default e type
                              if (Array.isArray(fieldValue) && fieldValue.length === 2 && 
                                  typeof fieldValue[0] === 'string' && fieldValue[0].startsWith('default:') &&
                                  typeof fieldValue[1] === 'string' && fieldValue[1].startsWith('type:')) {
                                
                                const defaultValue = fieldValue[0].replace('default:', '');
                                const fieldType = fieldValue[1].replace('type:', '');
                                const isReadonly = !selectedFlowNode.data.isPendingConnected;
                                const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                                const readonlyClasses = isReadonly 
                                  ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                                  : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                                
                                return (
                                  <div key={fieldName} className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                    {fieldType === 'longText' ? (
                                      <textarea
                                        rows={4}
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses} resize-vertical`}
                                      />
                                    ) : fieldType.startsWith('char(') ? (
                                      <input
                                        type="text"
                                        maxLength={parseInt(fieldType.match(/\d+/)?.[0] || '255')}
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : fieldType === 'int' ? (
                                      <input
                                        type="number"
                                        step="1"
                                        placeholder={defaultValue || `Digite um número inteiro`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : fieldType.startsWith('number(') ? (
                                      <input
                                        type="number"
                                        step={Math.pow(10, -parseInt(fieldType.match(/\d+/)?.[0] || '2'))}
                                        placeholder={defaultValue || `Digite um número`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        placeholder={defaultValue || `Digite ${fieldName.toLowerCase()}`}
                                        readOnly={isReadonly}
                                        value={formValues[fieldName] || ''}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                        className={`${baseClasses} ${readonlyClasses}`}
                                      />
                                    )}
                                  </div>
                                );
                              }
                              
                              // Comportamento original para arrays simples ou strings
                              const isReadonly = !selectedFlowNode.data.isPendingConnected;
                              const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                              const readonlyClasses = isReadonly 
                                ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                                : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                              
                              return (
                                <div key={fieldName} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                  {Array.isArray(fieldValue) ? (
                                    <select 
                                      disabled={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    >
                                      <option value="">Selecione uma opção</option>
                                      {fieldValue.map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                        }
                        
                        // Comportamento legado para formulários sem condição
                        return (
                          <div className="bg-gray-50 p-4 rounded border space-y-4">
                            {Object.entries(formData).map(([fieldName, fieldValue]) => {
                              const isReadonly = !selectedFlowNode.data.isPendingConnected;
                              const baseClasses = "w-full px-3 py-2 border rounded-md text-xs font-mono";
                              const readonlyClasses = isReadonly 
                                ? "bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
                                : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
                              
                              return (
                                <div key={fieldName} className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">{fieldName}</label>
                                  {Array.isArray(fieldValue) ? (
                                    <select 
                                      disabled={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    >
                                      <option value="">Selecione uma opção</option>
                                      {fieldValue.map((option, index) => (
                                        <option key={index} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={fieldValue || `Digite ${fieldName.toLowerCase()}`}
                                      readOnly={isReadonly}
                                      value={formValues[fieldName] || ''}
                                      onChange={(e) => setFormValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                                      className={`${baseClasses} ${readonlyClasses}`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch (e) {
                        const attachedFormData = selectedFlowNode.data.attached_Form || selectedFlowNode.data.attached_form;
                        return (
                          <div className="text-sm text-red-600">
                            Erro ao processar formulário: {attachedFormData}
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Layout tabular para DocumentNode - 2 colunas */}
                {selectedFlowNode.type === 'documentNode' && (
                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">ID Template</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'Executado' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'Pendente'
                                  : 'N.Exec.'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {selectedFlowNode.data.docType ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 font-mono">
                                  {selectedFlowNode.data.docType}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs font-mono">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(selectedFlowNode.data.integrType || selectedFlowNode.type === 'integrationNode') && (
                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Dir.Integr.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo Integr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'Executado' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'Pendente'
                                  : 'N.Exec.'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              {selectedFlowNode.data.integrType ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {selectedFlowNode.data.integrType}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {selectedFlowNode.data.callType ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {selectedFlowNode.data.callType}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedFlowNode.data.service && (
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Serviço:</span> {selectedFlowNode.data.service}
                    </p>
                  </div>
                )}

                {(selectedFlowNode.data.callType?.toLowerCase() === 'automatico' || selectedFlowNode.data.callType?.toLowerCase() === 'automático') && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      Esta integração é feita automaticamente por um processo agendado, o ID deste processo é:
                    </p>
                    <p className="text-xs text-blue-800 font-mono mt-1">
                      {selectedFlowNode.data.jobId || 'N/A'}
                    </p>
                  </div>
                )}

                {selectedFlowNode.data.callType?.toLowerCase() === 'manual' && (selectedFlowNode.data.isPendingConnected || selectedFlowNode.data.isExecuted === 'TRUE') && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="mb-3">
                      <p className="text-sm text-yellow-800 mb-2">
                        {(() => {
                          // Extrair informações do jobId
                          let functionCaption = selectedFlowNode.data.callType || 'callJob';
                          let functionName = '';
                          
                          if (selectedFlowNode.data.jobId) {
                            try {
                              const jobData = JSON.parse(selectedFlowNode.data.jobId);
                              const firstKey = Object.keys(jobData)[0];
                              if (firstKey) {
                                functionCaption = firstKey;
                                functionName = jobData[firstKey];
                              }
                            } catch (e) {
                              console.log('Erro ao fazer parse do jobId:', e);
                            }
                          }
                          
                          const displayName = functionName ? `${functionCaption} [${functionName}]` : functionCaption;
                          
                          return `Ao clicar no botão você executará a função ${displayName} que ${selectedFlowNode.data.integrType || 'Atualiza Dados'} com o serviço ${selectedFlowNode.data.service || 'externo'}. Pressione para continuar.`;
                        })()}
                      </p>
                    </div>

                    {integrationResult.status && (
                      <div className={`mb-3 p-3 rounded-md ${
                        integrationResult.status === 'success' 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm ${
                          integrationResult.status === 'success' 
                            ? 'text-green-800' 
                            : 'text-red-800'
                        }`}>
                          {integrationResult.message}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={executeManualIntegration}
                      disabled={selectedFlowNode.data.isExecuted === 'TRUE'}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedFlowNode.data.isExecuted === 'TRUE'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                      }`}
                    >
                      {selectedFlowNode.data.isExecuted === 'TRUE' ? 'Já Executado' : 'Executar'}
                    </button>
                  </div>
                )}

                {/* Layout tabular para StartNode - 2 colunas */}
                {selectedFlowNode.type === 'startNode' && (
                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'Executado' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'Pendente'
                                  : 'N.Exec.'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Início Direto
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Layout tabular para EndNode - 2 colunas */}
                {selectedFlowNode.type === 'endNode' && (
                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'Executado' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'Pendente'
                                  : 'N.Exec.'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {selectedFlowNode.data.FromType ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {selectedFlowNode.data.FromType === 'Init' ? 'Encerramento Direto' : 
                                   selectedFlowNode.data.FromType === 'flow_init' ? 'Transferência para Fluxo' : selectedFlowNode.data.FromType}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Layout tabular 3x2 para SwitchNode */}
                {selectedFlowNode.type === 'switchNode' && (
                  <div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Status Exec.</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 border-r border-gray-200 text-xs">Campo Switch</th>
                            <th className="px-2 py-1.5 text-center font-medium text-gray-700 text-xs">Input Switch</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              <div className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedFlowNode.data.isExecuted === 'TRUE' 
                                  ? 'Executado' 
                                  : selectedFlowNode.data.isPendingConnected
                                  ? 'Pendente'
                                  : 'N.Exec.'}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                              {selectedFlowNode.data.switchField ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {selectedFlowNode.data.switchField}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {selectedFlowNode.data.inputSwitch ? (
                                <div className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                  {selectedFlowNode.data.inputSwitch}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedFlowNode.data.To_Flow_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Fluxo de Destino</p>
                    <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.To_Flow_id}</p>
                  </div>
                )}

                {selectedFlowNode.type === 'actionNode' && selectedFlowNode.data.actionType === 'Intern_Aprove' && selectedFlowNode.data.isAproved !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Status de Aprovação</p>
                    <div className="flex space-x-2 mb-2">
                      <button
                        onClick={() => {
                          if (selectedFlowNode.data.isPendingConnected) {
                            updateApprovalStatus(selectedFlowNode.id, 'TRUE');
                          }
                        }}
                        disabled={!selectedFlowNode.data.isPendingConnected}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                          selectedFlowNode.data.isAproved === 'TRUE'
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : selectedFlowNode.data.isPendingConnected
                            ? 'bg-white border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-300 cursor-pointer'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <CircleCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">SIM</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          if (selectedFlowNode.data.isPendingConnected) {
                            updateApprovalStatus(selectedFlowNode.id, 'FALSE');
                          }
                        }}
                        disabled={!selectedFlowNode.data.isPendingConnected}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all flex-1 justify-center ${
                          selectedFlowNode.data.isAproved === 'FALSE'
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : selectedFlowNode.data.isPendingConnected
                            ? 'bg-white border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">NÃO</span>
                      </button>
                    </div>
                    
                    {/* Caixa de alerta para confirmação */}
                    {showApprovalAlert && selectedFlowNode.data.isAproved !== 'UNDEF' && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-orange-800 mb-1">ATENÇÃO</h4>
                            <p className="text-xs text-orange-700 mb-3">
                              Ao executar esta ação o fluxo passará automaticamente para o próximo estágio definido conforme o diagrama, esta ação pode ser irreversível caso ações posteriores no workflow sejam executadas.
                            </p>
                            <div className="flex space-x-2">
                              <button
                                onClick={saveChangesToDatabase}
                                disabled={!areAllFieldsFilled()}
                                className={`px-3 py-1.5 text-white text-xs font-medium rounded transition-colors ${
                                  areAllFieldsFilled()
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Salvar Alterações
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Status atual: {selectedFlowNode.data.isAproved || 'UNDEF'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Função para renderizar o inspector de propriedades do fluxo
  const renderFlowInspector = () => {
    if (!selectedFlowNode) return null;
    
    const getNodeTypeLabel = (nodeType: string) => {
      const typeMap: { [key: string]: string } = {
        'startNode': 'Início',
        'endNode': 'Fim',
        'actionNode': 'Ação',
        'documentNode': 'Documento',
        'integrationNode': 'Integração',
        'switchNode': 'Condição'
      };
      return typeMap[nodeType] || nodeType;
    };

    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold">Inspetor de Propriedades</h3>
            <p className="text-sm text-gray-600 font-mono">
              {getNodeTypeLabel(selectedFlowNode.type)} - {selectedFlowNode.id}
            </p>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Status de Execução</p>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                selectedFlowNode.data.isExecuted === 'TRUE' 
                  ? 'bg-blue-100 text-blue-800' 
                  : selectedFlowNode.data.isPendingConnected
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedFlowNode.data.isExecuted === 'TRUE' 
                  ? 'Executado' 
                  : selectedFlowNode.data.isPendingConnected
                  ? 'Pendente'
                  : 'N.Exec.'}
              </div>
            </div>

            {selectedFlowNode.data.actionType && (
              <div>
                <p className="text-sm font-medium text-gray-700">Tipo de Ação</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.actionType}</p>
              </div>
            )}

            {selectedFlowNode.data.description && (
              <div>
                <p className="text-sm font-medium text-gray-700">Descrição</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {selectedFlowNode.data.description}
                </p>
              </div>
            )}

            {selectedFlowNode.data.docType && (
              <div>
                <p className="text-sm font-medium text-gray-700">Tipo de Documento</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.docType}</p>
              </div>
            )}

            {selectedFlowNode.data.integrType && (
              <div>
                <p className="text-sm font-medium text-gray-700">Tipo de Integração</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.integrType}</p>
              </div>
            )}

            {selectedFlowNode.data.service && (
              <div>
                <p className="text-sm font-medium text-gray-700">Serviço</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.service}</p>
              </div>
            )}

            {selectedFlowNode.data.FromType && (
              <div>
                <p className="text-sm font-medium text-gray-700">Tipo de Origem</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.FromType}</p>
              </div>
            )}

            {selectedFlowNode.data.To_Flow_id && (
              <div>
                <p className="text-sm font-medium text-gray-700">Fluxo de Destino</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.To_Flow_id}</p>
              </div>
            )}

            {selectedFlowNode.type === 'switchNode' && selectedFlowNode.data.switchField && (
              <div>
                <p className="text-sm font-medium text-gray-700">Campo de Condição</p>
                <p className="text-sm text-gray-900 font-mono">{selectedFlowNode.data.switchField}</p>
              </div>
            )}

            {selectedFlowNode.type === 'switchNode' && (selectedFlowNode.data.redSwitch || selectedFlowNode.data.greenSwitch) && (
              <div>
                <p className="text-sm font-medium text-gray-700">Valores de Switch</p>
                <div className="space-y-2">
                  {selectedFlowNode.data.redSwitch && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-900 font-mono">
                        {Array.isArray(selectedFlowNode.data.redSwitch) 
                          ? selectedFlowNode.data.redSwitch.join(', ') 
                          : selectedFlowNode.data.redSwitch}
                      </span>
                    </div>
                  )}
                  {selectedFlowNode.data.greenSwitch && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-900 font-mono">
                        {Array.isArray(selectedFlowNode.data.greenSwitch) 
                          ? selectedFlowNode.data.greenSwitch.join(', ') 
                          : selectedFlowNode.data.greenSwitch}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedFlowNode.data.isAproved && (
              <div>
                <p className="text-sm font-medium text-gray-700">Status de Aprovação</p>
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  selectedFlowNode.data.isAproved === 'TRUE' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedFlowNode.data.isAproved === 'FALSE'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedFlowNode.data.isAproved === 'TRUE' 
                    ? 'Aprovado' 
                    : selectedFlowNode.data.isAproved === 'FALSE'
                    ? 'Rejeitado'
                    : 'Indefinido'}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                setShowFlowInspector(false);
                setSelectedFlowNode(null);
                setIsFlowInspectorPinned(false);
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Fechar Inspetor
            </Button>
          </div>
        </div>
      </div>
    );
  };

  function renderFlowDiagramModal() {
    console.log("🔴 RENDERIZANDO MODAL:", flowDiagramModal);
    if (!flowDiagramModal.isOpen || !flowDiagramModal.flowData) {
      console.log("🔴 Modal fechada ou sem dados, não renderizando");
      return null;
    }
    console.log("🔴 Modal ABERTA, renderizando...");

    // Node types definition moved inside render function
    const nodeTypes = {
      startNode: StartNodeComponent,
      endNode: EndNodeComponent,
      actionNode: ActionNodeComponent,
      documentNode: DocumentNodeComponent,
      integrationNode: IntegrationNodeComponent,
      switchNode: SwitchNodeComponent,
    };

    // Convert flow data function moved inside render function
    const convertFlowDataToReactFlow = (flowData: any) => {
      // Try to access flow_tasks first, then fall back to direct flowData
      const tasksData = flowData?.flowTasks || flowData;
      
      if (!tasksData?.nodes) {
        console.log("🔴 Nenhum node encontrado nos dados:", tasksData);
        return { nodes: [], edges: [] };
      }

      const nodes = tasksData.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          isReadonly: true,
        },
      }));

      console.log("🔴 Nodes convertidos:", nodes);
      console.log("🔴 Edges encontradas:", tasksData.edges || []);

      return {
        nodes,
        edges: tasksData.edges || [],
      };
    };

    const { nodes, edges } = convertFlowDataToReactFlow(flowDiagramModal.flowData);
    
    // Usar as edges originais diretamente - a animação será aplicada no FlowWithAutoFitView

    // Handler para clique em nós
    const onNodeClick = (event: React.MouseEvent, node: any) => {
      setSelectedFlowNode(node);
      setShowFlowInspector(true);
    };

    // Handler para clique no painel (fechar inspector apenas se não estiver pinado)
    const onPaneClick = () => {
      if (!isFlowInspectorPinned) {
        setShowFlowInspector(false);
        setSelectedFlowNode(null);
      }
    };

    // Remover lógica duplicada - a animação será aplicada no FlowWithAutoFitView



    return (
      <Dialog 
        open={flowDiagramModal.isOpen} 
        onOpenChange={(open) => {
          console.log("🔴 onOpenChange chamado:", open);
          if (!open) {
            setFlowDiagramModal({
              isOpen: false,
              flowData: null,
              documentTitle: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Diagrama do Fluxo - {flowDiagramModal.documentTitle}
            </DialogTitle>
            <DialogDescription>
              Visualização do diagrama de fluxo de trabalho aplicado ao documento
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 w-full border rounded-lg overflow-hidden">
            <ReactFlowProvider>
              <FlowWithAutoFitView 
                flowData={flowDiagramModal.flowData}
                showFlowInspector={showFlowInspector}
                setShowFlowInspector={setShowFlowInspector}
                setSelectedFlowNode={setSelectedFlowNode}
                selectedFlowNode={selectedFlowNode}
                showApprovalAlert={showApprovalAlert}
                setShowApprovalAlert={setShowApprovalAlert}
                isPinned={isFlowInspectorPinned}
              />
            </ReactFlowProvider>
          </div>
          
          <div className="flex-shrink-0 border-t bg-white p-4 mt-4">
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  console.log("🔴 Botão fechar clicado");
                  setFlowDiagramModal({
                    isOpen: false,
                    flowData: null,
                    documentTitle: "",
                  });
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {renderEditModal()}
      {renderAddArtifactModal()}
      {renderDocumentationModal()}
      {renderEditArtifactModal()}
      {renderFlowDiagramModal()}
    </div>
  );
}
