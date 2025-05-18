import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("struct");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 fade-in">
        <h1 className="text-2xl font-bold mb-6">Templates</h1>
        
        <Tabs 
          defaultValue="struct" 
          onValueChange={(value) => setActiveTab(value)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="struct">Struct Templates</TabsTrigger>
            <TabsTrigger value="out">Out Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="struct" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Struct Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Templates estruturais para definição de modelos de dados e interfaces.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Template cards irão aqui */}
                  <Card className="border border-gray-200 hover:border-blue-400 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Modelo Base</h3>
                      <p className="text-sm text-gray-600">Template estrutural padrão para novos projetos</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200 hover:border-blue-400 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Interface API</h3>
                      <p className="text-sm text-gray-600">Estrutura para definição de interfaces de API</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="out" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Out Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Templates de saída para geração de relatórios e documentos.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Template cards irão aqui */}
                  <Card className="border border-gray-200 hover:border-blue-400 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Relatório PDF</h3>
                      <p className="text-sm text-gray-600">Template para geração de relatórios em PDF</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200 hover:border-blue-400 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">Documento JSON</h3>
                      <p className="text-sm text-gray-600">Estrutura para exportação de dados em formato JSON</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}