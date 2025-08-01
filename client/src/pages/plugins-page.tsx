import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Pencil, Trash, Power, PowerOff, Play, Palette, Settings, 
  Database, Brain, BarChart, FileText, Zap, Wrench, Upload, Search,
  Puzzle, Code, Cpu, Globe, Lock, Mail, Image, Video, Music,
  Calendar, Clock, Users, Star, Heart, Flag, Target, Bookmark
} from "lucide-react";
import PluginModal from "@/components/plugin-modal";
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
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Plugin } from "@shared/schema";

// Dicionário de ícones disponíveis
const availableIcons = {
  "Palette": Palette,
  "Settings": Settings,
  "Database": Database,
  "Brain": Brain,
  "BarChart": BarChart,
  "FileText": FileText,
  "Zap": Zap,
  "Wrench": Wrench,
  "Puzzle": Puzzle,
  "Code": Code,
  "Cpu": Cpu,
  "Globe": Globe,
  "Lock": Lock,
  "Mail": Mail,
  "Image": Image,
  "Video": Video,
  "Music": Music,
  "Calendar": Calendar,
  "Clock": Clock,
  "Users": Users,
  "Star": Star,
  "Heart": Heart,
  "Flag": Flag,
  "Target": Target,
  "Bookmark": Bookmark,
  "Search": Search,
  "Upload": Upload
};

// Plugin types are now loaded dynamically from system_params table
// Keeping some common types for fallback only
const PluginType = {
  DATA_SOURCE: "DATA_SOURCE",
  AI_AGENT: "AI_AGENT",
  CHART: "CHART",
  FORMATTER: "FORMATTER",
  INTEGRATION: "INTEGRATION",
  UTILITY: "UTILITY"
} as const;

const PluginStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DEVELOPMENT: "development"
} as const;



// Schema para validação - types are now dynamic from database
const pluginFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  type: z.string().min(1, "Tipo é obrigatório"), // Accept any string from database
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
  const [iconSelectionMode, setIconSelectionMode] = useState<'library' | 'upload'>('library');
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [uploadedIconUrl, setUploadedIconUrl] = useState<string>('');
  const [activePluginTab, setActivePluginTab] = useState<'geral' | 'config'>('geral');
  const [configurationJson, setConfigurationJson] = useState<string>('');
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [testingPlugin, setTestingPlugin] = useState<Plugin | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingInProgress, setIsTestingInProgress] = useState(false);
  const [jsonValidationResult, setJsonValidationResult] = useState<{ isValid: boolean; message: string; error?: string } | null>(null);

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
    queryKey: ["/api/plugins", "all"],
  });

  // Query para buscar tipos de plugin de system_params
  const { data: pluginTypes = [], isLoading: isLoadingPluginTypes } = useQuery<Array<{value: string, label: string}>>({
    queryKey: ["/api/plugin-types"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "active"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "active"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plugins", "active"] });
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
    setConfigurationJson('');
    setJsonValidationResult(null);
    setActivePluginTab('geral');
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
    // Carregar configuração JSON
    setConfigurationJson(JSON.stringify(plugin.configuration || {}, null, 2));
    setJsonValidationResult(null);
    setActivePluginTab('geral');
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
    let configuration = {};
    
    // Parse da configuração JSON se fornecida
    if (configurationJson.trim()) {
      try {
        configuration = JSON.parse(configurationJson);
      } catch (error) {
        toast({
          title: "Erro no JSON",
          description: "Configuração JSON inválida: " + (error as Error).message,
          variant: "destructive",
        });
        return;
      }
    }

    const pluginData = {
      ...data,
      icon: iconSelectionMode === 'upload' ? uploadedIconUrl : data.icon,
      configuration,
    };

    if (selectedPlugin) {
      // Para edição, usar updatePluginMutation se existir, senão createPluginMutation
      createPluginMutation.mutate(pluginData);
    } else {
      createPluginMutation.mutate(pluginData);
    }
  };

  return (
    <div className="container mx-auto py-6" data-page="plugins">
      <div className="space-y-6">
        {/* Header com título */}
        <div className="rounded-lg p-6 bg-gray-50 dark:bg-[#0F172A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Puzzle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280]">
                Gerenciamento de Plugins
              </h1>
            </div>
            <Button onClick={openCreateModal} className="bg-[#1E40AF] hover:bg-[#1D4ED8] text-white dark:bg-[#1E40AF] dark:text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Plugin
            </Button>
          </div>
        </div>

        {/* Tabela de plugins */}
        <Card className="dark:bg-[#1E293B] dark:border-[#374151]">
          <CardContent className="pt-6">
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
                  <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Nome</TableHead>
                  <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Tipo</TableHead>
                  <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Status</TableHead>
                  <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Versão</TableHead>
                  <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Autor</TableHead>
                  <TableHead className="w-[150px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plugins.map((plugin) => (
                  <TableRow key={plugin.id} className="dark:border-[#374151]">
                    <TableCell className="dark:text-gray-300">
                      <div className="flex items-center gap-3">
                        {/* Ícone do plugin */}
                        <div className="flex-shrink-0">
                          {plugin.icon && availableIcons[plugin.icon as keyof typeof availableIcons] ? (
                            React.createElement(availableIcons[plugin.icon as keyof typeof availableIcons], { 
                              className: "h-6 w-6 text-blue-600 dark:text-blue-400" 
                            })
                          ) : plugin.icon && plugin.icon.startsWith('/uploads/') ? (
                            <img 
                              src={plugin.icon} 
                              alt={`Ícone ${plugin.name}`}
                              className="h-6 w-6 rounded object-cover"
                            />
                          ) : (
                            <Puzzle className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Nome e descrição */}
                        <div>
                          <div className="font-medium dark:text-gray-200">{plugin.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {plugin.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      <Badge variant="outline" className="dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-600">
                        {getPluginTypeLabel(plugin.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      <Badge 
                        variant={getStatusBadgeVariant(plugin.status)} 
                        className={`${
                          plugin.status === "active" ? "dark:bg-green-900/30 dark:text-green-400 dark:border-green-600" :
                          plugin.status === "inactive" ? "dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-600" :
                          "dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-600"
                        }`}
                      >
                        {getPluginStatusLabel(plugin.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">{plugin.version}</TableCell>
                    <TableCell className="dark:text-gray-300">{plugin.author || "-"}</TableCell>
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
                          {plugin.status === "active" ? (
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
      </div>

      {/* Modal para criar/editar plugin */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto dark:bg-[#0F1729] dark:border-[#374151]">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-200">
              {selectedPlugin ? "Editar Plugin" : "Novo Plugin"}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {selectedPlugin 
                ? "Edite as informações do plugin" 
                : "Crie um novo plugin para o sistema"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activePluginTab} onValueChange={(value) => setActivePluginTab(value as 'geral' | 'config')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="config">Config.</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Aba Geral */}
                <TabsContent value="geral" className="space-y-4 mt-4">
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
                          {isLoadingPluginTypes ? (
                            <SelectItem value="loading" disabled>Carregando tipos...</SelectItem>
                          ) : pluginTypes.length === 0 ? (
                            <>
                              <SelectItem value="DATA_SOURCE">Fonte de Dados</SelectItem>
                              <SelectItem value="AI_AGENT">Agente de IA</SelectItem>
                              <SelectItem value="CHART">Gráficos</SelectItem>
                              <SelectItem value="FORMATTER">Formatador</SelectItem>
                              <SelectItem value="INTEGRATION">Integração</SelectItem>
                              <SelectItem value="UTILITY">Utilitário</SelectItem>
                            </>
                          ) : (
                            pluginTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))
                          )}
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
                        <div className="space-y-3">
                          {/* Botões de alternância */}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={iconSelectionMode === 'library' ? 'default' : 'outline'}
                              onClick={() => setIconSelectionMode('library')}
                            >
                              Biblioteca
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={iconSelectionMode === 'upload' ? 'default' : 'outline'}
                              onClick={() => setIconSelectionMode('upload')}
                            >
                              Upload
                            </Button>
                          </div>

                          {/* Seleção da biblioteca */}
                          {iconSelectionMode === 'library' && (
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowIconSelector(!showIconSelector)}
                                className="w-full justify-start"
                              >
                                {field.value && availableIcons[field.value as keyof typeof availableIcons] ? (
                                  <>
                                    {React.createElement(availableIcons[field.value as keyof typeof availableIcons], { className: "mr-2 h-4 w-4" })}
                                    {field.value}
                                  </>
                                ) : (
                                  <>
                                    <Puzzle className="mr-2 h-4 w-4" />
                                    Selecionar ícone
                                  </>
                                )}
                              </Button>
                              
                              {showIconSelector && (
                                <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                                  {Object.entries(availableIcons).map(([iconName, IconComponent]) => (
                                    <Button
                                      key={iconName}
                                      type="button"
                                      variant={field.value === iconName ? 'default' : 'outline'}
                                      size="sm"
                                      className="aspect-square p-2"
                                      onClick={() => {
                                        field.onChange(iconName);
                                        setShowIconSelector(false);
                                      }}
                                      title={iconName}
                                    >
                                      <IconComponent className="h-4 w-4" />
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Upload de imagem */}
                          {iconSelectionMode === 'upload' && (
                            <div className="space-y-2">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">
                                  Clique para fazer upload de uma imagem
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  PNG, JPG até 2MB
                                </p>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="mt-2"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // Aqui você implementaria o upload real
                                      const fakeUrl = `/uploads/icons/${file.name}`;
                                      setUploadedIconUrl(fakeUrl);
                                      field.onChange(fakeUrl);
                                    }
                                  }}
                                />
                              </div>
                              {uploadedIconUrl && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <Image className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-700">Imagem carregada com sucesso</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
                </TabsContent>
                
                {/* Aba Config. */}
                <TabsContent value="config" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="config-json">Configuração JSON</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Configure as propriedades avançadas do plugin em formato JSON
                      </p>
                      <Textarea
                        id="config-json"
                        value={configurationJson}
                        onChange={(e) => {
                          setConfigurationJson(e.target.value);
                          // Limpar resultado de validação quando o conteúdo mudar
                          setJsonValidationResult(null);
                        }}
                        placeholder={`{
  "apiUrl": "https://api.exemplo.com",
  "timeout": 5000,
  "retries": 3,
  "features": {
    "autoSync": true,
    "enableCache": false
  }
}`}
                        className="min-h-[300px] font-mono text-sm"
                      />
                      {configurationJson && (
                        <div className="mt-2 space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(configurationJson);
                                setJsonValidationResult({
                                  isValid: true,
                                  message: "JSON válido e formatado corretamente!",
                                });
                              } catch (error) {
                                setJsonValidationResult({
                                  isValid: false,
                                  message: "JSON inválido",
                                  error: (error as Error).message
                                });
                              }
                            }}
                          >
                            Validar JSON
                          </Button>
                          
                          {/* Área de resultado da validação */}
                          {jsonValidationResult && (
                            <div className={`p-3 rounded-lg border ${
                              jsonValidationResult.isValid 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-start gap-2">
                                {jsonValidationResult.isValid ? (
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mt-0.5">
                                    <svg className="w-3 h-3 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center mt-0.5">
                                    <svg className="w-3 h-3 text-red-600 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    jsonValidationResult.isValid 
                                      ? 'text-green-800 dark:text-green-200' 
                                      : 'text-red-800 dark:text-red-200'
                                  }`}>
                                    {jsonValidationResult.message}
                                  </p>
                                  {!jsonValidationResult.isValid && jsonValidationResult.error && (
                                    <p className="text-sm text-red-600 dark:text-red-300 mt-1 font-mono">
                                      {jsonValidationResult.error}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => setJsonValidationResult(null)}
                                  className={`flex-shrink-0 rounded-md p-1.5 ${
                                    jsonValidationResult.isValid
                                      ? 'text-green-500 hover:bg-green-200 dark:text-green-400 dark:hover:bg-green-800'
                                      : 'text-red-500 hover:bg-red-200 dark:text-red-400 dark:hover:bg-red-800'
                                  }`}
                                >
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <DialogFooter className="mt-6">
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
          </Tabs>
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