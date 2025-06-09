import React, { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

interface SimpleExcalidrawPluginProps {
  onDataReceived?: (data: any) => void;
}

const SimpleExcalidrawPlugin: React.FC<SimpleExcalidrawPluginProps> = ({ onDataReceived }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const handleChange = (elements: any, appState: any) => {
    // Enviar dados para o componente pai quando houver mudanças
    onDataReceived?.({
      elements,
      appState,
      files: excalidrawAPI?.getFiles?.() || {}
    });
  };

  return (
    <div style={{ width: "100%", height: "500px" }}>
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