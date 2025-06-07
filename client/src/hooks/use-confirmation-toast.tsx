import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, X } from "lucide-react";

interface ConfirmationOptions {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function useConfirmationToast() {
  const { toast } = useToast();

  const showConfirmation = ({
    title,
    description,
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "default"
  }: ConfirmationOptions) => {
    let toastRef: any;

    const handleConfirm = () => {
      if (toastRef?.dismiss) {
        toastRef.dismiss();
      }
      onConfirm();
    };

    const handleCancel = () => {
      if (toastRef?.dismiss) {
        toastRef.dismiss();
      }
      onCancel?.();
    };

    toastRef = toast({
      title: title,
      description: description,
      action: (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={variant}
            onClick={handleConfirm}
            className="h-8"
          >
            <Check className="w-3 h-3 mr-1" />
            {confirmText}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-8"
          >
            <X className="w-3 h-3 mr-1" />
            {cancelText}
          </Button>
        </div>
      ),
      duration: 0, // Don't auto-dismiss
    });
  };

  return { showConfirmation };
}