import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "./App.scss";

export interface AppProps {
  onDataChange?: (data: any) => void;
}

export const App = ({ onDataChange }: AppProps) => {
  return (
    <div 
      className="excalidraw-simple-wrapper"
      style={{
        width: '800px',
        height: '600px',
        maxWidth: '800px',
        maxHeight: '600px',
        overflow: 'hidden',
        position: 'relative',
        margin: '0 auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }}
    >
      <Excalidraw
        initialData={{
          elements: [],
          appState: {
            theme: "light",
            viewBackgroundColor: "#ffffff",
            zenModeEnabled: true,
          },
        }}
        onChange={(elements, appState, files) => {
          onDataChange?.({ elements, appState, files });
        }}
        theme="light"
      />
    </div>
  );
};