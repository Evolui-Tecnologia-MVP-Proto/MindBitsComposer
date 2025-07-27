import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";
import { type Documento } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();

  // Buscar todos os documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
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


      </div>
    </div>
  );
}
