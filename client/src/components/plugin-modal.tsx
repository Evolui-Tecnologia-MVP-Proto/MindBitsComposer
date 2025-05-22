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

  const PluginComponent = PLUGIN_COMPONENTS[pluginName];

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
          position: 'fixed',
          top: isExpanded ? '0' : '50%',
          left: isExpanded ? '0' : '50%',
          transform: isExpanded ? 'none' : 'translate(-50%, -50%)',
          width: isExpanded ? '100vw' : '50vw',
          height: isExpanded ? '100vh' : '60vh',
          maxWidth: isExpanded ? '100vw' : '50vw',
          maxHeight: isExpanded ? '100vh' : '60vh',
          margin: 0,
          zIndex: 9999,
          borderRadius: isExpanded ? 0 : 8
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