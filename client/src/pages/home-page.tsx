import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="fade-in p-6">
      {/* Todo conteúdo principal foi removido, deixando apenas a estrutura básica */}
    </div>
  );
}
