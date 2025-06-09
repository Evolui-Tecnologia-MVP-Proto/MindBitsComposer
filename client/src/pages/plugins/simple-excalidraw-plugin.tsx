import React, { useState, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

interface SimpleExcalidrawPluginProps {
  onDataReceived?: (data: any) => void;
}

const SimpleExcalidrawPlugin: React.FC<SimpleExcalidrawPluginProps> = ({ onDataReceived }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const handleChange = (elements: any, appState: any) => {
    onDataReceived?.({
      elements,
      appState,
      files: excalidrawAPI?.getFiles?.() || {}
    });
  };

  // Forçar refresh após montagem para garantir layout correto
  useEffect(() => {
    const timer = setTimeout(() => {
      if (excalidrawAPI && excalidrawAPI.refresh) {
        excalidrawAPI.refresh();
      }
      // Forçar recálculo do viewport
      window.dispatchEvent(new Event('resize'));
    }, 200);

    return () => clearTimeout(timer);
  }, [excalidrawAPI]);

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