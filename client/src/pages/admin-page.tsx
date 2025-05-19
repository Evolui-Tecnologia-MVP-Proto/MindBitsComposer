import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, ExternalLink } from "lucide-react";
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
  const [selectedMapping, setSelectedMapping] = useState<BoardMapping | null>(null);
  
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
                <label htmlFor="board-id" className="text-sm font-medium text-gray-700">
                  ID do Quadro
                </label>
                <input
                  id="board-id"
                  name="board-id"
                  defaultValue={selectedMapping?.boardId || ""}
                  placeholder="Ex: 12345678"
                  className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-gray-500">
                  O ID do quadro pode ser encontrado na URL do quadro no Monday.com
                </p>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="status-column" className="text-sm font-medium text-gray-700">
                    Coluna de Status
                  </label>
                  <input
                    id="status-column"
                    name="status-column"
                    defaultValue={selectedMapping?.statusColumn || ""}
                    placeholder="Ex: status"
                    className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="responsible-column" className="text-sm font-medium text-gray-700">
                    Coluna de Responsável
                  </label>
                  <input
                    id="responsible-column"
                    name="responsible-column"
                    defaultValue={selectedMapping?.responsibleColumn || ""}
                    placeholder="Ex: person"
                    className="px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Verificar Colunas
                </button>
                <span className="ml-2 text-xs text-gray-500">
                  Obtém a lista de colunas disponíveis neste quadro
                </span>
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
                      type="password"
                      name="monday-api-key"
                      id="monday-api-key"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-primary focus:border-primary"
                      placeholder="Informe a chave de API do Monday.com"
                    />
                    <button
                      type="button"
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Salvar
                    </button>
                  </div>
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
