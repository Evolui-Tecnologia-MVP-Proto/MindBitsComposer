import { Documento } from "@/types/documentos";
import { DocumentoCard } from "./DocumentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentoListProps {
  documentos: Documento[];
  onDocumentoClick?: (documento: Documento) => void;
}

export function DocumentoList({ documentos, onDocumentoClick }: DocumentoListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {documentos.map((documento) => (
          <DocumentoCard
            key={documento.id}
            documento={documento}
            onClick={() => onDocumentoClick?.(documento)}
          />
        ))}
      </div>
    </ScrollArea>
  );
} 