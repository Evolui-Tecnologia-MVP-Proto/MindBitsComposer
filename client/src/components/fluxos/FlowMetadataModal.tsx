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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

interface FlowMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowData: {
    code: string;
    name: string;
    description?: string;
    flowTypeId?: string;
    applicationFilter?: Record<string, any>;
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
  const [editApplicationFilter, setEditApplicationFilter] = useState('');

  useEffect(() => {
    if (isOpen && flowData) {
      setEditFlowName(flowData.name || '');
      setEditFlowDescription(flowData.description || '');
      setEditApplicationFilter(JSON.stringify(flowData.applicationFilter || {}, null, 2));
    }
  }, [isOpen, flowData]);

  const handleSave = () => {
    let applicationFilter = {};
    try {
      applicationFilter = JSON.parse(editApplicationFilter || '{}');
    } catch (error) {
      alert('Erro no formato JSON da filtragem de aplicação. Verifique a sintaxe.');
      return;
    }

    onSave({
      name: editFlowName,
      description: editFlowDescription,
      applicationFilter,
    });
    onClose();
  };

  if (!flowData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] dark:bg-[#0F1729] dark:border-[#374151]">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-200">
            Editar Metadados do Fluxo - [{flowData.code || 'N/A'}]
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Altere o nome, descrição e configurações do fluxo conforme necessário.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="detalhes" className="py-4">
          <TabsList className="grid w-full grid-cols-2 dark:bg-[#0F172A]">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="aplicacao">Aplicação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="detalhes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="dark:text-gray-200">Nome do Fluxo</Label>
              <Input
                id="edit-name"
                value={editFlowName}
                onChange={(e) => setEditFlowName(e.target.value)}
                placeholder="Digite o nome do fluxo"
                className="w-full dark:bg-[#0F172A] dark:border-[#374151]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="dark:text-gray-200">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={editFlowDescription}
                onChange={(e) => setEditFlowDescription(e.target.value)}
                placeholder="Descreva o propósito deste fluxo"
                rows={4}
                className="w-full resize-none dark:bg-[#0F172A] dark:border-[#374151]"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="aplicacao" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-application-filter" className="dark:text-gray-200">Filtragem de aplicação</Label>
              <Textarea
                id="edit-application-filter"
                value={editApplicationFilter}
                onChange={(e) => setEditApplicationFilter(e.target.value)}
                placeholder='{"ambiente": "producao", "versao": "1.0"}'
                rows={8}
                className="w-full resize-none font-mono text-sm dark:bg-[#0F172A] dark:border-[#374151]"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Formato JSON para definir critérios de filtragem da aplicação
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} className="dark:bg-[#1E40AF] dark:hover:bg-[#1E3A8A]">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}