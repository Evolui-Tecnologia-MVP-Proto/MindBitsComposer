import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserRole } from "@shared/schema";

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole | null;
  mode: "create" | "edit";
}

export function UserRoleModal({ isOpen, onClose, userRole, mode }: UserRoleModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
    access: {} as Record<string, any>
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes or userRole changes
  useEffect(() => {
    if (mode === "edit" && userRole) {
      setFormData({
        name: userRole.name || "",
        description: userRole.description || "",
        active: userRole.active ?? true,
        access: userRole.access || {}
      });
    } else {
      setFormData({
        name: "",
        description: "",
        active: true,
        access: {}
      });
    }
  }, [mode, userRole, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/user-roles", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "User Role criada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar User Role",
        variant: "destructive",
      });
      console.error("Erro ao criar user role:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(`/api/user-roles/${userRole?.id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "User Role atualizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar User Role",
        variant: "destructive",
      });
      console.error("Erro ao atualizar user role:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erro",
        description: "Descrição é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (mode === "create") {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova User Role" : "Editar User Role"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Digite o nome da role"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Digite a descrição da role"
              rows={3}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: !!checked }))}
            />
            <Label htmlFor="active">Ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}