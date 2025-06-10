import React, { useCallback, useState, useRef } from 'react';
import { Tldraw, TldrawProps } from 'tldraw';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, FileImage, ImagePlus } from 'lucide-react';
import 'tldraw/tldraw.css';

interface VectorGraphPluginProps {
  onDataExchange?: (data: any) => void;
  globalAssets?: any[];
  documentArtifacts?: any[];
}

const VectorGraphPlugin: React.FC<VectorGraphPluginProps> = ({ onDataExchange, globalAssets = [], documentArtifacts = [] }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    setEditorInstance(editor);
    
    // Override the default image insertion behavior by listening to asset creation
    const originalCreateAssets = editor.createAssets;
    editor.createAssets = (assets: any[]) => {
      const imageAssets = assets.filter(asset => asset.type === 'image');
      if (imageAssets.length > 0) {
        // If this is an external image insertion, show our modal instead
        const firstImageAsset = imageAssets[0];
        if (firstImageAsset.props?.src && !firstImageAsset.props.src.startsWith('data:')) {
          setShowImageModal(true);
          return; // Prevent default asset creation
        }
      }
      return originalCreateAssets.call(editor, assets);
    };

    // Also intercept paste events for images
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            setShowImageModal(true);
            return;
          }
        }
      }
    };

    // Add paste event listener
    document.addEventListener('paste', handlePaste);
    
    // Cleanup function
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleLocalFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editorInstance) return;

    try {
      // Convert file to base64 for tldraw
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // Create image asset in tldraw
        const assetId = editorInstance.createAssetId();
        const imageAsset = {
          id: assetId,
          type: 'image',
          typeName: 'asset',
          props: {
            name: file.name,
            src: dataUrl,
            w: 0, // Will be set when image loads
            h: 0,
            mimeType: file.type,
            isAnimated: false,
          },
          meta: {},
        };

        editorInstance.createAssets([imageAsset]);
        
        // Create image shape
        const shapeId = editorInstance.createShapeId();
        editorInstance.createShapes([{
          id: shapeId,
          type: 'image',
          x: editorInstance.getViewportPageCenter().x - 100,
          y: editorInstance.getViewportPageCenter().y - 100,
          props: {
            assetId,
            w: 200,
            h: 200,
          },
        }]);
      };
      reader.readAsDataURL(file);
      setShowImageModal(false);
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
    }
  }, [editorInstance]);

  const handleAssetSelect = useCallback(async (asset: any) => {
    if (!editorInstance) return;

    // Convert base64 to data URL if needed (outside try block for scope)
    const dataUrl = asset.fileData.startsWith('data:') 
      ? asset.fileData 
      : `data:image/png;base64,${asset.fileData}`;

    try {
      // Create a proper File object from the data URL
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], asset.name, { type: 'image/png' });
      
      // Use tldraw v3 API for external content
      await editorInstance.putExternalContent({
        type: 'files',
        files: [file],
        point: editorInstance.getViewportPageCenter(),
        ignoreParent: false
      });
      
      setShowImageModal(false);
    } catch (error) {
      console.error('Erro ao inserir imagem:', error);
      
      // Fallback: direct asset and shape creation for tldraw v3
      try {
        // Create asset using tldraw v3 API
        const assetId = editorInstance.createId();
        
        // Use proper tldraw v3 asset structure
        const imageAsset = {
          id: assetId,
          type: 'image' as const,
          typeName: 'asset' as const,
          props: {
            name: asset.name,
            src: dataUrl,
            w: 200,
            h: 200,
            mimeType: 'image/png',
            isAnimated: false,
          },
          meta: {},
        };

        editorInstance.createAssets([imageAsset]);
        
        // Create shape using tldraw v3 API
        const shapeId = editorInstance.createId();
        const viewportCenter = editorInstance.getViewportPageCenter();
        
        editorInstance.createShapes([{
          id: shapeId,
          type: 'image' as const,
          x: viewportCenter.x - 100,
          y: viewportCenter.y - 100,
          props: {
            assetId,
            w: 200,
            h: 200,
          },
        }]);
        
        setShowImageModal(false);
      } catch (fallbackError) {
        console.error('Fallback também falhou:', fallbackError);
      }
    }
  }, [editorInstance]);

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
            onClick={() => setShowImageModal(true)}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            title="Inserir Imagem"
          >
            <ImagePlus className="w-3 h-3" />
            Inserir Imagem
          </button>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Selection Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Inserir Imagem</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload Local
              </TabsTrigger>
              <TabsTrigger value="global">
                <ImageIcon className="w-4 h-4 mr-2" />
                Global Assets
              </TabsTrigger>
              <TabsTrigger value="document">
                <FileImage className="w-4 h-4 mr-2" />
                My Assets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Carregar arquivo local</h3>
                <p className="text-sm text-gray-500 mb-4">Selecione uma imagem do seu computador</p>
                <Button onClick={handleLocalFileUpload}>
                  Selecionar Arquivo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="global" className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {globalAssets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum asset global disponível
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {globalAssets.map((asset: any) => (
                      <div
                        key={asset.id}
                        className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleAssetSelect(asset)}
                      >
                        <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                          <img
                            src={asset.fileData.startsWith('data:') ? asset.fileData : `data:image/png;base64,${asset.fileData}`}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-gray-600 truncate">{asset.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="document" className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {documentArtifacts.filter(artifact => artifact.originAssetId === "Uploaded").length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum asset do documento disponível
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documentArtifacts
                      .filter(artifact => artifact.originAssetId === "Uploaded")
                      .map((artifact: any) => (
                        <div
                          key={artifact.id}
                          className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleAssetSelect(artifact)}
                        >
                          <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                            <img
                              src={artifact.fileData.startsWith('data:') ? artifact.fileData : `data:image/png;base64,${artifact.fileData}`}
                              alt={artifact.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-gray-600 truncate">{artifact.name}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VectorGraphPlugin;