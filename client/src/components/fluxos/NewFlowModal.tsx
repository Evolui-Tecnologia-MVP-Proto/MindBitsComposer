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
      <DialogContent className="sm:max-w-[550px] dark:bg-[#0F1729] dark:border-[#374151]">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-200">Criar Novo Fluxo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="flowType" className="dark:text-gray-200">Tipo de Fluxo</Label>
            <Select value={newFlowTypeId} onValueChange={onFlowTypeChange}>
              <SelectTrigger className="text-left h-auto min-h-[40px] py-2 dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Selecione o tipo de fluxo">
                  {newFlowTypeId && flowTypes?.find((type: any) => type.id === newFlowTypeId) && (
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{flowTypes.find((type: any) => type.id === newFlowTypeId)?.name}</span>
                      <span className="text-sm text-gray-500 whitespace-normal break-words">{flowTypes.find((type: any) => type.id === newFlowTypeId)?.description}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="!text-xs w-[500px] dark:bg-[#0F172A] dark:border-[#374151]">
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
            <Label htmlFor="code" className="dark:text-gray-200">Código do Fluxo</Label>
            <Input
              id="code"
              value={newFlowCode}
              onChange={onCodeChange}
              placeholder="XXX-99"
              className="w-full dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200"
              maxLength={6}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Formato: 3 letras maiúsculas + hífen + 2 números (ex: ABC-12)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="dark:text-gray-200">Nome do Fluxo</Label>
            <Input
              id="name"
              value={newFlowName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Digite o nome do fluxo"
              className="w-full dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="dark:text-gray-200">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={newFlowDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Descreva o propósito deste fluxo"
              rows={4}
              className="w-full resize-none dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200"
            />
          </div>
        </div>
        <DialogFooter className="dark:bg-[#0F172A]">
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel}
            className="dark:border-[#6B7280] dark:text-gray-300 dark:hover:bg-[#1F2937]"
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={onCreateFlow}
            className="dark:bg-[#1E40AF] dark:hover:bg-[#1D4ED8] dark:text-white"
          >
            Criar Fluxo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}