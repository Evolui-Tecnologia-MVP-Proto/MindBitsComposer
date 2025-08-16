import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  User,
  Play,
  Filter,
  FilterX,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Documento, type Specialty } from "@shared/schema";
import { DocumentReviewModal } from "@/components/review/DocumentReviewModal";
import { DocsProcessEmbed } from "@/components/documentos/tables/DocsProcessEmbed";


export default function HomePage() {
  const { user } = useAuth();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("revisoes-ct-rag");
  const [tabContentCollapsed, setTabContentCollapsed] = useState(true);

  // Função para alternar colapso do conteúdo da tab
  const toggleTabContentCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContentCollapsed(!tabContentCollapsed);
  };

  // Buscar todos os documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  // Buscar edições de documentos para identificar documentos em processo pelo usuário
  const { data: documentEditions = [] } = useQuery({
    queryKey: ["/api/document-editions"],
    enabled: !!user?.id
  });

  // DEBUG: Vamos verificar todos os status disponíveis
  console.log("🔍 DEBUG - Todos os documentos recebidos:", documentos.length);
  const statusUnicos = [...new Set(documentos.map(doc => doc.status))];
  console.log("🔍 DEBUG - Status únicos encontrados:", statusUnicos);
  console.log("🔍 DEBUG - Documentos com status 'encerrado':", documentos.filter(doc => doc.status === "encerrado"));
  
  // Vamos também verificar documentos com status semelhante
  statusUnicos.forEach(status => {
    const count = documentos.filter(doc => doc.status === status).length;
    console.log(`📊 Status "${status}": ${count} documentos`);
  });

  // Calcular contadores para Base de conhecimento OC
  const documentosARevisar = documentos.filter(doc => 
    doc.origem === "MindBits_CT" && doc.status === "Integrado"
  ).length;

  const documentosEmRevisao = documentos.filter(doc => 
    doc.status === "Em Processo"
  ).length;

  const documentosPublicados = documentos.filter(doc => 
    doc.status === "encerrado"
  ).length;

  console.log("🔍 DEBUG - Documentos finalizados calculado:", documentosPublicados);

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

  // Calcular quantos documentos a revisar estão na alçada do usuário
  const documentosARevisarNaMinhaAlcada = documentos.filter(doc => 
    doc.origem === "MindBits_CT" && 
    doc.status === "Integrado" && 
    doc.responsavel &&
    isUserResponsibleForSpecialty(doc.responsavel)
  ).length;

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

  // Calcular total de documentos em processo por mim (todas as especialidades)
  const totalDocumentosEmProcessoPorMim = documentosEmProcessoPorMim.length;

  // Calcular documentos finalizados por mim
  const documentosFinalizadosPorMim = documentos.filter(doc => {
    // Documento deve estar "encerrado"
    if (doc.status !== "encerrado") return false;
    
    // Verificar se o documento foi iniciado pelo usuário logado
    if (doc.userId === user?.id) return true;
    
    // Verificar se há edições iniciadas pelo usuário logado
    const userEditions = (documentEditions as any[]).filter((edition: any) => 
      edition.documentId === doc.id && 
      edition.startedBy === user?.id
    );
    
    return userEditions.length > 0;
  });

  // Calcular total de documentos finalizados por mim (todas as especialidades)
  const totalDocumentosFinalizadosPorMim = documentosFinalizadosPorMim.length;

  // Função para formatar data
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
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
    <div className="fade-in px-3.5 py-1 bg-gray-50 dark:bg-[#1F2937] h-full flex flex-col">
      <div className="flex flex-col flex-1 min-h-0 gap-[10px]">
        
        {/* Sistema de Tabs Principal */}
        <Tabs 
          defaultValue="revisoes-ct-rag" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-[#0F172A]">
            <TabsTrigger value="revisoes-ct-rag" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF] flex items-center justify-between px-3">
              <span>Revisões CT → RAG</span>
              {activeTab === "revisoes-ct-rag" && (
                <button 
                  onClick={toggleTabContentCollapse}
                  className="ml-2 hover:bg-black/10 rounded p-1"
                >
                  {tabContentCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
            </TabsTrigger>
            <TabsTrigger value="triagem" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF] flex items-center justify-between px-3">
              <span>Triagem</span>
              {activeTab === "triagem" && (
                <button 
                  onClick={toggleTabContentCollapse}
                  className="ml-2 hover:bg-black/10 rounded p-1"
                >
                  {tabContentCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
            </TabsTrigger>
            <TabsTrigger value="projetos" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF] flex items-center justify-between px-3">
              <span>Projetos</span>
              {activeTab === "projetos" && (
                <button 
                  onClick={toggleTabContentCollapse}
                  className="ml-2 hover:bg-black/10 rounded p-1"
                >
                  {tabContentCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
            </TabsTrigger>
            <TabsTrigger value="elicitacoes-dev" className="text-center data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white dark:data-[state=active]:bg-[#1E40AF] flex items-center justify-between px-3">
              <span>Elicitações DEV</span>
              {activeTab === "elicitacoes-dev" && (
                <button 
                  onClick={toggleTabContentCollapse}
                  className="ml-2 hover:bg-black/10 rounded p-1"
                >
                  {tabContentCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Revisões CT → RAG */}
          {!tabContentCollapsed && (
            <TabsContent value="revisoes-ct-rag" className="slide-in mt-6">
            <div className="space-y-6 bg-gray-50 dark:bg-[#0F172A] rounded-lg p-6">
          {/* Base de conhecimento OC */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Base de conhecimento CT → OC (Atendimento e Suporte)
              </h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Documentos a revisar
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {documentosARevisar}
                    {documentosARevisarNaMinhaAlcada > 0 && (
                      <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        {documentosARevisarNaMinhaAlcada} na minha alçada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Documentos em revisão
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {documentosEmRevisao}
                    {totalDocumentosEmProcessoPorMim > 0 && (
                      <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                        {totalDocumentosEmProcessoPorMim} por mim
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#374151]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Documentos Finalizados
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {documentosPublicados}
                    {totalDocumentosFinalizadosPorMim > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {totalDocumentosFinalizadosPorMim} por mim
                      </div>
                    )}
                  </div>
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                        {responsavel}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant={isUserResponsibleForSpecialty(responsavel) ? "default" : "secondary"}
                        disabled={!isUserResponsibleForSpecialty(responsavel)}
                        className={`h-6 px-2 text-xs ${
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
                        Iniciar
                      </Button>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                        {quantidade} {quantidade === 1 ? "Integrado" : "Integrados"}
                        {documentosEmProcessoPorMimPorResponsavel[responsavel] && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            {documentosEmProcessoPorMimPorResponsavel[responsavel]} em processo por mim
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          </div>
          </TabsContent>
          )}

          {/* Tab Content: Triagem */}
          {!tabContentCollapsed && (
            <TabsContent value="triagem" className="slide-in mt-6">
            <div className="space-y-6 bg-gray-50 dark:bg-[#0F172A] rounded-lg p-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Triagem de Demandas
                </h2>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Conteúdo da tab Triagem será implementado em breve.
                </p>
              </div>
            </div>
          </TabsContent>
          )}

          {/* Tab Content: Projetos */}
          {!tabContentCollapsed && (
            <TabsContent value="projetos" className="slide-in mt-6">
            <div className="space-y-6 bg-gray-50 dark:bg-[#0F172A] rounded-lg p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Gestão de Projetos
                </h2>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Conteúdo da tab Projetos será implementado em breve.
                </p>
              </div>
            </div>
          </TabsContent>
          )}

          {/* Tab Content: Elicitações DEV */}
          {!tabContentCollapsed && (
            <TabsContent value="elicitacoes-dev" className="slide-in mt-6">
            <div className="space-y-6 bg-gray-50 dark:bg-[#0F172A] rounded-lg p-6">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Elicitações de Desenvolvimento
                </h2>
              </div>
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Conteúdo da tab Elicitações DEV será implementado em breve.
                </p>
              </div>
            </div>
          </TabsContent>
          )}

        </Tabs>

        {/* Seção de Meus Documentos em Processo - sempre visível com 5px de distância dinâmica */}
        <div className="flex-1 min-h-0">
          <div className="bg-gray-50 dark:bg-[#0F172A] rounded-lg p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Meus Documentos em Processo
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 w-9 p-0 rounded-full bg-white dark:bg-[#1E293B] border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#374151]"
                title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
              >
                {showFilters ? (
                  <FilterX className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Filter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                )}
              </Button>
            </div>
            
            <div className="flex-1 min-h-0">
              <DocsProcessEmbed
                className="h-full"
                showFilters={showFilters}
                activeTab="em-processo"
                hideStatusColumn={true}
                showResetButton={false}
                useUserFilter={true}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Modal de Revisão */}
      <DocumentReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        responsavel={selectedResponsavel}
      />
    </div>
  );
}
