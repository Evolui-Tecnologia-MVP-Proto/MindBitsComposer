import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DocumentActionsProps {
  onCreateDocument: () => void;
}

export function DocumentActions({ onCreateDocument }: DocumentActionsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
    queryClient.invalidateQueries({ queryKey: ['/api/document-flow-executions'] });
    toast({
      title: "Dados atualizados",
      description: "As informações das abas foram recarregadas com sucesso.",
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleRefresh}
        variant="outline"
        className="border-gray-300 hover:bg-gray-50"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Atualizar
      </Button>
      <Button
        onClick={onCreateDocument}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        Incluir Documento
      </Button>
    </div>
  );
}