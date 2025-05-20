import { useState } from "react";
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
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import UserTable from "@/components/UserTable";
import { queryClient } from "@/lib/queryClient";

// Definições de tipos simples
type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  description: string;
  statusColumn: string;
  responsibleColumn: string;
  lastSync: string | null;
  colunas?: number;
};

type ServiceConnection = {
  id: string;
  serviceName: string;
  token: string;
  description: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const { toast } = useToast();
  
  // Estados para gerenciar modais e seleções
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isServiceDeleteDialogOpen, setIsServiceDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ServiceConnection | null>(null);
  
  // Queries
  const { data: mappingsData, isLoading: mappingsIsLoading, error: mappingsError } = useQuery<BoardMapping[]>({
    queryKey: ['/api/monday/mappings'],
  });
  
  const { data: connections = [] } = useQuery<ServiceConnection[]>({
    queryKey: ['/api/service-connections'],
  });
  
  // Funções para abrir modal de edição/exclusão
  const openEditModal = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsModalOpen(true);
    
    toast({
      title: "Editar mapeamento",
      description: `Abrindo modal para editar o mapeamento "${mapping.name}"`,
    });
  };
  
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
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
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Mapeamentos de Quadros do Monday</CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMapping(null);
                        setIsModalOpen(true);
                        toast({
                          title: "Novo mapeamento",
                          description: "Abrindo modal para criar um novo mapeamento",
                        });
                      }}
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
                            <TableHead>Nome</TableHead>
                            <TableHead>ID do Quadro</TableHead>
                            <TableHead>Última Sincronização</TableHead>
                            <TableHead>Colunas</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappingsData.map((mapping: BoardMapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell className="font-medium">{mapping.name}</TableCell>
                              <TableCell>{mapping.boardId}</TableCell>
                              <TableCell>{mapping.lastSync ? new Date(mapping.lastSync).toLocaleString() : "Nunca"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {mapping.colunas || 0} cols
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
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
                        setSelectedService("monday");
                        setSelectedConnection(connections.find(c => c.serviceName === "monday") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração Monday.com",
                          description: "Abrindo modal para configurar integração com Monday.com",
                        });
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
                        setSelectedService("github");
                        setSelectedConnection(connections.find(c => c.serviceName === "github") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração GitHub",
                          description: "Abrindo modal para configurar integração com GitHub",
                        });
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
                        setSelectedService("openai");
                        setSelectedConnection(connections.find(c => c.serviceName === "openai") || null);
                        setIsServiceModalOpen(true);
                        toast({
                          title: "Configuração OpenAI",
                          description: "Abrindo modal para configurar integração com OpenAI",
                        });
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
    </div>
  );
}