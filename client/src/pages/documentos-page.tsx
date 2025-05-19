import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  File, 
  Upload, 
  Download, 
  Clock, 
  Check, 
  FileSearch, 
  FileType, 
  FileText,
  Eye,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

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
      <FileType className="h-5 w-5 text-red-500" /> : 
      <FileText className="h-5 w-5 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
    let variant = "default";
    let icon = null;
    
    switch(status) {
      case "Ativo":
        variant = "success";
        icon = <Check className="mr-1 h-3 w-3" />;
        break;
      case "Arquivado":
        variant = "secondary";
        break;
      case "Em aprovação":
        variant = "warning";
        icon = <Clock className="mr-1 h-3 w-3" />;
        break;
      case "Em revisão":
        variant = "default";
        icon = <FileSearch className="mr-1 h-3 w-3" />;
        break;
      case "Distribuído":
        variant = "outline";
        break;
      default:
        variant = "default";
    }
    
    return (
      <Badge variant={variant as any} className="flex items-center gap-1 whitespace-nowrap">
        {icon}
        {status}
      </Badge>
    );
  };

  const renderDocumentosTable = (documentos: any[]) => (
    <Table>
      <TableCaption>{documentos.length === 0 ? "Nenhum documento encontrado" : "Lista de documentos"}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Tipo</TableHead>
          <TableHead>Nome do Documento</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.map((documento) => (
          <TableRow key={documento.id}>
            <TableCell>
              <div className="flex items-center">
                {getTipoIcon(documento.tipo)}
                <span className="ml-2 text-xs text-gray-500">{documento.tipo}</span>
              </div>
            </TableCell>
            <TableCell className="font-medium">{documento.nome}</TableCell>
            <TableCell>
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {documento.data}
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(documento.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {documentos.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-6 text-gray-500">
              Nenhum documento encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
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
            {renderDocumentosTable(documentosIntegrados)}
          </TabsContent>
          
          <TabsContent value="em-processo" className="slide-in">
            {renderDocumentosTable(documentosEmProcesso)}
          </TabsContent>
          
          <TabsContent value="distribuidos" className="slide-in">
            {renderDocumentosTable(documentosDistribuidos)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}