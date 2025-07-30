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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Loader2,
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
  file?: string;
}

interface EditArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifactFormData: ArtifactFormData;
  setArtifactFormData: (data: ArtifactFormData) => void;
  onUpdateArtifact: () => void;
  updateArtifactMutation: {
    isPending: boolean;
  };
}

export function EditArtifactModal({
  isOpen,
  onClose,
  artifactFormData,
  setArtifactFormData,
  onUpdateArtifact,
  updateArtifactMutation,
}: EditArtifactModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md fixed top-[15%] left-[55%] transform -translate-x-1/2 -translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            Editar Anexo
          </DialogTitle>
          <DialogDescription>Edite as informações do anexo</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="edit-artifact-name">Nome do Anexo</Label>
            <Input
              id="edit-artifact-name"
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
            <Label>Arquivo/URL</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="edit-artifact-file"
                  value={artifactFormData.file}
                  onChange={(e) =>
                    setArtifactFormData({
                      ...artifactFormData,
                      file: e.target.value,
                    })
                  }
                  placeholder="Ex: /uploads/manual.pdf, https://exemplo.com/doc.pdf"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("edit-file-upload")?.click()
                  }
                  className="px-3"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              <input
                id="edit-file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.json,.xml,.xlsx,.zip"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const formData = new FormData();
                      formData.append("file", file);

                      const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (response.ok) {
                        const result = await response.json();
                        setArtifactFormData({
                          ...artifactFormData,
                          file: result.path,
                          type:
                            file.name.split(".").pop()?.toLowerCase() || "",
                        });
                      } else {
                        alert("Erro ao fazer upload do arquivo");
                      }
                    } catch (error) {
                      alert("Erro ao fazer upload do arquivo");
                    }
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Você pode inserir uma URL ou fazer upload de um arquivo local
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-artifact-type">Tipo do Arquivo</Label>
            <Select
              value={artifactFormData.type}
              onValueChange={(value) =>
                setArtifactFormData({ ...artifactFormData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
                <SelectItem value="zip">ZIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onUpdateArtifact}
            disabled={
              updateArtifactMutation.isPending || !artifactFormData.name
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateArtifactMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}