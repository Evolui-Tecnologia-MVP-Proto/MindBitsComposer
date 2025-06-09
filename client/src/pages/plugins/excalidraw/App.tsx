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
        width: '100%',
        height: '600px',
        maxWidth: '100%',
        maxHeight: '600px',
        overflow: 'hidden',
        position: 'relative',
        margin: '0 auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#ffffff'
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