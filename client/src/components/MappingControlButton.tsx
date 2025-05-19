import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import MondayColumnMapping from "./MondayColumnMapping";
import MappingCounter from "./MappingCounter";

type MappingControlButtonProps = {
  mappingId: string;
}

export default function MappingControlButton({ mappingId }: MappingControlButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div className="flex items-center">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center"
        onClick={() => setIsModalOpen(true)}
        title="Mapear Colunas"
      >
        <ArrowDown className="h-4 w-4 mr-1" />
        <span>Mapear Colunas</span>
      </Button>
      
      <MappingCounter mappingId={mappingId} />
      
      <MondayColumnMapping 
        mappingId={mappingId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}