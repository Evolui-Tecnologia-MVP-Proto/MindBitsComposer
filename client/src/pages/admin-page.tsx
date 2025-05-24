import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Pencil, 
  Trash, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Database,
  Settings,
  Users,
  CalendarDays,
  Plug,
  Github,
  Lightbulb,
  CheckCircle,
  XCircle,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import UserTable from "@/components/UserTable";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Definições de tipos
type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  quadroMonday: string;
  description: string;
  mappingFilter: string;
  defaultValues?: Record<string, string>;
  lastSync: string | null;
  columnCount?: number;
};

type MappingColumn = {
  id: string;
  mappingId: string;
  mondayColumnId: string;
  cpxField: string;
  transformFunction: string | null;
  createdAt: string;
  mondayColumnTitle?: string;
};

type MondayColumn = {
  id: string;
  mappingId: string;
  columnId: string;
  title: string;
  type: string;
};

type ServiceConnection = {
  id: string;
  serviceName: string;
  token: string;
  description: string | null;
  parameters: string[] | null;
  createdAt: string;
};

// Schemas para validação de formulários
const mappingFormSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres" }),
  boardId: z.string().min(1, { message: "ID do quadro é obrigatório" }),
  quadroMonday: z.string().optional(),
  description: z.string().optional(),
  mappingFilter: z.string().optional(),
  defaultValues: z.record(z.string()).optional(),
});

const columnMappingFormSchema = z.object({
  mondayColumnId: z.string().min(1, { message: "Coluna do Monday é obrigatória" }),
  cpxField: z.string().min(1, { message: "Campo CPX é obrigatório" }),
  transformFunction: z.string().optional(),
});

// Schema para conexões de serviço
const serviceConnectionSchema = z.object({
  serviceName: z.string().min(1, { message: "Serviço é obrigatório" }),
  token: z.string().min(1, { message: "Token ou chave API é obrigatório" }),
  description: z.string().optional(),
  parameters: z.array(z.string()).optional(),
});

// Função para gerar dinamicamente as colunas da tabela documentos
const getDocumentosColumns = () => {
  return [
    { field: "origem", label: "Origem", type: "text" },
    { field: "objeto", label: "Objeto da Task", type: "text" },
    { field: "tipo", label: "Tipo", type: "text" },
    { field: "cliente", label: "Cliente", type: "text" },
    { field: "responsavel", label: "Responsável", type: "text" },
    { field: "sistema", label: "Sistema", type: "text" },
    { field: "modulo", label: "Módulo", type: "text" },
    { field: "descricao", label: "Detalhamento", type: "text" },
    { field: "status", label: "Status", type: "text" },
    { field: "statusOrigem", label: "Status Origem", type: "text" },
    { field: "solicitante", label: "Solicitante", type: "text" },
    { field: "aprovador", label: "Aprovador", type: "text" },
    { field: "agente", label: "Agente", type: "text" },
    { field: "generalColumns", label: "Colunas Gerais", type: "json" },
  ];
};

// Função para obter campos válidos para valores padrão (somente obrigatórios e de tipo texto/numérico/data)
const getDefaultableFields = () => {
  // Campos obrigatórios da tabela documentos que podem ter valores padrão
  const requiredFields = [
    { field: "origem", label: "Origem", type: "text", required: true },
    { field: "objeto", label: "Objeto da Task", type: "text", required: true },
    { field: "cliente", label: "Cliente", type: "text", required: true },
    { field: "responsavel", label: "Responsável", type: "text", required: true },
    { field: "sistema", label: "Sistema", type: "text", required: true },
    { field: "modulo", label: "Módulo", type: "text", required: true },
    { field: "descricao", label: "Detalhamento", type: "text", required: true },
  ];
  
  // Campos opcionais que também podem ter valores padrão
  const optionalFields = [
    { field: "tipo", label: "Tipo", type: "text", required: false },
    { field: "status", label: "Status", type: "text", required: false },
    { field: "statusOrigem", label: "Status Origem", type: "text", required: false },
    { field: "solicitante", label: "Solicitante", type: "text", required: false },
    { field: "aprovador", label: "Aprovador", type: "text", required: false },
    { field: "agente", label: "Agente", type: "text", required: false },
  ];
  
  return [...requiredFields, ...optionalFields];
};

export default function AdminPage() {
  const { toast } = useToast();
  
  // Estados para gerenciar modais e seleções
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [activeTab, setActiveTab] = useState<string>("quadro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<MappingColumn | null>(null);
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isServiceDeleteDialogOpen, setIsServiceDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ServiceConnection | null>(null);
  
  // Estados para GitHub
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  
  // Estado para armazenar o status da conexão com o Monday e controlar cores do botão
  const [buttonStyle, setButtonStyle] = useState("bg-yellow-500");
  const [showServiceToken, setShowServiceToken] = useState(false);
  const [isServiceSubmitting, setIsServiceSubmitting] = useState(false);
  const [isExecutingMapping, setIsExecutingMapping] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<string>("");
  
  // Formulário para serviços externos
  const serviceForm = useForm<z.infer<typeof serviceConnectionSchema>>({
    resolver: zodResolver(serviceConnectionSchema),
    defaultValues: {
      serviceName: "",
      token: "",
      description: "",
    },
  });
  
  // Formulário para mapeamento do Monday
  const mappingForm = useForm<z.infer<typeof mappingFormSchema>>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      name: "",
      boardId: "",
      quadroMonday: "",
      description: "",
      mappingFilter: "",
      defaultValues: {},
    },
  });
  
  // Formulário para coluna de mapeamento
  const columnForm = useForm<z.infer<typeof columnMappingFormSchema>>({
    resolver: zodResolver(columnMappingFormSchema),
    defaultValues: {
      mondayColumnId: "",
      cpxField: "",
      transformFunction: "",
    },
  });
  
  // Atualiza o formulário quando um mapeamento é selecionado
  useEffect(() => {
    if (selectedMapping) {
      mappingForm.reset({
        name: selectedMapping.name,
        boardId: selectedMapping.boardId,
        quadroMonday: selectedMapping.quadroMonday,
        description: selectedMapping.description,
        mappingFilter: selectedMapping.mappingFilter || "",
        defaultValues: selectedMapping.defaultValues || {},
      });
      
      // Se o campo quadroMonday estiver preenchido, muda a cor do botão para verde
      if (selectedMapping.quadroMonday) {
        setButtonStyle("bg-green-600");
        setIsSaveDisabled(false);
      } else {
        setButtonStyle("bg-yellow-500");
      }
    } else {
      mappingForm.reset({
        name: "",
        boardId: "",
        quadroMonday: "",
        description: "",
      });
      setButtonStyle("bg-yellow-500");
    }
  }, [selectedMapping, mappingForm]);
  
  // Atualiza o formulário quando uma conexão de serviço é selecionada
  useEffect(() => {
    if (selectedConnection) {
      serviceForm.reset({
        serviceName: selectedConnection.serviceName,
        token: selectedConnection.token,
        description: selectedConnection.description || "",
      });
    } else if (selectedService) {
      serviceForm.reset({
        serviceName: selectedService,
        token: "",
        description: "",
      });
    } else {
      serviceForm.reset({
        serviceName: "",
        token: "",
        description: "",
      });
    }
    setShowServiceToken(false);
  }, [selectedConnection, selectedService, serviceForm]);
  
  // Atualiza o formulário quando uma coluna é selecionada
  useEffect(() => {
    if (selectedColumn) {
      columnForm.reset({
        mondayColumnId: selectedColumn.mondayColumnId,
        cpxField: selectedColumn.cpxField,
        transformFunction: selectedColumn.transformFunction || "",
      });
    } else {
      columnForm.reset({
        mondayColumnId: "",
        cpxField: "",
        transformFunction: "",
      });
    }
  }, [selectedColumn, columnForm]);
  
  // Queries
  const { data: mappingsData = [], isLoading: mappingsIsLoading, error: mappingsError } = useQuery<BoardMapping[]>({
    queryKey: ['/api/monday/mappings'],
  });
  
  const { data: connections = [] } = useQuery<ServiceConnection[]>({
    queryKey: ['/api/service-connections'],
  });
  
  // Query para colunas do Monday de um mapeamento específico
  const { data: mondayColumns = [], isLoading: columnsLoading } = useQuery<MondayColumn[]>({
    queryKey: [`/api/monday/mappings/${selectedMapping?.id}/columns`],
    enabled: !!selectedMapping,
  });
  
  // Query para colunas mapeadas de um mapeamento específico
  const { data: mappingColumns = [], isLoading: mappingColumnsLoading } = useQuery<MappingColumn[]>({
    queryKey: [`/api/monday/mappings/${selectedMapping?.id}/column-mappings`],
    enabled: !!selectedMapping,
  });
  
  // Estado para armazenar as colunas recebidas da API do Monday
  const [mondayColumnsData, setMondayColumnsData] = useState<any[]>([]);
  
  // Handler para salvar o mapeamento do Monday
  const onSubmitMapping = async (data: z.infer<typeof mappingFormSchema>) => {
    setIsSubmitting(true);
    try {
      // Preparar os dados no formato esperado pelo servidor
      const mappingData = {
        name: data.name,
        boardId: data.boardId,
        quadroMonday: data.quadroMonday || "",
        description: data.description || "",
        statusColumn: "",
        responsibleColumn: "",
        mappingFilter: data.mappingFilter || "",
        defaultValues: data.defaultValues || {},
        lastSync: null
      };
      
      // Criar/atualizar o mapeamento na tabela monday_mappings
      const apiUrl = selectedMapping 
        ? `/api/monday/mappings/${selectedMapping.id}` 
        : '/api/monday/mappings';
      
      const method = selectedMapping ? 'PATCH' : 'POST';
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappingData)
      });
      
      if (!response.ok) {
        let errorMessage = 'Falha ao salvar o mapeamento';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Se não conseguir obter JSON, tentar obter texto
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch (textError) {
            console.error("Erro ao ler resposta de erro:", textError);
          }
        }
        console.error("Resposta de erro do servidor:", errorMessage);
        throw new Error(errorMessage);
      }
      
      // Obter o mapeamento salvo (com ID gerado se for novo)
      const savedMapping = await response.json();
      
      // Salvar as colunas na tabela monday_columns vinculando com o mapeamento
      // Apenas quando for um novo mapeamento (não em edição)
      if (mondayColumnsData && mondayColumnsData.length > 0 && !selectedMapping) {
        try {
          // Enviar as colunas para o servidor somente se for um novo mapeamento
          const columnsResponse = await fetch(`/api/monday/mappings/${savedMapping.id}/fetch-columns`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ columns: mondayColumnsData })
          });
          
          if (!columnsResponse.ok) {
            throw new Error('Falha ao salvar as colunas');
          }
          
          toast({
            title: "Colunas sincronizadas",
            description: `Foram sincronizadas ${mondayColumnsData.length} colunas do quadro.`,
          });
          
        } catch (columnError) {
          console.error("Erro ao salvar colunas:", columnError);
          toast({
            title: "Atenção",
            description: "Mapeamento criado, mas houve um erro ao salvar as colunas.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: selectedMapping ? "Mapeamento atualizado" : "Mapeamento criado",
        description: `O mapeamento "${data.name}" foi ${selectedMapping ? 'atualizado' : 'criado'} com sucesso.`,
      });
      
      // Atualizar a lista de mapeamentos
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
      
      // Em modo de edição, manter a modal aberta após salvar
      if (selectedMapping) {
        console.log("Modo edição - modal permanece aberta");
        // Não fechar a modal, apenas mostrar que foi salvo
      } else {
        // Se for inclusão (novo mapeamento), manter aberto e mudar para a aba de colunas
        console.log("Modo criação - mantendo modal aberto e mudando para aba colunas");
        // Atualizar o mapeamento selecionado para o que acabamos de salvar
        setSelectedMapping(savedMapping);
        
        // Mudar para a aba de colunas após o salvamento sem fechar o modal
        setActiveTab("colunas");
      }
      
    } catch (error) {
      console.error("Erro ao salvar mapeamento:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o mapeamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onSubmitColumn = async (data: z.infer<typeof columnMappingFormSchema>) => {
    try {
      // Encontrar o título da coluna do Monday selecionada
      const selectedMondayColumn = mondayColumns.find(col => col.columnId === data.mondayColumnId);
      
      if (!selectedMondayColumn && !selectedColumn) {
        throw new Error("Coluna do Monday não encontrada");
      }
      
      // Preparar os dados para envio
      const columnData = {
        ...data,
        mappingId: selectedMapping?.id,
        mondayColumnTitle: selectedMondayColumn?.title || selectedColumn?.mondayColumnTitle || ""
      };
      
      // Fazer a chamada à API para salvar a coluna de mapeamento
      const endpoint = selectedColumn
        ? `/api/monday/mappings/column-mappings/${selectedColumn.id}`
        : `/api/monday/mappings/${selectedMapping?.id}/column-mappings`;
      
      const method = selectedColumn ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(columnData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar a coluna');
      }
      
      toast({
        title: selectedColumn ? "Coluna atualizada" : "Coluna adicionada",
        description: `A coluna foi ${selectedColumn ? 'atualizada' : 'adicionada'} com sucesso.`,
      });
      
      // Atualizar a lista de colunas mapeadas
      queryClient.invalidateQueries({ queryKey: [`/api/monday/mappings/${selectedMapping?.id}/column-mappings`] });
      
      // Fechar a modal
      setIsColumnModalOpen(false);
      
      // Limpar a seleção
      setSelectedColumn(null);
      
      // Resetar o formulário
      columnForm.reset({
        mondayColumnId: "",
        cpxField: "",
        transformFunction: ""
      });
    } catch (error) {
      console.error("Erro ao salvar coluna de mapeamento:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar a coluna de mapeamento.",
        variant: "destructive",
      });
    }
  };
  
  const deleteColumn = async (columnId: string) => {
    try {
      // Fazer chamada à API para excluir coluna de mapeamento
      const response = await fetch(`/api/monday/mappings/column-mappings/${columnId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir a coluna');
      }
      
      toast({
        title: "Coluna excluída",
        description: "A coluna de mapeamento foi excluída com sucesso.",
      });
      
      // Atualizar a lista de colunas mapeadas
      queryClient.invalidateQueries({ queryKey: [`/api/monday/mappings/${selectedMapping?.id}/column-mappings`] });
    } catch (error) {
      console.error("Erro ao excluir coluna de mapeamento:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a coluna de mapeamento.",
        variant: "destructive",
      });
    }
  };
  
  // Estado para controle dos botões
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isConnectDisabled, setIsConnectDisabled] = useState(true);
  
  // Função para salvar conexões de serviço
  const onSubmitServiceConnection = async (data: z.infer<typeof serviceConnectionSchema>) => {
    setIsServiceSubmitting(true);
    try {
      // Preparar dados para envio, incluindo parameters para GitHub
      const submitData = { ...data };
      
      // Se for GitHub e houver repositório selecionado, adicionar ao array parameters
      if (data.serviceName === "github" && selectedRepo) {
        submitData.parameters = [selectedRepo];
      }
      
      // Chamada à API para salvar a conexão
      const endpoint = selectedConnection ? `/api/service-connections/${selectedConnection.id}` : "/api/service-connections";
      const method = selectedConnection ? "PUT" : "POST";
      
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar conexão");
      }
      
      const successMessage = selectedRepo 
        ? `Conexão configurada com repositório: ${selectedRepo}`
        : "Conexão configurada com sucesso";
      
      toast({
        title: selectedConnection ? "Conexão atualizada" : "Conexão criada",
        description: successMessage
      });
      
      // Atualizar a lista de conexões
      queryClient.invalidateQueries({ queryKey: ['/api/service-connections'] });
      setIsServiceModalOpen(false);
      
      // Limpar estados do GitHub
      setConnectionStatus('idle');
      setGithubRepos([]);
      setSelectedRepo("");
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar a conexão. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsServiceSubmitting(false);
    }
  };
  
  // Função para obter o nome de exibição do serviço
  const getServiceDisplayName = (serviceName: string): string => {
    switch (serviceName) {
      case "monday": return "Monday.com";
      case "github": return "GitHub";
      case "openai": return "OpenAI";
      default: return serviceName;
    }
  };

  // Monitora mudanças nos campos para habilitar/desabilitar o botão Conectar
  useEffect(() => {
    const name = mappingForm.watch("name");
    const boardId = mappingForm.watch("boardId");
    const description = mappingForm.watch("description");
    // Botão Conectar só é habilitado quando todos os campos obrigatórios estiverem preenchidos
    setIsConnectDisabled(!name || !description || !boardId);
  }, [mappingForm.watch("name"), mappingForm.watch("description"), mappingForm.watch("boardId")]);

  // Botão Salvar permanece desabilitado até que a conexão seja testada
  // e o retorno seja bem-sucedido
  useEffect(() => {
    // Por padrão, o botão salvar fica desabilitado
    setIsSaveDisabled(true);
    
    // Ele só será habilitado quando a função de conectar for chamada
    // e retornar sucesso (isso será feito na função de conectar)
  }, []);
  
  // Monitora mudanças no formulário de serviço para habilitar/desabilitar o botão Salvar
  useEffect(() => {
    const serviceName = serviceForm.watch("serviceName");
    const token = serviceForm.watch("token");
    // Este useEffect será usado quando necessário para validações adicionais
  }, [serviceForm.watch("serviceName"), serviceForm.watch("token")]);

  // Funções para abrir modal de edição/exclusão
  const openEditModal = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setActiveTab("quadro");
    setIsModalOpen(true);
    setIsSaveDisabled(false);
    setIsConnectDisabled(false);
  };
  
  const openNewModal = () => {
    setSelectedMapping(null);
    setActiveTab("quadro");
    mappingForm.reset({
      name: "",
      boardId: "",
      description: "",
    });
    setIsModalOpen(true);
    setIsSaveDisabled(true);
    setIsConnectDisabled(true);
  };
  
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
  };

  // Função para executar sincronização do mapeamento Monday
  const executeMondayMapping = async (mapping: BoardMapping) => {
    try {
      setIsExecutingMapping(true);
      setExecutionProgress("🚀 Iniciando sincronização...");
      
      toast({
        title: "🚀 Executando sincronização",
        description: `Iniciando sincronização do mapeamento "${mapping.name}"...`,
      });

      // Etapa 1: Conectando
      setExecutionProgress("🔗 Conectando com API do Monday.com...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Etapa 2: Autenticando
      setExecutionProgress("🔐 Autenticando com Monday.com...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Etapa 3: Buscando dados
      setExecutionProgress("📊 Obtendo dados do quadro...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const startTime = Date.now();
      
      const response = await fetch(`/api/monday/mappings/${mapping.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Etapa 4: Processando com simulação de progresso
      setExecutionProgress("⚙️ Processando registros...");
      
      // Simular progresso durante o processamento
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const estimatedTotal = 8000; // Estimativa de 8 segundos para completar
        const progress = Math.min(Math.round((elapsed / estimatedTotal) * 100), 95);
        setExecutionProgress(`⚙️ Processando registros... ${progress}%`);
      }, 200);

      if (!response.ok) {
        clearInterval(progressInterval);
        const errorText = await response.text();
        throw new Error(errorText || 'Erro na sincronização');
      }

      // Debug: verificar o conteúdo da resposta
      const responseText = await response.text();
      console.log("Resposta do servidor:", responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Erro ao parsear JSON:", parseError);
        console.error("Conteúdo recebido:", responseText);
        throw new Error("Resposta inválida do servidor");
      }
      
      clearInterval(progressInterval);
      setExecutionProgress("✅ Finalizando sincronização...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      toast({
        title: "✅ Sincronização concluída com sucesso!",
        description: (
          <div className="space-y-1">
            <div className="font-medium">📊 Resumo da Importação:</div>
            <div>📥 <strong>{result.itemsProcessed}</strong> registros importados da API</div>
            <div>💾 <strong>{result.documentsCreated}</strong> documentos gravados no banco</div>
            <div>🚫 <strong>{result.documentsSkipped}</strong> registros filtrados/ignorados</div>
            <div className="text-xs text-gray-600 mt-2">
              📋 {result.columnsMapping} colunas mapeadas • ⏰ {new Date().toLocaleTimeString()}
            </div>
          </div>
        ),
        duration: 8000,
      });

      // Atualizar a lista de mapeamentos para refletir mudanças
      queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });

    } catch (error) {
      console.error('Erro ao executar mapeamento:', error);
      toast({
        title: "❌ Erro na execução",
        description: error instanceof Error ? error.message : "Não foi possível executar a sincronização",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsExecutingMapping(false);
      setExecutionProgress("");
    }
  };
  
  const editColumn = (column: MappingColumn) => {
    // Definir a coluna selecionada
    setSelectedColumn(column);
    
    // Preencher o formulário com os dados da coluna
    columnForm.reset({
      mondayColumnId: column.mondayColumnId,
      cpxField: column.cpxField,
      transformFunction: column.transformFunction || ""
    });
    
    // Abrir a modal
    setIsColumnModalOpen(true);
  };
  
  // Funções para modais de serviço
  const openServiceModal = (serviceName: string, connection: ServiceConnection | null = null) => {
    setSelectedService(serviceName);
    setSelectedConnection(connection);
    
    // Se for uma conexão GitHub existente, simular estado conectado
    if (serviceName === "github" && connection?.token) {
      setConnectionStatus('success');
      // Buscar repositórios automaticamente com o token existente
      fetchGithubRepos(connection.token);
      
      // Se já existe um repositório salvo nos parameters, selecioná-lo
      if (connection.parameters && connection.parameters.length > 0) {
        setSelectedRepo(connection.parameters[0]);
      }
    } else {
      setConnectionStatus('idle');
      setGithubRepos([]);
      setSelectedRepo("");
    }
    
    setIsServiceModalOpen(true);
  };
  
  const openServiceDeleteDialog = (connection: ServiceConnection) => {
    setSelectedConnection(connection);
    setIsServiceDeleteDialogOpen(true);
  };

  // Função auxiliar para buscar repositórios GitHub
  const fetchGithubRepos = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const repos = await response.json();
        setGithubRepos(repos);
        return repos;
      } else {
        setGithubRepos([]);
        return [];
      }
    } catch (error) {
      setGithubRepos([]);
      return [];
    }
  };

  // Função para testar conexão GitHub
  const testGithubConnection = async () => {
    const token = serviceForm.getValues("token");
    if (!token) {
      toast({
        title: "Erro",
        description: "Insira um token antes de testar a conexão",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');

    try {
      const repos = await fetchGithubRepos(token);
      
      if (repos.length > 0) {
        setConnectionStatus('success');
        toast({
          title: "Sucesso",
          description: `Conectado! ${repos.length} repositório(s) encontrado(s)`,
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Erro de conexão",
          description: "Token inválido ou sem permissões adequadas",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao GitHub",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const deleteServiceConnection = async () => {
    try {
      if (!selectedConnection) {
        throw new Error("Nenhuma conexão selecionada");
      }
      
      // Chamada à API para excluir a conexão
      const response = await fetch(`/api/service-connections/${selectedConnection.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir conexão");
      }
      
      toast({
        title: "Conexão excluída",
        description: `A conexão com ${getServiceDisplayName(selectedConnection.serviceName)} foi excluída com sucesso.`
      });
      
      // Atualizar a lista de conexões
      queryClient.invalidateQueries({ queryKey: ['/api/service-connections'] });
      setIsServiceDeleteDialogOpen(false);
      setSelectedConnection(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a conexão. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
        </div>
        
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="usuarios" className="text-center">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="monday" className="text-center">
              <CalendarDays className="h-4 w-4 mr-2" />
              Integração Monday
            </TabsTrigger>
            <TabsTrigger value="servicos" className="text-center">
              <Plug className="h-4 w-4 mr-2" />
              Integrações de Serviços
            </TabsTrigger>
            <TabsTrigger value="configuracao" className="text-center">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="usuarios" className="slide-in">
            {/* Conteúdo da aba de usuários */}
            <UserTable />
          </TabsContent>
          
          <TabsContent value="monday" className="slide-in">
            <div className="space-y-4">
              {/* Indicador de progresso durante execução */}
              {isExecutingMapping && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-900">🚀 Executando Sincronização Monday.com</h3>
                        <p className="text-sm text-blue-700">{executionProgress}</p>
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Mapeamentos de Quadros do Monday</CardTitle>
                    <Button
                      variant="outline"
                      onClick={openNewModal}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Mapeamento
                    </Button>
                  </div>
                  <CardDescription>
                    Configure a integração entre os quadros do Monday.com e o EVO-MindBits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {mappingsIsLoading ? (
                    <div className="w-full flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : mappingsError ? (
                    <div className="w-full flex justify-center py-8 text-red-500">
                      <AlertCircle className="h-6 w-6 mr-2" />
                      <span>Erro ao carregar mapeamentos</span>
                    </div>
                  ) : mappingsData && mappingsData.length > 0 ? (
                    <div className="relative w-full overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">NOME</TableHead>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ID DO QUADRO</TableHead>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ÚLTIMA SINCRONIZAÇÃO</TableHead>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">COLUNAS</TableHead>
                            <TableHead className="w-[100px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappingsData.map((mapping: BoardMapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell className="font-medium">{mapping.name}</TableCell>
                              <TableCell className="font-mono font-bold text-blue-700">{mapping.boardId}</TableCell>
                              <TableCell>{mapping.lastSync ? new Date(mapping.lastSync).toLocaleString() : "Nunca"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {mapping.columnCount || 0} cols
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => executeMondayMapping(mapping)}
                                    title="Executar sincronização"
                                    disabled={isExecutingMapping}
                                  >
                                    {isExecutingMapping ? (
                                      <div className="flex items-center space-x-1">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                      </div>
                                    ) : (
                                      <Play className="h-4 w-4 text-green-600" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditModal(mapping)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDeleteDialog(mapping)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Nenhum mapeamento encontrado</p>
                      <p className="text-sm mt-1">
                        Clique em "Novo Mapeamento" para começar a integração com o Monday.com
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="servicos" className="slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card Monday */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                        <CalendarDays className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">Monday.com</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "monday") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com Monday.com para sincronização de quadros e itens.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        const connection = connections.find(c => c.serviceName === "monday") || null;
                        openServiceModal("monday", connection);
                      }}
                    >
                      {connections.find(c => c.serviceName === "monday") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Card GitHub */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                        <Github className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">GitHub</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "github") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com GitHub para gestão de código e versionamento de documentação.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        const connection = connections.find(c => c.serviceName === "github") || null;
                        openServiceModal("github", connection);
                      }}
                    >
                      {connections.find(c => c.serviceName === "github") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Card OpenAI */}
              <div className="bg-white rounded-lg shadow-md transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <Lightbulb className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">OpenAI</h3>
                        <div className="flex items-center mt-1">
                          {connections.find(c => c.serviceName === "openai") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Conectado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-800">Não configurado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Integração com a API da OpenAI para recursos de inteligência artificial.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        const connection = connections.find(c => c.serviceName === "openai") || null;
                        openServiceModal("openai", connection);
                      }}
                    >
                      {connections.find(c => c.serviceName === "openai") ? "Editar" : "Configurar"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuracao" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h3>
              <p className="text-gray-500">Configurações globais do sistema.</p>
              
              <div className="mt-4 border-t pt-4">
                <h4 className="text-base font-medium mb-2">Sobre o Sistema</h4>
                <p className="text-sm text-gray-500 mb-1">Versão: 1.0.0</p>
                <p className="text-sm text-gray-500">
                  EVO-MindBits Composer é uma plataforma para gerenciamento e integração de documentos
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal para edição/inclusão de mapeamento de quadros do Monday */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {selectedMapping ? "Editar Mapeamento" : "Novo Mapeamento"}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do mapeamento entre Monday.com e EVO-MindBits.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...mappingForm}>
            <form id="mappingForm" onSubmit={mappingForm.handleSubmit(onSubmitMapping)} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="quadro">Quadro</TabsTrigger>
                  <TabsTrigger value="colunas" disabled={!selectedMapping}>Colunas</TabsTrigger>
                  <TabsTrigger value="defaults" disabled={!selectedMapping}>Defaults</TabsTrigger>
                  <TabsTrigger value="filtros" disabled={!selectedMapping}>Filtros</TabsTrigger>
                </TabsList>
                
                {/* Aba de informações do quadro */}
                <TabsContent value="quadro" className="space-y-4 py-4">
                  <FormField
                    control={mappingForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Mapeamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do mapeamento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={mappingForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva a finalidade deste mapeamento"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={mappingForm.control}
                    name="boardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID do Quadro</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="ID do quadro no Monday.com" {...field} className="font-mono font-bold text-blue-700" />
                          </FormControl>
                          <Button 
                            type="button"
                            className={`${buttonStyle} hover:opacity-90 text-white disabled:opacity-50 disabled:text-gray-100 disabled:cursor-not-allowed`}
                            disabled={isConnectDisabled}
                            onClick={async () => {
                              if (!field.value) {
                                toast({
                                  title: "Erro",
                                  description: "Informe o ID do quadro antes de conectar",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Tentativa de conexão iniciada - botão amarelo
                              setButtonStyle("bg-yellow-500");
                              
                              try {
                                // Recuperar colunas do quadro via API usando a conexão do Monday
                                const response = await fetch(`/api/monday/board/${field.value}/columns`, {
                                  method: 'GET',
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  
                                  // Botão verde após sucesso
                                  setButtonStyle("bg-green-600");
                                  
                                  // Habilitando o botão salvar após conexão bem-sucedida
                                  setIsSaveDisabled(false);
                                  
                                  // Armazenar as colunas recuperadas do Monday
                                  if (data.columns && data.columns.length > 0) {
                                    setMondayColumnsData(data.columns);
                                    
                                    // Se tiver o nome do quadro, atualizar no formulário
                                    if (data.boardName) {
                                      mappingForm.setValue("quadroMonday", data.boardName);
                                      // Se o nome estiver vazio, sugerir o nome do quadro
                                      if (!mappingForm.getValues("name")) {
                                        mappingForm.setValue("name", data.boardName);
                                      }
                                    }
                                  }
                                  
                                  toast({
                                    title: "Conectado com sucesso",
                                    description: "As colunas do quadro foram carregadas",
                                  });
                                } else {
                                  // Botão vermelho após falha
                                  setButtonStyle("bg-red-600");
                                  
                                  // Manter o botão salvar desabilitado
                                  setIsSaveDisabled(true);
                                  
                                  toast({
                                    title: "Erro na conexão",
                                    description: "Falha ao buscar as colunas do quadro",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                              } catch (error) {
                                console.error("Erro ao conectar com o quadro:", error);
                                
                                // Botão vermelho após falha
                                setButtonStyle("bg-red-600");
                                
                                // Manter o botão salvar desabilitado
                                setIsSaveDisabled(true);
                                
                                toast({
                                  title: "Erro na conexão",
                                  description: "Ocorreu um erro ao conectar com o Monday",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Conectar
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={mappingForm.control}
                    name="quadroMonday"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Nome do quadro no Monday (preenchido automaticamente)" 
                            {...field} 
                            readOnly={true}
                            className="bg-gray-50 font-mono font-bold text-blue-700"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </TabsContent>
            
            {/* Aba de colunas mapeadas */}
            <TabsContent value="colunas" className="py-4">
              {!selectedMapping ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    Salve o mapeamento primeiro para adicionar colunas.
                  </p>
                </div>
              ) : isAddingColumn ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {selectedColumn ? "Editar Coluna" : "Nova Coluna"}
                  </h3>
                  <Form {...columnForm}>
                    <form onSubmit={columnForm.handleSubmit(onSubmitColumn)} className="space-y-4">
                      <FormField
                        control={columnForm.control}
                        name="mondayColumnId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coluna do Monday</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="relative">
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    {...field}
                                  >
                                    <option value="">Selecione uma coluna</option>
                                    {mondayColumns.map((column) => (
                                      <option key={column.id} value={column.columnId}>
                                        {column.title} 
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {mondayColumns.map(column => (
                                    <div 
                                      key={column.id} 
                                      className={`flex items-center justify-between gap-2 p-2 border rounded-md cursor-pointer transition-colors ${field.value === column.columnId ? 'bg-primary/10 border-primary' : 'hover:bg-muted/10'}`}
                                      onClick={() => field.onChange(column.columnId)}
                                    >
                                      <div className="text-sm font-medium truncate">{column.title}</div>
                                      <Badge variant={field.value === column.columnId ? "default" : "outline"}>
                                        {column.type?.toUpperCase()}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={columnForm.control}
                        name="cpxField"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Campo CPX</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do campo no CPX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={columnForm.control}
                        name="transformFunction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função de Transformação (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Função para transformar dados" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-between pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddingColumn(false);
                            setSelectedColumn(null);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">Colunas Mapeadas</h2>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedColumn(null);
                        setIsColumnModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Coluna
                    </Button>
                  </div>
                  
                  {mappingColumnsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mappingColumns.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>Nenhuma coluna mapeada.</p>
                      <p className="text-sm mt-1">
                        Clique em "Nova Coluna" para adicionar um mapeamento.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">COLUNA MONDAY</TableHead>
                            <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">CAMPO CPX</TableHead>
                            <TableHead className="w-[100px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {mappingColumns.map((column) => (
                          <TableRow key={column.id} className="h-6">
                            <TableCell className="py-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono">
                                  {column.mondayColumnTitle}
                                </span>
                                <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                                  {(column as any).columnType || "desconhecido"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono">
                                  {column.cpxField === 'generalColumns' 
                                    ? `generalColumns [${mappingColumns
                                        .filter(col => col.cpxField === 'generalColumns')
                                        .findIndex(col => col.id === column.id) + 1}]`
                                    : column.cpxField === 'descricao'
                                    ? `descricao [${mappingColumns
                                        .filter(col => col.cpxField === 'descricao')
                                        .findIndex(col => col.id === column.id) + 1}]`
                                    : column.cpxField
                                  }
                                </span>
                                {/* Tag f(x) verde para função de transformação */}
                                {column.transformFunction && column.transformFunction.trim() && (
                                  <Badge variant="outline" className="text-xs font-mono bg-green-50 text-green-700 border-green-200">
                                    f(x)
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                                  {column.cpxField === 'objeto' ? 'texto' :
                                   column.cpxField === 'tipo' ? 'seleção' :
                                   column.cpxField === 'cliente' ? 'texto' :
                                   column.cpxField === 'sistema' ? 'texto' :
                                   column.cpxField === 'modulo' ? 'texto' :
                                   column.cpxField === 'responsavel' ? 'pessoa' :
                                   column.cpxField === 'solicitante' ? 'pessoa' :
                                   column.cpxField === 'aprovador' ? 'pessoa' :
                                   column.cpxField === 'agente' ? 'pessoa' :
                                   column.cpxField === 'descricao' ? 'texto longo' :
                                   column.cpxField === 'status' ? 'status' :
                                   column.cpxField === 'statusOrigem' ? 'origem' :
                                   'texto'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-0">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => editColumn(column)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteColumn(column.id)}
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )
            }
            </TabsContent>
            
            {/* Aba de valores padrão */}
            <TabsContent value="defaults" className="py-4">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    Configure valores padrão para campos quando não há mapeamento ou a API não retorna valor
                  </p>
                </div>
                
                {/* Tabela de valores padrão */}
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[200px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider">CAMPO</TableHead>
                        <TableHead className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">VALOR PADRÃO</TableHead>
                        <TableHead className="w-[100px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider">OBG-MAP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getDefaultableFields().map((fieldInfo) => (
                        <TableRow key={fieldInfo.field} className="h-9">
                          <TableCell className="py-0">
                            <span className="text-xs font-medium font-mono">
                              {fieldInfo.field}
                            </span>
                          </TableCell>
                          <TableCell className="py-0">
                            <Input
                              value={selectedMapping?.defaultValues?.[fieldInfo.field] || ""}
                              onChange={(e) => {
                                if (selectedMapping) {
                                  const newDefaults = {
                                    ...selectedMapping.defaultValues,
                                    [fieldInfo.field]: e.target.value
                                  };
                                  setSelectedMapping({
                                    ...selectedMapping,
                                    defaultValues: newDefaults
                                  });
                                  mappingForm.setValue("defaultValues", newDefaults);
                                }
                              }}
                              className="text-xs h-6 font-mono !text-xs"
                            />
                          </TableCell>
                          <TableCell className="py-0">
                            {(() => {
                              // Verifica se o campo está mapeado em alguma coluna
                              const isMapped = mappingColumns?.some((mapping: any) => 
                                mapping.cpxField === fieldInfo.field
                              ) || false;
                              
                              const obligatoryLetter = fieldInfo.required ? "S" : "N";
                              const mappedLetter = isMapped ? "S" : "N";
                              const badgeText = `${obligatoryLetter}-${mappedLetter}`;
                              
                              // Define cor baseada no status
                              let badgeColor = "bg-gray-100 text-gray-600 border-gray-200";
                              if (fieldInfo.required && isMapped) {
                                badgeColor = "bg-green-100 text-green-700 border-green-200";
                              } else if (fieldInfo.required && !isMapped) {
                                badgeColor = "bg-red-100 text-red-700 border-red-200";
                              } else if (!fieldInfo.required && isMapped) {
                                badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
                              }
                              
                              return (
                                <Badge 
                                  variant="secondary"
                                  className={`text-xs font-mono ${badgeColor}`}
                                >
                                  {badgeText}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            {/* Aba de filtros */}
            <TabsContent value="filtros" className="py-4">
              <Form {...mappingForm}>
                <div className="space-y-4">
                  <FormField
                    control={mappingForm.control}
                    name="mappingFilter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Condição de Filtragem (JavaScript)
                        </FormLabel>
                        <p className="text-xs text-gray-500 mb-2">
                          Defina uma função JavaScript para filtrar os itens do quadro Monday. 
                          Use a variável 'item' para acessar os dados de cada linha.
                        </p>
                        <FormControl>
                          <Textarea
                            placeholder={`// Exemplo: Filtrar por status específicos
return item.column_values.some(col => 
  col.column.title === "Status do processo" && 
  (col.text === "Em Análise Preliminar" || col.text === "Em Detalhamento Técnico")
);`}
                            className="font-mono text-sm min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Dicas de uso:</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Use <code className="bg-blue-100 px-1 rounded">item.column_values</code> para acessar os valores das colunas</li>
                      <li>• Acesse o título da coluna com <code className="bg-blue-100 px-1 rounded">col.column.title</code></li>
                      <li>• Use <code className="bg-blue-100 px-1 rounded">col.text</code> para o valor em texto da coluna</li>
                      <li>• A função deve retornar <code className="bg-blue-100 px-1 rounded">true</code> para incluir o item ou <code className="bg-blue-100 px-1 rounded">false</code> para excluí-lo</li>
                    </ul>
                  </div>
                </div>
              </Form>
            </TabsContent>
            
            {/* Botões que ficam abaixo do TabContent, condicionais por aba */}
            <div className="pt-4 border-t mt-4">
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  type="submit" 
                  form="mappingForm"
                  disabled={isSubmitting || isSaveDisabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : "Salvar"}
                </Button>
              </div>
            </div>
              </Tabs>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmação para exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o mapeamento "{selectedMapping?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  // Excluir o mapeamento via API
                  const response = await fetch(`/api/monday/mappings/${selectedMapping?.id}`, {
                    method: 'DELETE',
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Erro ao excluir mapeamento: ${response.status}`);
                  }
                  
                  toast({
                    title: "Mapeamento excluído",
                    description: `O mapeamento "${selectedMapping?.name}" foi excluído com sucesso.`,
                  });
                  
                  // Atualizar a lista de mapeamentos
                  queryClient.invalidateQueries({ queryKey: ['/api/monday/mappings'] });
                } catch (error) {
                  console.error("Erro ao excluir mapeamento:", error);
                  toast({
                    title: "Erro",
                    description: "Ocorreu um erro ao excluir o mapeamento. Tente novamente.",
                    variant: "destructive"
                  });
                } finally {
                  setIsSubmitting(false);
                  setIsDeleteDialogOpen(false);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal para configuração de conexões de serviços */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedConnection ? "Editar Conexão" : "Nova Conexão"} - {getServiceDisplayName(selectedService || "")}
            </DialogTitle>
            <DialogDescription>
              Configure as informações de conexão com o serviço externo.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onSubmitServiceConnection)} className="space-y-4">
              <FormField
                control={serviceForm.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={serviceForm.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token/Chave API</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input 
                          {...field} 
                          type={showServiceToken ? "text" : "password"} 
                          placeholder="Insira o token ou chave API"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowServiceToken(!showServiceToken)}
                        >
                          {showServiceToken ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                        {selectedService === "github" && (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Dropdown de repositórios GitHub - aparece após conexão bem-sucedida */}
              {selectedService === "github" && connectionStatus === 'success' && githubRepos.length > 0 && (
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
                control={serviceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descreva a finalidade desta conexão"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsServiceModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={isServiceSubmitting}
                >
                  {isServiceSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Modal para exclusão de conexão de serviço */}
      <AlertDialog open={isServiceDeleteDialogOpen} onOpenChange={setIsServiceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conexão com o serviço "{getServiceDisplayName(selectedConnection?.serviceName || "")}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={deleteServiceConnection}
            >
              {isServiceSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal para adicionar/editar mapeamento de coluna */}
      <Dialog open={isColumnModalOpen} onOpenChange={setIsColumnModalOpen}>
        <DialogContent 
          className="max-w-xl"
          offset={true}
        >
          <DialogHeader>
            <DialogTitle>{selectedColumn ? "Editar Mapeamento" : "Novo Mapeamento"}</DialogTitle>
            <DialogDescription>
              {selectedColumn 
                ? "Edite o mapeamento entre a coluna do Monday e o campo na aplicação." 
                : "Crie um novo mapeamento entre uma coluna do Monday e um campo na aplicação."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...columnForm}>
            <form onSubmit={columnForm.handleSubmit(onSubmitColumn)} className="space-y-4">
              <FormField
                control={columnForm.control}
                name="mondayColumnId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coluna do Monday</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        {...field}
                      >
                        <option value="">Selecione a coluna</option>
                        {mondayColumns?.filter(column => {
                          // Filtrar tipos de colunas não suportadas
                          const unsupportedTypes = ['subtasks', 'file', 'board_relation', 'mirror', 'button'];
                          if (unsupportedTypes.includes(column.type?.toLowerCase())) {
                            return false;
                          }
                          
                          // Se estamos editando, permitir a coluna atual
                          if (selectedColumn && selectedColumn.mondayColumnId === column.columnId) {
                            return true;
                          }
                          // Filtrar colunas que já estão mapeadas
                          return !mappingColumns.some(mapping => mapping.mondayColumnId === column.columnId);
                        }).map((column) => (
                          <option key={column.id} value={column.columnId} className="font-mono">
                            {column.title} [{column.type}]
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={columnForm.control}
                name="cpxField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campo na Aplicação</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        {...field}
                      >
                        <option value="">Selecione o campo</option>
                        {getDocumentosColumns().filter(column => {
                          // Se estamos editando, permitir o campo atual
                          if (selectedColumn && selectedColumn.cpxField === column.field) {
                            return true;
                          }
                          // Os campos generalColumns e descricao sempre devem estar disponíveis (podem receber múltiplas colunas)
                          if (column.field === "generalColumns" || column.field === "descricao") {
                            return true;
                          }
                          // Filtrar campos que já estão mapeados
                          return !mappingColumns.some(mapping => mapping.cpxField === column.field);
                        }).map((column) => (
                          <option key={column.field} value={column.field} className="font-mono">
                            {column.label} ({column.type})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={columnForm.control}
                name="transformFunction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função de Transformação (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Função de transformação de dados (JavaScript)" 
                        className="resize-none h-24 font-mono"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsColumnModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedColumn ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}