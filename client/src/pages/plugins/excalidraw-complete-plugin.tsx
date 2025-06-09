import React, { useEffect, useRef } from "react";
import { App as ExcalidrawApp } from "./excalidraw/App";

interface ExcalidrawCompletePluginProps {
  onDataReceived?: (data: any) => void;
}

const ExcalidrawCompletePlugin: React.FC<ExcalidrawCompletePluginProps> = ({ onDataReceived }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDataChange = (data: any) => {
    // Enviar dados para o componente pai quando houver mudanças
    onDataReceived?.(data);
  };

  useEffect(() => {
    const removeHelpTexts = () => {
      const container = containerRef.current;
      if (!container) return;

      // Encontrar e remover apenas textos de ajuda, não a toolbar
      const helpTexts = container.querySelectorAll('div:not(.Island):not([class*="Island"])');
      helpTexts.forEach((div) => {
        const text = div.textContent || '';
        const element = div as HTMLElement;
        
        // Verificar se é texto de ajuda e não contém botões
        if ((text.includes('To move canvas') || 
            text.includes('hold mouse wheel') || 
            text.includes('spacebar while dragging') ||
            text.includes('use the hand tool')) && 
            !element.querySelector('button') &&
            !element.querySelector('svg')) {
          element.style.display = 'none';
        }
      });
    };

    const timer = setTimeout(removeHelpTexts, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ExcalidrawApp onDataChange={handleDataChange} />
    </div>
  );
};

ExcalidrawCompletePlugin.displayName = "Excalidraw Complete Editor";

export default ExcalidrawCompletePlugin;