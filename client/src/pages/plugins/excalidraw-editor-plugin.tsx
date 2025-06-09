import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Save } from 'lucide-react';
import { Excalidraw, exportToCanvas, exportToSvg } from '@excalidraw/excalidraw';

interface ExcalidrawEditorPluginProps {
  onDataExchange?: (data: any) => void;
}

export default function ExcalidrawEditorPlugin({ onDataExchange }: ExcalidrawEditorPluginProps) {
  const excalidrawRef = useRef<any>(null);

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
      
      // Exportar como PNG
      const canvas = await exportToCanvas({
        elements,
        appState,
      });
      
      // Converter canvas para blob
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
      
      const svg = await exportToSvg({
        elements,
        appState,
      });

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
    if (excalidrawRef.current) {
      excalidrawRef.current.updateScene({
        elements: [],
        appState: { theme: 'light', viewBackgroundColor: '#ffffff' }
      });
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 pb-3 border-b flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-lg font-semibold">Excalidraw Editor</h1>
            <p className="text-xs text-gray-600 mt-1">
              Editor de diagramas e desenhos vetoriais
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave}
            className="h-8 px-3 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar PNG
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportSVG}
            className="h-8 px-3 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Exportar SVG
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClear}
            className="h-8 px-3 text-xs"
          >
            Limpar
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Editor Excalidraw */}
      <div 
        className="flex-1 w-full excalidraw-container" 
        style={{ 
          height: 'calc(100% - 73px)',
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
          `}
        </style>
        <Excalidraw
          excalidrawAPI={(api: any) => (excalidrawRef.current = api)}
          initialData={{
            elements: [],
            appState: {
              theme: 'light',
              viewBackgroundColor: '#ffffff',
            },
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: true,
            },
            tools: {
              image: false,
            },
          }}
          renderTopRightUI={() => null}
        />
      </div>
    </div>
  );
}