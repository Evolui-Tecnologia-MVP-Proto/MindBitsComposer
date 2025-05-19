import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowDown, Code2 } from "lucide-react";
import MondayColumnMapping from "./MondayColumnMapping";

type MondayMappingWidgetProps = {
  // Se não for fornecido, listará todos os mapeamentos disponíveis
  mappingId?: string;
}

export default function MondayMappingWidget({ mappingId }: MondayMappingWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(mappingId || null);
  
  // Consulta para buscar os mapeamentos disponíveis, se nenhum ID específico for fornecido
  const { data: mappings = [] } = useQuery({
    queryKey: ['/api/monday/mappings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/monday/mappings');
        if (!response.ok) {
          throw new Error('Falha ao carregar os mapeamentos do Monday');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar mapeamentos do Monday:", error);
        return [];
      }
    },
    enabled: !mappingId, // Só busca se não tiver um ID específico
  });
  
  // Quando temos apenas um mapeamento disponível, seleciona-o automaticamente
  useEffect(() => {
    if (!mappingId && mappings.length === 1) {
      setSelectedMappingId(mappings[0].id);
    }
  }, [mappingId, mappings]);
  
  // Função para extrair o mapeamento do array
  const getMapping = (id: string, list: any[]) => {
    return list.find((item) => item.id === id);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Mapeamento de Colunas do Monday.com</h3>
        
        {!mappingId && mappings.length > 1 && (
          <select 
            className="px-3 py-2 rounded-md border border-gray-300 text-sm" 
            value={selectedMappingId || ''}
            onChange={(e) => setSelectedMappingId(e.target.value || null)}
          >
            <option value="">Selecione um mapeamento...</option>
            {mappings.map((mapping: any) => (
              <option key={mapping.id} value={mapping.id}>
                {mapping.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {selectedMappingId ? (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-center"
        >
          <Code2 className="w-4 h-4 mr-2" />
          Mapear Colunas do Monday.com
        </Button>
      ) : (
        <div className="text-center p-4 bg-gray-50 rounded-md text-gray-500">
          {mappings.length === 0 ? 
            "Nenhum mapeamento do Monday.com disponível. Crie um mapeamento primeiro." :
            "Selecione um mapeamento do Monday.com para configurar as colunas."
          }
        </div>
      )}
      
      {selectedMappingId && (
        <MondayColumnMapping
          mappingId={selectedMappingId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}