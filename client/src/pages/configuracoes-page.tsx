import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { ServiceConnection as ServiceConnectionType } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  Edit, 
  Plus, 
  Key, 
  GitBranchPlus,
  BrainCircuit,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema para o formulário de conexão
const connectionFormSchema = z.object({
  serviceName: z.string().min(1, "Nome do serviço é obrigatório"),
  token: z.string().min(1, "Token é obrigatório"),
  description: z.string().optional()
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

// Serviços predefinidos
const predefinedServices = [
  { name: "monday", label: "Monday.com", icon: <Key size={18} /> },
  { name: "github", label: "GitHub", icon: <GitBranchPlus size={18} /> },
  { name: "openai", label: "OpenAI", icon: <BrainCircuit size={18} /> }
];

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ServiceConnectionType | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string>("");
  
  // Estados para integração GitHub
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [githubRepos, setGithubRepos] = useState<Array<{name: string, full_name: string}>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  // Consulta para buscar todas as conexões
  const { data: connections = [], isLoading } = useQuery<ServiceConnectionType[]>({
    queryKey: ["/api/services/connections"],
    queryFn: async () => {
      const res = await fetch("/api/services/connections");
      if (!res.ok) throw new Error("Falha ao buscar conexões");
      return res.json();
    }
  });

  // Formulário para nova conexão
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      serviceName: "",
      token: "",
      description: ""
    }
  });

  // Mutations
  const createConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormValues) => {
      const res = await apiRequest("POST", "/api/services/connections", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Conexão salva",
        description: "A conexão foi salva com sucesso.",
      });
      setIsModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/services/connections"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar conexão",
        description: error.message || "Ocorreu um erro ao salvar a conexão.",
        variant: "destructive"
      });
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/services/connections/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Conexão excluída",
        description: "A conexão foi excluída com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/services/connections"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir conexão",
        description: error.message || "Ocorreu um erro ao excluir a conexão.",
        variant: "destructive"
      });
    }
  });

  // Funções de manipulação
  const openAddModal = (serviceName: string = "") => {
    form.reset({
      serviceName: serviceName,
      token: "",
      description: getServiceLabel(serviceName)
    });
    setSelectedServiceName(serviceName);
    
    // Resetar estados do GitHub quando abrir modal para nova conexão
    setConnectionStatus('idle');
    setGithubRepos([]);
    setSelectedRepo("");
    
    setIsModalOpen(true);
  };

  const openEditModal = (connection: ServiceConnectionType) => {
    form.reset({
      serviceName: connection.serviceName,
      token: connection.token,
      description: connection.description || ""
    });
    setSelectedConnection(connection);
    setSelectedServiceName(connection.serviceName);
    
    // Resetar estados do GitHub quando abrir modal de edição
    setConnectionStatus('idle');
    setGithubRepos([]);
    setSelectedRepo("");
    
    setIsModalOpen(true);
  };

  const openDeleteDialog = (connection: ServiceConnectionType) => {
    setSelectedConnection(connection);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitConnection = form.handleSubmit((data) => {
    createConnectionMutation.mutate(data);
  });

  const confirmDelete = () => {
    if (selectedConnection) {
      deleteConnectionMutation.mutate(selectedConnection.id);
    }
  };

  // Função para testar conexão GitHub e buscar repositórios
  const testGithubConnection = async () => {
    const token = form.getValues("token");
    if (!token) {
      toast({
        title: "Token obrigatório",
        description: "Por favor, insira um token GitHub válido.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');
    setGithubRepos([]);

    try {
      // Testar conexão e buscar repositórios
      const response = await fetch("https://api.github.com/user/repos", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        throw new Error("Token inválido ou sem permissão");
      }

      const repos = await response.json();
      setGithubRepos(repos);
      setConnectionStatus('success');
      
      toast({
        title: "Conexão bem-sucedida!",
        description: `${repos.length} repositórios encontrados.`,
      });
    } catch (error: any) {
      setConnectionStatus('error');
      toast({
        title: "Erro na conexão",
        description: error.message || "Não foi possível conectar ao GitHub.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Função auxiliar para obter rótulo do serviço
  const getServiceLabel = (serviceName: string): string => {
    const service = predefinedServices.find(s => s.name === serviceName);
    return service ? service.label : serviceName;
  };

  // Função para renderizar ícone do serviço
  const getServiceIcon = (serviceName: string) => {
    const service = predefinedServices.find(s => s.name === serviceName);
    return service ? service.icon : <Key size={18} />;
  };

  // Verifica se uma conexão existe para um serviço específico
  const hasConnection = (serviceName: string): boolean => {
    return connections.some((conn: ServiceConnectionType) => conn.serviceName === serviceName);
  };

  // Obtém conexão por nome do serviço
  const getConnection = (serviceName: string): ServiceConnectionType | undefined => {
    return connections.find((conn: ServiceConnectionType) => conn.serviceName === serviceName);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configurações do Sistema</h1>
      
      <Tabs defaultValue="integracoes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>
        
        <TabsContent value="integracoes" className="slide-in">
          <Card>
            <CardHeader>
              <CardTitle>Integrações de Serviços</CardTitle>
              <CardDescription>
                Gerencie as conexões com serviços externos como Monday.com, GitHub e OpenAI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {predefinedServices.map((service) => (
                  <Card key={service.name} className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {service.icon}
                          <CardTitle className="text-lg">{service.label}</CardTitle>
                        </div>
                        {hasConnection(service.name) && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Conectado
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {hasConnection(service.name) ? (
                        <div>
                          <p className="text-sm text-gray-500 mb-3">
                            {getConnection(service.name)?.description || `Conexão com ${service.label} configurada`}
                          </p>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openEditModal(getConnection(service.name)!)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700" 
                              onClick={() => openDeleteDialog(getConnection(service.name)!)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-500 mb-3">
                            Adicione suas credenciais para integrar com {service.label}.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openAddModal(service.name)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Configurar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Card para adicionar outras conexões personalizadas */}
                <Card className="relative overflow-hidden border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Outra Integração</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-3">
                      Adicione uma conexão para outro serviço personalizado.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openAddModal()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Lista todas as conexões em uma tabela */}
              {connections.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Todas as Conexões</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Serviço</th>
                          <th className="px-4 py-2 text-left">Descrição</th>
                          <th className="px-4 py-2 text-left">Token</th>
                          <th className="px-4 py-2 text-left">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {connections.map((connection: ServiceConnectionType) => (
                          <tr key={connection.id} className="border-b">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {getServiceIcon(connection.serviceName)}
                                <span>{getServiceLabel(connection.serviceName)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{connection.description}</td>
                            <td className="px-4 py-3">
                              <span className="bg-gray-100 p-1 rounded font-mono text-xs">
                                {connection.token.substring(0, 4)}
                                {'•'.repeat(8)}
                                {connection.token.substring(connection.token.length - 4)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openEditModal(connection)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700" 
                                  onClick={() => openDeleteDialog(connection)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema" className="slide-in">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configurações gerais e informações sobre o sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Sobre o Sistema</h3>
                  <p className="text-sm text-gray-500">
                    <strong>Nome:</strong> EVO-MindBits Composer<br />
                    <strong>Versão:</strong> 1.0.0<br />
                    <strong>Desenvolvido por:</strong> EVO-MindBits Team
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Ambiente</h3>
                  <p className="text-sm text-gray-500">
                    <strong>Ambiente:</strong> Produção<br />
                    <strong>Data da build:</strong> {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Manutenção do Sistema</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="w-full">
                      Limpar Cache
                    </Button>
                    <Button variant="outline" className="w-full">
                      Verificar Atualizações
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para adicionar/editar conexão */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedConnection ? "Editar Conexão" : "Nova Conexão"}
            </DialogTitle>
            <DialogDescription>
              {selectedConnection 
                ? `Atualize as configurações para ${getServiceLabel(selectedServiceName)}.` 
                : "Adicione uma nova conexão de serviço."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={handleSubmitConnection} className="space-y-4">
              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Serviço</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!selectedServiceName} />
                    </FormControl>
                    <FormDescription>
                      Um identificador único para o serviço (ex: monday, github, openai)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token de API</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input {...field} type="password" autoComplete="off" className="flex-1" />
                        {/* Debug: sempre mostrar para teste */}
                        {true && (
                          <div className="text-xs text-gray-500 mb-2">
                            Debug: selectedServiceName="{selectedServiceName}", formValue="{form.getValues("serviceName")}"
                          </div>
                        )}
                        {(selectedServiceName === "github" || form.getValues("serviceName") === "github") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={testGithubConnection}
                            disabled={isConnecting || !field.value}
                            className={`px-3 ${
                              connectionStatus === 'success' 
                                ? 'border-green-500 text-green-700 hover:bg-green-50' 
                                : connectionStatus === 'error'
                                ? 'border-red-500 text-red-700 hover:bg-red-50'
                                : 'border-amber-500 text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            {isConnecting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : connectionStatus === 'success' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : connectionStatus === 'error' ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              "Conectar"
                            )}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Token de acesso à API do serviço
                      {selectedServiceName === "github" && " - Clique em 'Conectar' para testar e buscar repositórios"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Combo de repositórios GitHub */}
              {(selectedServiceName === "github" || form.getValues("serviceName") === "github") && connectionStatus === 'success' && githubRepos.length > 0 && (
                <div className="space-y-2">
                  <Label>Repositório Padrão</Label>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um repositório..." />
                    </SelectTrigger>
                    <SelectContent>
                      {githubRepos.map((repo) => (
                        <SelectItem key={repo.full_name} value={repo.full_name}>
                          {repo.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {githubRepos.length} repositório(s) encontrado(s)
                  </p>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Uma descrição opcional para esta conexão
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createConnectionMutation.isPending}
                >
                  {createConnectionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conexão com {selectedConnection?.serviceName}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteConnectionMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteConnectionMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}