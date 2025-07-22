import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Template, TemplateType } from "@shared/schema";
import { Plus, Edit, Trash2, FileCode, FileJson, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TemplateFormModal from "@/components/TemplateFormModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<string>("struct");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const { toast } = useToast();
  const structTabRef = useRef<HTMLDivElement>(null);
  const outputTabRef = useRef<HTMLDivElement>(null);

  // Force background color application
  useEffect(() => {
    const applyBackgroundColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        if (structTabRef.current) {
          structTabRef.current.style.backgroundColor = '#0F172A';
          structTabRef.current.style.background = '#0F172A';
        }
        if (outputTabRef.current) {
          outputTabRef.current.style.backgroundColor = '#0F172A';
          outputTabRef.current.style.background = '#0F172A';
        }
      }
    };

    applyBackgroundColor();
    
    // Observer for theme changes
    const observer = new MutationObserver(applyBackgroundColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [activeTab]);

  // Consulta templates por tipo (struct ou output)
  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates", activeTab],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/templates/${activeTab}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar templates");
        }
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar templates:", error);
        return [];
      }
    }
  });

  // Mutação para criar template
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      try {
        // Garantir que a estrutura seja um objeto JavaScript válido, não uma string JSON
        const dataToSend = {
          ...templateData,
          structure: typeof templateData.structure === 'string' 
            ? JSON.parse(templateData.structure) 
            : templateData.structure
        };
        
        console.log("Enviando template:", JSON.stringify(dataToSend, null, 2));
        
        const res = await apiRequest("POST", "/api/templates", dataToSend);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Resposta do servidor:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Erro ao criar template");
          } catch (e) {
            throw new Error(errorText || "Erro ao criar template");
          }
        }
        return await res.json();
      } catch (error) {
        console.error("Erro completo:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Erro na mutação:", error);
      toast({
        title: "Erro ao criar template",
        description: error.message || "Ocorreu um erro ao salvar o template",
        variant: "destructive",
      });
    }
  });

  // Mutação para atualizar template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        // Garantir que a estrutura seja um objeto JavaScript válido, não uma string JSON
        const dataToSend = {
          ...data,
          structure: typeof data.structure === 'string' 
            ? JSON.parse(data.structure) 
            : data.structure
        };
        
        console.log("Atualizando template:", JSON.stringify(dataToSend, null, 2));
        
        const res = await apiRequest("PUT", `/api/template/${id}`, dataToSend);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Resposta do servidor:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || "Erro ao atualizar template");
          } catch (e) {
            throw new Error(errorText || "Erro ao atualizar template");
          }
        }
        return await res.json();
      } catch (error) {
        console.error("Erro completo na atualização:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Erro na mutação de atualização:", error);
      toast({
        title: "Erro ao atualizar template",
        description: error.message || "Ocorreu um erro ao atualizar o template",
        variant: "destructive",
      });
    }
  });

  // Mutação para excluir template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/template/${id}`);
      if (!res.ok) {
        throw new Error("Erro ao excluir template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso",
      });
    }
  });

  // Mutação para duplicar template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: Template) => {
      // Criar uma cópia do template com um novo código
      const newTemplate = {
        name: `${template.name} (Cópia)`,
        code: `${template.code}-CÓPIA`,
        description: `${template.description} (Cópia)`,
        type: template.type,
        structure: template.structure
      };
      
      console.log("Duplicando template:", JSON.stringify(newTemplate, null, 2));
      
      const res = await apiRequest("POST", "/api/templates", newTemplate);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resposta do servidor:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || "Erro ao duplicar template");
        } catch (e) {
          throw new Error(errorText || "Erro ao duplicar template");
        }
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template duplicado",
        description: "Uma cópia do template foi criada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao duplicar template:", error);
      toast({
        title: "Erro ao duplicar template",
        description: error.message || "Ocorreu um erro ao duplicar o template",
        variant: "destructive",
      });
    }
  });

  // Manipuladores
  const handleCreateTemplate = async (data: any) => {
    await createTemplateMutation.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdateTemplate = async (data: any) => {
    if (!selectedTemplate) return;
    await updateTemplateMutation.mutateAsync({ id: selectedTemplate.id, data });
    setIsEditModalOpen(false);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    await deleteTemplateMutation.mutateAsync(selectedTemplate.id);
    setIsDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };
  
  const handleDuplicateTemplate = async (template: Template) => {
    await duplicateTemplateMutation.mutateAsync(template);
  };

  const openEditModal = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (template: Template) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // Função para renderizar os cards de templates
  const renderTemplateCards = (templates: Template[]) => {
    if (templates.length === 0) {
      return (
        <Card className="col-span-full p-6 text-center border-dashed border-2">
          <CardContent className="pt-6">
            <p className="text-gray-500">Nenhum template encontrado.</p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              variant="outline" 
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar novo template
            </Button>
          </CardContent>
        </Card>
      );
    }

    return templates.map((template) => (
      <Card 
        key={template.id} 
        className="border border-gray-200 hover:border-blue-400 transition-colors"
      >
        <CardContent className="p-4 pt-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              {template.type === "struct" ? (
                <FileCode className="h-5 w-5 mr-2 text-blue-500" />
              ) : (
                <FileJson className="h-5 w-5 mr-2 text-purple-500" />
              )}
              <div>
                <h3 className="font-medium">{template.name || template.code}</h3>
                <p className="text-xs text-gray-500">{template.code}</p>
              </div>
            </div>
            <div className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {template.type === "struct" ? "Estrutural" : "Saída"}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{template.description}</p>
          <div className="flex justify-end space-x-2 mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2" 
              title="Editar"
              onClick={() => openEditModal(template)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50" 
              title="Duplicar"
              onClick={() => handleDuplicateTemplate(template)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" 
              title="Excluir"
              onClick={() => openDeleteDialog(template)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto py-6 bg-background dark:bg-[#1F2937] text-foreground" data-page="templates">
      <div className="space-y-6 bg-[#F9FAFB] dark:bg-[#1F2937]">
        <div className="flex items-center justify-between p-6 rounded-lg bg-gray-50 dark:bg-[#0F172A]">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280] flex items-center gap-3">
            <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Templates
          </h1>
        </div>
        
        <Tabs 
          defaultValue="struct" 
          onValueChange={(value) => setActiveTab(value)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-[#1E293B] mb-6">
            <TabsTrigger value="struct">Struct Templates</TabsTrigger>
            <TabsTrigger value="output">Out Templates</TabsTrigger>
          </TabsList>
        
        <TabsContent value="struct" className="space-y-4 dark:bg-[#0F172A]" ref={structTabRef}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Struct Templates</CardTitle>
                <CardDescription>
                  Templates estruturais para definição de modelos de dados e interfaces.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-1/3 mb-2 mt-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderTemplateCards(templates?.filter(t => t.type === 'struct') || [])}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="output" className="space-y-4 dark:bg-[#0F172A]" ref={outputTabRef}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Out Templates</CardTitle>
                <CardDescription>
                  Templates de saída para geração de relatórios e documentos.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-1/3 mb-2 mt-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderTemplateCards(templates?.filter(t => t.type === 'output') || [])}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Modal para criação de template */}
      {isCreateModalOpen && (
        <TemplateFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateTemplate}
          mode="create"
          selectedType={activeTab as TemplateType}
        />
      )}

      {/* Modal para edição de template */}
      {isEditModalOpen && selectedTemplate && (
        <TemplateFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateTemplate}
          template={selectedTemplate}
          mode="edit"
        />
      )}

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}