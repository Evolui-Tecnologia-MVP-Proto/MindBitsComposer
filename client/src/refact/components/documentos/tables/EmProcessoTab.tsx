import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Documento } from "@shared/schema";

interface EmProcessoTabProps {
  isLoading: boolean;
  renderDocumentosTable: (documentos: Documento[]) => JSX.Element;
  documentosProcessando: Documento[];
  useTabsContext?: boolean; // Novo prop para controlar se deve usar TabsContent
}

export function EmProcessoTab({
  isLoading,
  renderDocumentosTable,
  documentosProcessando,
  useTabsContext = true, // Por padrão usa TabsContent para compatibilidade
}: EmProcessoTabProps) {
  const content = isLoading ? (
    <div className="text-center py-6">Carregando documentos...</div>
  ) : (
    renderDocumentosTable(documentosProcessando)
  );

  // Se useTabsContext for false, renderiza como div simples
  if (!useTabsContext) {
    return (
      <div className="slide-in h-full">
        {content}
      </div>
    );
  }

  // Caso contrário, usa TabsContent normalmente
  return (
    <TabsContent value="em-processo" className="slide-in">
      {content}
    </TabsContent>
  );
}