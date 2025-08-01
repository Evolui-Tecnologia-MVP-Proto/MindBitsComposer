import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, FolderSync } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface GitHubIntegrationProps {
  syncFromGitHubMutation: any;
  syncAllToGitHubMutation: any;
  repoStructures: any[];
}

export function GitHubIntegration({
  syncFromGitHubMutation,
  syncAllToGitHubMutation,
  repoStructures,
}: GitHubIntegrationProps) {
  const queryClient = useQueryClient();

  const handleSyncRef = () => {
    // Update all repo structures to is_sync: true
    fetch('/api/repo-structure/sync-all', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(data => {
      console.log('Sync Ref completed:', data);
      // Refresh the repo structures
      queryClient.invalidateQueries({ queryKey: ['/api/repo-structure'] });
    })
    .catch(error => {
      console.error('Error in Sync Ref:', error);
    });
  };

  const getUnsyncedCount = () => {
    return repoStructures.filter(
      (folder: any) =>
        !folder.isSync &&
        (!folder.linkedTo ||
          repoStructures.some(
            (parent: any) => parent.uid === folder.linkedTo,
          )),
    ).length;
  };

  return (
    <div className="flex items-center justify-between mb-6 flex-shrink-0">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E5E7EB]">
          Integração com Repositório GitHub
        </h3>
        <p className="text-sm text-gray-600 dark:text-[#9CA3AF] mt-1">
          Gerencie documentos sincronizados com o repositório configurado
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
          onClick={handleSyncRef}
          title="Sincronizar referências"
        >
          <FolderSync className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncFromGitHubMutation.mutate()}
          disabled={syncFromGitHubMutation.isPending}
        >
          {syncFromGitHubMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Trazer do GitHub
        </Button>
        <Button
          className="bg-green-600 hover:bg-green-700"
          size="sm"
          onClick={() => syncAllToGitHubMutation.mutate()}
          disabled={
            syncAllToGitHubMutation.isPending ||
            getUnsyncedCount() === 0
          }
        >
          {syncAllToGitHubMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {syncAllToGitHubMutation.isPending
            ? "Enviando..."
            : `Enviar para GitHub (${getUnsyncedCount()})`}
        </Button>
      </div>
    </div>
  );
}