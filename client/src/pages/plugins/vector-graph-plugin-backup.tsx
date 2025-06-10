import React, { useState, useRef } from 'react';
import { Tldraw } from 'tldraw';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Image as ImageIcon, Save, FileText } from 'lucide-react';

interface VectorGraphPluginProps {
  onDataExchange: (data: any) => void;
  globalAssets?: any[];
  documentArtifacts?: any[];
  selectedEdition?: any;
}

const VectorGraphPlugin: React.FC<VectorGraphPluginProps> = ({ 
  onDataExchange, 
  globalAssets = [], 
  documentArtifacts = [], 
  selectedEdition 
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [fileName, setFileName] = useState('vector-graph');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelection = async (assetId: string) => {
    if (!editorInstance) return;

    try {
      const asset = globalAssets.find(a => a.id === assetId);
      if (!asset) return;

      // Create image shape in editor
      const imageShape = {
        type: 'image',
        x: 100,
        y: 100,
        props: {
          w: 200,
          h: 150,
          assetId: assetId
        }
      };

      editorInstance.createShape(imageShape);
      setShowImageModal(false);
      
      toast({
        title: "Image Added",
        description: "Image successfully added to canvas"
      });
    } catch (error) {
      console.error('Error adding image:', error);
      toast({
        title: "Error",
        description: "Failed to add image to canvas",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!editorInstance) return;

    try {
      const snapshot = editorInstance.store.getSnapshot();
      const pngBlob = await editorInstance.getSvg();
      
      const formData = new FormData();
      formData.append('file', pngBlob, `${fileName}.svg`);
      formData.append('description', fileName);
      formData.append('editor', 'Graph_TLD');

      const response = await fetch('/api/global-assets', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Save tldraw data as file metadata
        await fetch(`/api/global-assets/${result.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_metadata: JSON.stringify(snapshot)
          })
        });

        toast({
          title: "Saved Successfully",
          description: `Vector graph saved as ${fileName}`
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save vector graph",
        variant: "destructive"
      });
    }
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editorInstance) return;

    try {
      if (file.name.endsWith('.tldr')) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Simple shape loading for .tldr files
        if (data.store) {
          const shapes = Object.values(data.store).filter((record: any) => 
            record.typeName === 'shape'
          );
          
          for (const shape of shapes) {
            try {
              const originalText = shape.props?.text;
              
              if (shape.type === 'text' && originalText) {
                // Convert text shapes to geo shapes with text
                const geoShape = {
                  id: shape.id,
                  type: 'geo',
                  x: shape.x || 0,
                  y: shape.y || 0,
                  props: {
                    geo: 'rectangle',
                    text: originalText,
                    w: Math.max(100, originalText.length * 8),
                    h: 50,
                    size: 'm',
                    color: 'black'
                  }
                };
                editorInstance.createShape(geoShape);
              } else {
                // Clean other shapes
                const cleanProps = { ...shape.props };
                delete cleanProps.text;
                delete cleanProps.handles;
                delete cleanProps.align;
                delete cleanProps.verticalAlign;
                delete cleanProps.autoSize;
                
                if (shape.type === 'geo') {
                  cleanProps.geo = cleanProps.geo || 'rectangle';
                  cleanProps.w = cleanProps.w || 100;
                  cleanProps.h = cleanProps.h || 50;
                }
                
                const cleanShape = {
                  id: shape.id,
                  type: shape.type,
                  x: shape.x || 0,
                  y: shape.y || 0,
                  props: cleanProps
                };
                
                editorInstance.createShape(cleanShape);
              }
            } catch (shapeError) {
              console.warn('Failed to create shape:', shape.id, shapeError);
            }
          }
        }
        
        toast({
          title: "File Loaded",
          description: `Loaded ${file.name} successfully`
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h3 className="text-lg font-semibold">Vector Graph Editor</h3>
        
        <div className="flex items-center gap-2">
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="File name"
            className="w-40"
          />
          
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <Button onClick={handleLoad} size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-1" />
            Load
          </Button>
          
          <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <ImageIcon className="w-4 h-4 mr-1" />
                Images
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Select Image</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4">
                {globalAssets.map((asset) => (
                  <Card key={asset.id} className="cursor-pointer hover:ring-2 hover:ring-primary">
                    <CardContent className="p-2">
                      <img
                        src={`/api/global-assets/${asset.id}/file`}
                        alt={asset.description || 'Asset'}
                        className="w-full h-32 object-cover rounded"
                        onClick={() => handleImageSelection(asset.id)}
                      />
                      <p className="text-sm mt-1 truncate">{asset.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 relative">
        <Tldraw
          onMount={(editor) => {
            setEditorInstance(editor);
          }}
          onUiEvent={(name, data) => {
            if (name === 'toggle-tool-lock') {
              console.log('Tool lock toggled:', data);
            }
          }}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".tldr,.json"
        onChange={handleFileLoad}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VectorGraphPlugin;