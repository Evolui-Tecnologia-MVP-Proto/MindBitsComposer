import { TabsContent } from "@/components/ui/tabs";
import { type Documento } from "@shared/schema";

interface ConcluidosTabProps {
  isLoading: boolean;
  renderDocumentosTable: (documentos: Documento[]) => JSX.Element;
  documentosConcluidos: Documento[];
}

export function ConcluidosTab({
  isLoading,
  renderDocumentosTable,
  documentosConcluidos,
}: ConcluidosTabProps) {
  return (
    <TabsContent value="concluidos" className="slide-in">
      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        renderDocumentosTable(documentosConcluidos)
      )}
    </TabsContent>
  );
}