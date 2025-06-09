import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import FreeHandCanvasPlugin from "@/pages/plugins/freehand-canvas-plugin";
import MermaidGraphPlugin from "@/pages/plugins/mermaid-graph-plugin";
import SimpleExcalidrawPlugin from "@/pages/plugins/simple-excalidraw-plugin";
import VectorGraphPlugin from "@/pages/plugins/vector-graph-plugin";

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
  'mermaid-graph-plugin': MermaidGraphPlugin,
  'simple-excalidraw-plugin': SimpleExcalidrawPlugin,
  'vector-graph-plugin': VectorGraphPlugin,
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
  const [isReadyToMountPlugin, setIsReadyToMountPlugin] = useState(false);

  // Espera a modal abrir completamente para renderizar plugin pesado como o Excalidraw
  useEffect(() => {
    if (isOpen && actualPluginName === 'simple-excalidraw-plugin') {
      const timeout = setTimeout(() => {
        setIsReadyToMountPlugin(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setIsReadyToMountPlugin(true);
    }
  }, [isOpen, actualPluginName]);

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
        className="p-0 gap-0 !max-w-none !max-h-none"
        style={{
          width: actualPluginName === 'mermaid-graph-plugin' ? '80vw' : 
                 actualPluginName === 'vector-graph-plugin' ? '80vw' :
                 actualPluginName === 'simple-excalidraw-plugin' ? '90vw' : '100vw',
          height: actualPluginName === 'mermaid-graph-plugin' ? '80vh' : 
                  actualPluginName === 'vector-graph-plugin' ? '80vh' :
                  actualPluginName === 'simple-excalidraw-plugin' ? '90vh' : '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          position: 'fixed',
          top: actualPluginName === 'mermaid-graph-plugin' ? '10vh' : 
               actualPluginName === 'vector-graph-plugin' ? '10vh' :
               actualPluginName === 'simple-excalidraw-plugin' ? '5vh' : '0',
          left: actualPluginName === 'mermaid-graph-plugin' ? '10vw' : 
                actualPluginName === 'vector-graph-plugin' ? '10vw' :
                actualPluginName === 'simple-excalidraw-plugin' ? '5vw' : '0',
          right: 'auto',
          bottom: 'auto',
          margin: '0',
          padding: '0',
          transform: 'none',
          borderRadius: (actualPluginName === 'mermaid-graph-plugin' || actualPluginName === 'vector-graph-plugin' || actualPluginName === 'simple-excalidraw-plugin') ? '8px' : '0',
          zIndex: 50,
          border: 'none',
          overflow: 'hidden'
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Plugin {pluginName}</DialogTitle>
        </VisuallyHidden>

        {(actualPluginName !== 'simple-excalidraw-plugin' || isReadyToMountPlugin) ? (
          <PluginComponent
            onDataExchange={handleDataExchange}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            Carregando editor...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}