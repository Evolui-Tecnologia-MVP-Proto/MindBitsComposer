import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Building } from "lucide-react";
import { SpecialtiesTab } from "@/components/specialties/SpecialtiesTab";

export default function CadastrosGeraisPage() {
  return (
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
          <Tabs defaultValue="especialidades" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 dark:bg-[#0F172A]">
              <TabsTrigger value="especialidades">Áreas de Especialidade</TabsTrigger>
              <TabsTrigger value="a_implementar">A Implementar</TabsTrigger>
            </TabsList>

            <TabsContent value="especialidades" className="space-y-4">
              <SpecialtiesTab />
            </TabsContent>

            <TabsContent value="a_implementar" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle>A Implementar</CardTitle>
                  </div>
                  <CardDescription>
                    Funcionalidades e melhorias a serem implementadas
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
          </Tabs>
        </div>
      </div>
  );
}