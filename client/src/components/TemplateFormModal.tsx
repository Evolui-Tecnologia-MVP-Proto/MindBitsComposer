import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Template, TemplateType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type TemplateFormValues = {
  code: string;
  description: string;
  type: string;
  structure: object;
};

const emptyTemplate: TemplateFormValues = {
  code: "",
  description: "",
  type: "struct",
  structure: {},
};

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateFormValues) => Promise<void>;
  template?: Template;
  mode: "create" | "edit";
  selectedType?: TemplateType;
}

export default function TemplateFormModal({
  isOpen,
  onClose,
  onSave,
  template,
  mode,
  selectedType
}: TemplateFormModalProps) {
  const [formData, setFormData] = useState<TemplateFormValues>(
    template
      ? {
          code: template.code,
          description: template.description,
          type: template.type,
          structure: template.structure,
        }
      : { ...emptyTemplate, type: selectedType || "struct" }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const structure = JSON.parse(e.target.value);
      setFormData((prev) => ({ ...prev, structure }));
      setStructureError("");
    } catch (error) {
      setStructureError("Formato JSON inválido");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (structureError) {
      toast({
        title: "Erro de validação",
        description: "O formato JSON da estrutura é inválido",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast({
        title: "Erro ao salvar template",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Template" : "Editar Template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Código
              </Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="col-span-3"
                required
                maxLength={15}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descrição
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
                disabled={mode === "edit"}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="struct">Struct Template</SelectItem>
                  <SelectItem value="output">Out Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="structure" className="text-right pt-2">
                Estrutura (JSON)
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="structure"
                  name="structure"
                  defaultValue={JSON.stringify(formData.structure, null, 2)}
                  onChange={handleStructureChange}
                  className="font-mono text-sm h-32"
                  required
                />
                {structureError && (
                  <p className="text-sm text-red-500 mt-1">{structureError}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !!structureError}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}