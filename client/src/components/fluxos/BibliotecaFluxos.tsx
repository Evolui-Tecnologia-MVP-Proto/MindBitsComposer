import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Copy, Edit } from "lucide-react";

export const BibliotecaFluxos = () => {
  const { data: savedFlows, isLoading: isLoadingFlows } = useQuery<any[]>({
    queryKey: ["/api/documents-flows"],
  });
  
  const { data: flowTypes } = useQuery<any[]>({
    queryKey: ["/api/flow-types"],
  });

  // Função para contar nós em um fluxo
  const countNodes = (flowData: any) => {
    if (!flowData?.nodes) return { steps: 0, decisions: 0 };
    
    const steps = flowData.nodes.filter((node: any) => 
      ['startNode', 'endNode', 'actionNode', 'documentNode'].includes(node.type)
    ).length;
    
    const decisions = flowData.nodes.filter((node: any) => 
      node.type === 'switchNode'
    ).length;
    
    return { steps, decisions };
  };

  // Função para duplicar um fluxo existente
  const duplicateFlow = async (originalFlow: any) => {
    try {
      const response = await fetch("/api/documents-flows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: `${originalFlow.code}-COPY`,
          name: `${originalFlow.name} (Cópia)`,
          description: originalFlow.description ? `Cópia de: ${originalFlow.description}` : undefined,
          flowTypeId: originalFlow.flowTypeId || originalFlow.flow_type_id,
          flowData: originalFlow.flowData || originalFlow.flow_data,
        }),
      });

      if (response.ok) {
        // Recarregar a lista de fluxos
        window.location.reload();
      }
    } catch (error) {
      console.error("Erro ao duplicar fluxo:", error);
    }
  };

  if (isLoadingFlows) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando biblioteca de fluxos...</p>
        </div>
      </div>
    );
  }

  if (!savedFlows?.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum fluxo encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro fluxo na aba "Editor" para começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Biblioteca de Fluxos</h2>
          <p className="text-muted-foreground">
            {savedFlows.length} fluxo{savedFlows.length !== 1 ? 's' : ''} disponível{savedFlows.length !== 1 ? 'veis' : ''} para uso
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedFlows.map((flow) => {
          const flowType = flowTypes?.find(type => 
            type.id === (flow.flowTypeId || flow.flow_type_id)
          );
          const nodeStats = countNodes(flow.flowData || flow.flow_data);
          
          return (
            <Card key={flow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div>
                  <CardTitle className="text-lg font-mono">
                    [{flow.code}] {flow.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {flow.description || "Sem descrição"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => duplicateFlow(flow)}
                      className="flex-1"
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Duplicar
                    </Button>
                    
                    <Button 
                      size="sm" 
                      onClick={() => {
                        // Navegar para a aba editor e carregar o fluxo
                        const editorTab = document.querySelector('[data-value="editor"]') as HTMLElement;
                        if (editorTab) {
                          editorTab.click();
                          // Pequeno delay para garantir que a aba foi mudada
                          setTimeout(() => {
                            const flowSelect = document.getElementById('flow-select') as HTMLElement;
                            if (flowSelect) {
                              flowSelect.click();
                              // Encontrar e clicar no item do fluxo
                              setTimeout(() => {
                                const flowItem = document.querySelector(`[data-value="${flow.id}"]`) as HTMLElement;
                                if (flowItem) {
                                  flowItem.click();
                                }
                              }, 100);
                            }
                          }, 100);
                        }
                      }}
                      className="flex-1"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                  
                  {flow.createdAt && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Criado em {new Date(flow.createdAt).toLocaleDateString('pt-BR')} por {flow.createdByName || 'Usuário desconhecido'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};