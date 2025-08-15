import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const [accessJson, setAccessJson] = useState("");
  const [jsonError, setJsonError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes or userRole changes
  useEffect(() => {
    if (mode === "edit" && userRole) {
      const accessData = userRole.access || {};
      setFormData({
        name: userRole.name || "",
        description: userRole.description || "",
        active: userRole.active ?? true,
        access: accessData
      });
      setAccessJson(JSON.stringify(accessData, null, 2));
    } else {
      setFormData({
        name: "",
        description: "",
        active: true,
        access: {}
      });
      setAccessJson("{}");
    }
    setJsonError("");
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

  const validateAndParseJson = () => {
    try {
      const parsed = JSON.parse(accessJson);
      setJsonError("");
      return parsed;
    } catch (error) {
      setJsonError("JSON inválido");
      return null;
    }
  };

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

    const parsedAccess = validateAndParseJson();
    if (parsedAccess === null) {
      toast({
        title: "Erro",
        description: "O JSON de acessos é inválido",
        variant: "destructive",
      });
      return;
    }

    const finalData = {
      ...formData,
      access: parsedAccess
    };

    if (mode === "create") {
      createMutation.mutate(finalData);
    } else {
      updateMutation.mutate(finalData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova User Role" : "Editar User Role"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="acessos">Acessos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="detalhes" className="space-y-4 mt-4">
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
            </TabsContent>

            <TabsContent value="acessos" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="access-json">Configurações de Acesso (JSON)</Label>
                <Textarea
                  id="access-json"
                  value={accessJson}
                  onChange={(e) => {
                    setAccessJson(e.target.value);
                    setJsonError("");
                  }}
                  placeholder='{"module1": {"read": true, "write": false}, "module2": {"read": true, "write": true}}'
                  rows={12}
                  className={`font-mono text-sm ${jsonError ? "border-red-500" : ""}`}
                />
                {jsonError && (
                  <p className="text-sm text-red-500 mt-1">{jsonError}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Configure as permissões de acesso em formato JSON. Exemplo: &#123;"admin": true, "reports": &#123;"read": true, "write": false&#125;&#125;
                </p>
              </div>
            </TabsContent>
          </Tabs>

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