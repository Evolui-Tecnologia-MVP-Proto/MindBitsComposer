import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GraduationCap, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Specialty } from "@shared/schema";
import { SpecialtyModal } from "@/components/specialties/SpecialtyModal";

export function SpecialtiesTab() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<Specialty | null>(null);

  // Consulta todas as especialidades
  const { data: specialties = [], isLoading } = useQuery<Specialty[]>({
    queryKey: ["/api/specialties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/specialties");
      if (!res.ok) throw new Error("Erro ao carregar especialidades");
      return res.json();
    }
  });

  // Função para buscar número de especialistas por área
  const { data: specialistsCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/specialties", "specialists-counts"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      
      // Para cada especialidade, busca o número de especialistas
      await Promise.all(
        specialties.map(async (specialty) => {
          try {
            const res = await apiRequest("GET", `/api/specialties/${specialty.id}/users`);
            if (res.ok) {
              const users = await res.json();
              results[specialty.id] = users.length;
            } else {
              results[specialty.id] = 0;
            }
          } catch {
            results[specialty.id] = 0;
          }
        })
      );
      
      return results;
    },
    enabled: specialties.length > 0
  });

  // Mutação para excluir especialidade
  const deleteSpecialtyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/specialties/${id}`);
      return res.status === 204 ? {} : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/specialties"] });
      toast({
        title: "Especialidade excluída",
        description: "A área de especialidade foi excluída com sucesso.",
      });
      setSpecialtyToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir especialidade",
        description: error.message,
        variant: "destructive",
      });
      setSpecialtyToDelete(null);
    },
  });

  const handleEdit = (specialty: Specialty) => {
    setEditingSpecialty(specialty);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSpecialty(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSpecialty(null);
  };

  const handleDelete = (specialty: Specialty) => {
    setSpecialtyToDelete(specialty);
  };

  const confirmDelete = () => {
    if (specialtyToDelete) {
      deleteSpecialtyMutation.mutate(specialtyToDelete.id);
    }
  };

  return (
    <>
      <Card className="dark:bg-[#111827] rounded-b-lg">
        <CardHeader className="dark:bg-[#111827] rounded-t-lg">
          <div className="flex items-center justify-end">
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Especialidade
            </Button>
          </div>
        </CardHeader>
        <CardContent className="dark:bg-[#111827]">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Carregando especialidades...</p>
            </div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Nenhuma área de especialidade cadastrada
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeira especialidade
              </Button>
            </div>
          ) : (
            <div className="rounded-md border dark:bg-[#0F172A]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Especialistas</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialties.map((specialty) => (
                    <TableRow key={specialty.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {specialty.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{specialty.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {specialty.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-600"
                        >
                          {specialistsCounts[specialty.id] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(specialty)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(specialty)}
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de criação/edição */}
      <SpecialtyModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        specialty={editingSpecialty}
      />

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!specialtyToDelete} onOpenChange={() => setSpecialtyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a área de especialidade "{specialtyToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}