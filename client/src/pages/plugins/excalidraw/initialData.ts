import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

const initialData: ExcalidrawInitialDataState = {
  elements: [],
  appState: {
    theme: "light",
    viewBackgroundColor: "#ffffff",
    currentItemStrokeColor: "#1e1e1e",
    currentItemBackgroundColor: "transparent",
    currentItemFillStyle: "hachure",
    currentItemStrokeWidth: 1,
    currentItemStrokeStyle: "solid",
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontFamily: 1,
    currentItemFontSize: 20,
    currentItemTextAlign: "left",
    currentItemStartArrowhead: null,
    currentItemEndArrowhead: "arrow",
    scrollX: 0,
    scrollY: 0,
    zoom: {
      value: 1,
    },
    currentItemRoundness: "round",
    gridSize: null,
    colorPalette: {},
  },
  scrollToContent: true,
};

export default initialData;