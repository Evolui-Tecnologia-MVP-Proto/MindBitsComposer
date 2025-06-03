import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Copy, Edit, Trash2, FileEdit, Lock, Unlock, Eye, EyeOff, PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { FlowMetadataModal } from './FlowMetadataModal';
import { NewFlowModal } from './NewFlowModal';

export const BibliotecaFluxos = () => {
  const queryClient = useQueryClient();
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<any | null>(null);
  
  // Estado para o modal de novo fluxo
  const [showNewFlowModal, setShowNewFlowModal] = useState<boolean>(false);
  const [newFlowTypeId, setNewFlowTypeId] = useState<string>('');
  const [newFlowCode, setNewFlowCode] = useState<string>('');
  const [newFlowName, setNewFlowName] = useState<string>('');
  const [newFlowDescription, setNewFlowDescription] = useState<string>('');
  
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

  // Mutation para criar novo fluxo
  const createFlowMutation = useMutation({
    mutationFn: async (flowData: { 
      flowTypeId: string; 
      code: string; 
      name: string; 
      description?: string; 
    }) => {
      const response = await fetch('/api/documents-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Erro ao criar fluxo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents-flows"] });
      toast({
        title: "Fluxo criado",
        description: "O novo fluxo foi criado com sucesso.",
      });
      // Reset do modal
      setShowNewFlowModal(false);
      setNewFlowTypeId('');
      setNewFlowCode('');
      setNewFlowName('');
      setNewFlowDescription('');
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar fluxo",
        variant: "destructive",
      });
    },
  });

  // Função para formatar código XXX-99
  const formatCode = useCallback((value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleaned.length <= 3) {
      return cleaned.replace(/[^A-Z]/g, '');
    } else {
      const letters = cleaned.slice(0, 3).replace(/[^A-Z]/g, '');
      const numbers = cleaned.slice(3, 5).replace(/[^0-9]/g, '');
      return letters + (numbers ? '-' + numbers : '');
    }
  }, []);

  // Função para validar código XXX-99
  const validateCode = useCallback((code: string) => {
    const codeRegex = /^[A-Z]{3}-[0-9]{2}$/;
    return codeRegex.test(code);
  }, []);

  // Callbacks para o modal de novo fluxo
  const handleCreateFlow = () => {
    if (!newFlowTypeId || !newFlowCode || !newFlowName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!validateCode(newFlowCode)) {
      toast({
        title: "Código inválido",
        description: "O código deve seguir o formato XXX-99 (3 letras maiúsculas + hífen + 2 números).",
        variant: "destructive",
      });
      return;
    }

    createFlowMutation.mutate({
      flowTypeId: newFlowTypeId,
      code: newFlowCode,
      name: newFlowName,
      description: newFlowDescription,
    });
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setNewFlowCode(formatted);
  };

  const handleCancelNewFlow = () => {
    setShowNewFlowModal(false);
    setNewFlowTypeId('');
    setNewFlowCode('');
    setNewFlowName('');
    setNewFlowDescription('');
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
            Gerencie todos os seus fluxos de documentos
          </p>
        </div>
        <Button
          onClick={() => setShowNewFlowModal(true)}
          className="flex items-center space-x-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Novo Fluxo</span>
        </Button>
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-semibold tracking-tight text-[14px]">
                      [{flow.code}] {flow.name}
                    </CardTitle>
                    {/* Indicadores de status */}
                    {flow.isLocked && (
                      <Lock className="h-4 w-4 text-red-500" title="Fluxo bloqueado" />
                    )}
                    {!flow.isEnabled && (
                      <EyeOff className="h-4 w-4 text-gray-500" title="Fluxo desabilitado" />
                    )}
                  </div>
                  <CardDescription className="text-muted-foreground mt-1 text-[12px]">
                    {flow.description || "Sem descrição"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Barra de botões com separador */}
                  <div className="flex items-center gap-1 justify-end">
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => duplicateFlowMutation.mutate(flow)}
                        disabled={duplicateFlowMutation.isPending}
                        className="flex items-center justify-center p-2"
                        title="Duplicar fluxo"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingFlow(flow)}
                        className="flex items-center justify-center p-2"
                        title="Editar metadados"
                      >
                        <FileEdit className="h-3 w-3" />
                      </Button>

                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => confirmDelete(flow)}
                        disabled={deleteFlowMutation.isPending}
                        className="flex items-center justify-center p-2"
                        title="Excluir fluxo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Separador vertical */}
                    <div className="h-6 w-px bg-border mx-1"></div>

                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant={flow.isEnabled ? "outline" : "secondary"}
                        onClick={() => toggleEnabledMutation.mutate(flow.id)}
                        disabled={toggleEnabledMutation.isPending}
                        className="flex items-center justify-center p-2"
                        title={flow.isEnabled ? "Desabilitar fluxo" : "Habilitar fluxo"}
                      >
                        {flow.isEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>

                      <Button 
                        size="sm" 
                        variant={flow.isLocked ? "destructive" : "outline"}
                        onClick={() => toggleLockMutation.mutate(flow.id)}
                        disabled={toggleLockMutation.isPending}
                        className="flex items-center justify-center p-2"
                        title={flow.isLocked ? "Desbloquear fluxo" : "Bloquear fluxo"}
                      >
                        {flow.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Link para o editor - separado */}
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => window.open(`/fluxos?flow=${flow.id}`, '_blank')}
                    disabled={flow.isLocked}
                    className="w-full flex items-center gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    {flow.isLocked ? "Editor (Bloqueado)" : "Abrir no Editor"}
                  </Button>
                  
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
      
      {/* Modal para criar novo fluxo */}
      <NewFlowModal
        isOpen={showNewFlowModal}
        onOpenChange={setShowNewFlowModal}
        newFlowTypeId={newFlowTypeId}
        newFlowCode={newFlowCode}
        newFlowName={newFlowName}
        newFlowDescription={newFlowDescription}
        flowTypes={flowTypes || []}
        onFlowTypeChange={setNewFlowTypeId}
        onCodeChange={handleCodeChange}
        onNameChange={setNewFlowName}
        onDescriptionChange={setNewFlowDescription}
        onCreateFlow={handleCreateFlow}
        onCancel={handleCancelNewFlow}
      />
    </div>
  );
};