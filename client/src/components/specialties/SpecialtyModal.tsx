import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Specialty, InsertSpecialty } from "@shared/schema";

interface SpecialtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialty?: Specialty | null;
}

export function SpecialtyModal({ isOpen, onClose, specialty }: SpecialtyModalProps) {
  const { toast } = useToast();
  const isEditing = !!specialty;

  const [formData, setFormData] = useState<InsertSpecialty>({
    code: "",
    name: "",
    description: "",
  });

  // Preencher formulário quando editando
  useEffect(() => {
    if (specialty) {
      setFormData({
        code: specialty.code,
        name: specialty.name,
        description: specialty.description || "",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
      });
    }
  }, [specialty]);

  // Mutação para criar especialidade
  const createSpecialtyMutation = useMutation({
    mutationFn: async (data: InsertSpecialty) => {
      const res = await apiRequest("POST", "/api/specialties", data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao criar especialidade");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      toast({
        title: "Especialidade criada",
        description: "A área de especialidade foi criada com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar especialidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar especialidade
  const updateSpecialtyMutation = useMutation({
    mutationFn: async (data: InsertSpecialty) => {
      const res = await apiRequest("PATCH", `/api/specialties/${specialty!.id}`, data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao atualizar especialidade");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      toast({
        title: "Especialidade atualizada",
        description: "A área de especialidade foi atualizada com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar especialidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Código e nome são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateSpecialtyMutation.mutate(formData);
    } else {
      createSpecialtyMutation.mutate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isLoading = createSpecialtyMutation.isPending || updateSpecialtyMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Área de Especialidade" : "Nova Área de Especialidade"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações da área de especialidade." 
              : "Preencha os dados para criar uma nova área de especialidade."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ex: TEC001"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Tecnologia da Informação"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              placeholder="Descreva a área de especialidade..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : (isEditing ? "Salvar" : "Criar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}