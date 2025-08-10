import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserRole, UserStatus, User } from "@shared/schema";
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

// Schema do formulário
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres."
  }),
  email: z.string().email({
    message: "E-mail inválido."
  }),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  flowProcessAcs: z.array(z.string()).default([])
});

type FormValues = z.infer<typeof formSchema>;

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
};

export default function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      flowProcessAcs: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "flowProcessAcs",
  });

  // Atualizar valores do formulário quando o usuário mudar
  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        flowProcessAcs: Array.isArray(user.flowProcessAcs) ? user.flowProcessAcs : [],
      });
    }
  }, [user, isOpen, form]);

  const handleAddTag = () => {
    if (newTag.trim() && !form.getValues("flowProcessAcs")?.includes(newTag.trim())) {
      append(newTag.trim() as any);
      setNewTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    remove(index);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user) throw new Error("Usuário não encontrado");
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar usuário",
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
    updateUserMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                      <SelectItem value={UserRole.EDITOR}>Editor</SelectItem>
                      <SelectItem value={UserRole.USER}>Usuário</SelectItem>
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
                      value={field.value}
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
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value={UserStatus.PENDING} />
                        </FormControl>
                        <FormLabel className="font-normal">Pendente</FormLabel>
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
                      {fields.map((field, index) => (
                        <Badge
                          key={field.id}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1"
                        >
                          <span>{form.getValues(`flowProcessAcs.${index}`)}</span>
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
                      ))}
                    </div>
                    
                    {/* Campo para adicionar nova tag */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite um acesso de fluxo"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
              >
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}