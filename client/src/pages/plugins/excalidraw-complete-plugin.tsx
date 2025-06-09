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
    const forceToolbarPosition = () => {
      const container = containerRef.current;
      if (!container) return;

      // Encontrar todas as toolbars/islands
      const toolbars = container.querySelectorAll('.Island, [class*="Island"]');
      
      toolbars.forEach((toolbar) => {
        const element = toolbar as HTMLElement;
        // Forçar posicionamento no topo
        element.style.cssText = `
          position: absolute !important;
          top: 10px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 1000 !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 4px !important;
          right: auto !important;
          bottom: auto !important;
          width: auto !important;
          height: auto !important;
        `;
      });

      // Encontrar e reposicionar textos de ajuda
      const helpTextElements = container.querySelectorAll('div');
      helpTextElements.forEach((div) => {
        const text = div.textContent || '';
        if (text.includes('To move canvas') || text.includes('hold mouse wheel')) {
          const element = div as HTMLElement;
          element.style.cssText = `
            position: absolute !important;
            top: 70px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(255, 255, 255, 0.9) !important;
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-size: 11px !important;
            color: #666 !important;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
            white-space: nowrap !important;
            z-index: 999 !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
          `;
        }
      });
    };

    // Executar múltiplas vezes para garantir persistência
    const intervals: NodeJS.Timeout[] = [];
    
    // Primeira execução após 500ms
    const initialTimer = setTimeout(forceToolbarPosition, 500);
    
    // Execução contínua a cada 2 segundos para manter posicionamento
    const persistentInterval = setInterval(forceToolbarPosition, 2000);
    intervals.push(persistentInterval);

    // Observer para mudanças imediatas
    let observer: MutationObserver | null = null;
    const setupObserver = () => {
      if (containerRef.current && !observer) {
        observer = new MutationObserver(() => {
          // Delay pequeno para aguardar aplicação completa das mudanças
          setTimeout(forceToolbarPosition, 100);
        });
        observer.observe(containerRef.current, { 
          childList: true, 
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    };

    setTimeout(setupObserver, 1000);

    return () => {
      clearTimeout(initialTimer);
      intervals.forEach(interval => clearInterval(interval));
      if (observer) {
        observer.disconnect();
      }
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