import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';

interface FlowMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowData: {
    code: string;
    name: string;
    description?: string;
    flowTypeId?: string;
  };
  flowTypes: any[];
  onSave: (data: any) => void;
  isEditing?: boolean;
}

export function FlowMetadataModal({
  isOpen,
  onClose,
  flowData,
  flowTypes,
  onSave,
  isEditing = false
}: FlowMetadataModalProps) {
  const [editFlowName, setEditFlowName] = useState('');
  const [editFlowDescription, setEditFlowDescription] = useState('');

  useEffect(() => {
    if (isOpen && flowData) {
      setEditFlowName(flowData.name || '');
      setEditFlowDescription(flowData.description || '');
    }
  }, [isOpen, flowData]);

  const handleSave = () => {
    onSave({
      name: editFlowName,
      description: editFlowDescription,
    });
    onClose();
  };

  if (!flowData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Editar Metadados do Fluxo - [{flowData.code || 'N/A'}]
          </DialogTitle>
          <DialogDescription>
            Altere o nome e a descrição do fluxo conforme necessário.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Fluxo</Label>
            <Input
              id="edit-name"
              value={editFlowName}
              onChange={(e) => setEditFlowName(e.target.value)}
              placeholder="Digite o nome do fluxo"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição (opcional)</Label>
            <Textarea
              id="edit-description"
              value={editFlowDescription}
              onChange={(e) => setEditFlowDescription(e.target.value)}
              placeholder="Descreva o propósito deste fluxo"
              rows={4}
              className="w-full resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}