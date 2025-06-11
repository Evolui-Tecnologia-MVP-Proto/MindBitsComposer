import React, { useCallback, useState, useRef } from 'react';
import { Tldraw, TldrawProps, loadSnapshot, getSnapshot } from 'tldraw';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, FileImage, ImagePlus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import 'tldraw/tldraw.css';

interface VectorGraphPluginProps {
  onDataExchange?: (data: any) => void;
  globalAssets?: any[];
  documentArtifacts?: any[];
  selectedEdition?: any;
}

const VectorGraphPlugin: React.FC<VectorGraphPluginProps> = ({ onDataExchange, globalAssets = [], documentArtifacts = [], selectedEdition }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [fileName, setFileName] = useState('vector-graph');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAssetSelect = useCallback(async (asset: any) => {
    if (!editorInstance) return;

    try {
      console.log('ASSET DEBUG - Full asset object:', asset);
      console.log('ASSET DEBUG - editor field:', asset.editor);
      console.log('ASSET DEBUG - fileMetadata exists:', !!asset.fileMetadata);
      console.log('ASSET DEBUG - fileMetadata length:', asset.fileMetadata?.length);
      
      // Check if this is a tldraw file with editor field = "Graph_TLD"
      if (asset.editor === "Graph_TLD" && asset.fileMetadata) {
        console.log('IDENTIFIED TLDRAW FILE - editor field:', asset.editor);
        console.log('METADATA LENGTH:', asset.fileMetadata.length);
        
        console.log('Loading tldraw file from asset metadata...');
        
        const fileContent = asset.fileMetadata;
        let tldrawData;
        
        try {
          const rawData = JSON.parse(fileContent);
          console.log('JSON PARSE SUCCESS');
          console.log('PARSED DATA TOP LEVEL KEYS:', Object.keys(rawData));
          
          // Sanitize deprecated properties
          tldrawData = JSON.parse(JSON.stringify(rawData, (key, value) => {
            if (key === 'w' || key === 'h' || key === 'align' || key === 'verticalAlign' || 
                key === 'autoSize' || key === 'text' || key === 'handles') {
              console.log(`REMOVING DEPRECATED KEY: ${key}`);
              return undefined;
            }
            return value;
          }));
          
          console.log('DEEP SANITIZATION COMPLETE');
        } catch (parseError) {
          console.error('JSON PARSE ERROR:', parseError);
          throw parseError;
        }
        
        if (tldrawData && tldrawData.store && editorInstance) {
          console.log('Attempting to load snapshot with tldraw data');
          console.log('Store keys:', Object.keys(tldrawData.store).length);
          
          let loadMethod;
          
          try {
            const { loadSnapshot } = await import('tldraw');
            loadSnapshot(editorInstance.store, tldrawData);
            loadMethod = 'loadSnapshot';
            console.log('loadSnapshot function succeeded');
          } catch (loadMethodError) {
            console.error('Error with loadSnapshot function:', loadMethodError);
            
            // Try manual loading
            console.log('Trying manual loading method...');
            editorInstance.store.clear();
            
            const records = Object.values(tldrawData.store).filter((record: any) => {
              return record && record.typeName && record.id;
            });
            
            console.log('Records to load:', records.length);
            editorInstance.store.put(records);
            
            console.log('Manual loading succeeded');
            loadMethod = 'manual put';
          }
          
          console.log(`SUCCESS: Loaded using ${loadMethod}`);
          console.log(`Final check - Store size: ${editorInstance.store.allRecords().length}`);
          
          if (editorInstance.store.allRecords().length > 0) {
            console.log('Content loaded successfully');
            console.log('Store size after load:', editorInstance.store.allRecords().length);
            
            const shapes = editorInstance.store.allRecords().filter((r: any) => r.typeName === 'shape');
            console.log('Number of shapes loaded:', shapes.length);
            console.log('Sample shapes:', Array.from(editorInstance.getCurrentPageShapeIds()).slice(0, 3).map(id => ({ id, type: editorInstance.getShape(id)?.type })));
            console.log('Current page shapes:', editorInstance.getCurrentPageShapeIds().size);
            
            // Zoom to fit the loaded content
            setTimeout(() => {
              try {
                editorInstance.zoomToFit();
                console.log('Zoomed to fit loaded content');
              } catch (zoomError) {
                console.warn('Zoom to fit failed:', zoomError);
              }
            }, 1000);
            
          } else {
            throw new Error('Dados de snapshot inválidos');
          }
        }
        
        toast({
          title: "Sucesso",
          description: `Arquivo .tldr "${asset.name}" carregado com sucesso`,
        });
        
        setShowImageModal(false);
        return;
      }

      // For regular images (non-tldraw files)
      const src = asset.fileData.startsWith('data:') 
        ? asset.fileData 
        : `data:image/png;base64,${asset.fileData}`;

      const assetId = `asset:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const imageAsset = {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: asset.name || 'image',
          src,
          w: 400,
          h: 300,
          mimeType: asset.mimeType || 'image/png',
          isAnimated: false,
        },
        meta: {},
      };

      editorInstance.createAssets([imageAsset]);

      const shapeId = `shape:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const shape = {
        id: shapeId,
        type: 'image',
        typeName: 'shape',
        x: 100,
        y: 100,
        rotation: 0,
        index: 'a1',
        parentId: editorInstance.getCurrentPageId(),
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          assetId: assetId,
          w: 400,
          h: 300,
          playing: true,
          url: '',
        },
      };

      editorInstance.createShape(shape);
      
      toast({
        title: "Sucesso",
        description: `Imagem "${asset.name}" adicionada com sucesso`,
      });
      
      setShowImageModal(false);
    } catch (error) {
      console.error('Erro ao selecionar asset:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar asset",
        variant: "destructive",
      });
    }
  }, [editorInstance, toast]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">Editor de Gráficos Vetoriais</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImageModal(true)}
            size="sm"
            variant="outline"
          >
            <ImagePlus className="w-4 h-4 mr-2" />
            Inserir Imagem
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <Tldraw
          onMount={(editor) => {
            setEditorInstance(editor);
            console.log('Tldraw editor mounted');
          }}
          onUiEvent={(name, data) => {
            console.log('UI Event:', name, data);
          }}
        />
      </div>

      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inserir Imagem</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="global-assets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global-assets">Global Assets</TabsTrigger>
              <TabsTrigger value="my-assets">My Assets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="global-assets">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {globalAssets?.map((asset) => (
                  <div
                    key={asset.id}
                    className="cursor-pointer border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                      {asset.fileData ? (
                        <img
                          src={asset.fileData.startsWith('data:') ? asset.fileData : `data:image/png;base64,${asset.fileData}`}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm truncate">{asset.name}</p>
                    {asset.editor === "Graph_TLD" && (
                      <p className="text-xs text-blue-600 font-medium">TLDraw File</p>
                    )}
                  </div>
                ))}
                {globalAssets?.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nenhum asset global disponível
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="my-assets">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {documentArtifacts?.map((asset) => (
                  <div
                    key={asset.id}
                    className="cursor-pointer border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                      {asset.fileData ? (
                        <img
                          src={asset.fileData.startsWith('data:') ? asset.fileData : `data:image/png;base64,${asset.fileData}`}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileImage className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm truncate">{asset.name}</p>
                  </div>
                ))}
                {documentArtifacts?.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Nenhum asset do documento disponível
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