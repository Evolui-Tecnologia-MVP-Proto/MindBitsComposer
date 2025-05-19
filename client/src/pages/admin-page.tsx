import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserTable from "@/components/UserTable";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("usuarios");

  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Administração</h2>
      </div>

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
                  <h4 className="text-md font-medium text-gray-900 mb-4">Mapeamento de Quadros</h4>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="board-id" className="block text-sm font-medium text-gray-700">
                        ID do Quadro Principal
                      </label>
                      <input
                        type="text"
                        name="board-id"
                        id="board-id"
                        className="rounded-md border border-gray-300 focus:ring-primary focus:border-primary px-3 py-2"
                        placeholder="Digite o ID do quadro"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="status-column" className="block text-sm font-medium text-gray-700">
                          Coluna de Status
                        </label>
                        <input
                          type="text"
                          name="status-column"
                          id="status-column"
                          className="rounded-md border border-gray-300 focus:ring-primary focus:border-primary px-3 py-2"
                          placeholder="Nome da coluna de status"
                        />
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="responsible-column" className="block text-sm font-medium text-gray-700">
                          Coluna de Responsável
                        </label>
                        <input
                          type="text"
                          name="responsible-column"
                          id="responsible-column"
                          className="rounded-md border border-gray-300 focus:ring-primary focus:border-primary px-3 py-2"
                          placeholder="Nome da coluna de responsável"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 flex">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Testar Conexão
                    </button>
                    
                    <button
                      type="button"
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Salvar Configurações
                    </button>
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
