import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  structure: string | object;
};

const emptyTemplate: TemplateFormValues = {
  code: "",
  description: "",
  type: "struct",
  structure: "{}",
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
          structure: typeof template.structure === 'object' 
            ? JSON.stringify(template.structure, null, 2) 
            : "{}",
        }
      : { 
          ...emptyTemplate, 
          type: selectedType || "struct", 
          structure: "{}" 
        }
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
    // Armazenar o texto bruto da estrutura
    const structureValue = e.target.value.trim();
    
    try {
      // Verifica se o campo está vazio
      if (!structureValue) {
        setFormData((prev) => ({ ...prev, structure: "{}" }));
        setStructureError("");
        return;
      }
      
      // Validar se é um JSON válido
      JSON.parse(structureValue);
      
      // Armazenar o texto JSON original, não o objeto parseado
      setFormData((prev) => ({ ...prev, structure: structureValue }));
      setStructureError("");
    } catch (error) {
      // Se não for um JSON válido, manter o valor no campo mas marcar erro
      setFormData((prev) => ({ ...prev, structure: structureValue }));
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
      
      // Converter a estrutura de string para objeto JSON antes de enviar
      const processedData = {
        ...formData,
        structure: typeof formData.structure === 'string' 
          ? JSON.parse(formData.structure) 
          : formData.structure
      };
      
      console.log("Enviando template:", JSON.stringify(processedData, null, 2));
      await onSave(processedData);
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
          <DialogDescription>
            Preencha os campos para {mode === "create" ? "criar um novo" : "editar o"} template.
          </DialogDescription>
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
                  value={typeof formData.structure === 'string' 
                    ? formData.structure 
                    : JSON.stringify(formData.structure, null, 2)}
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