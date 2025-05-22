import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash, Power, PowerOff, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Tipos de plugin
const PluginType = {
  DATA_SOURCE: "data_source",
  AI_AGENT: "ai_agent",
  CHART: "chart",
  FORMATTER: "formatter",
  INTEGRATION: "integration",
  UTILITY: "utility"
} as const;

const PluginStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEVELOPMENT: "development"
} as const;

type Plugin = {
  id: string;
  name: string;
  description: string;
  type: keyof typeof PluginType;
  status: keyof typeof PluginStatus;
  version: string;
  author: string | null;
  icon: string | null;
  configuration: Record<string, any>;
  endpoints: Record<string, string>;
  permissions: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
};

// Schema para validação
const pluginFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  type: z.enum([
    PluginType.DATA_SOURCE,
    PluginType.AI_AGENT,
    PluginType.CHART,
    PluginType.FORMATTER,
    PluginType.INTEGRATION,
    PluginType.UTILITY
  ]),
  version: z.string().min(1, "Versão é obrigatória"),
  author: z.string().optional(),
  icon: z.string().optional(),
});

type PluginFormValues = z.infer<typeof pluginFormSchema>;

// Função para obter o nome amigável do tipo
function getPluginTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    [PluginType.DATA_SOURCE]: "Fonte de Dados",
    [PluginType.AI_AGENT]: "Agente de IA",
    [PluginType.CHART]: "Gráficos",
    [PluginType.FORMATTER]: "Formatador",
    [PluginType.INTEGRATION]: "Integração",
    [PluginType.UTILITY]: "Utilitário",
  };
  return labels[type] || type;
}

// Função para obter o nome amigável do status
function getPluginStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [PluginStatus.ACTIVE]: "Ativo",
    [PluginStatus.INACTIVE]: "Inativo",
    [PluginStatus.DEVELOPMENT]: "Desenvolvimento",
  };
  return labels[status] || status;
}

// Função para obter a cor do badge do status
function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case PluginStatus.ACTIVE:
      return "default";
    case PluginStatus.INACTIVE:
      return "secondary";
    case PluginStatus.DEVELOPMENT:
      return "outline";
    default:
      return "secondary";
  }
}

export default function PluginsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  // Form para plugin
  const form = useForm<PluginFormValues>({
    resolver: zodResolver(pluginFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: PluginType.UTILITY,
      version: "1.0.0",
      author: "",
      icon: "Puzzle",
    },
  });

  // Query para buscar plugins
  const { data: plugins = [], isLoading, refetch } = useQuery<Plugin[]>({
    queryKey: ["/api/plugins"],
  });

  // Mutation para criar/editar plugin
  const createPluginMutation = useMutation({
    mutationFn: async (data: PluginFormValues) => {
      if (selectedPlugin) {
        const response = await apiRequest("PUT", `/api/plugins/${selectedPlugin.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/plugins", data);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: selectedPlugin ? "Plugin atualizado" : "Plugin criado",
        description: selectedPlugin ? "Plugin foi atualizado com sucesso." : "Novo plugin foi criado com sucesso.",
      });
      setIsModalOpen(false);
      setSelectedPlugin(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para alterar status do plugin
  const toggleStatusMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await apiRequest("POST", `/api/plugins/${pluginId}/toggle`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status alterado",
        description: "Status do plugin foi alterado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir plugin
  const deletePluginMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      await apiRequest("DELETE", `/api/plugins/${pluginId}`);
    },
    onSuccess: () => {
      toast({
        title: "Plugin excluído",
        description: "Plugin foi excluído com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedPlugin(null);
      queryClient.invalidateQueries({ queryKey: ["/api/plugins"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrar plugins
  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || plugin.type === filterType;
    const matchesStatus = filterStatus === "all" || plugin.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const openCreateModal = () => {
    setSelectedPlugin(null);
    form.reset({
      name: "",
      description: "",
      type: PluginType.UTILITY,
      version: "1.0.0",
      author: "",
      icon: "Puzzle",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    form.reset({
      name: plugin.name,
      description: plugin.description,
      type: plugin.type as any,
      version: plugin.version,
      author: plugin.author || "",
      icon: plugin.icon || "Puzzle",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: PluginFormValues) => {
    createPluginMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Plugins</h1>
          <p className="text-muted-foreground">
            Configure e gerencie os plugins do sistema
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Plugin
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Plugins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plugins.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plugins Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plugins.filter(p => p.status === PluginStatus.ACTIVE).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plugins.filter(p => p.status === PluginStatus.DEVELOPMENT).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos Diferentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(plugins.map(p => p.type)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar plugins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value={PluginType.DATA_SOURCE}>Fonte de Dados</SelectItem>
                <SelectItem value={PluginType.AI_AGENT}>Agente de IA</SelectItem>
                <SelectItem value={PluginType.CHART}>Gráficos</SelectItem>
                <SelectItem value={PluginType.FORMATTER}>Formatador</SelectItem>
                <SelectItem value={PluginType.INTEGRATION}>Integração</SelectItem>
                <SelectItem value={PluginType.UTILITY}>Utilitário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value={PluginStatus.ACTIVE}>Ativo</SelectItem>
                <SelectItem value={PluginStatus.INACTIVE}>Inativo</SelectItem>
                <SelectItem value={PluginStatus.DEVELOPMENT}>Desenvolvimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de plugins */}
      <Card>
        <CardHeader>
          <CardTitle>Plugins ({filteredPlugins.length})</CardTitle>
          <CardDescription>
            Lista de todos os plugins configurados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando plugins...</div>
          ) : filteredPlugins.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum plugin encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlugins.map((plugin) => (
                  <TableRow key={plugin.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plugin.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {plugin.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPluginTypeLabel(plugin.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(plugin.status)}>
                        {getPluginStatusLabel(plugin.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{plugin.version}</TableCell>
                    <TableCell>{plugin.author || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatusMutation.mutate(plugin.id)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {plugin.status === PluginStatus.ACTIVE ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(plugin)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(plugin)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para criar/editar plugin */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPlugin ? "Editar Plugin" : "Novo Plugin"}
            </DialogTitle>
            <DialogDescription>
              {selectedPlugin 
                ? "Edite as informações do plugin" 
                : "Crie um novo plugin para o sistema"}
            </DialogDescription>
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
                      <Input placeholder="Nome do plugin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do plugin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PluginType.DATA_SOURCE}>Fonte de Dados</SelectItem>
                          <SelectItem value={PluginType.AI_AGENT}>Agente de IA</SelectItem>
                          <SelectItem value={PluginType.CHART}>Gráficos</SelectItem>
                          <SelectItem value={PluginType.FORMATTER}>Formatador</SelectItem>
                          <SelectItem value={PluginType.INTEGRATION}>Integração</SelectItem>
                          <SelectItem value={PluginType.UTILITY}>Utilitário</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Versão</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Autor</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do autor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <FormControl>
                        <Input placeholder="Puzzle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                  disabled={createPluginMutation.isPending}
                >
                  {createPluginMutation.isPending 
                    ? "Salvando..." 
                    : selectedPlugin ? "Salvar" : "Criar"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para excluir */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plugin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plugin "{selectedPlugin?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPlugin && deletePluginMutation.mutate(selectedPlugin.id)}
              disabled={deletePluginMutation.isPending}
            >
              {deletePluginMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}