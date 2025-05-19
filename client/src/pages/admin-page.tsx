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
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, ExternalLink, Eye, EyeOff } from "lucide-react";
import UserTable from "@/components/UserTable";

// Tipo para representar o mapeamento de quadros
type BoardMapping = {
  id: string;
  name: string;
  boardId: string;
  description: string;
  statusColumn: string;
  responsibleColumn: string;
  lastSync: string | null;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Dados de exemplo para a tabela
  const [boardMappings, setBoardMappings] = useState<BoardMapping[]>([
    {
      id: "1",
      name: "Quadro de Projetos",
      boardId: "12345678",
      description: "Quadro principal para gerenciamento de projetos",
      statusColumn: "status",
      responsibleColumn: "person",
      lastSync: "19/05/2025 10:45"
    },
    {
      id: "2",
      name: "Quadro de Tarefas",
      boardId: "87654321",
      description: "Tarefas diárias da equipe",
      statusColumn: "status",
      responsibleColumn: "owner",
      lastSync: "19/05/2025 09:30"
    },
    {
      id: "3",
      name: "Quadro de Bugs",
      boardId: "24681357",
      description: "Rastreamento de bugs e correções",
      statusColumn: "stage",
      responsibleColumn: "assignee",
      lastSync: null
    }
  ]);
  
  const openEditModal = (mapping: BoardMapping | null = null) => {
    setSelectedMapping(mapping);
    setIsModalOpen(true);
  };
  
  const openDeleteDialog = (mapping: BoardMapping) => {
    setSelectedMapping(mapping);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteMapping = () => {
    if (selectedMapping) {
      setBoardMappings(currentMappings => 
        currentMappings.filter(mapping => mapping.id !== selectedMapping.id)
      );
      setIsDeleteDialogOpen(false);
      setSelectedMapping(null);
    }
  };
  
  const testBoardConnection = (boardId: string) => {
    setIsTesting(true);
    setTestResult(null);
    
    // Simulando um teste de conexão
    setTimeout(() => {
      if (boardId && boardId.trim() !== "") {
        // Verificar se o ID do quadro é válido (exemplo simples)
        const isValid = boardId.length >= 6 && /^\d+$/.test(boardId);
        
        if (isValid) {
          setTestResult({
            success: true,
            message: "Quadro encontrado! Conexão estabelecida com sucesso."
          });
        } else {
          setTestResult({
            success: false,
            message: "ID de quadro inválido ou não encontrado. Verifique o ID e tente novamente."
          });
        }
      } else {
        setTestResult({
          success: false,
          message: "Por favor, informe um ID de quadro válido."
        });
      }
      
      setIsTesting(false);
    }, 1500);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert("Por favor, informe uma chave de API válida.");
      return;
    }

    setApiKeySaving(true);

    // Simula o envio da API Key para o servidor
    setTimeout(() => {
      // Aqui seria feita a chamada para a API para salvar a chave
      console.log("API Key salva:", apiKey);
      
      setApiKeySaving(false);
      setApiKeySaved(true);
      
      // Reset o estado de "salvo" após alguns segundos
      setTimeout(() => {
        setApiKeySaved(false);
      }, 3000);
    }, 1000);
  };

  // Modal de configuração do mapeamento
  const renderConfigModal = () => {
    const isEditing = selectedMapping !== null;
    
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Mapeamento" : "Novo Mapeamento"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do mapeamento com o Monday.com
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="mapping-name" className="text-sm font-medium text-gray-700">
                  Nome do Mapeamento
                </label>
                <input
                  id="mapping-name"
                  name="mapping-name"
                  defaultValue={selectedMapping?.name || ""}
                  placeholder="Ex: Quadro de Projetos"
                  className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={selectedMapping?.description || ""}
                  placeholder="Descrição breve deste mapeamento"
                  className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="board-id" className="text-sm font-medium text-gray-700">
                  ID do Quadro
                </label>
                <div className="flex space-x-2">
                  <input
                    id="board-id"
                    name="board-id"
                    defaultValue={selectedMapping?.boardId || ""}
                    placeholder="Ex: 12345678"
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const boardIdInput = document.getElementById('board-id') as HTMLInputElement;
                      testBoardConnection(boardIdInput.value);
                    }}
                    className="whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-1 align-[-2px]"></span>
                        Testando...
                      </>
                    ) : (
                      "Conectar"
                    )}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 px-3 py-2 rounded-md text-sm ${
                    testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testResult.message}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  O ID do quadro pode ser encontrado na URL do quadro no Monday.com
                </p>
              </div>
              

            </div>
          </div>
          
          <DialogFooter>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 ml-3 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setIsModalOpen(false)}
            >
              {isEditing ? "Salvar Alterações" : "Criar Mapeamento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Administração</h2>
      </div>
      
      {renderConfigModal()}
      
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
            <AlertDialogAction onClick={handleDeleteMapping} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6">
        <Tabs 
          defaultValue="usuarios" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="integracao-monday">Integração Monday</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usuarios" className="slide-in">
            <UserTable />
          </TabsContent>
          
          <TabsContent value="integracao-monday" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Integração com Monday.com</h3>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="monday-api-key" className="block text-sm font-medium text-gray-700 mb-1">
                    API Key do Monday.com
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type={showApiKey ? "text" : "password"}
                      name="monday-api-key"
                      id="monday-api-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 min-w-0 block px-3 py-2 rounded-l-md border border-r-0 border-gray-300 focus:ring-primary focus:border-primary"
                      placeholder="Informe a chave de API do Monday.com"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={saveApiKey}
                      disabled={apiKeySaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {apiKeySaving ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-1.5 align-[-2px]"></span>
                          Salvando...
                        </>
                      ) : apiKeySaved ? (
                        "Salvo ✓"
                      ) : (
                        "Salvar"
                      )}
                    </button>
                  </div>
                  {apiKeySaved && (
                    <div className="mt-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm">
                      Chave de API salva com sucesso!
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    A API Key é necessária para integrar com o Monday.com. Você pode encontrá-la nas configurações da sua conta.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Mapeamento de Quadros</h4>
                    <button
                      onClick={() => openEditModal()}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Novo Mapeamento
                    </button>
                  </div>
                  
                  <div className="mt-4 border rounded-md">
                    <Table>
                      <TableCaption>Lista de mapeamentos de quadros do Monday.com</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/5">Nome</TableHead>
                          <TableHead className="w-1/6">ID do Quadro</TableHead>
                          <TableHead className="w-1/4">Descrição</TableHead>
                          <TableHead className="w-1/6">Última Sincronização</TableHead>
                          <TableHead className="w-1/6 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {boardMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell className="font-medium">{mapping.name}</TableCell>
                            <TableCell>{mapping.boardId}</TableCell>
                            <TableCell className="text-sm text-gray-600">{mapping.description}</TableCell>
                            <TableCell>
                              {mapping.lastSync ? (
                                <span className="text-sm">{mapping.lastSync}</span>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Nunca sincronizado</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => openEditModal(mapping)}
                                  className="p-1 text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50"
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteDialog(mapping)}
                                  className="p-1 text-red-600 hover:text-red-800 rounded-md hover:bg-red-50"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <a
                                  href={`https://monday.com/boards/${mapping.boardId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-50"
                                  title="Abrir no Monday.com"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {boardMappings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                              Nenhum mapeamento configurado. Clique em "Novo Mapeamento" para adicionar.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-5">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Sincronização de Dados</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        id="sync-automatic"
                        name="sync-type"
                        type="radio"
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        defaultChecked
                      />
                      <label htmlFor="sync-automatic" className="block text-sm font-medium text-gray-700">
                        Sincronização Automática
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        id="sync-manual"
                        name="sync-type"
                        type="radio"
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="sync-manual" className="block text-sm font-medium text-gray-700">
                        Sincronização Manual
                      </label>
                    </div>
                    
                    <div className="pl-7">
                      <label htmlFor="sync-interval" className="block text-sm font-medium text-gray-700 mb-1">
                        Intervalo de Sincronização (minutos)
                      </label>
                      <input
                        type="number"
                        name="sync-interval"
                        id="sync-interval"
                        min="5"
                        defaultValue="30"
                        className="rounded-md border border-gray-300 focus:ring-primary focus:border-primary px-3 py-2 w-28"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-5">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Sincronizar Agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuracao" className="slide-in">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações do Sistema</h3>
              <p className="text-gray-500 italic">Esta seção está em desenvolvimento.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
