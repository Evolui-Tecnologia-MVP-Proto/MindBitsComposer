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

// Função para sanitizar richText
function sanitizeRichText(richText: any) {
  if (
    !richText ||
    typeof richText !== 'object' ||
    richText.type !== 'doc' ||
    !Array.isArray(richText.content)
  ) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { dir: "auto" },
          content: []
        }
      ]
    };
  }

  // Filtra apenas paragraphs válidos
  const validContent = richText.content.filter((node: any) => {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'paragraph') {
      // Se tiver content, filtra só text nodes válidos
      if (Array.isArray(node.content)) {
        node.content = node.content.filter((child: any) =>
          child && typeof child === 'object' && child.type === 'text' && typeof child.text === 'string'
        );
      }
      return true;
    }
    return false;
  });

  return {
    type: "doc",
    content: validContent.length > 0 ? validContent : [
      {
        type: "paragraph",
        attrs: { dir: "auto" },
        content: []
      }
    ]
  };
}

// Função para garantir align válido em shapes geo
function ensureGeoAlign(snapshot: any) {
  if (!snapshot || !snapshot.store) return snapshot;
  Object.values(snapshot.store).forEach((record: any) => {
    if (record.type === 'geo' && record.props) {
      const allowedAligns = ["start", "middle", "end", "start-legacy", "end-legacy", "middle-legacy"];
      if (!allowedAligns.includes(record.props.align)) {
        record.props.align = "middle";
      }
    }
  });
  return snapshot;
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
      console.log('ASSET DEBUG - fileMetadata exists:', !!asset.fileMetadata);
      console.log('ASSET DEBUG - fileMetadata length:', asset.fileMetadata?.length);
      
      // Check if this is a tldraw file with metadata
      if (asset.fileMetadata && asset.fileMetadata.length > 1000) {
        try {
          const testParse = JSON.parse(asset.fileMetadata.substring(0, 1000));
          const isTldrawFile = testParse && (testParse.store || testParse.document || testParse.records);
          
          console.log('METADATA TEST - Is tldraw file:', isTldrawFile);
          
          if (isTldrawFile) {
            console.log('Loading tldraw file from asset metadata...');
            
            const fileContent = asset.fileMetadata;
            let tldrawData;
            
            try {
              const rawData = JSON.parse(fileContent);
              
              // Sanitize deprecated properties
              tldrawData = JSON.parse(JSON.stringify(rawData, (key, value) => {
                if (key === 'w' || key === 'h' || key === 'align' || key === 'verticalAlign' || 
                    key === 'autoSize' || key === 'text' || key === 'handles') {
                  return undefined;
                }
                return value;
              }));
              
            } catch (parseError) {
              console.error('JSON PARSE ERROR:', parseError);
              throw parseError;
            }
            
            if (tldrawData && tldrawData.store && editorInstance) {
              try {
                const { loadSnapshot } = await import('tldraw');
                loadSnapshot(editorInstance.store, tldrawData);
                console.log('loadSnapshot function succeeded');
              } catch (loadMethodError) {
                console.error('Error with loadSnapshot function:', loadMethodError);
                
                // Try manual loading
                editorInstance.store.clear();
                const records = Object.values(tldrawData.store).filter((record: any) => {
                  return record && record.typeName && record.id;
                });
                editorInstance.store.put(records);
                console.log('Manual loading succeeded');
              }
              
              if (editorInstance.store.allRecords().length > 0) {
                setTimeout(() => {
                  try {
                    editorInstance.zoomToFit();
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
        } catch (detectionError) {
          console.log('Not a tldraw file, treating as regular image:', detectionError);
        }
      }

      // For regular images
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