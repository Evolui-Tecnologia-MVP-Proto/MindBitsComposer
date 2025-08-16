import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit, 
  Lock, 
  Unlock, 
  KeyRound,
  MoreHorizontal,
  ArrowRightLeft
} from "lucide-react";
import { User, UserStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewUserModal from "./NewUserModal";
import EditUserModal from "./EditUserModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [userToTransfer, setUserToTransfer] = useState<User | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>("");
  const { toast } = useToast();
  
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Query for user roles to map roleId to role name
  const {
    data: userRoles,
    isLoading: userRolesLoading,
  } = useQuery<Array<{id: number, name: string}>>({
    queryKey: ["/api/user-roles"],
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

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.status === 204 ? {} : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
      setUserToDelete(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/users/${id}/reset-password`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Senha resetada",
        description: `A senha foi resetada com sucesso. A nova senha é: ${data.initialPassword}`,
      });
      setUserToResetPassword(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao resetar senha",
        description: error.message,
        variant: "destructive",
      });
      setUserToResetPassword(null);
    },
  });

  const transferUserMutation = useMutation({
    mutationFn: async ({ sourceUserId, targetUserId }: { sourceUserId: number; targetUserId: number }) => {
      const res = await apiRequest("POST", "/api/users/transfer", { 
        sourceUserId, 
        targetUserId 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Transferência concluída",
        description: `${data.transferredCount} registros foram transferidos com sucesso.`,
      });
      setIsTransferModalOpen(false);
      setUserToTransfer(null);
      setTransferTargetUserId("");
    },
    onError: (error) => {
      toast({
        title: "Erro na transferência",
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
    switch (status) {
      case UserStatus.ACTIVE:
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
      case UserStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200";
      case UserStatus.INACTIVE:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-200";
    }
  };

  const getRoleName = (roleId: number | null) => {
    // Special case for Super Administrator (roleId = 0)
    if (roleId === 0) {
      return "Super Administrador";
    }
    
    // Find role name from userRoles array
    const role = userRoles?.find(r => r.id === roleId);
    return role ? role.name : "Usuário";
  };

  const getTranslatedStatus = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return "Ativo";
      case UserStatus.PENDING:
        return "Pendente";
      case UserStatus.INACTIVE:
        return "Inativo";
      default:
        return status;
    }
  };

  const toggleStatus = (user: User) => {
    let newStatus;
    
    // Se estiver pendente ou inativo, ativar
    if (user.status === UserStatus.PENDING || user.status === UserStatus.INACTIVE) {
      newStatus = UserStatus.ACTIVE;
    } else {
      // Se estiver ativo, desativar
      newStatus = UserStatus.INACTIVE;
    }
    
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
    <div className="bg-white dark:bg-[#0F172A] p-4 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-[#0F172A]">
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
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
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
              ) : filteredUsers?.length === 0 ? (
                <div className="bg-white px-4 py-10 text-center">
                  <p className="text-gray-500">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white">
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
                  <tbody className="bg-white divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers?.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar>
                                <AvatarImage 
                                  src={user.avatarUrl || ''} 
                                  alt={user.name}
                                  key={user.avatarUrl} // Force re-render when avatar changes
                                />
                                <AvatarFallback className="bg-primary text-white">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status as UserStatus)}`}>
                            {getTranslatedStatus(user.status as UserStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {getRoleName(user.roleId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-[#0F172A] border-gray-200 dark:border-gray-700">
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToEdit(user);
                                  setIsEditUserModalOpen(true);
                                }}
                                className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => toggleStatus(user)}
                                className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {user.status === UserStatus.ACTIVE ? (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Bloquear
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    {user.status === UserStatus.PENDING ? "Ativar" : "Desbloquear"}
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => setUserToResetPassword(user)}
                                className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Resetar Senha
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToTransfer(user);
                                  setIsTransferModalOpen(true);
                                }}
                                className="cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Transferir
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => setUserToDelete(user)}
                                className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <EditUserModal 
        isOpen={isEditUserModalOpen} 
        onClose={() => {
          setIsEditUserModalOpen(false);
          setUserToEdit(null);
        }} 
        user={userToEdit}
      />

      {/* Diálogo de confirmação para excluir usuário */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.name}"?
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação para resetar senha */}
      <AlertDialog open={!!userToResetPassword} onOpenChange={() => setUserToResetPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja resetar a senha do usuário "{userToResetPassword?.name}"?
              Uma nova senha será gerada automaticamente e exibida para você.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToResetPassword && resetPasswordMutation.mutate(userToResetPassword.id)}
              className="bg-primary hover:bg-primary/90 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
            >
              {resetPasswordMutation.isPending ? "Resetando..." : "Resetar Senha"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de transferência de usuário */}
      <AlertDialog open={isTransferModalOpen} onOpenChange={(open) => {
        setIsTransferModalOpen(open);
        if (!open) {
          setUserToTransfer(null);
          setTransferTargetUserId("");
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir Dados do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Transferir todas as movimentações e registros do usuário "{userToTransfer?.name}" para outro usuário.
              Esta ação irá alterar todos os vínculos nas tabelas do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usuário de Origem:
                </label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  {userToTransfer?.name} ({userToTransfer?.email})
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usuário de Destino:
                </label>
                <Select value={transferTargetUserId} onValueChange={setTransferTargetUserId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o usuário de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(u => u.id !== userToTransfer?.id).map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (userToTransfer && transferTargetUserId) {
                  transferUserMutation.mutate({
                    sourceUserId: userToTransfer.id,
                    targetUserId: parseInt(transferTargetUserId)
                  });
                }
              }}
              disabled={!transferTargetUserId || transferUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {transferUserMutation.isPending ? "Transferindo..." : "Transferir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
