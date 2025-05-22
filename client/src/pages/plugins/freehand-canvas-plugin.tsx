import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Maximize2, 
  Minimize2, 
  Palette, 
  Eraser, 
  RotateCcw, 
  Download,
  Upload,
  Trash2,
  Circle,
  Square,
  Minus
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FreeHandCanvasPluginProps {
  onDataExchange?: (data: any) => void;
}

export default function FreeHandCanvasPlugin({ 
  onDataExchange 
}: FreeHandCanvasPluginProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'circle' | 'square' | 'line'>('pen');
  const [brushSize, setBrushSize] = useState([5]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  
  // Referência para container do canvas para cálculo dinâmico
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: 1400,
    height: 800
  });

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ffffff',
    '#808080', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#c0c0c0'
  ];

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Preencher fundo apenas se for a primeira inicialização
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // Efeito para calcular tamanho dinâmico do canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasContainerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newSize = {
        width: Math.floor(rect.width - 64), // Subtrair padding + border + margem
        height: Math.floor(rect.height - 64) // Subtrair padding + border + margem
      };
      
      // Garantir tamanhos mínimos
      if (newSize.width < 100) newSize.width = 100;
      if (newSize.height < 100) newSize.height = 100;
      
      // Só atualizar se o tamanho mudou significativamente
      if (Math.abs(newSize.width - canvasSize.width) > 10 || 
          Math.abs(newSize.height - canvasSize.height) > 10) {
        setCanvasSize(newSize);
      }
    };

    // Aguardar um frame para garantir que o layout esteja estável
    const timeoutId = setTimeout(updateCanvasSize, 100);
    
    // Escutar redimensionamento da janela
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    initializeCanvas();
  }, [backgroundColor, canvasSize]); // Adicionar canvasSize como dependência

  // Efeito separado para lidar com mudanças de expansão sem alterar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Configurar canvas apenas uma vez - dimensões reais sem CSS
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      canvas.style.border = '1px solid #ccc';
    }
    
    // Apenas estilos básicos - SEM redimensionamento CSS
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
  }, []);

  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };



  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getMousePos(canvas, e);

    setIsDrawing(true);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(canvas, e);

    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize[0] * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = brushSize[0];
      ctx.strokeStyle = currentColor;
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `freehand-canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    // Enviar dados para a aplicação principal
    if (onDataExchange) {
      onDataExchange({
        action: 'download',
        type: 'image',
        data: canvas.toDataURL(),
        timestamp: new Date().toISOString(),
        filename: link.download
      });
    }
  };

  const exportCanvasData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasData = {
      imageData: canvas.toDataURL(),
      dimensions: {
        width: canvas.width,
        height: canvas.height
      },
      settings: {
        backgroundColor,
        lastTool: currentTool,
        lastBrushSize: brushSize[0],
        lastColor: currentColor
      },
      timestamp: new Date().toISOString()
    };

    // Enviar dados para a aplicação principal
    if (onDataExchange) {
      onDataExchange({
        action: 'export',
        type: 'canvas_data',
        data: canvasData,
        message: 'Dados do canvas exportados com sucesso'
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <Card className="border-b rounded-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">FreeHand Canvas</CardTitle>
                <Badge variant="default" className="shrink-0">Ativo</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Plugin de desenho livre para criação e edição visual
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Toolbar */}
      <Card className="border-b border-t-0 rounded-none">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Ferramentas */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Ferramentas:</span>
              <Button
                variant={currentTool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('pen')}
              >
                <Palette className="h-4 w-4 mr-1" />
                Pincel
              </Button>
              <Button
                variant={currentTool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('eraser')}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Borracha
              </Button>
              <Button
                variant={currentTool === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('line')}
              >
                <Minus className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Tamanho do pincel */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Tamanho:</span>
              <div className="w-20">
                <Slider
                  value={brushSize}
                  onValueChange={setBrushSize}
                  max={50}
                  min={1}
                  step={1}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">{brushSize[0]}px</span>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Cores */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Cor:</span>
              <div className="flex space-x-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      currentColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))}
              </div>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-8 h-6 rounded border border-gray-300"
              />
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Fundo */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Fundo:</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-8 h-6 rounded border border-gray-300"
              />
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Ações */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCanvas}
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCanvasData}
              >
                <Upload className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 p-4 bg-gray-50 min-h-0"
      >
        <div className="h-full border border-gray-300 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair block max-w-full max-h-full"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>

      {/* Status Bar */}
      <Card className="border-t rounded-none">
        <CardContent className="py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Ferramenta: {currentTool === 'pen' ? 'Pincel' : currentTool === 'eraser' ? 'Borracha' : 'Linha'}</span>
              <span>Tamanho: {brushSize[0]}px</span>
              <span>Cor: {currentColor}</span>
            </div>
            <div>
              Canvas Interativo • FreeHand v1.0
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}