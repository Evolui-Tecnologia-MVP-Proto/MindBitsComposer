import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown } from "lucide-react";

export default function MondayIntegrationButton() {
  const { toast } = useToast();
  
  const handleClick = () => {
    toast({
      title: "Mapeamento de Colunas",
      description: "O mapeamento de colunas está disponível na página de Mapeamento Monday no menu lateral.",
      variant: "default",
      duration: 5000,
    });
  };
  
  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="flex items-center"
    >
      <ArrowDown className="h-4 w-4 mr-2" />
      Mapear Colunas
    </Button>
  );
}