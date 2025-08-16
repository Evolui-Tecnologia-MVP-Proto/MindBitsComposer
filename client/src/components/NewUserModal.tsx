import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserStatus, UserRoleRecord } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


// Schema do formulário
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres."
  }),
  email: z.string().email({
    message: "E-mail inválido."
  }),
  roleId: z.number().default(0),
  status: z.nativeEnum(UserStatus),
  flowProcessAcs: z.array(z.string()).default([])
});

type FormValues = z.infer<typeof formSchema>;

type NewUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function NewUserModal({ isOpen, onClose }: NewUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      status: UserStatus.ACTIVE,
      roleId: 0,
      flowProcessAcs: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "flowProcessAcs" as const,
  });

  // Buscar user roles do sistema
  const { data: userRoles } = useQuery({
    queryKey: ["/api/user-roles"],
    enabled: isOpen,
    retry: false,
  });

  // Buscar roles do sistema para flowProcessAcs
  const { data: systemParams } = useQuery({
    queryKey: ["/api/system-params/ADMIN_ACS_ROLES"],
    enabled: isOpen,
    retry: false,
    select: (data: any) => {
      try {
        return data.paramValue ? JSON.parse(data.paramValue) : [];
      } catch {
        return [];
      }
    }
  });

  const handleAddRole = (roleId: string) => {
    if (roleId && !form.getValues("flowProcessAcs")?.includes(roleId)) {
      (append as any)(roleId);
      setSelectedRole("");
    }
  };

  const handleRemoveTag = (index: number) => {
    remove(index);
  };

  const getRoleName = (roleId: string) => {
    if (!systemParams) return roleId;
    const role = systemParams.find((r: any) => r.roleId === roleId);
    return role ? role.roleName : roleId;
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      const username = form.getValues("email").split('@')[0];
      toast({
        title: "Usuário criado",
        description: `O usuário foi criado com sucesso. A senha inicial é: ${username}123`,
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    createUserMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>

        <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <AlertCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Será gerada uma senha inicial com base no email do usuário (parte antes do @ + "123").
            O usuário deverá alterar esta senha no primeiro acesso.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Super Administrador</SelectItem>
                      {userRoles?.map((role: UserRoleRecord) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-6"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value={UserStatus.ACTIVE} />
                        </FormControl>
                        <FormLabel className="font-normal">Ativo</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value={UserStatus.INACTIVE} />
                        </FormControl>
                        <FormLabel className="font-normal">Inativo</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flowProcessAcs"
              render={() => (
                <FormItem>
                  <FormLabel>Acessos de Fluxo</FormLabel>
                  <div className="space-y-3">
                    {/* Tags existentes */}
                    <div className="flex flex-wrap gap-2">
                      {fields.map((field, index) => {
                        const roleId = form.getValues(`flowProcessAcs.${index}`);
                        return (
                          <Badge
                            key={field.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            <span>{getRoleName(roleId)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => handleRemoveTag(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                    
                    {/* Campo para selecionar nova role */}
                    <div className="flex gap-2">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um acesso de fluxo" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemParams?.map((role: any) => (
                            <SelectItem key={role.roleId} value={role.roleId}>
                              {role.roleName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRole(selectedRole)}
                        disabled={!selectedRole}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
