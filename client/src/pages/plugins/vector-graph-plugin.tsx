import React, { useCallback } from 'react';
import { Tldraw, TldrawProps } from 'tldraw';
import 'tldraw/tldraw.css';

interface VectorGraphPluginProps {
  onDataExchange?: (data: any) => void;
}

const VectorGraphPlugin: React.FC<VectorGraphPluginProps> = ({ onDataExchange }) => {
  
  const handleExport = useCallback(async () => {
    try {
      // Get the editor instance from tldraw
      const editor = (window as any).tldrawEditor;
      if (editor) {
        // Export as SVG
        const svgData = await editor.getSvg();
        if (svgData) {
          const svgString = new XMLSerializer().serializeToString(svgData);
          
          // Send data back to parent
          if (onDataExchange) {
            onDataExchange({
              type: 'vector-graph',
              format: 'svg',
              data: svgString,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao exportar vetor:', error);
    }
  }, [onDataExchange]);

  const handleMount = useCallback((editor: any) => {
    // Store editor instance globally for access
    (window as any).tldrawEditor = editor;
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header com controles */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="font-medium text-sm">Vector Graph Editor</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Exportar SVG
          </button>
          <button
            onClick={() => onDataExchange?.({ closeModal: true })}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
      
      {/* Editor tldraw */}
      <div className="flex-1 relative">
        <Tldraw
          onMount={handleMount}
          autoFocus
        />
      </div>
    </div>
  );
};

export default VectorGraphPlugin;