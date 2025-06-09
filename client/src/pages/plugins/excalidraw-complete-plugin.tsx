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



  return (
    <div ref={containerRef} className="w-full h-full">
      <ExcalidrawApp onDataChange={handleDataChange} />
    </div>
  );
};

ExcalidrawCompletePlugin.displayName = "Excalidraw Complete Editor";

export default ExcalidrawCompletePlugin;