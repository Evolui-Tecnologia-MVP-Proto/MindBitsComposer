import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';

interface NewFlowModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newFlowTypeId: string;
  newFlowCode: string;
  newFlowName: string;
  newFlowDescription: string;
  flowTypes: any[];
  onFlowTypeChange: (typeId: string) => void;
  onCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onCreateFlow: () => void;
  onCancel: () => void;
}

export function NewFlowModal({
  isOpen,
  onOpenChange,
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
  onCancel
}: NewFlowModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Fluxo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="flowType">Tipo de Fluxo</Label>
            <Select value={newFlowTypeId} onValueChange={onFlowTypeChange}>
              <SelectTrigger className="text-left h-auto min-h-[40px] py-2">
                <SelectValue placeholder="Selecione o tipo de fluxo">
                  {newFlowTypeId && flowTypes?.find((type: any) => type.id === newFlowTypeId) && (
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{flowTypes.find((type: any) => type.id === newFlowTypeId)?.name}</span>
                      <span className="text-sm text-gray-500 whitespace-normal break-words">{flowTypes.find((type: any) => type.id === newFlowTypeId)?.description}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="!text-xs w-[500px]">
                {flowTypes?.map((flowType: any) => (
                  <SelectItem key={flowType.id} value={flowType.id} className="!text-xs h-auto py-3 min-h-[60px]">
                    <div className="flex flex-col w-full space-y-1">
                      <span className="font-medium text-left whitespace-normal">{flowType.name}</span>
                      <span className="text-sm text-gray-500 text-left whitespace-normal break-words leading-tight">{flowType.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código do Fluxo</Label>
            <Input
              id="code"
              value={newFlowCode}
              onChange={onCodeChange}
              placeholder="XXX-99"
              className="w-full"
              maxLength={6}
            />
            <p className="text-sm text-gray-500">
              Formato: 3 letras maiúsculas + hífen + 2 números (ex: ABC-12)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Fluxo</Label>
            <Input
              id="name"
              value={newFlowName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Digite o nome do fluxo"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={newFlowDescription}
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
          <Button type="button" onClick={onCreateFlow}>
            Criar Fluxo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}