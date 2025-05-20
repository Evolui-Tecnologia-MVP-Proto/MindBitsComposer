import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Login form schema
const loginFormSchema = z.object({
  email: z.string().email({
    message: "Por favor, informe um e-mail válido.",
  }),
  password: z.string().min(1, {
    message: "A senha é obrigatória.",
  }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// Registration form schema
const registerFormSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, informe um e-mail válido.",
  }),
  password: z.string().min(6, {
    message: "A senha deve ter pelo menos 6 caracteres.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

// Password change form schema
const passwordChangeFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "A senha atual é obrigatória.",
  }),
  newPassword: z.string().min(6, {
    message: "A nova senha deve ter pelo menos 6 caracteres.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeFormSchema>;

export default function AuthPage() {
  const { user, isLoading, isFirstLogin, loginMutation, registerMutation, changePasswordMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Password change form
  const passwordChangeForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle login submit
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  // Handle registration submit
  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
      role: "USER",
      status: "ACTIVE",
      mustChangePassword: false,
    });
  };

  // Handle password change submit
  const onPasswordChangeSubmit = (data: PasswordChangeFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  // If the user is logged in and doesn't need to change password, redirect to home page
  if (user && !isFirstLogin && !isLoading) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Formulário de login */}
      <div className="w-1/2 flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-4">
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              {isFirstLogin ? (
                <div className="fade-in">
                  <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
                    Alterar Senha
                  </h2>
                  <p className="text-center text-gray-600 mb-6">
                    Você precisa alterar sua senha no primeiro acesso.
                  </p>

                  <Form {...passwordChangeForm}>
                    <form onSubmit={passwordChangeForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
                      <FormField
                        control={passwordChangeForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordChangeForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordChangeForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                      </Button>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="fade-in">
                  <h2 className="text-xl font-semibold text-left text-gray-800 mb-2">
                    Entrar
                  </h2>
                  <p className="text-left text-gray-600 mb-6">
                    Entre com suas credenciais para acessar a plataforma
                  </p>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Entrando..." : "Entrar"}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Lado direito - Hero/Imagem */}
      <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: "#0e4f82" }}>
        <div className="px-12" style={{ color: "#acc3e3" }}>
          <h2 className="text-3xl font-bold mb-4">
            EVO-MindBits Composer
          </h2>
          <p className="text-xl mb-6">
            Compositor integrado de documentação técnica e empresarial assistido por IA
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <div className="flex items-center justify-center w-6 h-6 bg-white bg-opacity-20 rounded-full font-bold text-sm mr-2" style={{ color: "#acc3e3" }}>
                1
              </div>
              Integração com sistemas externos
            </li>
            <li className="flex items-center">
              <div className="flex items-center justify-center w-6 h-6 bg-white bg-opacity-20 rounded-full font-bold text-sm mr-2" style={{ color: "#acc3e3" }}>
                2
              </div>
              Gerenciamento de mapeamentos
            </li>
            <li className="flex items-center">
              <div className="flex items-center justify-center w-6 h-6 bg-white bg-opacity-20 rounded-full font-bold text-sm mr-2" style={{ color: "#acc3e3" }}>
                3
              </div>
              Ambiente de edição dinâmico
            </li>
            <li className="flex items-center">
              <div className="flex items-center justify-center w-6 h-6 bg-white bg-opacity-20 rounded-full font-bold text-sm mr-2" style={{ color: "#acc3e3" }}>
                4
              </div>
              Validação de documentos
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}