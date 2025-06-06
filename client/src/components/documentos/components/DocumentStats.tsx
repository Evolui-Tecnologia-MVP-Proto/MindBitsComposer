import { type Documento } from "@shared/schema";

interface DocumentStatsProps {
  documentos: Documento[];
  activeTab: string;
  artifactCounts: Record<string, number>;
  flowExecutionCounts: Record<string, number>;
}

export function DocumentStats({ 
  documentos, 
  activeTab, 
  artifactCounts, 
  flowExecutionCounts 
}: DocumentStatsProps) {
  const getTabCount = (status: string) => {
    switch (status) {
      case "incluidos":
        return documentos.filter((doc) => doc.status === "Incluido").length;
      case "integrados":
        return documentos.filter((doc) => doc.status === "Integrado").length;
      case "em-processo":
        return documentos.filter((doc) => doc.status === "Em Processo").length;
      case "concluidos":
        return documentos.filter((doc) => doc.status === "Concluido").length;
      case "repositorio":
        return documentos.length; // All documents for repository view
      default:
        return 0;
    }
  };

  const getTotalArtifacts = () => {
    return Object.values(artifactCounts).reduce((sum, count) => sum + count, 0);
  };

  const getTotalFlowExecutions = () => {
    return Object.values(flowExecutionCounts).reduce((sum, count) => sum + count, 0);
  };

  const currentTabCount = getTabCount(activeTab);
  const totalArtifacts = getTotalArtifacts();
  const totalFlowExecutions = getTotalFlowExecutions();

  return (
    <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
      <span>
        {currentTabCount} documento{currentTabCount !== 1 ? 's' : ''}
      </span>
      {totalArtifacts > 0 && (
        <span>
          {totalArtifacts} anexo{totalArtifacts !== 1 ? 's' : ''}
        </span>
      )}
      {totalFlowExecutions > 0 && (
        <span>
          {totalFlowExecutions} execuç{totalFlowExecutions !== 1 ? 'ões' : 'ão'}
        </span>
      )}
    </div>
  );
}