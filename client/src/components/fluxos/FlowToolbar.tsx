import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { 
  Settings, 
  Edit, 
  Trash2, 
  Save, 
  Play, 
  GitBranch, 
  Zap, 
  FileText, 
  Link, 
  Square, 
  PlusCircle, 
  AlignCenter, 
  Undo2, 
  Redo2, 
  RotateCcw,
  Map
} from "lucide-react";
import { FlowMetadataModal } from "./FlowMetadataModal";
import { NewFlowModal } from "./NewFlowModal";

interface FlowToolbarProps {
  // Flow selection
  currentFlowId: string | null;
  savedFlows: any[];
  onFlowSelect: (flowId: string) => void;
  checkUnsavedChanges?: () => boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  
  // Inspector
  showInspector: boolean;
  onToggleInspector: () => void;
  
  // MiniMap
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  
  // Flow state
  isFlowLocked?: boolean;
  hasUnsavedChanges?: boolean;
  
  // Modals
  isNewFlowModalOpen: boolean;
  onOpenNewFlowModal: (open: boolean) => void;
  isEditModalOpen: boolean;
  onOpenEditModal: () => void;
  
  // New flow modal props
  newFlowTypeId: string;
  newFlowCode: string;
  newFlowName: string;
  newFlowDescription: string;
  flowTypes: any[];
  onFlowTypeChange: (typeId: string) => void;
  onCodeChange: (code: string) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onCreateFlow: () => void;
  onCancelNewFlow: () => void;
  
  // Edit flow modal props
  editFlowCode: string;
  editFlowName: string;
  editFlowDescription: string;
  onEditNameChange: (name: string) => void;
  onEditDescriptionChange: (description: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  
  // Flow actions
  onDeleteFlow: () => void;
  onSaveFlow: () => void;
  
  // Node selection
  selectedNodeType: string;
  onNodeTypeChange: (type: string) => void;
  onAddNode: () => void;
  
  // History controls
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onAutoAlign: () => void;
  
  // Node count for auto align
  nodeCount: number;
}

export const FlowToolbar = ({
  currentFlowId,
  savedFlows,
  onFlowSelect,
  checkUnsavedChanges,
  onSave,
  onDiscard,
  showInspector,
  onToggleInspector,
  showMiniMap,
  onToggleMiniMap,
  isFlowLocked = false,
  hasUnsavedChanges = false,
  isNewFlowModalOpen,
  onOpenNewFlowModal,
  isEditModalOpen,
  onOpenEditModal,
  newFlowTypeId,
  newFlowCode,
  newFlowName,
  newFlowDescription,
  flowTypes,
  onFlowTypeChange,
  onCodeChange,
  onNameChange,
  onDescriptionChange,
  onCreateFlow,
  onCancelNewFlow,
  editFlowCode,
  editFlowName,
  editFlowDescription,
  onEditNameChange,
  onEditDescriptionChange,
  onSaveEdit,
  onCancelEdit,
  onDeleteFlow,
  onSaveFlow,
  selectedNodeType,
  onNodeTypeChange,
  onAddNode,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  onReset,
  onAutoAlign,
  nodeCount
}: FlowToolbarProps) => {
  const [pendingFlowChange, setPendingFlowChange] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);



  const handleFlowChangeAttempt = (newFlowId: string) => {
    console.log('🔍 FLOW CHANGE ATTEMPT');
    console.log('  newFlowId:', newFlowId);
    console.log('  currentFlowId:', currentFlowId);
    console.log('  hasUnsavedChanges:', hasUnsavedChanges);
    console.log('  showUnsavedModal:', showUnsavedModal);
    
    // Se é o mesmo fluxo, não fazer nada
    if (newFlowId === currentFlowId) {
      console.log('  ❌ Same flow, returning');
      return;
    }
    
    // Verificar alterações não salvas
    if (hasUnsavedChanges) {
      console.log('  ✅ HAS CHANGES - SHOWING MODAL');
      setPendingFlowChange(newFlowId);
      setShowUnsavedModal(true);
      console.log('  Modal state set to true');
    } else {
      console.log('  ❌ No changes, proceeding');
      onFlowSelect(newFlowId);
    }
  };

  const handleConfirmChange = (shouldSave: boolean) => {
    console.log('handleConfirmChange called with shouldSave:', shouldSave);
    
    if (shouldSave && onSave) {
      onSave();
    }
    
    if (pendingFlowChange) {
      onFlowSelect(pendingFlowChange);
    }
    
    setPendingFlowChange(null);
    setShowUnsavedModal(false);
  };

  const handleCancelChange = () => {
    console.log('handleCancelChange called');
    setPendingFlowChange(null);
    setShowUnsavedModal(false);
  };

  return (
    <div className="mb-4 bg-white p-4 rounded-lg shadow-sm space-y-3">
      {/* Primeira linha - Seleção de fluxo e botões principais */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <Select value={currentFlowId || ""} onValueChange={(value) => {
              console.log('Select onValueChange triggered with value:', value);
              handleFlowChangeAttempt(value);
            }}>
              <SelectTrigger id="flow-select" className="!text-xs text-left font-mono">
                <SelectValue placeholder="Carregar fluxo existente" />
              </SelectTrigger>
              <SelectContent className="!text-xs">
                {savedFlows
                  ?.filter((flow) => flow.isEnabled !== false) // Filtra apenas fluxos habilitados
                  ?.map((flow) => (
                    <SelectItem key={flow.id} value={flow.id} className="!text-xs font-mono">
                      <span className={flow.isLocked ? "text-red-600" : ""}>
                        {flow.code} - {flow.name}
                        {flow.isLocked && " (Bloqueado)"}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={onSaveFlow} 
            size="sm"
            disabled={isFlowLocked}
            variant={hasUnsavedChanges ? "default" : "outline"}
            className={hasUnsavedChanges ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
            title={isFlowLocked ? "Fluxo bloqueado para edição" : hasUnsavedChanges ? "Existem alterações não salvas" : "Salvar fluxo"}
          >
            <Save className={`mr-1 h-4 w-4 ${hasUnsavedChanges ? "text-white animate-pulse" : ""}`} />
            {hasUnsavedChanges ? "Salvar*" : "Salvar"}
          </Button>
          {hasUnsavedChanges && onDiscard && (
            <Button 
              onClick={onDiscard} 
              size="sm"
              variant="destructive"
              title="Descartar todas as alterações e reinicializar o canvas"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Descartar
            </Button>
          )}
        </div>
      </div>
      
      {/* Segunda linha - Seleção de nós e controles de histórico */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-64">
              <Select onValueChange={onNodeTypeChange} disabled={!currentFlowId || isFlowLocked}>
                <SelectTrigger id="node-type">
                  <SelectValue placeholder={isFlowLocked ? "Fluxo bloqueado" : "Selecione um nó"} />
                </SelectTrigger>
                <SelectContent className="!text-xs">
                  <SelectItem value="startNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4 text-green-600" />
                      <span>Start</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="switchNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <GitBranch className="h-4 w-4 text-blue-600" />
                      <span>Switch</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="actionNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span>Action</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="documentNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>Document</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="integrationNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <Link className="h-4 w-4 text-orange-600" />
                      <span>Integration</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="endNode" className="!text-xs">
                    <div className="flex items-center space-x-2">
                      <Square className="h-4 w-4 text-red-600" />
                      <span>Finish</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={onAddNode} 
              size="sm" 
              disabled={!selectedNodeType || !currentFlowId || isFlowLocked}
              title={isFlowLocked ? "Fluxo bloqueado para edição" : ""}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
            <Button
              variant={showInspector ? "default" : "outline"}
              size="sm"
              onClick={onToggleInspector}
              disabled={!currentFlowId || isFlowLocked}
              title={isFlowLocked ? "Fluxo bloqueado para edição" : ""}
            >
              <Settings className="h-4 w-4 mr-2" />
              Propriedades dos nós
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={showMiniMap ? "default" : "outline"}
            size="sm"
            onClick={onToggleMiniMap}
            disabled={!currentFlowId}
            title="Mostrar/ocultar mini mapa"
          >
            <Map className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onAutoAlign} 
            variant="outline" 
            size="sm"
            disabled={!currentFlowId || nodeCount === 0 || isFlowLocked}
            title={isFlowLocked ? "Fluxo bloqueado para edição" : "Organizar nós automaticamente"}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onUndo} 
            variant="outline" 
            size="sm"
            disabled={historyIndex <= 0 || isFlowLocked}
            title={isFlowLocked ? "Fluxo bloqueado para edição" : "Desfazer última ação"}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onRedo} 
            variant="outline" 
            size="sm"
            disabled={historyIndex >= historyLength - 1 || isFlowLocked}
            title={isFlowLocked ? "Fluxo bloqueado para edição" : "Refazer última ação"}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button 
            onClick={onReset} 
            variant="outline" 
            size="sm" 
            disabled={!currentFlowId || isFlowLocked}
            title={isFlowLocked ? "Fluxo bloqueado para edição" : "Limpar todos os nós"}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          

        </div>
      </div>

      {/* Modal de confirmação para alterações não salvas */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Alterações não salvas</h3>
            <p className="text-gray-600 mb-6">
              Atenção, ao sair do editor você perderá todo conteúdo editado que ainda não foi salvo. 
              Deseja salvar o fluxo antes de sair?
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={handleCancelChange}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleConfirmChange(false)}
              >
                Descartar
              </Button>
              <Button
                onClick={() => handleConfirmChange(true)}
              >
                Salvar e trocar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};