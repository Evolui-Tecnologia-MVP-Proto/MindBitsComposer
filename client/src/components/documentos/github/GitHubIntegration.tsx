import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Loader2, FolderSync } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import FileExplorer from "@/components/FileExplorer";

export function GitHubIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados locais
  const [githubRepoFiles, setGithubRepoFiles] = useState<any[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<any[]>([]);
  const [isLoadingFolderFiles, setIsLoadingFolderFiles] = useState(false);

  // Buscar estrutura local do repositório
  const { data: repoStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/repo-structure"],
  });

  // Buscar conexões de serviço para obter o repositório GitHub
  const { data: serviceConnections = [] } = useQuery({
    queryKey: ["/api/service-connections"],
  });

  // Mutation para sincronizar estrutura do GitHub para o banco local
  const syncFromGitHubMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        "/api/repo-structure/sync-from-github",
      );
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída!",
        description: `${data.importedCount || 0} pasta(s) importadas e ${data.updatedCount || 0} pasta(s) atualizadas.`,
      });

      // Atualizar dados locais
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });

      // Atualizar estrutura do GitHub também
      fetchGithubRepoStructure();

      // Forçar re-fetch após um pequeno delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao importar estrutura do GitHub",
        variant: "destructive",
      });
    },
  });

  // Mutation para sincronizar todas as pastas não sincronizadas com GitHub
  const syncAllToGitHubMutation = useMutation({
    mutationFn: async () => {
      const unsyncedFolders = repoStructures.filter(
        (folder: any) =>
          !folder.isSync &&
          (!folder.linkedTo ||
            repoStructures.some(
              (parent: any) => parent.uid === folder.linkedTo,
            )),
      );
      
      const results = [];
      for (const folder of unsyncedFolders) {
        console.log(
          `🚀 Sincronizando pasta: ${folder.folderName} (${folder.uid})`,
        );
        try {
          const res = await apiRequest(
            "POST",
            `/api/repo-structure/${folder.uid}/sync-github`,
          );
          const result = await res.json();
          results.push({
            folder: folder.folderName,
            success: true,
            message: result.message,
          });
        } catch (error: any) {
          results.push({
            folder: folder.folderName,
            success: false,
            message: error.message,
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast({
          title: `${successCount} pasta(s) sincronizada(s)!`,
          description:
            errorCount > 0
              ? `${errorCount} pasta(s) falharam na sincronização.`
              : "Todas as pastas foram enviadas para o GitHub com sucesso.",
        });
      }

      if (errorCount > 0) {
        const failedFolders = results
          .filter((r) => !r.success)
          .map((r) => r.folder)
          .join(", ");
        toast({
          title: "Algumas pastas falharam",
          description: `Pastas com erro: ${failedFolders}`,
          variant: "destructive",
        });
      }

      // Atualizar imediatamente a estrutura local
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });

      // Forçar múltiplas atualizações para garantir sincronização visual
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 500);

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
        fetchGithubRepoStructure();
      }, 1500);

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/repo-structure"] });
      }, 3500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar pastas com GitHub.",
        variant: "destructive",
      });
    },
  });

  // Função para buscar arquivos de uma pasta específica no GitHub
  const fetchFolderFiles = async (folderPath: string) => {
    if (!folderPath) return;

    setIsLoadingFolderFiles(true);
    try {
      const githubConnection = (serviceConnections as any[])?.find(
        (conn: any) => conn.serviceName === "github",
      );

      if (!githubConnection) return;

      const repo = githubConnection.parameters?.[0];
      if (!repo) return;

      const response = await fetch(
        `https://api.github.com/repos/${repo}/contents/${folderPath}`,
        {
          headers: {
            Authorization: `token ${githubConnection.token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "EVO-MindBits-Composer",
          },
        },
      );

      if (response.ok) {
        const files = await response.json();
        // Filtrar arquivos, excluindo .gitkeep que são apenas para sincronização
        const fileList = Array.isArray(files)
          ? files.filter(
              (item: any) => item.type === "file" && item.name !== ".gitkeep",
            )
          : [];
        setSelectedFolderFiles(fileList);
      } else if (response.status === 404) {
        // Pasta vazia ou não existe - mostrar mensagem apropriada
        setSelectedFolderFiles([]);
      } else {
        setSelectedFolderFiles([]);
      }
    } catch (error) {
      setSelectedFolderFiles([]);
    } finally {
      setIsLoadingFolderFiles(false);
    }
  };

  // Função para carregar visualização da estrutura do repositório
  const fetchGithubRepoStructure = async () => {
    setIsLoadingRepo(true);
    try {
      const response = await fetch("/api/github/repo/contents");

      console.log("📊 Status da resposta:", response.status, response.statusText);

      if (response.ok) {
        const contents = await response.json();
        console.log("✅ Conteúdo recebido:", contents.length, "itens");
        const fileStructure = await buildSimpleFileTree(contents);
        setGithubRepoFiles(fileStructure);
        return fileStructure;
      } else {
        const errorData = await response.json();
        console.error("❌ Erro na resposta:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error
        });
        return [];
      }
    } catch (error: any) {
      console.error("❌ Erro na requisição completa:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return [];
    } finally {
      setIsLoadingRepo(false);
    }
  };

  // Função simples para criar estrutura de visualização
  const buildSimpleFileTree = async (items: any[]) => {
    return items.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "folder" : "file",
      size: item.size || 0,
      children: [],
    }));
  };

  // Carregar estrutura do repositório quando houver conexão GitHub
  useEffect(() => {
    if (
      serviceConnections &&
      serviceConnections.length > 0
    ) {
      fetchGithubRepoStructure();
    }
  }, [serviceConnections]);

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
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0F172A]">
      <div className="bg-white dark:bg-[#0F172A] rounded-lg border dark:border-[#374151] p-6 flex-1 flex flex-col">
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

        <div className="border-t dark:border-[#374151] pt-6 bg-white dark:bg-[#0F172A] p-4 rounded-lg flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            <div className="space-y-4 bg-white dark:bg-[#1F2937] p-4 rounded-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-[#E5E7EB]">
                  Estrutura do Repositório
                </h4>
                {isLoadingRepo && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-[#9CA3AF]">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Carregando...
                  </div>
                )}
                {!isLoadingRepo && githubRepoFiles.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchGithubRepoStructure}
                  >
                    Atualizar
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {githubRepoFiles.length > 0 ? (
                  <FileExplorer
                    data={githubRepoFiles}
                    onFileSelect={(file) => {
                      console.log("Arquivo selecionado:", file);
                    }}
                    onFolderToggle={(folder, isExpanded) => {
                      console.log(
                        "Pasta:",
                        folder.name,
                        "Expandida:",
                        isExpanded,
                      );
                      if (isExpanded && folder.type === "folder") {
                        const buildFullPath = (folderName: string) => {
                          const structure = repoStructures.find(
                            (s: any) => s.folderName === folderName,
                          );
                          if (!structure) return `/${folderName}/`;

                          let path = structure.folderName;
                          let current = structure;

                          while (current.linkedTo) {
                            const parent = repoStructures.find(
                              (s: any) => s.uid === current.linkedTo,
                            );
                            if (parent) {
                              path = `${parent.folderName}/${path}`;
                              current = parent;
                            } else {
                              break;
                            }
                          }

                          return `/${path}/`;
                        };

                        const fullPath = buildFullPath(folder.name);
                        setSelectedFolderPath(fullPath);
                        fetchFolderFiles(folder.path);
                      }
                    }}
                  />
                ) : !isLoadingRepo ? (
                  <div className="border dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#111827] p-6 text-center">
                    <div className="text-gray-500 dark:text-[#9CA3AF] mb-2">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-[#E5E7EB] mb-1">
                      Nenhum repositório conectado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mb-4">
                      Configure uma conexão GitHub nas configurações
                      para ver a estrutura do repositório aqui.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchGithubRepoStructure}
                    >
                      Tentar Conectar
                    </Button>
                  </div>
                ) : (
                  <div className="border dark:border-[#374151] rounded-lg bg-white dark:bg-[#111827] p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 bg-white dark:bg-[#1F2937] p-4 rounded-lg flex flex-col">
              <h4 className="font-medium text-gray-900 dark:text-[#E5E7EB]">
                {selectedFolderPath ? (
                  <span>
                    Arquivos em:{" "}
                    <code className="bg-gray-100 dark:bg-[#374151] px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                      {selectedFolderPath}
                    </code>
                  </span>
                ) : (
                  "Arquivos na pasta"
                )}
              </h4>
              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoadingFolderFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
                      Carregando arquivos...
                    </span>
                  </div>
                ) : selectedFolderFiles.length > 0 ? (
                  selectedFolderFiles.map(
                    (file: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#111827] rounded-lg border dark:border-[#374151]"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-[#E5E7EB]">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                              Tamanho: {(file.size / 1024).toFixed(1)}KB
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          GitHub
                        </Badge>
                      </div>
                    ),
                  )
                ) : selectedFolderPath ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-[#9CA3AF] text-sm">
                      📁 Pasta vazia
                      <br />
                      <span className="text-xs">
                        Esta pasta foi criada para organização mas ainda
                        não contém arquivos
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-[#9CA3AF] text-sm">
                      Clique em uma pasta para ver seus arquivos
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}