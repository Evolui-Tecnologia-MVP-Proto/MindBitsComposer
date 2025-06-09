import React, { useState, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

interface SimpleExcalidrawPluginProps {
  onDataReceived?: (data: any) => void;
}

const SimpleExcalidrawPlugin: React.FC<SimpleExcalidrawPluginProps> = ({ onDataReceived }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const handleChange = (elements: any, appState: any) => {
    onDataReceived?.({
      elements,
      appState,
      files: excalidrawAPI?.getFiles?.() || {}
    });
  };

  // Aguardar modal estar visível antes de renderizar
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Delay para forçar recalcular o layout após API estar disponível
  useEffect(() => {
    if (excalidrawAPI && isReady) {
      const timer = setTimeout(() => {
        if (excalidrawAPI.refresh) {
          excalidrawAPI.refresh();
        }
        window.dispatchEvent(new Event('resize'));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [excalidrawAPI, isReady]);

  if (!isReady) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Carregando editor...</div>
      </div>
    );
  }

  return (
    <div
      className="excalidraw-wrapper"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "500px",
        minWidth: "700px",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: false
          }
        }}
      />
    </div>
  );
};

SimpleExcalidrawPlugin.displayName = "Simple Excalidraw";

export default SimpleExcalidrawPlugin;