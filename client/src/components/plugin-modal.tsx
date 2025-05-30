import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import FreeHandCanvasPlugin from "@/pages/plugins/freehand-canvas-plugin";

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginName?: string;
  plugin?: any;
  onDataExchange?: (data: any) => void;
  onImageExport?: (imageUrl: string) => void;
}

const PLUGIN_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'freehand-canvas-plugin': FreeHandCanvasPlugin,
};

export default function PluginModal({ 
  isOpen, 
  onClose, 
  pluginName,
  plugin,
  onDataExchange,
  onImageExport 
}: PluginModalProps) {
  // Determinar o nome do plugin a partir do objeto plugin ou do pluginName
  const actualPluginName = plugin?.pageName || pluginName || "";
  const PluginComponent = actualPluginName ? PLUGIN_COMPONENTS[actualPluginName] : null;

  // Função para interceptar dados do plugin e verificar se deve fechar modal
  const handleDataExchange = (data: any) => {
    console.log('PluginModal recebeu dados:', data);
    
    // Chamar função original se existir
    if (onDataExchange) {
      onDataExchange(data);
    }
    
    // Se é uma exportação de imagem, chamar onImageExport
    if (data && data.action === 'export' && data.type === 'selection_image' && data.data?.imageUrl && onImageExport) {
      console.log('Chamando onImageExport com URL:', data.data.imageUrl);
      onImageExport(data.data.imageUrl);
    }
    
    // Verificar se o plugin solicitou fechamento do modal
    if (data && data.closeModal === true) {
      onClose();
    }
  };

  if (!PluginComponent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <VisuallyHidden>
            <DialogTitle>Plugin não encontrado</DialogTitle>
          </VisuallyHidden>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Plugin não encontrado</h3>
            <p className="text-muted-foreground">
              O plugin "{actualPluginName}" não foi encontrado ou não está disponível.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 gap-0 !max-w-none !max-h-none fixed inset-0 w-full h-full m-0 border-0"
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          margin: '0',
          padding: '0',
          transform: 'none',
          borderRadius: '0',
          zIndex: 50
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Plugin {pluginName}</DialogTitle>
        </VisuallyHidden>
        <PluginComponent
          onDataExchange={handleDataExchange}
        />
      </DialogContent>
    </Dialog>
  );
}