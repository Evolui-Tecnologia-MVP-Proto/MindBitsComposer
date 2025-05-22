import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import FreeHandCanvasPlugin from "@/pages/plugins/freehand-canvas-plugin";

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginName: string;
  onDataExchange?: (data: any) => void;
}

const PLUGIN_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'freehand-canvas-plugin': FreeHandCanvasPlugin,
};

export default function PluginModal({ 
  isOpen, 
  onClose, 
  pluginName,
  onDataExchange 
}: PluginModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  console.log("PluginModal recebeu pluginName:", pluginName);
  console.log("Componentes disponíveis:", Object.keys(PLUGIN_COMPONENTS));

  const PluginComponent = PLUGIN_COMPONENTS[pluginName];
  
  console.log("Componente encontrado:", PluginComponent ? "SIM" : "NÃO");

  if (!PluginComponent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Plugin não encontrado</h3>
            <p className="text-muted-foreground">
              O plugin "{pluginName}" não foi encontrado ou não está disponível.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 gap-0 transition-all duration-300"
        style={{ 
          width: isExpanded ? '100vw' : '50vw',
          height: isExpanded ? '100vh' : '60vh',
          maxWidth: isExpanded ? 'none' : '50vw',
          maxHeight: isExpanded ? 'none' : '60vh'
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Plugin {pluginName}</DialogTitle>
        </VisuallyHidden>
        <PluginComponent
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          onDataExchange={onDataExchange}
        />
      </DialogContent>
    </Dialog>
  );
}