import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

export interface AppProps {
  onDataChange?: (data: any) => void;
}

export const App = ({ onDataChange }: AppProps) => {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Excalidraw
        initialData={{
          elements: [],
          appState: { theme: "light" },
        }}
        onChange={(elements, appState, files) => {
          onDataChange?.({ elements, appState, files });
        }}
        theme="light"
      />
    </div>
  );
};