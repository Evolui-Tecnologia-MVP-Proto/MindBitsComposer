import { Badge } from "@/components/ui/badge";
import { type Documento } from "@shared/schema";

interface StatusBadgeProps {
  documento: Documento;
  artifactCount?: number;
  hasMondayData?: boolean;
  type: "origem" | "status" | "statusOrigem" | "anexos" | "Monday";
}

export function StatusBadge({ documento, artifactCount = 0, hasMondayData = false, type }: StatusBadgeProps) {
  switch (type) {
    case "origem":
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-800 border-purple-200"
        >
          {documento.origem}
        </Badge>
      );

    case "status":
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {documento.status}
        </Badge>
      );

    case "statusOrigem":
      return (
        <Badge variant="outline">
          {documento.statusOrigem}
        </Badge>
      );

    case "anexos":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800"
        >
          {artifactCount}
        </Badge>
      );

    case "Monday":
      // Badge logic for Monday data status
      if (!hasMondayData && artifactCount === 0) {
        return (
          <Badge
            variant="secondary"
            className="bg-gray-100 text-gray-600 border-gray-300"
          >
            none
          </Badge>
        );
      }

      if (hasMondayData && artifactCount === 0) {
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 border-orange-300"
          >
            files
          </Badge>
        );
      }

      if (artifactCount > 0) {
        return (
          <div className="flex gap-1">
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-800 border-orange-300"
            >
              files
            </Badge>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 border-green-300"
            >
              sync
            </Badge>
          </div>
        );
      }

      return null;

    default:
      return null;
  }
}