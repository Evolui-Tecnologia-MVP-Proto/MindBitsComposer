import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-6">Bem-vindo, {user?.name}!</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>EVO-MindBits Composer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Bem-vindo à plataforma EVO-MindBits Composer, seu ambiente de trabalho
            integrado para gerenciamento de conteúdo e automação de tarefas.
          </p>
          <p>
            Utilize o menu lateral para navegar entre as funcionalidades disponíveis
            para seu perfil.
          </p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Acesse as configurações administrativas do sistema e gerencie usuários.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Configure integrações com OpenAI, GitHub e outros serviços.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Altere suas configurações pessoais e preferências de interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
