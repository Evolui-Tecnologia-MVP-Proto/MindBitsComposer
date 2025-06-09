import React, { useState } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "./App.scss";

export interface AppProps {
  onDataChange?: (data: any) => void;
}

export const App = ({ onDataChange }: AppProps) => {
  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const renderTopRightUI = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          className="custom-button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title="Alternar tema"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          className="custom-button"
          onClick={() => setViewModeEnabled(!viewModeEnabled)}
          title="Modo visualização"
        >
          👁️
        </button>
        <button
          className="custom-button"
          onClick={() => setZenModeEnabled(!zenModeEnabled)}
          title="Modo zen"
        >
          🧘
        </button>
      </div>
    );
  };

  const renderMenu = () => {
    return (
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    );
  };

  const renderWelcomeScreen = () => {
    return (
      <WelcomeScreen>
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Hints.ToolbarHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Logo />
          <WelcomeScreen.Center.Heading>
            Editor de Diagramas Excalidraw
          </WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            <WelcomeScreen.Center.MenuItemLoadScene />
            <WelcomeScreen.Center.MenuItemHelp />
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
      </WelcomeScreen>
    );
  };

  return (
    <div className="excalidraw-app">
      <Excalidraw
        initialData={{
          elements: [],
          appState: {
            theme,
            viewBackgroundColor: theme === "light" ? "#ffffff" : "#121212",
          },
        }}
        onChange={(elements, appState, files) => {
          onDataChange?.({ elements, appState, files });
        }}
        UIOptions={{
          canvasActions: {
            toggleTheme: false,
            export: false,
          },
        }}
        renderTopRightUI={renderTopRightUI}
        viewModeEnabled={viewModeEnabled}
        zenModeEnabled={zenModeEnabled}
        theme={theme}
        name="Excalidraw Editor"
      >
        {renderMenu()}
        {renderWelcomeScreen()}
      </Excalidraw>
    </div>
  );
};