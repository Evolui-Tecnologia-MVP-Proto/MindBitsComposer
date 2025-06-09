import React, { useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  exportToCanvas,
  exportToSvg,
  exportToBlob,
  getSceneVersion,
  isInvisiblySmallElement,
  getNonDeletedElements,
  loadFromBlob,
  loadLibraryFromBlob,
  useHandleLibrary,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  LibraryItems,
  Theme,
  UIOptions,
  AppState,
  ExcalidrawElement,
} from "@excalidraw/excalidraw/types";
import { Footer } from "./components/Footer";
import { MobileMenu } from "./components/MobileMenu";
import { LanguageList } from "./components/LanguageList";
import initialData from "./initialData";
import { isImageFileHandle, isImageFileHandleType } from "./data/blob";
import {
  exportToFileIcon,
  loadIcon,
  saveIcon,
  exportImageIcon,
  helpIcon,
} from "./icons";

import "./App.scss";

export interface AppProps {}

export const App = (props: AppProps) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [canvasUrl, setCanvasUrl] = useState("");
  const [exportedDataURL, setExportedDataURL] = useState("");
  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [gridModeEnabled, setGridModeEnabled] = useState(false);
  const [blobUrl, setBlobUrl] = useState("");
  const [canvasScale, setCanvasScale] = useState(1);
  const [theme, setTheme] = useState<Theme>("light");

  const initialStatePromiseRef = useRef<{
    promise: Promise<ExcalidrawInitialDataState | null>;
  }>({ promise: Promise.resolve(initialData) });

  useHandleLibrary({ excalidrawAPI });

  useEffect(() => {
    const onHashChange = () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const libraryUrl = hash.get("addLibrary");
      if (libraryUrl) {
        // Handle library loading
        excalidrawAPI?.updateScene({ libraryItems: [] });
      }
    };

    window.addEventListener("hashchange", onHashChange, false);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [excalidrawAPI]);

  const updateScene = (elements: readonly ExcalidrawElement[]) => {
    const nonDeletedElements = getNonDeletedElements(elements);
    excalidrawAPI?.updateScene({
      elements: nonDeletedElements,
    });
  };

  const onLinkOpen = (
    element: ExcalidrawElement,
    event: CustomEvent<{
      nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement>;
    }>,
  ) => {
    const link = element.link;
    const { nativeEvent } = event.detail;
    const isNewTab = nativeEvent.ctrlKey || nativeEvent.metaKey;
    const isNewWindow = nativeEvent.shiftKey;
    const isMiddleClick =
      nativeEvent.button === 1 ||
      (nativeEvent instanceof PointerEvent && nativeEvent.button === 1);
    if (link) {
      if (isNewTab || isMiddleClick) {
        window.open(link, "_blank", "noreferrer");
      } else if (isNewWindow) {
        window.open(link, "_blank", "popup,noreferrer");
      } else {
        window.location.href = link;
      }
    }
  };

  const renderTopRightUI = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          className="custom-button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title="Toggle theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          className="custom-button"
          onClick={() => setViewModeEnabled(!viewModeEnabled)}
          title="Toggle view mode"
        >
          👁️
        </button>
        <button
          className="custom-button"
          onClick={() => setZenModeEnabled(!zenModeEnabled)}
          title="Toggle zen mode"
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
        <MainMenu.DefaultItems.Socials />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    );
  };

  const renderFooter = () => {
    return <Footer />;
  };

  const renderWelcomeScreen = () => {
    return (
      <WelcomeScreen>
        <WelcomeScreen.Hints.MenuHint />
        <WelcomeScreen.Hints.ToolbarHint />
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Logo />
          <WelcomeScreen.Center.Heading>
            Excalidraw is a virtual collaborative whiteboard tool that lets you
            easily sketch diagrams that have a hand-drawn feel to them.
          </WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            <WelcomeScreen.Center.MenuItemLoadScene />
            <WelcomeScreen.Center.MenuItemHelp />
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
      </WelcomeScreen>
    );
  };

  const UIOptions: UIOptions = {
    canvasActions: {
      toggleTheme: false,
      export: false,
    },
  };

  return (
    <div className="excalidraw-app">
      <Excalidraw
        ref={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
        initialData={initialStatePromiseRef.current.promise}
        onChange={(elements, appState, files) => {
          console.log("Elements :", elements, "App State:", appState, "Files:", files);
        }}
        onPointerUpdate={(payload) => console.log(payload)}
        onLinkOpen={onLinkOpen}
        UIOptions={UIOptions}
        renderTopRightUI={renderTopRightUI}
        renderFooter={renderFooter}
        langCode="en"
        viewModeEnabled={viewModeEnabled}
        zenModeEnabled={zenModeEnabled}
        gridModeEnabled={gridModeEnabled}
        theme={theme}
        name="Excalidraw"
        renderCustomStats={(elements, appState) => (
          <div style={{ fontSize: "0.7rem" }}>
            Scene has {elements.length} elements
            (only non-deleted: {getNonDeletedElements(elements).length})
          </div>
        )}
      >
        {renderMenu()}
        {renderWelcomeScreen()}
      </Excalidraw>
    </div>
  );
};