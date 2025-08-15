import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxFileSize?: number;
  onComplete?: (avatarUrl: string) => void;
  buttonClassName?: string;
  children: ReactNode;
  userId?: number;
}

/**
 * A file upload component for avatar images that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for file selection and upload
 * - Handles avatar image upload to object storage
 * - Updates user avatar URL upon successful upload
 * 
 * @param props - Component props
 * @param props.maxFileSize - Maximum file size in bytes (default: 5MB)
 * @param props.onComplete - Callback function called when upload is complete with the new avatar URL
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 * @param props.userId - User ID for avatar association
 */
export function ObjectUploader({
  maxFileSize = 5242880, // 5MB default
  onComplete,
  buttonClassName,
  children,
  userId,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSize) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${Math.round(maxFileSize / (1024 * 1024))}MB.`,
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    setUploading(true);

    try {
      // Get upload URL from backend
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file using FormData for local storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: formData,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }

      const uploadResultData = await uploadResult.json();
      console.log("Upload result:", uploadResultData);

      // Update user avatar URL with the filename returned from upload
      const updateResponse = await fetch("/api/user/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: `/avatars/${uploadResultData.filename}`,
          userId,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error("Update response error:", errorData);
        throw new Error("Failed to update avatar");
      }

      const { avatarUrl } = await updateResponse.json();
      console.log("Avatar updated to:", avatarUrl);

      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!",
      });

      onComplete?.(avatarUrl);
      setShowModal(false);
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro",
        description: "Falha ao fazer upload do avatar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
  };

  return (
    <div>
      <Button
        onClick={() => setShowModal(true)}
        className={buttonClassName}
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="avatar-file">Selecionar Imagem</Label>
              <Input
                id="avatar-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Máximo {Math.round(maxFileSize / (1024 * 1024))}MB. Formatos: JPG, PNG, GIF
              </p>
            </div>

            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-full border-2 border-gray-200"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? "Enviando..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}