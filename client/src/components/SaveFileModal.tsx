import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { File, FileText, Download } from "lucide-react";

interface SaveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string, format: string, includeImages?: boolean) => void;
  defaultFilename?: string;
}

export default function SaveFileModal({ isOpen, onClose, onSave, defaultFilename = "documento" }: SaveFileModalProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [format, setFormat] = useState("lexical");
  const [includeImages, setIncludeImages] = useState(false);

  // Atualizar filename quando defaultFilename mudar
  useEffect(() => {
    setFilename(defaultFilename);
  }, [defaultFilename]);

  const handleSave = () => {
    if (!filename.trim()) {
      return;
    }

    const cleanFilename = filename.replace(/[^a-z0-9\-_\s]/gi, '').trim();
    onSave(cleanFilename, format, format === "lexical" ? includeImages : undefined);
    onClose();
  };

  const getFileExtension = () => {
    switch (format) {
      case "lexical":
        return ".lexical";
      case "markdown":
        return ".md";
      case "both":
        return ".lexical + .md";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Salvar Documento
          </DialogTitle>
          <DialogDescription>
            Configure as opções de salvamento para o seu documento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações sobre salvamento */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Download className="w-4 h-4 text-blue-600" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Salvamento automático</p>
              <p>Os arquivos serão salvos no diretório de Downloads do seu navegador.</p>
            </div>
          </div>

          {/* Nome do arquivo */}
          <div className="space-y-2">
            <Label htmlFor="filename">Nome do arquivo</Label>
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-gray-500" />
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Digite o nome do arquivo"
                className="flex-1"
              />
              <span className="text-sm text-gray-500 min-w-fit">
                {getFileExtension()}
              </span>
            </div>
          </div>

          {/* Formato do arquivo */}
          <div className="space-y-3">
            <Label>Formato de salvamento</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lexical" id="lexical" />
                <Label htmlFor="lexical" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Lexical (.lexical) - Formato completo do editor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Markdown (.md) - Formato de texto simples
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Ambos os formatos (.lexical + .md)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Opções para imagens (Lexical e Ambos os formatos) */}
          {(format === "lexical" || format === "both") && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg pl-[0px] pr-[0px]">
              <Label>
                Tratamento de imagens 
                {format === "both" && <span className="text-sm text-gray-600">(aplicado apenas ao arquivo Lexical)</span>}
              </Label>
              <RadioGroup 
                value={includeImages ? "base64" : "references"} 
                onValueChange={(value) => setIncludeImages(value === "base64")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="references" id="references" />
                  <Label htmlFor="references" className="cursor-pointer">
                    Salvar como referências (arquivo menor)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="base64" id="base64" />
                  <Label htmlFor="base64" className="cursor-pointer">
                    Incluir imagens em base64 (arquivo maior, completo)
                  </Label>
                </div>
              </RadioGroup>
              {format === "both" && (
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Nota:</strong> O arquivo Markdown sempre manterá imagens como referências, independente desta configuração.
                </p>
              )}
            </div>
          )}

          {format === "markdown" && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> O formato Markdown sempre salva imagens como referências para manter o arquivo limpo e legível.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!filename.trim()}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}