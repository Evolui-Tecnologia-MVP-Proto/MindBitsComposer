import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Building, Users, Tags, MapPin, Phone } from "lucide-react";
import Layout from "@/components/Layout";

export default function CadastrosGeraisPage() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8" data-page="cadastros-gerais">
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg bg-gray-50 dark:bg-[#0F172A] p-6 border border-gray-200 dark:border-[#374151]">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280]">
                  Cadastros Gerais
                </h1>
                <p className="text-muted-foreground">
                  Gerencie os cadastros básicos do sistema
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="empresas" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="categorias">Categorias</TabsTrigger>
              <TabsTrigger value="localizacoes">Localizações</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>

            <TabsContent value="empresas" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Empresas</CardTitle>
                  </div>
                  <CardDescription>
                    Cadastro e gerenciamento de empresas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clientes" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Clientes</CardTitle>
                  </div>
                  <CardDescription>
                    Cadastro e gerenciamento de clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categorias" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Tags className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Categorias</CardTitle>
                  </div>
                  <CardDescription>
                    Cadastro e gerenciamento de categorias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Tags className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localizacoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Localizações</CardTitle>
                  </div>
                  <CardDescription>
                    Cadastro e gerenciamento de localizações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contatos" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Contatos</CardTitle>
                  </div>
                  <CardDescription>
                    Cadastro e gerenciamento de contatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Funcionalidade em desenvolvimento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}