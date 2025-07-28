import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Specialty, InsertSpecialty, User } from "@shared/schema";

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
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userToRemove, setUserToRemove] = useState<{id: number, name: string} | null>(null);

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

  // Query para buscar todos os usuários do sistema
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      return res.json();
    },
    enabled: isOpen && isEditing // Só busca quando modal está aberto e editando
  });

  // Query para buscar usuários associados à especialidade
  const { data: specialtyUsers = [], refetch: refetchSpecialtyUsers } = useQuery<Array<{user: User}>>({
    queryKey: ["/api/specialties", specialty?.id, "users"],
    queryFn: async () => {
      if (!specialty?.id) return [];
      const res = await apiRequest("GET", `/api/specialties/${specialty.id}/users`);
      if (!res.ok) throw new Error("Erro ao carregar especialistas");
      return res.json();
    },
    enabled: isOpen && isEditing && !!specialty?.id
  });

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
      // Não fecha o modal para permitir edição de usuários
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar especialidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para adicionar usuário à especialidade
  const addUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/specialties/${specialty!.id}/users`, { userId });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao adicionar especialista");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchSpecialtyUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/specialties", "specialists-counts"] });
      setSelectedUserId("");
      toast({
        title: "Especialista adicionado",
        description: "O usuário foi adicionado à especialidade com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar especialista",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para remover usuário da especialidade
  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/specialties/${specialty!.id}/users/${userId}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao remover especialista");
      }
    },
    onSuccess: () => {
      refetchSpecialtyUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/specialties", "specialists-counts"] });
      setUserToRemove(null);
      toast({
        title: "Especialista removido",
        description: "O usuário foi removido da especialidade com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover especialista",
        description: error.message,
        variant: "destructive",
      });
      setUserToRemove(null);
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

  const handleAddUser = () => {
    if (!selectedUserId) return;
    addUserMutation.mutate(parseInt(selectedUserId));
  };

  const handleRemoveUser = (user: User) => {
    setUserToRemove({ id: user.id, name: user.name });
  };

  const confirmRemoveUser = () => {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove.id);
    }
  };

  // Filtrar usuários que já estão associados
  const availableUsers = allUsers.filter(user => 
    !specialtyUsers.some(su => su.user.id === user.id)
  );

  const isLoading = createSpecialtyMutation.isPending || updateSpecialtyMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] dark:bg-[#111827]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Área de Especialidade" : "Nova Área de Especialidade"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Gerencie os dados e especialistas da área." 
                : "Preencha os dados para criar uma nova área de especialidade."
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 dark:bg-[#0F172A]">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="especialistas" disabled={!isEditing}>
                Especialistas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="space-y-4">
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
                      className="dark:bg-[#0F172A] dark:border-[#374151]"
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
                      className="dark:bg-[#0F172A] dark:border-[#374151]"
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
                    className="dark:bg-[#0F172A] dark:border-[#374151]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Salvando..." : (isEditing ? "Salvar" : "Criar")}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="especialistas" className="space-y-4">
              {isEditing && (
                <>
                  <Card className="dark:bg-[#0F172A] dark:border-[#374151]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Especialista
                      </CardTitle>
                      <CardDescription>
                        Selecione um usuário para associar a esta especialidade.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedUserId} 
                          onValueChange={setSelectedUserId}
                          disabled={addUserMutation.isPending || availableUsers.length === 0}
                        >
                          <SelectTrigger className="flex-1 dark:bg-[#0F172A] dark:border-[#374151]">
                            <SelectValue placeholder={
                              availableUsers.length === 0 
                                ? "Todos os usuários já estão associados" 
                                : "Selecione um usuário..."
                            } />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddUser}
                          disabled={!selectedUserId || addUserMutation.isPending}
                        >
                          {addUserMutation.isPending ? "Adicionando..." : "Adicionar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-[#0F172A] dark:border-[#374151]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Especialistas Associados ({specialtyUsers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {specialtyUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">
                            Nenhum especialista associado a esta área.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-md border dark:bg-[#111827] dark:border-[#374151]">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:bg-[#111827]">
                                <TableHead className="dark:bg-[#111827]">Email</TableHead>
                                <TableHead className="dark:bg-[#111827]">Função</TableHead>
                                <TableHead className="dark:bg-[#111827]">Status</TableHead>
                                <TableHead className="w-[100px] dark:bg-[#111827]">Ação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {specialtyUsers.map(({ user }) => (
                                <TableRow key={user.id} className="dark:bg-[#0F172A]">
                                  <TableCell className="dark:bg-[#0F172A]">{user.email}</TableCell>
                                  <TableCell className="dark:bg-[#0F172A]">
                                    <Badge variant="outline" className="font-mono">
                                      {user.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="dark:bg-[#0F172A]">
                                    <Badge 
                                      variant={user.status === "ACTIVE" ? "default" : "secondary"}
                                      className={
                                        user.status === "ACTIVE" 
                                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" 
                                          : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400"
                                      }
                                    >
                                      {user.status === "ACTIVE" ? "Ativo" : "Inativo"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="dark:bg-[#0F172A]">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveUser(user)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      title="Remover especialista"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                      Fechar
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para remover usuário */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent className="dark:bg-[#111827] dark:border-[#374151]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Especialista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{userToRemove?.name}</strong> desta área de especialidade?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRemove(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}