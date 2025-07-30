import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  User,
  Play,
  Eye,
  FileText
} from "lucide-react";
import { type Documento, type Specialty } from "@shared/schema";
import { DocumentReviewModal } from "@/components/review/DocumentReviewModal";

export default function HomePage() {
  const { user } = useAuth();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null);

  // Buscar todos os documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar edições de documentos para identificar documentos em processo pelo usuário
  const { data: documentEditions = [] } = useQuery({
    queryKey: ["/api/document-editions"],
    enabled: !!user?.id
  });

  // Calcular contadores para Base de conhecimento OC
  const documentosARevisar = documentos.filter(doc => 
    doc.origem === "MindBits_CT" && doc.status === "Integrado"
  ).length;

  const documentosEmRevisao = documentos.filter(doc => 
    doc.status === "Em Processo"
  ).length;

  const documentosPublicados = documentos.filter(doc => 
    doc.status === "Concluido"
  ).length;

  // Calcular documentos MindBits_CT Integrados agrupados por responsável
  const documentosMindBitsIntegrados = documentos.filter(doc => 
    doc.origem === "MindBits_CT" && doc.status === "Integrado"
  );

  // Buscar especialidades do usuário logado
  const { data: userSpecialtyAssociations = [] } = useQuery({
    queryKey: ["/api/user-specialties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const res = await fetch(`/api/users/${user.id}/specialties`);
      if (res.ok) {
        return res.json();
      }
      return [];
    },
    enabled: !!user?.id
  });

  // Extrair apenas as especialidades das associações
  const userSpecialties = userSpecialtyAssociations.map((assoc: any) => assoc.specialty as Specialty);

  // Agrupar por responsável
  const documentosPorEspecialidade = documentosMindBitsIntegrados.reduce((acc, doc) => {
    const responsavel = doc.responsavel || "Sem responsável";
    acc[responsavel] = (acc[responsavel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Verificar se o responsável corresponde a um código de especialidade do usuário
  const isUserResponsibleForSpecialty = (responsavel: string) => {
    return userSpecialties.some((specialty: Specialty) => specialty.code === responsavel);
  };

  // Calcular documentos "em processo por mim" agrupados por responsável
  const documentosEmProcessoPorMim = documentos.filter(doc => {
    // Documento deve estar "Em Processo"
    if (doc.status !== "Em Processo") return false;
    
    // Verificar se o documento foi iniciado pelo usuário logado
    if (doc.userId === user?.id) return true;
    
    // Verificar se há edições ativas iniciadas pelo usuário logado
    const userEditions = (documentEditions as any[]).filter((edition: any) => 
      edition.documentId === doc.id && 
      edition.startedBy === user?.id &&
      (edition.status === "in_progress" || edition.status === "draft" || edition.status === "ready_to_revise")
    );
    
    return userEditions.length > 0;
  });

  const documentosEmProcessoPorMimPorResponsavel = documentosEmProcessoPorMim.reduce((acc, doc) => {
    const responsavel = doc.responsavel || "Sem responsável";
    acc[responsavel] = (acc[responsavel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtrar documentos integrados do usuário logado
  const documentosIntegradosDoUsuario = documentos.filter(doc => {
    return doc.status === "Integrado" && doc.userId === user?.id;
  });

  // Log temporário para verificar
  if (user?.id) {
    const integrados = documentos.filter(doc => doc.status === "Integrado");
    console.log(`Total integrados: ${integrados.length}, Do usuário ${user.id}: ${documentosIntegradosDoUsuario.length}`);
  }



  // Funções auxiliares para formatação da tabela
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Integrado": return "secondary";
      case "Em Processo": return "default";
      case "Concluido": return "default";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Integrado": return <CheckCircle2 className="h-3 w-3" />;
      case "Em Processo": return <Clock className="h-3 w-3" />;
      case "Concluido": return <CheckCircle2 className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const openViewModal = (documento: Documento) => {
    setSelectedDocument(documento);
    setViewModalOpen(true);
  };



  if (isLoading) {
    return (
      <div className="fade-in p-6 bg-gray-50 dark:bg-[#1F2937]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in p-6 bg-gray-50 dark:bg-[#1F2937]">
      <div className="space-y-8">
        {/* Base de conhecimento OC */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Base de conhecimento OC
            </h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Documentos a revisar
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {documentosARevisar}
                </div>
                <p className="text-xs text-muted-foreground">
                  Aguardando revisão
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Documentos em revisão
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {documentosEmRevisao}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em processo de revisão
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Documentos Publicados
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {documentosPublicados}
                </div>
                <p className="text-xs text-muted-foreground">
                  Concluídos e publicados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Documentos MindBits_CT Integrados por Especialidade */}
        {Object.keys(documentosPorEspecialidade).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Documentos MindBits_CT - Integrados por Especialidade
              </h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(documentosPorEspecialidade)
                .sort(([, a], [, b]) => b - a) // Ordenar por quantidade (decrescente)
                .map(([responsavel, quantidade]) => (
                <Card key={responsavel} className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                      {responsavel}
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="relative h-[80px]">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {quantidade} {quantidade === 1 ? "Integrado" : "Integrados"}
                      {documentosEmProcessoPorMimPorResponsavel[responsavel] && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {" e "}{documentosEmProcessoPorMimPorResponsavel[responsavel]} em processo por mim
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Button
                        size="sm"
                        variant={isUserResponsibleForSpecialty(responsavel) ? "default" : "secondary"}
                        disabled={!isUserResponsibleForSpecialty(responsavel)}
                        className={`h-7 px-2 text-xs ${
                          isUserResponsibleForSpecialty(responsavel) 
                            ? "bg-blue-600 hover:bg-blue-700 text-white" 
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => {
                          if (isUserResponsibleForSpecialty(responsavel)) {
                            setSelectedResponsavel(responsavel);
                            setReviewModalOpen(true);
                          }
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar Revisão
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Meus Documentos Integrados */}
        {documentosIntegradosDoUsuario.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Meus Documentos Integrados
              </h2>
              <Badge variant="outline" className="ml-2">
                {documentosIntegradosDoUsuario.length}
              </Badge>
            </div>
            
            <div className="bg-white dark:bg-[#0F172A] rounded-lg border dark:border-[#374151] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151]">
                    <TableHead className="dark:text-gray-200">Origem</TableHead>
                    <TableHead className="dark:text-gray-200">Descrição</TableHead>
                    <TableHead className="dark:text-gray-200">Responsável</TableHead>
                    <TableHead className="dark:text-gray-200">Sistema</TableHead>
                    <TableHead className="dark:text-gray-200">Módulo</TableHead>
                    <TableHead className="dark:text-gray-200">Status</TableHead>
                    <TableHead className="text-right dark:text-gray-200">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentosIntegradosDoUsuario.map((documento) => (
                    <TableRow key={documento.id} className="dark:border-[#374151]">
                      <TableCell className="dark:text-gray-200">
                        <div className="flex items-center">
                          {documento.origem === "Monday" ? (
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                              Monday
                            </div>
                          ) : (
                            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium">
                              {documento.origem}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium dark:text-gray-200 max-w-md">
                        <div className="truncate" title={documento.objeto}>
                          {documento.objeto}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-gray-200">
                        {documento.responsavel || "-"}
                      </TableCell>
                      <TableCell className="dark:text-gray-200">
                        {documento.sistema || "-"}
                      </TableCell>
                      <TableCell className="dark:text-gray-200">
                        {documento.modulo || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(documento.status) as any}
                          className="flex items-center gap-1 whitespace-nowrap w-fit"
                        >
                          {getStatusIcon(documento.status)}
                          {documento.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewModal(documento)}
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

      </div>

      {/* Modal de Revisão */}
      <DocumentReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        responsavel={selectedResponsavel}
      />

      {/* Modal de Visualização de Documento */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl dark:bg-[#0F1729] dark:border-[#374151]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-gray-200">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              Visualizar Documento
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="bg-gray-50 dark:bg-[#1E293B] p-4 rounded-lg border dark:border-[#374151]">
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-200">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.objeto}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <div className="mt-1">
                      <Badge
                        variant={getStatusBadgeVariant(selectedDocument.status) as any}
                        className="flex items-center gap-1 whitespace-nowrap w-fit"
                      >
                        {getStatusIcon(selectedDocument.status)}
                        {selectedDocument.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Origem</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.origem}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Responsável</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.responsavel || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sistema</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.sistema || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Módulo</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.modulo || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cliente</label>
                    <p className="text-gray-900 dark:text-gray-300">{selectedDocument.cliente || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</label>
                    <p className="text-gray-900 dark:text-gray-300">{formatDate(selectedDocument.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* ID do Documento */}
              <div className="bg-gray-50 dark:bg-[#1E293B] p-4 rounded-lg border dark:border-[#374151]">
                <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Identificação</h3>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ID do Documento</label>
                  <p className="text-gray-900 dark:text-gray-300 font-mono text-sm">{selectedDocument.id}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
