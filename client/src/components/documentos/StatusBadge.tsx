import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleX, AlertCircle, Loader2 } from "lucide-react";
import { type DocumentoStatus } from "@/types/documentos";

interface StatusBadgeProps {
  status: DocumentoStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  return (
    <Badge
      variant={getStatusBadgeVariant(status)}
      className="flex items-center gap-1 whitespace-nowrap"
    >
      {showIcon && getStatusIcon(status)}
      {status}
    </Badge>
  );
}

function getStatusIcon(status: DocumentoStatus) {
  switch (status) {
    case "Integrado":
      return <CircleCheck className="h-3 w-3" />;
    case "Processando":
      return <Loader2 className="h-3 w-3 animate-spin" />;
    case "Concluido":
      return <CircleCheck className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
}

function getStatusBadgeVariant(status: DocumentoStatus) {
  switch (status) {
    case "Integrado":
      return "default";
    case "Processando":
      return "secondary";
    case "Concluido":
      return "outline";
    default:
      return "destructive";
  }
} 