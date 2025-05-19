import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, Upload, Download, Clock, Check, FileSearch } from "lucide-react";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("integrados");

  // Dados de exemplo para documentos
  const documentosIntegrados = [
    { id: 1, nome: "Contrato de Serviços", data: "19/05/2025", tipo: "PDF", status: "Ativo" },
    { id: 2, nome: "Proposta Comercial", data: "18/05/2025", tipo: "DOCX", status: "Ativo" },
    { id: 3, nome: "Termo de Compromisso", data: "15/05/2025", tipo: "PDF", status: "Arquivado" }
  ];

  const documentosEmProcesso = [
    { id: 4, nome: "Aditivo Contratual", data: "19/05/2025", tipo: "PDF", status: "Em aprovação" },
    { id: 5, nome: "Solicitação de Mudança", data: "17/05/2025", tipo: "DOCX", status: "Em revisão" }
  ];

  const documentosDistribuidos = [
    { id: 6, nome: "Manual do Usuário", data: "16/05/2025", tipo: "PDF", status: "Distribuído" },
    { id: 7, nome: "Procedimento Operacional", data: "14/05/2025", tipo: "PDF", status: "Distribuído" },
    { id: 8, nome: "Guia de Referência", data: "12/05/2025", tipo: "DOCX", status: "Distribuído" }
  ];

  const getTipoIcon = (tipo: string) => {
    return tipo === "PDF" ? 
      <File className="h-10 w-10 text-red-500" /> : 
      <File className="h-10 w-10 text-blue-500" />;
  };

  const renderDocumentoCard = (documento: any) => (
    <Card key={documento.id} className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{documento.nome}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {documento.data}
            </CardDescription>
          </div>
          {getTipoIcon(documento.tipo)}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-gray-500">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            documento.status === "Ativo" ? "bg-green-100 text-green-800" :
            documento.status === "Arquivado" ? "bg-gray-100 text-gray-800" :
            documento.status === "Em aprovação" ? "bg-yellow-100 text-yellow-800" :
            documento.status === "Em revisão" ? "bg-blue-100 text-blue-800" :
            "bg-purple-100 text-purple-800"
          }`}>
            {documento.status === "Ativo" && <Check className="mr-1 h-3 w-3" />}
            {documento.status === "Em aprovação" && <Clock className="mr-1 h-3 w-3" />}
            {documento.status === "Em revisão" && <FileSearch className="mr-1 h-3 w-3" />}
            {documento.status}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-between w-full">
          <Button variant="outline" size="sm" className="text-xs">
            <FileSearch className="mr-1 h-3.5 w-3.5" />
            Visualizar
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />
            Baixar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="fade-in">
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">Documentos</h2>
        
        <div className="mt-3 sm:mt-0">
          <Button className="inline-flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <Tabs 
          defaultValue="integrados" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="integrados">Integrados</TabsTrigger>
            <TabsTrigger value="em-processo">Em Processo</TabsTrigger>
            <TabsTrigger value="distribuidos">Distribuídos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrados" className="slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documentosIntegrados.map(renderDocumentoCard)}
              {documentosIntegrados.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  Nenhum documento integrado encontrado.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="em-processo" className="slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documentosEmProcesso.map(renderDocumentoCard)}
              {documentosEmProcesso.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  Nenhum documento em processo encontrado.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="distribuidos" className="slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documentosDistribuidos.map(renderDocumentoCard)}
              {documentosDistribuidos.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  Nenhum documento distribuído encontrado.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}