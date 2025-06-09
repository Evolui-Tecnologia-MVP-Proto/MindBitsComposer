import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import mermaid from "mermaid";

interface MermaidGraphPluginProps {
  onDataExchange?: (data: any) => void;
}

export default function MermaidGraphPlugin({ onDataExchange }: MermaidGraphPluginProps) {
  const [mermaidCode, setMermaidCode] = useState(`graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [lastSvg, setLastSvg] = useState<string>('');

  // Inicializar Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
      fontSize: 14,
    });
  }, []);

  // Renderizar o gráfico quando o código mudar
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderMermaid = async () => {
      if (!mermaidCode.trim()) {
        if (canvasRef.current) {
          canvasRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Digite código Mermaid no editor</div>';
        }
        return;
      }

      setIsRendering(true);
      setRenderError(null);

      try {
        // Limpar conteúdo anterior
        if (canvasRef.current) {
          canvasRef.current.innerHTML = '';
        }

        // Validar sintaxe primeiro
        await mermaid.parse(mermaidCode);

        // Gerar ID único para o gráfico
        const graphId = `mermaid-graph-${Date.now()}`;
        
        // Renderizar o gráfico
        const { svg } = await mermaid.render(graphId, mermaidCode);
        
        if (canvasRef.current) {
          canvasRef.current.innerHTML = svg;
          setLastSvg(svg);
          
          // Auto-redimensionar o SVG para caber no canvas
          setTimeout(() => {
            const svgElement = canvasRef.current?.querySelector('svg');
            if (svgElement) {
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.maxWidth = '100%';
              svgElement.style.maxHeight = '100%';
              svgElement.style.objectFit = 'contain';
            }
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao renderizar Mermaid:', error);
        setRenderError(error instanceof Error ? error.message : 'Erro desconhecido ao renderizar o gráfico');
        
        if (canvasRef.current) {
          canvasRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-red-500 p-4">
              <div class="text-lg font-semibold mb-2">Erro na sintaxe</div>
              <div class="text-sm text-center">${error instanceof Error ? error.message : 'Erro desconhecido'}</div>
            </div>
          `;
        }
      } finally {
        setIsRendering(false);
      }
    };

    // Debounce para evitar re-renderizações muito frequentes
    const timeoutId = setTimeout(renderMermaid, 500);
    return () => clearTimeout(timeoutId);
  }, [mermaidCode]);

  const handleClose = () => {
    if (onDataExchange) {
      onDataExchange({ closeModal: true });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 pb-3 border-b flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Mermaid Graph Plugin</h1>
          <p className="text-xs text-gray-600 mt-1">
            Editor e visualizador de diagramas Mermaid em tempo real
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex flex-1">
        {/* Painel Esquerdo - Editor de Código */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="font-medium text-sm text-gray-700">Editor Mermaid</h3>
            <p className="text-xs text-gray-500 mt-1">Digite ou cole seu código Mermaid aqui</p>
          </div>
          <div className="flex-1 p-3">
            <textarea
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              className="w-full h-full resize-none border rounded-lg p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu código Mermaid aqui..."
              spellCheck={false}
            />
          </div>
        </div>
        
        {/* Painel Direito - Canvas Renderizador */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm text-gray-700">Visualização</h3>
                <p className="text-xs text-gray-500 mt-1">Pré-visualização do diagrama em tempo real</p>
              </div>
              {isRendering && (
                <div className="text-xs text-blue-600 font-medium">Renderizando...</div>
              )}
              {renderError && (
                <div className="text-xs text-red-600 font-medium">Erro na sintaxe</div>
              )}
            </div>
          </div>
          <div className="flex-1 p-3 overflow-auto bg-white">
            <div 
              ref={canvasRef}
              className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg"
            >
              <div className="text-gray-500 text-sm">
                {isRendering ? 'Renderizando gráfico...' : 'Aguardando código...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}