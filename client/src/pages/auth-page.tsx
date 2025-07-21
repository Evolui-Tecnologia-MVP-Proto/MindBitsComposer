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
      <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: "#2D3748" }}>
        <div className="w-full max-w-md mx-4">
          {/* Logo removido da tela de login conforme solicitado */}
          <Card className="shadow-lg" style={{ backgroundColor: "#2D3748", border: "none" }}>
            <CardContent className="pt-6">
              {isFirstLogin ? (
                <div className="fade-in">
                  <h2 className="text-xl font-semibold text-center text-white mb-2">
                    Alterar Senha
                  </h2>
                  <p className="text-center text-gray-300 mb-6">
                    Você precisa alterar sua senha no primeiro acesso.
                  </p>

                  <Form {...passwordChangeForm}>
                    <form onSubmit={passwordChangeForm.handleSubmit(onPasswordChangeSubmit)} className="space-y-4">
                      <FormField
                        control={passwordChangeForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Senha Atual</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
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
                            <FormLabel className="text-white">Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
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
                            <FormLabel className="text-white">Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
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
                  <h2 className="text-xl font-semibold text-left text-white mb-2">
                    Entrar
                  </h2>
                  <p className="text-left text-gray-300 mb-6">
                    Entre com suas credenciais para acessar a plataforma
                  </p>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
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
                            <FormLabel className="text-white">Senha</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full text-white"
                        style={{ backgroundColor: "#3182CE" }}
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
      <div className="w-1/2 flex flex-col" style={{ backgroundColor: "#0E4F82" }}>
        {/* Imagem na parte superior */}
        <div className="mt-10 ml-10">
          <img 
            src="/login-image.png" 
            alt="Compositor de Documentação" 
            className="h-96 w-auto object-contain rounded-xl" 
          />
        </div>
        
        {/* Container para todos os elementos textuais com mesma margem esquerda */}
        <div className="mt-8 ml-10 flex flex-col">
          {/* Título com logo alinhado horizontalmente */}
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden flex justify-center items-center mr-3 bg-white border-2 border-white">
              <img 
                src="/logo-icon.jpg" 
                alt="Logo da Aplicação" 
                className="h-16 w-16 object-cover"
              />
            </div>
            <h1 className="text-4xl font-bold text-white">
              EVO-MindBits CTx
            </h1>
          </div>
          
          {/* Textos descritivos com mesma margem da imagem principal */}
          <div className="mt-6 text-white">
            <p className="text-xl mb-8">
              Sistema de triagem inteligente de mensagens de chatbots com IA para análise de eficácia e geração de auto treinamento da base de conhecimento.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm mr-2 bg-white text-blue-600">
                  1
                </div>
                Integração com Chatbots Omnichannel
              </li>
              <li className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm mr-2 bg-white text-blue-600">
                  2
                </div>
                Workflows de análise e triagem para detalhamento funcional
              </li>
              <li className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm mr-2 bg-white text-blue-600">
                  3
                </div>
                Integração com o MindBits CPx para edição avançada de base de conhecimento
              </li>
              <li className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm mr-2 bg-white text-blue-600">
                  4
                </div>
                Designação de equipe especialista com base em "Skills"
              </li>
              <li className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm mr-2 bg-white text-blue-600">
                  5
                </div>
                Integração com agentes de IA para análise de triagem automática
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}