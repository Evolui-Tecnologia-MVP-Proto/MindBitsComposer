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
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usuarios" className="slide-in">
            <UserTable />
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
