import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Upload, Save } from 'lucide-react';
import { Excalidraw, exportToCanvas, exportToSvg } from '@excalidraw/excalidraw';

interface ExcalidrawEditorPluginProps {
  onDataExchange?: (data: any) => void;
}

export default function ExcalidrawEditorPlugin({ onDataExchange }: ExcalidrawEditorPluginProps) {
  const excalidrawRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileLoad = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.elements && Array.isArray(data.elements)) {
          setSceneData({
            elements: data.elements,
            appState: data.appState || { theme: 'light', viewBackgroundColor: '#ffffff' }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar arquivo:', error);
        alert('Erro ao carregar arquivo. Verifique se é um arquivo Excalidraw válido.');
      }
    };
    reader.readAsText(file);
    
    // Limpar o input
    event.target.value = '';
  }, []);

  const handleClear = useCallback(() => {
    setSceneData({
      elements: [],
      appState: { theme: 'light', viewBackgroundColor: '#ffffff' }
    });
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
            onClick={handleLoad}
            className="h-8 px-3 text-xs"
          >
            <Upload className="h-3 w-3 mr-1" />
            Carregar
          </Button>
          
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
      
      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".excalidraw,.json"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />
      
      {/* Editor Excalidraw */}
      <div className="flex-1 w-full" style={{ height: 'calc(100% - 73px)' }}>
        <Excalidraw
          initialData={sceneData}
          onChange={(elements: any, appState: any, files: any) => {
            setSceneData({
              elements: [...elements],
              appState: appState
            });
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: true,
            },
          }}
        />
      </div>
    </div>
  );
}