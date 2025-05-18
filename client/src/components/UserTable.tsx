import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus } from "lucide-react";
import { User, UserStatus, UserRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewUserModal from "./NewUserModal";

export default function UserTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const { toast } = useToast();
  
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: UserStatus }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status alterado",
        description: "O status do usuário foi alterado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users by search term
  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeClass = (status: UserStatus) => {
    return status === UserStatus.ACTIVE
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const getTranslatedRole = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Administrador";
      case UserRole.EDITOR:
        return "Editor";
      case UserRole.USER:
        return "Usuário";
      default:
        return role;
    }
  };

  const getTranslatedStatus = (status: UserStatus) => {
    return status === UserStatus.ACTIVE ? "Ativo" : "Inativo";
  };

  const toggleStatus = (user: User) => {
    const newStatus = user.status === UserStatus.ACTIVE 
      ? UserStatus.INACTIVE 
      : UserStatus.ACTIVE;
    
    toggleUserStatusMutation.mutate({ 
      id: user.id, 
      status: newStatus 
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Erro ao carregar usuários: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div className="w-full sm:w-1/3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="pl-10 w-full"
              placeholder="Pesquisar usuários"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Button 
          onClick={() => setIsNewUserModalOpen(true)}
          className="w-full sm:w-auto"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="mt-2 flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              {isLoading ? (
                <div className="bg-white px-4 py-5 text-center">
                  <div className="animate-pulse flex space-x-4 justify-center">
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                    <div className="h-4 w-4 bg-primary rounded-full"></div>
                  </div>
                </div>
              ) : filteredUsers?.length === 0 ? (
                <div className="bg-white px-4 py-10 text-center">
                  <p className="text-gray-500">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        E-mail
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfil
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers?.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar>
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback className="bg-primary text-white">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                            {getTranslatedStatus(user.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getTranslatedRole(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            variant="link" 
                            className="text-primary-600 hover:text-primary-900"
                            onClick={() => toggleStatus(user)}
                          >
                            {user.status === UserStatus.ACTIVE ? "Desativar" : "Ativar"}
                          </Button>
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

      <NewUserModal 
        isOpen={isNewUserModalOpen} 
        onClose={() => setIsNewUserModalOpen(false)} 
      />
    </div>
  );
}
