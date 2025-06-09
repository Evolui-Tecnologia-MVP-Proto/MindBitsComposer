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
    const reorganizeToolbar = () => {
      const container = containerRef.current;
      if (!container) return;

      // Encontrar elementos de ajuda e toolbar
      const helpTextElements = container.querySelectorAll('div');
      const toolbarIsland = container.querySelector('.Island');
      
      helpTextElements.forEach((div) => {
        const text = div.textContent || '';
        if (text.includes('To move canvas') || text.includes('hold mouse wheel')) {
          // Reposicionar texto de ajuda para baixo da toolbar
          const element = div as HTMLElement;
          element.style.position = 'absolute';
          element.style.top = '70px';
          element.style.left = '50%';
          element.style.transform = 'translateX(-50%)';
          element.style.background = 'rgba(255, 255, 255, 0.9)';
          element.style.padding = '4px 8px';
          element.style.borderRadius = '4px';
          element.style.fontSize = '11px';
          element.style.color = '#666';
          element.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
          element.style.whiteSpace = 'nowrap';
          element.style.zIndex = '999';
          element.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        }
      });

      // Posicionar toolbar no topo
      if (toolbarIsland) {
        const element = toolbarIsland as HTMLElement;
        element.style.position = 'absolute';
        element.style.top = '10px';
        element.style.left = '50%';
        element.style.transform = 'translateX(-50%)';
        element.style.zIndex = '1000';
        element.style.display = 'flex';
        element.style.flexDirection = 'row';
        element.style.alignItems = 'center';
        element.style.gap = '4px';
      }
    };

    // Executar reorganização com delay para aguardar renderização
    const timer = setTimeout(() => {
      reorganizeToolbar();
      
      // Observer para mudanças no DOM
      const observer = new MutationObserver(reorganizeToolbar);
      if (containerRef.current) {
        observer.observe(containerRef.current, { 
          childList: true, 
          subtree: true 
        });
      }
      
      return () => observer.disconnect();
    }, 1000);

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