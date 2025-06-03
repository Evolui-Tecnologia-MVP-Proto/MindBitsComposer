import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FlowMetadataModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editFlowCode: string;
  editFlowName: string;
  editFlowDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function FlowMetadataModal({
  isOpen,
  onOpenChange,
  editFlowCode,
  editFlowName,
  editFlowDescription,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel
}: FlowMetadataModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Editar Metadados do Fluxo - [{editFlowCode}]
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Fluxo</Label>
            <Input
              id="edit-name"
              value={editFlowName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Digite o nome do fluxo"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição (opcional)</Label>
            <Textarea
              id="edit-description"
              value={editFlowDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
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
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}