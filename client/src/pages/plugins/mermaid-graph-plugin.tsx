import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import mermaid from "mermaid";

interface MermaidGraphPluginProps {
  onDataExchange?: (data: any) => void;
  selectedEdition?: any;
}

export default function MermaidGraphPlugin({ onDataExchange, selectedEdition }: MermaidGraphPluginProps) {
  const [mermaidCode, setMermaidCode] = useState(`graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]`);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [diagramName, setDiagramName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastSvg, setLastSvg] = useState<string>('');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Mutation para salvar diagram como imagem
  const saveDiagramMutation = useMutation({
    mutationFn: async (data: { name: string; imageData: string; mermaidDefinition: string }) => {
      // Se não há documento composer, salvar em global assets
      if (!selectedEdition) {
        const globalAssetData = {
          name: data.name,
          fileData: data.imageData,
          fileSize: Math.round(data.imageData.length * 0.75).toString(),
          mimeType: 'image/png',
          isImage: 'true',
          description: 'Diagrama Mermaid gerado'
        };

        const response = await apiRequest('POST', '/api/global-assets', globalAssetData);
        return response.json();
      }

      // Se há documento composer, salvar como artifact
      const artifactData = {
        name: data.name,
        fileData: data.imageData,
        fileName: data.name,
        fileSize: Math.round(data.imageData.length * 0.75).toString(),
        mimeType: 'image/png',
        type: 'png',
        isImage: 'true',
        originAssetId: 'Mermaid',
        fileMetadata: data.mermaidDefinition
      };

      const response = await apiRequest('POST', `/api/document-editions/${selectedEdition.id}/artifacts`, artifactData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the appropriate cache based on where the diagram was saved
      if (selectedEdition) {
        queryClient.invalidateQueries({ queryKey: ['/api/document-editions', selectedEdition.id, 'artifacts'] });
        toast({
          title: "Diagrama salvo",
          description: "O diagrama foi salvo em My Assets com sucesso.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/global-assets'] });
        toast({
          title: "Diagrama salvo",
          description: "O diagrama foi salvo em Global Assets com sucesso.",
        });
      }
      
      setDiagramName(''); // Clear the name field
      
      // Close the modal by calling onDataExchange with close signal
      if (onDataExchange) {
        onDataExchange({ action: 'close' });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o diagrama.",
        variant: "destructive",
      });
    }
  });

  // Função para converter SVG para PNG e salvar
  const handleSaveDiagram = async () => {
    if (!diagramName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o diagrama antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    const svgElement = canvasRef.current?.querySelector('svg');
    if (!svgElement) {
      toast({
        title: "Erro ao salvar",
        description: "Nenhum diagrama encontrado para salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get SVG dimensions - use viewBox if available, otherwise computed dimensions
      const viewBox = svgElement.getAttribute('viewBox');
      let width, height;
      
      if (viewBox) {
        const [, , w, h] = viewBox.split(' ').map(Number);
        width = w || 800;
        height = h || 600;
      } else {
        const rect = svgElement.getBoundingClientRect();
        width = rect.width || 800;
        height = rect.height || 600;
      }

      // Clone and prepare SVG
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', width.toString());
      svgClone.setAttribute('height', height.toString());
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      canvas.width = width;
      canvas.height = height;

      // Set background color based on theme
      const isDarkMode = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDarkMode ? '#1B2028' : 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert SVG to string and create blob
      const svgString = new XMLSerializer().serializeToString(svgClone);
      console.log('SVG dimensions:', { width, height });
      console.log('SVG string length:', svgString.length);

      // Create image and convert
      const img = new Image();
      const imagePromise = new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            ctx.drawImage(img, 0, 0, width, height);
            const pngDataUrl = canvas.toDataURL('image/png', 0.95);
            const base64Data = pngDataUrl.split(',')[1];
            console.log('PNG conversion successful, base64 length:', base64Data.length);
            resolve(base64Data);
          } catch (drawError) {
            console.error('Error drawing to canvas:', drawError);
            reject(drawError);
          }
        };
        img.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load SVG as image'));
        };
      });

      // Use data URL directly instead of blob
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      img.src = svgDataUrl;

      const base64Data = await imagePromise as string;

      // Save using mutation
      const fileName = diagramName.endsWith('.png') ? diagramName : `${diagramName}.png`;
      saveDiagramMutation.mutate({ 
        name: fileName, 
        imageData: base64Data,
        mermaidDefinition: mermaidCode 
      });

    } catch (error) {
      console.error('Error saving diagram:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao salvar",
        description: `Falha ao converter o diagrama: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Função para redimensionar SVG baseada no canvas real
  const resizeSvgToCanvas = () => {
    const svgElement = canvasRef.current?.querySelector('svg');
    const container = canvasRef.current;
    
    if (svgElement && container) {
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - 40; // margem para bordas
      const containerHeight = containerRect.height - 40;
      
      svgElement.style.width = `${containerWidth}px`;
      svgElement.style.height = 'auto';
      svgElement.style.maxWidth = `${containerWidth}px`;
      svgElement.style.maxHeight = `${containerHeight}px`;
      svgElement.style.display = 'block';
      svgElement.style.margin = '0 auto';
    }
  };

  // Função para configurar tema do Mermaid baseado no sistema (usando mesmas configurações do MDX)
  const configureMermaidTheme = useCallback(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = isDarkMode || systemPrefersDark;
    
    mermaid.initialize({
      startOnLoad: false,
      theme: shouldUseDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      themeVariables: shouldUseDark ? {
        primaryColor: '#1B2028',
        primaryTextColor: '#FFFFFF',
        primaryBorderColor: '#FFFFFF',
        lineColor: '#FFFFFF',
        secondaryColor: '#1E293B',
        tertiaryColor: '#374151',
        background: '#1B2028',
        mainBkg: '#1B2028',
        secondBkg: '#1E293B',
        tertiaryBkg: '#374151',
        edgeLabelBackground: '#1B2028',
        labelBackground: '#1B2028',
        labelTextColor: '#FFFFFF',
        edgeLabelColor: '#FFFFFF',
      } : {}
    });
  }, []);

  // Inicializar Mermaid com tema
  useEffect(() => {
    configureMermaidTheme();

    // Observar mudanças no tema da página
    const observer = new MutationObserver(() => {
      configureMermaidTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Observar mudanças no tema do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      configureMermaidTheme();
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [configureMermaidTheme]);

  // Observer para redimensionamento do canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      if (lastSvg) {
        setTimeout(resizeSvgToCanvas, 50);
      }
    });

    resizeObserverRef.current.observe(canvasRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [lastSvg]);

  // Renderizar o gráfico quando o código mudar
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderMermaid = async () => {
      if (!mermaidCode.trim()) {
        if (canvasRef.current) {
          canvasRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500 dark:text-white">Digite código Mermaid no editor</div>';
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
          setTimeout(resizeSvgToCanvas, 200);
        }
      } catch (error) {
        console.error('Erro ao renderizar Mermaid:', error);
        setRenderError(error instanceof Error ? error.message : 'Erro desconhecido ao renderizar o gráfico');
        
        if (canvasRef.current) {
          canvasRef.current.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-300 p-4">
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
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#1E293B]">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-gray-200 dark:border-[#374151] dark:bg-[#111827]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-[#E5E7EB]">Mermaid Graph Plugin</h1>
            <p className="text-xs text-gray-600 dark:text-[#9CA3AF] mt-1">
              Editor e visualizador de diagramas Mermaid em tempo real
            </p>
          </div>
          
          {/* Save controls */}
          <div className="flex items-center gap-3 mr-6">
            <Input
              type="text"
              placeholder="Nome do diagrama..."
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              className="w-48 h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-[#E5E7EB] dark:placeholder-[#6B7280]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && diagramName.trim()) {
                  handleSaveDiagram();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSaveDiagram}
              disabled={!diagramName.trim() || saveDiagramMutation.isPending}
              className="h-8 px-3"
            >
              {saveDiagramMutation.isPending ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex flex-1">
        {/* Painel Esquerdo - Editor de Código */}
        <div className="w-1/2 border-r border-gray-200 dark:border-[#374151] flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#111827]">
            <h3 className="font-medium text-sm text-gray-700 dark:text-[#E5E7EB]">Editor Mermaid</h3>
            <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-1">Digite ou cole seu código Mermaid aqui</p>
          </div>
          <div className="flex-1 p-3 bg-white dark:bg-[#1E293B]">
            <textarea
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              className="w-full h-full resize-none border border-gray-300 dark:border-[#374151] rounded-lg p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#020203] text-gray-900 dark:text-[#E5E7EB] dark:placeholder-[#6B7280]"
              placeholder="Digite seu código Mermaid aqui..."
              spellCheck={false}
            />
          </div>
        </div>
        
        {/* Painel Direito - Canvas Renderizador */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm text-gray-700 dark:text-[#E5E7EB]">Visualização</h3>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-1">Pré-visualização do diagrama em tempo real</p>
              </div>
              {isRendering && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Renderizando...</div>
              )}
              {renderError && (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">Erro na sintaxe</div>
              )}
            </div>
          </div>
          <div className="flex-1 p-3 overflow-auto bg-white dark:bg-[#1B2028]">
            <div 
              ref={canvasRef}
              className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-[#374151] rounded-lg bg-white dark:bg-[#1B2028]"
            >
              <div className="text-gray-500 dark:text-[#FFFFFF] text-sm">
                {isRendering ? 'Renderizando gráfico...' : 'Aguardando código...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}