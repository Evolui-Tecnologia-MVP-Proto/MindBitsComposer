import { Documento } from "@/types/documentos";
import { StatusBadge } from "./StatusBadge";
import { FileTypeIcon } from "./FileTypeIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function isValidDate(dateString?: string) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

interface DocumentoCardProps {
  documento: Documento;
  onClick?: () => void;
}

export function DocumentoCard({ documento, onClick }: DocumentoCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {documento.nome}
        </CardTitle>
        <StatusBadge status={documento.status} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <FileTypeIcon type={documento.tipo} size={3} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {documento.objeto}
            </p>
            <p className="text-xs text-muted-foreground">
              {isValidDate(documento.dataCriacao)
                ? format(new Date(documento.dataCriacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Data desconhecida"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 