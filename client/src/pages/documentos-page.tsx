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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Trash2,
  Image,
  FileJson,
  FileSpreadsheet,
  FileX,
  Pencil
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Definição dos tipos de anexos
  type TipoAnexo = "Imagem" | "DOC" | "XLX" | "PDF" | "TXT" | "JSON" | "Outro";
  
  // Interface para anexos
  interface Anexo {
    id: number;
    tipo: TipoAnexo;
    nome: string;
  }
  
  // Dados de exemplo para documentos
  const documentosIntegrados = [
    { 
      id: 1, 
      nome: "Contrato de Serviços", 
      data: "19/05/2025", 
      tipo: "PDF", 
      status: "Ativo",
      origem: "Monday",
      dataOrigem: "18/05/2025",
      dataIntegracao: "19/05/2025",
      statusOrigem: "Completo",
      descricaoOrigem: "Contrato de prestação de serviços aprovado pelo cliente. Este documento serve como base para todas as atividades relacionadas ao projeto e define escopo, prazos e termos de pagamento.",
      anexos: [
        { id: 1, tipo: "PDF" as TipoAnexo, nome: "Contrato_Assinado.pdf" },
        { id: 2, tipo: "DOC" as TipoAnexo, nome: "Termos_Adicionais.docx" },
        { id: 3, tipo: "Imagem" as TipoAnexo, nome: "Assinatura_Cliente.jpg" }
      ]
    },
    { 
      id: 2, 
      nome: "Proposta Comercial", 
      data: "18/05/2025", 
      tipo: "DOCX", 
      status: "Ativo",
      origem: "EVO-CTx",
      dataOrigem: "15/05/2025",
      dataIntegracao: "18/05/2025",
      statusOrigem: "Aprovado",
      descricaoOrigem: "Proposta comercial final enviada ao cliente com detalhamento dos serviços, cronograma e valores.",
      anexos: [
        { id: 4, tipo: "XLX" as TipoAnexo, nome: "Planilha_Custos.xlsx" },
        { id: 5, tipo: "PDF" as TipoAnexo, nome: "Proposta_Final.pdf" },
        { id: 6, tipo: "Imagem" as TipoAnexo, nome: "Logo_Cliente.png" },
        { id: 7, tipo: "JSON" as TipoAnexo, nome: "Dados_Integração.json" }
      ]
    },
    { 
      id: 3, 
      nome: "Termo de Compromisso", 
      data: "15/05/2025", 
      tipo: "PDF", 
      status: "Arquivado",
      origem: "Monday",
      dataOrigem: "12/05/2025",
      dataIntegracao: "15/05/2025",
      statusOrigem: "Desatualizado",
      descricaoOrigem: "Versão inicial do termo de compromisso para o projeto. Este documento foi substituído pela versão final do contrato.",
      anexos: [
        { id: 8, tipo: "PDF" as TipoAnexo, nome: "Termo_Original.pdf" },
        { id: 9, tipo: "TXT" as TipoAnexo, nome: "Comentários.txt" },
        { id: 10, tipo: "Outro" as TipoAnexo, nome: "Arquivo_Sistema.bin" }
      ]
    }
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
  
  const getAnexoIcon = (tipo: TipoAnexo) => {
    switch (tipo) {
      case "PDF":
        return <FileType className="h-5 w-5 text-red-500" />;
      case "DOC":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "XLX":
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case "Imagem":
        return <Image className="h-5 w-5 text-purple-500" />;
      case "TXT":
        return <File className="h-5 w-5 text-gray-500" />;
      case "JSON":
        return <FileJson className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileX className="h-5 w-5 text-gray-400" />;
    }
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

  const openViewModal = (documento: any) => {
    setSelectedDocument(documento);
    setIsViewModalOpen(true);
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => openViewModal(documento)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
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

  const renderViewModal = () => {
    if (!selectedDocument) return null;
    
    const isIntegrated = activeTab === "integrados";
    
    return (
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTipoIcon(selectedDocument.tipo)}
              <span>{selectedDocument.nome}</span>
            </DialogTitle>
            <DialogDescription>
              Detalhes do documento {isIntegrated ? "integrado" : ""}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {isIntegrated && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Origem</p>
                  <p className="text-sm">{selectedDocument.origem}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Nome</p>
                  <p className="text-sm">{selectedDocument.nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                  <div>{getStatusBadge(selectedDocument.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Data Origem</p>
                  <p className="text-sm">{selectedDocument.dataOrigem}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Data Integração</p>
                  <p className="text-sm">{selectedDocument.dataIntegracao}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status Origem</p>
                  <p className="text-sm">{selectedDocument.statusOrigem}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500 mb-1">Descrições Origem</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md text-gray-700 max-h-24 overflow-y-auto">
                    {selectedDocument.descricaoOrigem}
                  </p>
                </div>
                
                {selectedDocument.anexos && selectedDocument.anexos.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <p className="text-sm font-medium text-gray-500 mb-2">Anexos</p>
                    <div className="bg-gray-50 rounded-md border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nome
                            </th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedDocument.anexos.map((anexo: Anexo) => (
                            <tr key={anexo.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getAnexoIcon(anexo.tipo)}
                                  <span className="ml-2 text-xs text-gray-500">{anexo.tipo}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {anexo.nome}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Pencil className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!isIntegrated && (
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Nome</p>
                  <p className="text-sm">{selectedDocument.nome}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                  <div>{getStatusBadge(selectedDocument.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Data</p>
                  <p className="text-sm">{selectedDocument.data}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Tipo</p>
                  <div className="flex items-center">
                    {getTipoIcon(selectedDocument.tipo)}
                    <span className="ml-2">{selectedDocument.tipo}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
      
      {renderViewModal()}

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