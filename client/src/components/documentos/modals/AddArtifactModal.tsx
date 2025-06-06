import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Paperclip,
  Upload,
} from "lucide-react";

interface ArtifactFormData {
  documentoId: string;
  name: string;
  fileData?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  mimeType?: string | null;
  type?: string | null;
  originAssetId?: string | null;
  isImage?: string | null;
}

interface AddArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactFormData: ArtifactFormData;
  setArtifactFormData: (data: ArtifactFormData) => void;
  onCreateArtifact: () => void;
  createArtifactMutation: {
    isPending: boolean;
  };
  onFileUpload: (file: File) => void;
}

export function AddArtifactModal({
  isOpen,
  onClose,
  artifactFormData,
  setArtifactFormData,
  onCreateArtifact,
  createArtifactMutation,
  onFileUpload,
}: AddArtifactModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-blue-500" />
            Adicionar Anexo
          </DialogTitle>
          <DialogDescription>
            Adicione um novo anexo ao documento
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="artifact-name">Nome do Anexo</Label>
            <Input
              id="artifact-name"
              value={artifactFormData.name}
              onChange={(e) =>
                setArtifactFormData({
                  ...artifactFormData,
                  name: e.target.value,
                })
              }
              placeholder="Ex: Manual de usuário, Especificação técnica"
            />
          </div>

          <div>
            <Label>Arquivo</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="file"
                  id="artifact-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onFileUpload(file);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("artifact-file")?.click()
                  }
                  className="px-3"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>

              {/* Mostrar informações do arquivo selecionado */}
              {artifactFormData.fileName && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">
                    Arquivo selecionado:
                  </p>
                  <p className="text-sm text-gray-600">
                    {artifactFormData.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tipo detectado: {artifactFormData.type?.toUpperCase()} |
                    Tamanho:{" "}
                    {(
                      parseInt(artifactFormData.fileSize || "0") / 1024
                    ).toFixed(2)}{" "}
                    KB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onCreateArtifact}
            disabled={
              createArtifactMutation.isPending ||
              !artifactFormData.name ||
              !artifactFormData.fileData
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createArtifactMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Anexo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}