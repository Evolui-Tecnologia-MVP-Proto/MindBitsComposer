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
        className="p-0 gap-0 !max-w-none"
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          margin: 0,
          zIndex: 9999,
          borderRadius: 0
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Plugin {pluginName}</DialogTitle>
        </VisuallyHidden>
        <PluginComponent
          onDataExchange={onDataExchange}
        />
      </DialogContent>
    </Dialog>
  );
}