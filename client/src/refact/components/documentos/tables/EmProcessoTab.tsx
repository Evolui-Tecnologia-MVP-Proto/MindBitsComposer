import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Documento } from "@shared/schema";

interface EmProcessoTabProps {
  isLoading: boolean;
  renderDocumentosTable: (documentos: Documento[]) => JSX.Element;
  documentosProcessando: Documento[];
}

export function EmProcessoTab({
  isLoading,
  renderDocumentosTable,
  documentosProcessando,
}: EmProcessoTabProps) {
  return (
    <TabsContent value="em-processo" className="slide-in">
      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        renderDocumentosTable(documentosProcessando)
      )}
    </TabsContent>
  );
}