import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Copy, Edit, Trash2, FileEdit, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { FlowMetadataModal } from './FlowMetadataModal';

export const BibliotecaFluxos = () => {
  const queryClient = useQueryClient();
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<any | null>(null);
  
  const { data: savedFlows, isLoading: isLoadingFlows } = useQuery<any[]>({
    queryKey: ["/api/documents-flows"],
  });
  
  const { data: flowTypes } = useQuery<any[]>({
    queryKey: ["/api/flow-types"],
  });

  // Função para confirmar exclusão com toast
  const confirmDelete = (flow: any) => {
    toast({
      title: "Confirmar exclusão",
      description: `Tem certeza que deseja excluir o fluxo "${flow.name}"?`,
      action: (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteFlowMutation.mutate(flow.id)}
          >
            Excluir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Toast será automaticamente fechado
            }}
          >
            Cancelar
          </Button>
        </div>
      ),
    });
  };

  // Mutation para excluir fluxo
  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await fetch(`/api/documents-flows/${flowId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir fluxo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      toast({
        title: "Fluxo excluído",
        description: "O fluxo foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fluxo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar metadata do fluxo
  const updateFlowMutation = useMutation({
    mutationFn: async ({ flowId, data }: { flowId: string; data: any }) => {
      const response = await fetch(`/api/documents-flows/${flowId}/metadata`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao atualizar metadados do fluxo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      setEditingFlow(null);
      toast({
        title: "Metadados atualizados",
        description: "O nome e descrição do fluxo foram atualizados com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os metadados do fluxo.",
        variant: "destructive",
      });
    },
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

  // Mutation para duplicar fluxo
  const duplicateFlowMutation = useMutation({
    mutationFn: async (originalFlow: any) => {
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

      if (!response.ok) {
        throw new Error("Erro ao duplicar fluxo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      toast({
        title: "Fluxo duplicado",
        description: "O fluxo foi duplicado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível duplicar o fluxo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar bloqueio
  const toggleLockMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await fetch(`/api/documents-flows/${flowId}/toggle-lock`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Erro ao alterar status de bloqueio");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      toast({
        title: data.isLocked ? "Fluxo bloqueado" : "Fluxo desbloqueado",
        description: data.isLocked 
          ? "O fluxo não pode mais ser editado no editor." 
          : "O fluxo pode ser editado novamente no editor.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status de bloqueio.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar habilitação
  const toggleEnabledMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await fetch(`/api/documents-flows/${flowId}/toggle-enabled`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Erro ao alterar status de habilitação");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      toast({
        title: data.isEnabled ? "Fluxo habilitado" : "Fluxo desabilitado",
        description: data.isEnabled 
          ? "O fluxo aparecerá nas seleções do sistema." 
          : "O fluxo não aparecerá mais nas seleções do sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status de habilitação.",
        variant: "destructive",
      });
    },
  });

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
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => duplicateFlowMutation.mutate(flow)}
                      disabled={duplicateFlowMutation.isPending}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Duplicar
                    </Button>
                    
                    <Button 
                      size="sm" 
                      onClick={() => setEditingFlow(flow)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>

                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => confirmDelete(flow)}
                      disabled={deleteFlowMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Excluir
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

      {/* Modal de edição de metadata */}
      {editingFlow && (
        <FlowMetadataModal
          isOpen={true}
          onClose={() => setEditingFlow(null)}
          flowData={{
            code: editingFlow.code,
            name: editingFlow.name,
            description: editingFlow.description,
            flowTypeId: editingFlow.flowTypeId || editingFlow.flow_type_id,
          }}
          flowTypes={flowTypes || []}
          onSave={(data) => {
            updateFlowMutation.mutate({
              flowId: editingFlow.id,
              data,
            });
          }}
          isEditing={true}
        />
      )}
    </div>
  );
};