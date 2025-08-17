import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserRoleModal } from "./UserRoleModal";
import type { UserRoleRecord } from "@shared/schema";

export function UserRolesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRoleRecord | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userRoles = [], isLoading } = useQuery<UserRoleRecord[]>({
    queryKey: ["/api/user-roles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/user-roles/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "User Role excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir User Role",
        variant: "destructive",
      });
      console.error("Erro ao excluir user role:", error);
    },
  });

  const filteredRoles = userRoles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedRole(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const handleEdit = (role: UserRoleRecord) => {
    setSelectedRole(role);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRole(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div>
      {/* Header com busca e botão criar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-[#0F172A]">
        <div className="w-full sm:w-1/3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="pl-10 w-full"
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleCreate}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Role
        </Button>
      </div>

      <div className="mt-2">
        <div className="overflow-hidden">
          <div className="border rounded-lg bg-white border-gray-200 dark:border-gray-700" style={{ backgroundColor: '#0F172A' }}>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="bg-white px-4 py-5 text-center">
                  <div className="animate-pulse flex space-x-4 justify-center">
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                  </div>
                </div>
              ) : filteredRoles?.length === 0 ? (
                <div className="bg-white px-4 py-10 text-center">
                  <p className="text-gray-500">{searchTerm ? "Nenhuma role encontrada" : "Nenhuma role cadastrada"}</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '400px' }}>
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '350px' }}>
                        Descrição
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criada em
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRoles?.map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ width: '400px', maxWidth: '400px' }}>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={role.name}>{role.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ width: '350px', maxWidth: '350px' }}>
                          <div className="text-sm text-gray-900 dark:text-gray-100 truncate" title={role.description}>{role.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={role.active ? "default" : "secondary"}>
                            {role.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {role.createdAt ? new Date(role.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(role)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-900">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a role "{role.name}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(role.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de criar/editar */}
      <UserRoleModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        userRole={selectedRole}
        mode={modalMode}
      />
    </div>
  );
}