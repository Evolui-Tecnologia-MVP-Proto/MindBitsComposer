import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash, Power, PowerOff, Play } from "lucide-react";
import PluginModal from "@/components/plugin-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  pageName: string | null;
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
  pageName: z.string().optional(),
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
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [testingPlugin, setTestingPlugin] = useState<Plugin | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);

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
      pageName: plugin.pageName || "",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setIsDeleteDialogOpen(true);
  };

  const openTestModal = (plugin: Plugin) => {
    setTestingPlugin(plugin);
    setTestResult(null);
    
    // Se o plugin tem uma página definida, abrir em modal
    if (plugin.pageName) {
      setIsPluginModalOpen(true);
    } else {
      setIsTestModalOpen(true);
    }
  };

  const testPlugin = async (plugin: Plugin) => {
    setIsTestingInProgress(true);
    setTestResult(null);

    try {
      // Dados de teste que serão enviados para o plugin
      const testData = {
        message: "Teste de comunicação com plugin",
        timestamp: new Date().toISOString(),
        user: "Sistema de Teste",
        applicationContext: {
          currentDocument: "Documento de Exemplo",
          selectedText: "Texto selecionado para teste",
          editorState: "ready"
        }
      };

      // Simular chamada para o endpoint do plugin
      const response = await fetch(`/api/plugins/${plugin.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult({
          success: true,
          data: result,
          message: "Plugin testado com sucesso!"
        });
        toast({
          title: "Teste bem-sucedido",
          description: `Plugin "${plugin.name}" funcionou corretamente.`,
        });
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
        message: "Falha no teste do plugin"
      });
      toast({
        title: "Erro no teste",
        description: `Falha ao testar o plugin: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingInProgress(false);
    }
  };

  const handlePluginDataExchange = (data: any) => {
    console.log("Dados recebidos do plugin:", data);
    
    // Processar dados recebidos do plugin
    if (data.action === 'export') {
      toast({
        title: "Dados exportados",
        description: `Plugin "${testingPlugin?.name}" exportou dados com sucesso.`,
      });
    } else if (data.action === 'download') {
      toast({
        title: "Download realizado",
        description: `Arquivo "${data.filename}" baixado com sucesso.`,
      });
    }
    
    // Aqui você pode processar os dados e enviar para outras partes da aplicação
    // Por exemplo, salvar no banco de dados, integrar com outros sistemas, etc.
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



      {/* Tabela de plugins */}
      <Card>
        <CardHeader>
          <CardTitle>Plugins ({plugins.length})</CardTitle>
          <CardDescription>
            Lista de todos os plugins configurados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando plugins...</div>
          ) : plugins.length === 0 ? (
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
                {plugins.map((plugin) => (
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
                          onClick={() => openTestModal(plugin)}
                          title="Testar Plugin"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
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
              
              <FormField
                control={form.control}
                name="pageName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Página (para plugins com interface)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: freehand-canvas-plugin" {...field} />
                    </FormControl>
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

      {/* Modal para teste de plugin */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Testar Plugin: {testingPlugin?.name}
            </DialogTitle>
            <DialogDescription>
              Execute o plugin em ambiente de teste e veja os resultados da comunicação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Informações do plugin */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações do Plugin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Tipo:</span> {getPluginTypeLabel(testingPlugin?.type || "")}
                  </div>
                  <div>
                    <span className="font-medium">Versão:</span> {testingPlugin?.version}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge variant={getStatusBadgeVariant(testingPlugin?.status || "")} className="ml-2">
                      {getPluginStatusLabel(testingPlugin?.status || "")}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Autor:</span> {testingPlugin?.author || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Descrição:</span> {testingPlugin?.description}
                </div>
              </CardContent>
            </Card>

            {/* Botão de teste */}
            <div className="flex justify-center">
              <Button 
                onClick={() => testingPlugin && testPlugin(testingPlugin)}
                disabled={isTestingInProgress}
                className="w-full sm:w-auto"
              >
                {isTestingInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Testando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Executar Teste
                  </>
                )}
              </Button>
            </div>

            {/* Resultados do teste */}
            {testResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    Resultado do Teste
                    <Badge 
                      variant={testResult.success ? "default" : "destructive"} 
                      className="ml-2"
                    >
                      {testResult.success ? "Sucesso" : "Falha"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-medium">Status:</span> {testResult.message}
                  </div>

                  {testResult.success && testResult.data && (
                    <div>
                      <span className="font-medium">Dados Retornados:</span>
                      <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!testResult.success && testResult.error && (
                    <div>
                      <span className="font-medium">Erro:</span>
                      <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                        {testResult.error}
                      </div>
                    </div>
                  )}

                  {/* Dados enviados para o teste */}
                  <div>
                    <span className="font-medium">Dados de Teste Enviados:</span>
                    <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
{`{
  "message": "Teste de comunicação com plugin",
  "timestamp": "${new Date().toISOString()}",
  "user": "Sistema de Teste",
  "applicationContext": {
    "currentDocument": "Documento de Exemplo",
    "selectedText": "Texto selecionado para teste",
    "editorState": "ready"
  }
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações sobre a comunicação API */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comunicação API</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Endpoint de Teste:</span> 
                  <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                    POST /api/plugins/{testingPlugin?.id}/test
                  </code>
                </div>
                <div>
                  <span className="font-medium">Tipos de Dados Suportados:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">Texto</Badge>
                    <Badge variant="outline">JSON</Badge>
                    <Badge variant="outline">Imagens</Badge>
                    <Badge variant="outline">Objetos</Badge>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  O plugin pode receber e retornar dados da aplicação através desta API.
                  A comunicação é bidirecional, permitindo que o plugin processe dados
                  e retorne resultados para a aplicação principal.
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTestModalOpen(false);
                setTestResult(null);
                setTestingPlugin(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal do Plugin */}
      <PluginModal
        isOpen={isPluginModalOpen}
        onClose={() => {
          setIsPluginModalOpen(false);
          setTestingPlugin(null);
        }}
        pluginName={testingPlugin?.pageName || ""}
        onDataExchange={handlePluginDataExchange}
      />
    </div>
  );
}