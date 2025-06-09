import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Save, RefreshCw, Upload, Undo, Redo, ZoomIn, ZoomOut } from 'lucide-react';
import { 
  Excalidraw, 
  exportToCanvas, 
  exportToSvg, 
  exportToBlob,
  loadFromBlob,
  loadLibraryFromBlob,
  exportToClipboard
} from '@excalidraw/excalidraw';

interface ExcalidrawEditorPluginProps {
  onDataExchange?: (data: any) => void;
}

export default function ExcalidrawEditorPlugin({ onDataExchange }: ExcalidrawEditorPluginProps) {
  const excalidrawRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleClose = useCallback(() => {
    if (onDataExchange) {
      onDataExchange({ closeModal: true });
    }
  }, [onDataExchange]);

  const handleSave = useCallback(async () => {
    if (!excalidrawRef.current) {
      alert('Editor não está pronto');
      return;
    }

    try {
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();

      if (!elements || elements.length === 0) {
        alert('Desenhe algo primeiro.');
        return;
      }

      const canvas = await exportToCanvas({ elements, appState });

      canvas.toBlob((blob: any) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `excalidraw-drawing-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Desenhe algo primeiro.');
    }
  }, []);

  const handleExportSVG = useCallback(async () => {
    if (!excalidrawRef.current) {
      alert('Editor não está pronto');
      return;
    }

    try {
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();

      if (!elements || elements.length === 0) {
        alert('Desenhe algo primeiro.');
        return;
      }

      const svg = await exportToSvg({ elements, appState });

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const a = document.createElement('a');
      a.href = svgUrl;
      a.download = `excalidraw-drawing-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(svgUrl);

    } catch (error) {
      console.error('Erro ao exportar SVG:', error);
      alert('Erro ao exportar. Desenhe algo primeiro.');
    }
  }, []);

  const handleClear = useCallback(() => {
    excalidrawRef.current?.updateScene({
      elements: [],
      appState: {
        theme: 'light',
        viewBackgroundColor: '#ffffff',
        zoom: 1,
        scrollX: 0,
        scrollY: 0,
      }
    });
  }, []);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileLoad = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !excalidrawRef.current) return;

    try {
      if (file.name.endsWith('.excalidraw')) {
        const text = await file.text();
        const data = JSON.parse(text);
        excalidrawRef.current.updateScene({
          elements: data.elements || [],
          appState: { ...data.appState, theme }
        });
      } else if (file.type.startsWith('image/')) {
        // Handle image import
        const fileData = await loadFromBlob(file, null, null);
        if (fileData) {
          excalidrawRef.current.updateScene(fileData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      alert('Erro ao carregar arquivo. Verifique se é um arquivo válido.');
    }
    
    event.target.value = '';
  }, [theme]);

  const handleUndo = useCallback(() => {
    excalidrawRef.current?.history?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    excalidrawRef.current?.history?.redo();
  }, []);

  const handleZoomIn = useCallback(() => {
    const currentZoom = excalidrawRef.current?.getAppState()?.zoom?.value || 1;
    excalidrawRef.current?.updateScene({
      appState: { zoom: { value: Math.min(currentZoom * 1.2, 3) } }
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    const currentZoom = excalidrawRef.current?.getAppState()?.zoom?.value || 1;
    excalidrawRef.current?.updateScene({
      appState: { zoom: { value: Math.max(currentZoom / 1.2, 0.1) } }
    });
  }, []);

  const resetViewport = useCallback(() => {
    excalidrawRef.current?.updateScene({
      appState: {
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    excalidrawRef.current?.updateScene({
      appState: { theme: newTheme }
    });
  }, [theme]);

  const exportToClipboardHandler = useCallback(async () => {
    if (!excalidrawRef.current) return;

    try {
      const elements = excalidrawRef.current.getSceneElements();
      if (!elements || elements.length === 0) {
        alert('Desenhe algo primeiro.');
        return;
      }

      await exportToClipboard({
        elements,
        appState: excalidrawRef.current.getAppState(),
        files: excalidrawRef.current.getFiles(),
        type: 'png'
      });
      
      alert('Imagem copiada para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Erro ao copiar para área de transferência.');
    }
  }, []);

  const saveAsExcalidraw = useCallback(async () => {
    if (!excalidrawRef.current) return;

    try {
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      
      const data = {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements,
        appState
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drawing-${Date.now()}.excalidraw`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao salvar .excalidraw:', error);
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gray-50">
        <div>
          <h1 className="text-lg font-semibold">Excalidraw Editor</h1>
          <p className="text-xs text-gray-600 mt-1">
            Editor profissional de diagramas e desenhos vetoriais
          </p>
        </div>

        <div className="flex items-center space-x-1">
          {/* Grupo Arquivo */}
          <div className="flex items-center space-x-1 mr-2">
            <Button variant="outline" size="sm" onClick={handleLoad} className="h-7 px-2 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Abrir
            </Button>
            <Button variant="outline" size="sm" onClick={saveAsExcalidraw} className="h-7 px-2 text-xs">
              <Save className="h-3 w-3 mr-1" />
              Salvar
            </Button>
          </div>

          {/* Grupo Exportar */}
          <div className="flex items-center space-x-1 mr-2">
            <Button variant="outline" size="sm" onClick={handleSave} className="h-7 px-2 text-xs">
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSVG} className="h-7 px-2 text-xs">
              SVG
            </Button>
            <Button variant="outline" size="sm" onClick={exportToClipboardHandler} className="h-7 px-2 text-xs">
              Copiar
            </Button>
          </div>

          {/* Grupo Edição */}
          <div className="flex items-center space-x-1 mr-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUndo} 
              disabled={!canUndo}
              className="h-7 w-7 p-0"
            >
              <Undo className="h-3 w-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRedo} 
              disabled={!canRedo}
              className="h-7 w-7 p-0"
            >
              <Redo className="h-3 w-3" />
            </Button>
          </div>

          {/* Grupo Zoom */}
          <div className="flex items-center space-x-1 mr-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetViewport} className="h-7 px-2 text-xs">
              100%
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0">
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          {/* Grupo Ações */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={handleClear} className="h-7 px-2 text-xs">
              Limpar
            </Button>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="h-7 px-2 text-xs">
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".excalidraw,.json,image/*"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />
      
      {/* Editor Excalidraw */}
      <div 
        className="flex-1 w-full excalidraw-container" 
        style={{ 
          height: 'calc(100% - 73px)',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          '--ui-font-size': '14px',
        } as React.CSSProperties}
      >
        <style>
          {`
            .excalidraw-container .App-toolbar-content {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              display: flex !important;
            }
            .excalidraw-container .App-toolbar {
              top: 10px !important;
              left: 10px !important;
              max-width: calc(100vw - 100px) !important;
              width: auto !important;
              height: auto !important;
            }
            .excalidraw-container .App-toolbar .Island,
            .excalidraw-container .Island {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              display: flex !important;
              align-items: center !important;
              gap: 4px !important;
              padding: 8px !important;
              max-width: none !important;
              width: auto !important;
              height: auto !important;
            }
            .excalidraw-container .ToolIcon {
              width: 40px !important;
              height: 40px !important;
              min-width: 40px !important;
              min-height: 40px !important;
              margin: 0 !important;
              flex-shrink: 0 !important;
            }
            .excalidraw-container .ToolIcon svg {
              width: 20px !important;
              height: 20px !important;
            }
            .excalidraw-container .ToolIcon__icon {
              font-size: 16px !important;
            }
            .excalidraw-container button {
              font-size: 14px !important;
              min-width: 40px !important;
              min-height: 40px !important;
              flex-shrink: 0 !important;
            }
            .excalidraw-container .App-menu__left {
              gap: 4px !important;
              flex-direction: row !important;
              flex-wrap: wrap !important;
              display: flex !important;
            }
            .excalidraw-container .App-menu {
              transform: none !important;
            }
            .excalidraw-container .Stack {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              display: flex !important;
              gap: 4px !important;
            }
            .excalidraw-container .excalidraw {
              pointer-events: all !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              overflow: hidden !important;
            }
            .excalidraw-container canvas {
              pointer-events: all !important;
              max-width: 100% !important;
              max-height: 100% !important;
            }
            .excalidraw-container .App {
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
            }
            .excalidraw-container .excalidraw__canvas {
              max-width: 100% !important;
              max-height: 100% !important;
            }
            .excalidraw-container .excalidraw .App-main {
              width: 100% !important;
              height: 100% !important;
              max-width: 100vw !important;
              max-height: 100vh !important;
              overflow: hidden !important;
            }
            .excalidraw-container .excalidraw .App-canvas {
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
            }
            .excalidraw-container .layer-ui__wrapper {
              max-width: 100% !important;
              max-height: 100% !important;
            }
          `}
        </style>
        <Excalidraw
          excalidrawAPI={(api: any) => {
            excalidrawRef.current = api;
          }}
          initialData={{
            elements: [],
            appState: {
              theme,
              viewBackgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e',
              zenModeEnabled: false,
              viewModeEnabled: false,
            },
          }}
          onChange={(elements, appState, files) => {
            // Atualizar estados para controles
            if (appState) {
              const historySize = excalidrawRef.current?.history?.getSnapshotsMeta?.();
              setCanUndo(historySize?.undoSize > 0);
              setCanRedo(historySize?.redoSize > 0);
              setZoom(appState.zoom?.value || 1);
            }
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: false,
              clearCanvas: false,
            },
            tools: {
              image: true,
            },
          }}
          renderTopRightUI={() => null}
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={true}
          theme={theme}
        />
      </div>
    </div>
  );
}