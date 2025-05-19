import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type MappingCounterProps = {
  mappingId: string;
}

export default function MappingCounter({ mappingId }: MappingCounterProps) {
  const [count, setCount] = useState(0);
  
  // Consulta para obter mapeamentos de colunas existentes
  const { data: columnMappings = [] } = useQuery({
    queryKey: [`/api/monday/mappings/${mappingId}/column-mappings`],
    queryFn: async () => {
      if (!mappingId) return [];
      try {
        const response = await fetch(`/api/monday/mappings/${mappingId}/column-mappings`);
        if (!response.ok) {
          // Pode ser que os mapeamentos ainda não existam
          if (response.status === 404) {
            return [];
          }
          throw new Error('Falha ao carregar os mapeamentos de colunas');
        }
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar mapeamentos de colunas:", error);
        return [];
      }
    },
    enabled: !!mappingId,
  });
  
  // Atualiza o contador quando os dados forem carregados
  useEffect(() => {
    if (columnMappings) {
      setCount(columnMappings.length);
    }
  }, [columnMappings]);
  
  if (count === 0) {
    return null;
  }
  
  return (
    <div className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
      {count} {count === 1 ? 'coluna mapeada' : 'colunas mapeadas'}
    </div>
  );
}