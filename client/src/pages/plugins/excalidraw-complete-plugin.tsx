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

      // Encontrar e remover textos de ajuda
      const allDivs = container.querySelectorAll('div');
      allDivs.forEach((div) => {
        const text = div.textContent || '';
        if (text.includes('To move canvas') || 
            text.includes('hold mouse wheel') || 
            text.includes('spacebar while dragging') ||
            text.includes('use the hand tool')) {
          div.style.display = 'none';
          div.style.visibility = 'hidden';
        }
      });
    };

    // Executar remoção após carregamento
    const timer = setTimeout(removeHelpTexts, 1000);
    
    // Observer para remover textos que aparecem dinamicamente
    const observer = new MutationObserver(removeHelpTexts);
    if (containerRef.current) {
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true 
      });
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ExcalidrawApp onDataChange={handleDataChange} />
    </div>
  );
};

ExcalidrawCompletePlugin.displayName = "Excalidraw Complete Editor";

export default ExcalidrawCompletePlugin;