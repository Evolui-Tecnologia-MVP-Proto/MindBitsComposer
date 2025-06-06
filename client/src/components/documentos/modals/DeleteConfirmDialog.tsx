import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { type Documento } from "@shared/schema";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentToDelete: Documento | null;
  onConfirmDelete: (documento: Documento) => void;
  isDeleting: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  documentToDelete,
  onConfirmDelete,
  isDeleting,
}: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    if (documentToDelete) {
      onConfirmDelete(documentToDelete);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            {documentToDelete && (
              <>
                Tem certeza que deseja excluir "{documentToDelete.objeto}"? Esta ação não pode ser desfeita.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}