import { useDocumentos } from "@/hooks/useDocumentos";
import { DocumentoList } from "@/components/documentos/DocumentoList";
import { DocumentoFilters } from "@/components/documentos/DocumentoFilters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Documento } from "@/types/documentos";

export default function DocumentosPage() {
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
  const { documentos, filtros, setFiltros, isLoading } = useDocumentos();

  const handleDocumentoClick = (documento: Documento) => {
    setSelectedDocumento(documento);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      <DocumentoFilters
        filtros={filtros}
        onFiltrosChange={setFiltros}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <DocumentoList
          documentos={documentos}
          onDocumentoClick={handleDocumentoClick}
        />
      )}
    </div>
  );
}
