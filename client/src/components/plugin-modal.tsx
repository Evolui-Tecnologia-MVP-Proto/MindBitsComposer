import { useState, useEffect, Suspense } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Loader2 } from "lucide-react";

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginName?: string;
  plugin?: any;
  onDataExchange?: (data: any) => void;
  onImageExport?: (imageUrl: string) => void;
  selectedEdition?: any;
  globalAssets?: any[];
  documentArtifacts?: any[];
}

// Cache de componentes carregados dinamicamente
const pluginComponentsCache: Record<string, React.ComponentType<any>> = {};

// Função para carregar componente de plugin dinamicamente
const loadPluginComponent = async (pageName: string): Promise<React.ComponentType<any> | null> => {
  // Verificar se já está no cache
  if (pluginComponentsCache[pageName]) {
    return pluginComponentsCache[pageName];
  }

  try {
    // Tentar carregar o componente dinamicamente
    const module = await import(`@/pages/plugins/${pageName}.tsx`);
    const Component = module.default;
    
    // Armazenar no cache para reutilização
    if (Component) {
      pluginComponentsCache[pageName] = Component;
      return Component;
    }
  } catch (error) {
    console.error(`Erro ao carregar plugin ${pageName}:`, error);
  }
  
  return null;
};

export default function PluginModal({ 
  isOpen, 
  onClose, 
  pluginName,
  plugin,
  onDataExchange,
  onImageExport,
  selectedEdition,
  globalAssets = [],
  documentArtifacts = []
}: PluginModalProps) {
  // Determinar o nome do plugin a partir do objeto plugin ou do pluginName
  const actualPluginName = plugin?.pageName || pluginName || "";
  const [PluginComponent, setPluginComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoadingPlugin, setIsLoadingPlugin] = useState(false);
  const [isReadyToMountPlugin, setIsReadyToMountPlugin] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Carregar componente do plugin dinamicamente quando modal abre
  useEffect(() => {
    if (isOpen && actualPluginName) {
      console.log('Carregando plugin:', actualPluginName);
      setIsLoadingPlugin(true);
      setLoadError(null);
      setPluginComponent(null);
      
      loadPluginComponent(actualPluginName)
        .then((component) => {
          if (component) {
            console.log('Plugin carregado com sucesso:', actualPluginName);
            setPluginComponent(() => component);
            setLoadError(null);
          } else {
            console.log('Plugin não encontrado:', actualPluginName);
            setLoadError(`Plugin "${actualPluginName}" não foi encontrado.`);
          }
        })
        .catch((error) => {
          console.error('Erro ao carregar plugin:', actualPluginName, error);
          setLoadError(`Erro ao carregar plugin: ${error.message}`);
        })
        .finally(() => {
          setIsLoadingPlugin(false);
        });
    } else {
      setPluginComponent(null);
      setIsLoadingPlugin(false);
      setLoadError(null);
    }
  }, [isOpen, actualPluginName]);

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

  // Force immediate sizing with aggressive approaches - MUST be before conditional returns
  useEffect(() => {
    if (!isOpen) return;

    const applyStyles = (element: HTMLElement) => {
      if (actualPluginName === 'lth_menus_path_plugin') {
        element.style.setProperty('width', '40vw', 'important');
        element.style.setProperty('height', '60vh', 'important');
        element.style.setProperty('position', 'fixed', 'important');
        element.style.setProperty('top', '20vh', 'important');
        element.style.setProperty('left', '30vw', 'important');
        element.style.setProperty('right', 'auto', 'important');
        element.style.setProperty('bottom', 'auto', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('padding', '0', 'important');
        element.style.setProperty('transform', 'none', 'important');
        element.style.setProperty('max-width', 'none', 'important');
        element.style.setProperty('max-height', 'none', 'important');
        element.style.setProperty('transition', 'none', 'important');
        element.style.setProperty('animation', 'none', 'important');
      }
    };

    // Immediate attempt
    const dialogContent = document.querySelector('[data-radix-dialog-content]');
    if (dialogContent) {
      applyStyles(dialogContent as HTMLElement);
    }

    // MutationObserver to catch when the element is created
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.matches('[data-radix-dialog-content]')) {
              applyStyles(element as HTMLElement);
            }
            // Also check children
            const dialogContent = element.querySelector('[data-radix-dialog-content]');
            if (dialogContent) {
              applyStyles(dialogContent as HTMLElement);
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Multiple timeout attempts to ensure styles are applied
    const timeouts = [0, 1, 5, 10, 50, 100].map(delay => 
      setTimeout(() => {
        const dialogContent = document.querySelector('[data-radix-dialog-content]');
        if (dialogContent) {
          applyStyles(dialogContent as HTMLElement);
        }
      }, delay)
    );

    return () => {
      observer.disconnect();
      timeouts.forEach(clearTimeout);
    };
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

  // Renderizar estados de loading e erro
  if (isLoadingPlugin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <VisuallyHidden>
            <DialogTitle>Carregando plugin</DialogTitle>
          </VisuallyHidden>
          <div className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Carregando plugin</h3>
            <p className="text-muted-foreground">
              Carregando "{actualPluginName}"...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (loadError || !PluginComponent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <VisuallyHidden>
            <DialogTitle>Plugin não encontrado</DialogTitle>
          </VisuallyHidden>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Plugin não encontrado</h3>
            <p className="text-muted-foreground">
              {loadError || `O plugin "${actualPluginName}" não foi encontrado ou não está disponível.`}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal>
      <DialogContent 
        forceMount={isOpen ? true : undefined} 
        className={`p-0 gap-0 !max-w-none !max-h-none ${
          actualPluginName === 'lth_menus_path_plugin' ? 'plugin-modal-lth' :
          actualPluginName === 'mermaid-graph-plugin' ? 'plugin-modal-large' : 
          actualPluginName === 'vector-graph-plugin' ? 'plugin-modal-large' :
          actualPluginName === 'simple-excalidraw-plugin' ? 'plugin-modal-xlarge' : 'plugin-modal-fullscreen'
        }`}
        style={{
          width: actualPluginName === 'lth_menus_path_plugin' ? '40vw' :
                 actualPluginName === 'mermaid-graph-plugin' ? '80vw' : 
                 actualPluginName === 'vector-graph-plugin' ? '80vw' :
                 actualPluginName === 'simple-excalidraw-plugin' ? '90vw' : '100vw',
          height: actualPluginName === 'lth_menus_path_plugin' ? '60vh' :
                  actualPluginName === 'mermaid-graph-plugin' ? '80vh' : 
                  actualPluginName === 'vector-graph-plugin' ? '80vh' :
                  actualPluginName === 'simple-excalidraw-plugin' ? '90vh' : '100vh',
          position: 'fixed',
          top: actualPluginName === 'lth_menus_path_plugin' ? '20vh' :
               actualPluginName === 'mermaid-graph-plugin' ? '10vh' : 
               actualPluginName === 'vector-graph-plugin' ? '10vh' :
               actualPluginName === 'simple-excalidraw-plugin' ? '5vh' : '0',
          left: actualPluginName === 'lth_menus_path_plugin' ? '30vw' :
                actualPluginName === 'mermaid-graph-plugin' ? '10vw' : 
                actualPluginName === 'vector-graph-plugin' ? '10vw' :
                actualPluginName === 'simple-excalidraw-plugin' ? '5vw' : '0',
          right: 'auto',
          bottom: 'auto',
          margin: '0',
          padding: '0',
          transform: 'none',
          maxWidth: 'none',
          maxHeight: 'none',
          transition: 'none',
          animation: 'none',
          borderRadius: (actualPluginName === 'lth_menus_path_plugin' || actualPluginName === 'mermaid-graph-plugin' || actualPluginName === 'vector-graph-plugin' || actualPluginName === 'simple-excalidraw-plugin') ? '8px' : '0',
          zIndex: 50,
          border: 'none',
          overflow: 'hidden'
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Plugin {pluginName}</DialogTitle>
        </VisuallyHidden>

        {(actualPluginName !== 'simple-excalidraw-plugin' || isReadyToMountPlugin) && PluginComponent ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <PluginComponent
              onDataExchange={handleDataExchange || (() => {})}
              selectedEdition={selectedEdition || null}
              globalAssets={globalAssets || []}
              documentArtifacts={documentArtifacts || []}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando editor...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}