import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import { useQueryClient } from "@tanstack/react-query";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(user?.avatarUrl || "");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getUserRole = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Super Administrador";
      case "USER":
        return "Usuário";
      case "MANAGER":
        return "Gerente";
      default:
        return role;
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Erro",
        description: "A nova senha e confirmação não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso.",
        });
        setPasswords({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao alterar senha.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setPasswords({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    onClose();
  };

  const handleAvatarUpload = (newAvatarUrl: string) => {
    console.log("Avatar upload completed, new URL:", newAvatarUrl);
    setCurrentAvatarUrl(newAvatarUrl);
    
    // Invalidar cache para atualizar dados do usuário em todos os locais
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    
    // Refetch explicitamente os dados do usuário
    queryClient.refetchQueries({ queryKey: ['/api/user'] });
    
    toast({
      title: "Sucesso",
      description: "Avatar atualizado com sucesso!",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-[#1F2937] border-gray-200 dark:border-gray-600 p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Perfil do Usuário
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6">
          {/* Seção do perfil */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={currentAvatarUrl || user?.avatarUrl || ""} 
                  alt={user?.name || ""} 
                  key={currentAvatarUrl || user?.avatarUrl} // Force re-render when avatar changes
                />
                <AvatarFallback className="bg-primary text-white text-xl">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <ObjectUploader
                maxFileSize={5242880}
                onComplete={handleAvatarUpload}
                userId={user?.id}
                buttonClassName="absolute -bottom-1 -right-1 h-8 w-8 p-0 rounded-full bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700"
              >
                <Camera className="h-4 w-4 text-white" />
              </ObjectUploader>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {user?.name || "Peter Igor Volf"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {user?.email || "pivolf@evolutecnologia.com.br"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {getUserRole(user?.role || "ADMIN")}
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Alterar Senha
            </h4>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label 
                  htmlFor="currentPassword" 
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Senha Atual
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="mt-1 bg-white dark:bg-[#374151] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <Label 
                  htmlFor="newPassword" 
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Nova Senha
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="mt-1 bg-white dark:bg-[#374151] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <Label 
                  htmlFor="confirmPassword" 
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="mt-1 bg-white dark:bg-[#374151] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}