import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RepoStructure {
  uid: string;
  folderName: string;
  linkedTo: string | null;
  isSync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolder?: string;
}

export function CreateFolderModal({ open, onOpenChange, parentFolder }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedParent, setSelectedParent] = useState<string>(parentFolder || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar estrutura do repositório para o dropdown de pasta pai
  const { data: repoStructures = [] } = useQuery<RepoStructure[]>({
    queryKey: ["/api/repo-structure"],
    enabled: open,
  });

  // Mutation para criar nova pasta
  const createFolderMutation = useMutation({
    mutationFn: async (data: { folderName: string; linkedTo?: string }) => {
      const res = await apiRequest("POST", "/api/repo-structure", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pasta criada com sucesso!",
        description: "A pasta foi criada e está pronta para sincronização com o GitHub.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/repo-structure"] });
      setFolderName("");
      setSelectedParent("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome da pasta.",
        variant: "destructive",
      });
      return;
    }

    createFolderMutation.mutate({
      folderName: folderName.trim(),
      linkedTo: selectedParent === "root" ? undefined : selectedParent || undefined,
    });
  };

  const buildFolderPath = (structure: RepoStructure): string => {
    const parentStructure = repoStructures.find(s => s.uid === structure.linkedTo);
    if (parentStructure) {
      return `${buildFolderPath(parentStructure)}/${structure.folderName}`;
    }
    return structure.folderName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Criar Nova Pasta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Nome da Pasta</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: documentos, assets, src..."
              disabled={createFolderMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentFolder">Pasta Pai (Opcional)</Label>
            <Select value={selectedParent} onValueChange={setSelectedParent}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pasta pai ou deixe vazio para raiz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">/ (Raiz do repositório)</SelectItem>
                {repoStructures.map((structure) => (
                  <SelectItem key={structure.uid} value={structure.uid}>
                    {buildFolderPath(structure)}
                    {!structure.isSync && " (não sincronizada)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createFolderMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar Pasta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}