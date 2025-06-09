import React, { useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

interface SimpleExcalidrawPluginProps {
  onDataReceived?: (data: any) => void;
}

const SimpleExcalidrawPlugin: React.FC<SimpleExcalidrawPluginProps> = ({ onDataReceived }) => {
  const excalidrawRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);

  const handleChange = (elements: any, appState: any) => {
    onDataReceived?.({
      elements,
      appState,
      files: excalidrawRef.current?.getFiles?.() || {}
    });
  };

  useEffect(() => {
    if (!apiReady || !excalidrawRef.current) return;

    const timer = setTimeout(() => {
      excalidrawRef.current.refresh?.();
      window.dispatchEvent(new Event("resize"));
    }, 200);

    return () => clearTimeout(timer);
  }, [apiReady]);

  return (
    <div
      className="excalidraw-wrapper"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "500px",
        minWidth: "700px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawRef.current = api;
          setApiReady(true);
        }}
        onChange={handleChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: false,
          },
        }}
      />
    </div>
  );
};

SimpleExcalidrawPlugin.displayName = "Simple Excalidraw";

export default SimpleExcalidrawPlugin;