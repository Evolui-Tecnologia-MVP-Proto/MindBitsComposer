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
  Minus,
  MousePointer2
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
  const [currentTool, setCurrentTool] = useState<'select' | 'eraser' | 'circle' | 'square' | 'line'>('line');
  const [brushSize, setBrushSize] = useState([3]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
  // Referência para container do canvas para cálculo dinâmico
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: 1400,
    height: 800
  });

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ffffff'
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

  // Limpar seleção ao trocar de ferramenta
  useEffect(() => {
    if (currentTool !== 'select') {
      clearSelection();
    }
  }, [currentTool]);

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

    if (currentTool === 'select') {
      setIsSelecting(true);
      setSelectionRect({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0
      });
      return;
    }

    setIsDrawing(true);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getMousePos(canvas, e);

    // Lógica de seleção
    if (isSelecting && selectionRect) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Redesenhar o canvas original (sem a seleção anterior)
      redrawCanvas();

      // Calcular dimensões da seleção
      const width = pos.x - selectionRect.x;
      const height = pos.y - selectionRect.y;

      // Desenhar retângulo de seleção
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionRect.x, selectionRect.y, width, height);
      ctx.setLineDash([]);

      // Atualizar dimensões da seleção
      setSelectionRect({
        ...selectionRect,
        width,
        height
      });
      return;
    }

    if (!isDrawing) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

  // Função para redesenhar o canvas original
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Aqui você pode adicionar lógica para redesenhar desenhos salvos se necessário
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    // Finalizar seleção se estiver selecionando
    if (isSelecting) {
      setIsSelecting(false);
      console.log('Área selecionada:', selectionRect);
      // Aqui você pode adicionar lógica para processar a área selecionada
    }
  };

  const clearSelection = () => {
    setSelectionRect(null);
    setIsSelecting(false);
    redrawCanvas();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    clearSelection();
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

  const exportCanvasData = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectionRect || selectionRect.width === 0 || selectionRect.height === 0) return;

    try {
      // Criar um canvas temporário para a área selecionada
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Definir dimensões do canvas temporário
      const { x, y, width, height } = selectionRect;
      tempCanvas.width = Math.abs(width);
      tempCanvas.height = Math.abs(height);

      // Copiar a área selecionada para o canvas temporário
      tempCtx.drawImage(
        canvas,
        Math.min(x, x + width), // x da origem
        Math.min(y, y + height), // y da origem  
        Math.abs(width), // largura da origem
        Math.abs(height), // altura da origem
        0, // x do destino
        0, // y do destino
        Math.abs(width), // largura do destino
        Math.abs(height) // altura do destino
      );

      // Converter para JPG com qualidade alta
      const jpegDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
      
      // Converter para Blob
      const response = await fetch(jpegDataUrl);
      const blob = await response.blob();

      // Criar FormData para envio
      const formData = new FormData();
      formData.append('image', blob, `selection_${Date.now()}.jpg`);
      formData.append('metadata', JSON.stringify({
        selection: selectionRect,
        timestamp: new Date().toISOString(),
        format: 'jpeg',
        quality: 0.9
      }));

      // Enviar via API (você pode ajustar o endpoint conforme necessário)
      const apiResponse = await fetch('/api/canvas/upload-selection', {
        method: 'POST',
        body: formData
      });

      if (apiResponse.ok) {
        const result = await apiResponse.json();
        console.log('Seleção enviada com sucesso:', result);
        
        // Limpar seleção após envio bem-sucedido
        clearSelection();
        
        // Notificar aplicação principal
        if (onDataExchange) {
          onDataExchange({
            action: 'export',
            type: 'selection_image',
            data: {
              success: true,
              selection: selectionRect,
              response: result
            },
            message: 'Seleção exportada como JPG com sucesso!'
          });
        }
      } else {
        throw new Error(`Erro na API: ${apiResponse.status}`);
      }

    } catch (error) {
      console.error('Erro ao exportar seleção:', error);
      
      // Notificar aplicação principal do erro
      if (onDataExchange) {
        onDataExchange({
          action: 'export',
          type: 'selection_image',
          data: {
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          },
          message: 'Erro ao exportar seleção'
        });
      }
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
                variant={currentTool === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('select')}
              >
                <MousePointer2 className="h-4 w-4 mr-1" />
                Seleção
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
                disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
                className={selectionRect && selectionRect.width !== 0 && selectionRect.height !== 0 ? 
                  "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : 
                  ""}
              >
                <Upload className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-50 min-h-0 relative"
      >
        <div 
          className="border border-gray-300 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden absolute" 
          style={{ 
            top: '30px', 
            left: '30px', 
            right: '30px', 
            bottom: '30px',
            padding: '1px'
          }}
        >
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
              <span>Ferramenta: {currentTool === 'eraser' ? 'Borracha' : currentTool === 'line' ? 'Linha' : currentTool === 'circle' ? 'Círculo' : 'Quadrado'}</span>
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