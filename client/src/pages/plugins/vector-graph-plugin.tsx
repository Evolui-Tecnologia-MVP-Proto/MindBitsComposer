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

  // Function to sanitize tldraw snapshot data by removing deprecated properties
  const sanitizeSnapshotData = useCallback((store: any) => {
    console.log('🔥 SANITIZE FUNCTION CALLED - Starting sanitization process');
    console.log('🔥 Input store keys:', Object.keys(store).length);
    
    const sanitizedStore = { ...store };
    let shapesProcessed = 0;
    let deprecatedPropsRemoved = 0;
    
    // List of all deprecated properties to remove
    const deprecatedProperties = [
      'text', 'verticalAlign', 'align', 'autoSize', 'w', 'h', 'handles'
    ];
    
    console.log('🔥 Deprecated properties to remove:', deprecatedProperties);
    
    Object.keys(sanitizedStore).forEach(key => {
      const record = sanitizedStore[key];
      if (record && typeof record === 'object') {
        // Handle shape records based on typeName
        if (record.typeName === 'shape') {
          shapesProcessed++;
          const shape = { ...record };
          
          // Remove deprecated properties based on shape type
          if (shape.props) {
            const originalProps = { ...shape.props };
            const cleanProps = { ...shape.props };
            let propsRemoved = false;
            
            // Remove all deprecated properties regardless of shape type
            deprecatedProperties.forEach(prop => {
              if (cleanProps[prop] !== undefined) {
                console.log(`Removing deprecated property '${prop}' from ${shape.type} shape (${shape.id})`);
                delete cleanProps[prop];
                propsRemoved = true;
              }
            });
            
            // Special handling for text shapes - ensure specific properties are preserved
            if (shape.type === 'text') {
              console.log(`Original text props for ${shape.id}:`, Object.keys(originalProps));
              
              // Keep only essential text properties
              const allowedTextProps: any = {};
              
              // Only add properties that exist and are not deprecated
              if (originalProps.color !== undefined) allowedTextProps.color = originalProps.color;
              if (originalProps.size !== undefined) allowedTextProps.size = originalProps.size;
              if (originalProps.font !== undefined) allowedTextProps.font = originalProps.font;
              if (originalProps.textAlign !== undefined) allowedTextProps.textAlign = originalProps.textAlign;
              if (originalProps.scale !== undefined) allowedTextProps.scale = originalProps.scale;
              if (originalProps.richText !== undefined) allowedTextProps.richText = originalProps.richText;
              
              console.log(`Allowed text props for ${shape.id}:`, Object.keys(allowedTextProps));
              
              // Replace all props with only allowed ones
              shape.props = allowedTextProps;
              propsRemoved = true;
              
              console.log(`Final text props for ${shape.id}:`, Object.keys(shape.props));
            }
            
            // Special handling for geo shapes
            if (shape.type === 'geo') {
              console.log(`Original geo props for ${shape.id}:`, Object.keys(originalProps));
              
              // Keep only essential geo properties
              const allowedGeoProps: any = {};
              
              // Only add properties that exist and are not deprecated
              if (originalProps.w !== undefined) allowedGeoProps.w = originalProps.w;
              if (originalProps.h !== undefined) allowedGeoProps.h = originalProps.h;
              if (originalProps.geo !== undefined) allowedGeoProps.geo = originalProps.geo;
              if (originalProps.color !== undefined) allowedGeoProps.color = originalProps.color;
              if (originalProps.labelColor !== undefined) allowedGeoProps.labelColor = originalProps.labelColor;
              if (originalProps.fill !== undefined) allowedGeoProps.fill = originalProps.fill;
              if (originalProps.dash !== undefined) allowedGeoProps.dash = originalProps.dash;
              if (originalProps.size !== undefined) allowedGeoProps.size = originalProps.size;
              if (originalProps.font !== undefined) allowedGeoProps.font = originalProps.font;
              if (originalProps.growY !== undefined) allowedGeoProps.growY = originalProps.growY;
              if (originalProps.url !== undefined) allowedGeoProps.url = originalProps.url;
              if (originalProps.scale !== undefined) allowedGeoProps.scale = originalProps.scale;
              if (originalProps.richText !== undefined) allowedGeoProps.richText = originalProps.richText;
              
              console.log(`Allowed geo props for ${shape.id}:`, Object.keys(allowedGeoProps));
              
              // Replace all props with only allowed ones
              shape.props = allowedGeoProps;
              propsRemoved = true;
              
              console.log(`Final geo props for ${shape.id}:`, Object.keys(shape.props));
            }
            
            // For other shape types, just remove deprecated properties
            if (shape.type !== 'text' && shape.type !== 'geo') {
              shape.props = cleanProps;
            }
            
            if (propsRemoved) {
              deprecatedPropsRemoved++;
            }
          }
          
          sanitizedStore[key] = shape;
        }
      }
    });
    
    console.log(`Sanitization complete. Processed ${shapesProcessed} shapes, cleaned ${deprecatedPropsRemoved} shapes.`);
    return sanitizedStore;
  }, []);
  
  // Função de sanitização robusta para shapes do tldraw
  function sanitizeTldrawStore(store: any) {
    const deprecatedProps = ['w', 'h', 'align', 'verticalAlign', 'autoSize', 'text', 'handles'];
    const newStore: any = {};

    Object.entries(store).forEach(([key, record]: [string, any]) => {
      if (record.typeName === 'shape') {
        // Garante que props existe
        const cleanProps = { ...(record.props || {}) };
        // Para shapes de texto, NÃO remover 'w', mas garantir que seja número
        if (record.type === 'text') {
          cleanProps.color = cleanProps.color || 'black';
          cleanProps.size = cleanProps.size || 'm';
          cleanProps.font = cleanProps.font || 'draw';
          cleanProps.textAlign = cleanProps.textAlign || 'start';
          cleanProps.scale = cleanProps.scale || 1;
          cleanProps.richText = sanitizeRichText(cleanProps.richText);
          cleanProps.w = typeof cleanProps.w === 'number' ? cleanProps.w : 100;
          cleanProps.autoSize = typeof cleanProps.autoSize === 'boolean' ? cleanProps.autoSize : false;
          // Remover apenas propriedades realmente deprecadas, mas NÃO 'w' nem 'autoSize'
          deprecatedProps.filter(p => p !== 'w' && p !== 'autoSize').forEach((prop) => {
            if (cleanProps[prop] !== undefined) {
              delete cleanProps[prop];
            }
          });
        } else if (record.type === 'geo') {
          // Para geo, pode remover 'w' e 'h' se quiser, mas garantir defaults
          deprecatedProps.forEach((prop) => {
            if (cleanProps[prop] !== undefined) {
              delete cleanProps[prop];
            }
          });
          cleanProps.w = typeof cleanProps.w === 'number' ? cleanProps.w : 100;
          cleanProps.h = typeof cleanProps.h === 'number' ? cleanProps.h : 100;
          cleanProps.geo = cleanProps.geo || 'rectangle';
          cleanProps.color = cleanProps.color || 'black';
          cleanProps.labelColor = cleanProps.labelColor || 'black';
          cleanProps.fill = cleanProps.fill || 'none';
          cleanProps.dash = cleanProps.dash || 'draw';
          cleanProps.size = cleanProps.size || 'm';
          cleanProps.font = cleanProps.font || 'draw';
          cleanProps.growY = cleanProps.growY || 0;
          cleanProps.url = cleanProps.url || '';
          cleanProps.scale = cleanProps.scale || 1;
          cleanProps.richText = sanitizeRichText(cleanProps.richText);
          const allowedAligns = ["start", "middle", "end", "start-legacy", "end-legacy", "middle-legacy"];
          cleanProps.align = allowedAligns.includes(cleanProps.align) ? cleanProps.align : "middle";
          const allowedVerticalAligns = ["start", "middle", "end"];
          cleanProps.verticalAlign = allowedVerticalAligns.includes(cleanProps.verticalAlign) ? cleanProps.verticalAlign : "middle";
        } else {
          // Para outros tipos, remover tudo normalmente
          deprecatedProps.forEach((prop) => {
            if (cleanProps[prop] !== undefined) {
              delete cleanProps[prop];
            }
          });
        }
        newStore[key] = { ...record, props: cleanProps };
      } else {
        newStore[key] = record;
      }
    });

    return newStore;
  }

  const handleSaveToAssets = useCallback(async () => {
    try {
      if (!editorInstance) {
        toast({
          title: "Erro",
          description: "Editor não está disponível",
          variant: "destructive"
        });
        return;
      }

      // Export as PNG using correct tldraw v3.13.1 API
      console.log('Starting PNG export...');
      console.log('Editor instance methods:', Object.getOwnPropertyNames(editorInstance));
      
      // Use the correct export method for tldraw v3.13.1
      const shapeIds = Array.from(editorInstance.getCurrentPageShapeIds());
      console.log('Shape IDs to export:', shapeIds);
      
      if (shapeIds.length === 0) {
        throw new Error('Nenhum conteúdo para exportar. Desenhe algo antes de salvar.');
      }
      
      // Try different export methods available in tldraw v3.13.1
      let pngBlob;
      try {
        // Method 1: Try getSvgAsImage
        if (typeof editorInstance.getSvgAsImage === 'function') {
          console.log('Using getSvgAsImage method...');
          pngBlob = await editorInstance.getSvgAsImage(shapeIds, {
            format: 'png',
            scale: 1,
            background: true
          });
        } 
        // Method 2: Try export method
        else if (typeof editorInstance.export === 'function') {
          console.log('Using export method...');
          pngBlob = await editorInstance.export(shapeIds, 'png');
        }
        // Method 3: Try getSvg and convert
        else if (typeof editorInstance.getSvg === 'function') {
          console.log('Using getSvg method and converting...');
          const svg = await editorInstance.getSvg(shapeIds, {
            scale: 1,
            background: true
          });
          
          if (svg) {
            console.log('SVG obtained, converting to PNG...');
            // Convert SVG to PNG using canvas with better error handling
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }
            
            const img = new Image();
            
            pngBlob = await new Promise((resolve, reject) => {
              img.onload = () => {
                try {
                  console.log('Image loaded, dimensions:', img.width, img.height);
                  canvas.width = img.width || 800;
                  canvas.height = img.height || 600;
                  
                  // Clear canvas with white background
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw the image
                  ctx.drawImage(img, 0, 0);
                  
                  // Compress the image if it's too large
                  const maxSize = 2 * 1024 * 1024; // 2MB limit
                  let quality = 0.8;
                  let scale = 1;
                  
                  // If canvas is very large, scale it down
                  if (canvas.width > 2048 || canvas.height > 2048) {
                    scale = Math.min(2048 / canvas.width, 2048 / canvas.height);
                    const scaledCanvas = document.createElement('canvas');
                    const scaledCtx = scaledCanvas.getContext('2d');
                    
                    scaledCanvas.width = canvas.width * scale;
                    scaledCanvas.height = canvas.height * scale;
                    
                    if (scaledCtx) {
                      // Fill with white background
                      scaledCtx.fillStyle = 'white';
                      scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
                      
                      // Draw scaled image
                      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                      
                      scaledCanvas.toBlob((blob) => {
                        if (blob) {
                          console.log('Scaled PNG blob created, size:', blob.size, 'scale:', scale);
                          resolve(blob);
                        } else {
                          reject(new Error('Failed to create scaled PNG blob'));
                        }
                      }, 'image/png', quality);
                      return;
                    }
                  }
                  
                  canvas.toBlob((blob) => {
                    if (blob) {
                      console.log('PNG blob created successfully, size:', blob.size);
                      if (blob.size > maxSize) {
                        console.log('Image too large, trying with lower quality...');
                        canvas.toBlob((compressedBlob) => {
                          if (compressedBlob) {
                            console.log('Compressed PNG blob created, size:', compressedBlob.size);
                            resolve(compressedBlob);
                          } else {
                            resolve(blob); // Use original if compression fails
                          }
                        }, 'image/jpeg', 0.6); // Use JPEG with lower quality for compression
                      } else {
                        resolve(blob);
                      }
                    } else {
                      reject(new Error('Failed to create PNG blob'));
                    }
                  }, 'image/png', quality);
                } catch (error) {
                  console.error('Error in image processing:', error);
                  reject(error);
                }
              };
              
              img.onerror = (error) => {
                console.error('Image load error:', error);
                reject(new Error('Failed to load SVG as image'));
              };
              
              try {
                const svgString = new XMLSerializer().serializeToString(svg);
                console.log('SVG string length:', svgString.length);
                const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                img.src = svgDataUrl;
              } catch (error) {
                console.error('Error creating SVG data URL:', error);
                reject(error);
              }
            });
          } else {
            throw new Error('Failed to get SVG from editor');
          }
        } else {
          throw new Error('Nenhum método de exportação disponível no editor');
        }
      } catch (exportError) {
        console.error('Erro no método de exportação:', exportError);
        throw exportError;
      }
      console.log('PNG export result:', pngBlob ? 'Success' : 'Failed');
      
      if (!pngBlob) {
        console.error('PNG export failed - no blob returned');
        toast({
          title: "Erro",
          description: "Não foi possível exportar a imagem",
          variant: "destructive"
        });
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const pngData = base64Data.split(',')[1]; // Remove data:image/png;base64,

          // Get tldraw snapshot for metadata - using same logic as handleExportTldr
          const snapshot = editorInstance.store.getSnapshot();
          const fixedSnapshot = ensureGeoAlign(snapshot);
          
          // Check if tldraw data is too large and compress if needed for My Assets too
          let metadataToSave = JSON.stringify(fixedSnapshot);
          const maxMetadataSize = 500 * 1024; // 500KB limit for metadata
          console.log('Original tldraw metadata size for My Assets:', metadataToSave.length);
          
          if (metadataToSave.length > maxMetadataSize) {
            console.log('My Assets metadata too large, creating simplified version...');
            // Create a simplified version with only essential data
            const simplifiedSnapshot: any = {
              store: {},
              schema: fixedSnapshot.schema || {
                schemaVersion: 2,
                sequences: {
                  "com.tldraw.store": 4,
                  "com.tldraw.shape": 4
                }
              }
            };
            
            // Keep only shapes and pages, remove large data
            Object.entries(fixedSnapshot.store).forEach(([key, record]: [string, any]) => {
              if (record.typeName === 'shape' || record.typeName === 'page') {
                // For shapes, keep only basic properties
                if (record.typeName === 'shape') {
                  simplifiedSnapshot.store[key] = {
                    ...record,
                    props: {
                      ...record.props,
                      // Remove potentially large data
                      richText: undefined,
                      text: record.props?.text ? record.props.text.substring(0, 100) : undefined
                    }
                  };
                } else {
                  simplifiedSnapshot.store[key] = record;
                }
              }
            });
            
            metadataToSave = JSON.stringify(simplifiedSnapshot);
            console.log('Simplified My Assets metadata size:', metadataToSave.length);
          }
          
          // Create filename using user input with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const baseFileName = fileName.trim() || 'vector-graph';
          const filename = `${baseFileName}-${timestamp}.png`;

          // Check if there's a composer document selected
          const documentId = selectedEdition?.documentId || selectedEdition?.id;
          
          if (!documentId) {
            // Save to Global Assets when no composer document is selected
            // Get the tldraw snapshot for file_metadata - using same logic as handleExportTldr
            const snapshotForGlobal = editorInstance.store.getSnapshot();
            const fixedSnapshotForGlobal = ensureGeoAlign(snapshotForGlobal);
            let tldrawData = JSON.stringify(fixedSnapshotForGlobal);
            
            // Check if tldraw data is too large and compress if needed
            const maxMetadataSize = 500 * 1024; // 500KB limit for metadata
            console.log('Original tldraw metadata size:', tldrawData.length);
            
            if (tldrawData.length > maxMetadataSize) {
              console.log('Metadata too large, creating simplified version...');
              // Create a simplified version with only essential data
              const simplifiedSnapshot: any = {
                store: {},
                schema: fixedSnapshotForGlobal.schema || {
                  schemaVersion: 2,
                  sequences: {
                    "com.tldraw.store": 4,
                    "com.tldraw.shape": 4
                  }
                }
              };
              
              // Keep only shapes and pages, remove large data
              Object.entries(fixedSnapshotForGlobal.store).forEach(([key, record]: [string, any]) => {
                if (record.typeName === 'shape' || record.typeName === 'page') {
                  // For shapes, keep only basic properties
                  if (record.typeName === 'shape') {
                    simplifiedSnapshot.store[key] = {
                      ...record,
                      props: {
                        ...record.props,
                        // Remove potentially large data
                        richText: undefined,
                        text: record.props?.text ? record.props.text.substring(0, 100) : undefined
                      }
                    };
                  } else {
                    simplifiedSnapshot.store[key] = record;
                  }
                }
              });
              
              tldrawData = JSON.stringify(simplifiedSnapshot);
              console.log('Simplified tldraw metadata size:', tldrawData.length);
            }
            
            const formData = new FormData();
            formData.append('file', pngBlob, filename);
            formData.append('name', filename.replace('.png', ''));
            formData.append('type', 'image');
            formData.append('description', baseFileName);
            formData.append('fileMetadata', tldrawData);
            formData.append('editor', 'Graph_TLD');

            console.log('Saving to Global Assets:', filename);
            
            const response = await fetch('/api/global-assets', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });

            if (response.ok) {
              const resultData = await response.json();
              
              toast({
                title: "Sucesso",
                description: "Imagem salva em Global Assets",
              });
              
              // Invalidate global assets cache
              queryClient.invalidateQueries({ 
                queryKey: ['/api/global-assets'] 
              });
              
              if (onDataExchange) {
                onDataExchange({
                  type: 'global-asset-saved',
                  assetData: resultData,
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              const errorText = await response.text();
              console.error('Erro ao salvar em Global Assets:', response.status, errorText);
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
          } else {
            // Save to My Assets when composer document is selected
            const artifactData = {
              documentoId: documentId,
              name: filename,
              fileName: filename,
              fileData: pngData,
              fileSize: pngBlob.size.toString(),
              mimeType: 'image/png',
              type: 'image/png',
              originAssetId: "Graph_TLD",
              fileMetadata: metadataToSave,
              isImage: 'true'
            };

            console.log('Saving to My Assets:', artifactData);
            
            // Check authentication first
            const authResponse = await fetch('/api/user');
            
            if (!authResponse.ok) {
              throw new Error('Usuário não autenticado. Faça login novamente.');
            }
            
            const response = await fetch(`/api/documentos/${documentId}/artifacts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(artifactData),
              credentials: 'include'
            });

            if (response.ok) {
              const resultData = await response.json();
              
              toast({
                title: "Sucesso",
                description: "Imagem salva em Meus Assets",
              });
              
              // Invalidate query cache to refresh My Assets list
              queryClient.invalidateQueries({ 
                queryKey: ['/api/document-editions', selectedEdition?.id || selectedEdition?.documentId, 'artifacts'] 
              });
              
              // Trigger parent data refresh by sending data exchange signal
              if (onDataExchange) {
                onDataExchange({
                  type: 'artifact-saved',
                  artifactData: resultData,
                  timestamp: new Date().toISOString()
                });
              } else {
                console.log('Response not OK, reading error...');
                const errorText = await response.text();
                console.error('Erro HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao salvar - full error object:', error);
          console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
          console.error('Error message:', error instanceof Error ? error.message : String(error));
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          
          toast({
            title: "Erro",
            description: error instanceof Error ? error.message : "Falha ao salvar a imagem",
            variant: "destructive"
          });
        }
      };
      
      reader.readAsDataURL(pngBlob);
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar a imagem",
        variant: "destructive"
      });
    }
  }, [editorInstance, toast]);

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

  const handleExportTldr = useCallback(async () => {
    if (!editorInstance) return;

    try {
      // Get the current snapshot
      const snapshot = editorInstance.store.getSnapshot();
      const fixedSnapshot = ensureGeoAlign(snapshot);
      
      // Convert to JSON string
      const jsonContent = JSON.stringify(fixedSnapshot, null, 2);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `vector-graph-${timestamp}.tldr`;
      
      // Create and download file
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: `Arquivo .tldr "${filename}" exportado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao exportar .tldr:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo .tldr",
        variant: "destructive"
      });
    }
  }, [editorInstance, toast]);

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

  // Função compartilhada para carregar dados TLD (usada tanto para arquivos quanto para assets)
  const loadTldrawData = useCallback((tldrawData: any, source: string) => {
    if (!editorInstance) return;

    console.log(`Parsed .tldr file structure from ${source}:`);
    console.log('- tldrawFileFormatVersion:', tldrawData.tldrawFileFormatVersion);
    console.log('- schema:', tldrawData.schema ? 'present' : 'missing');
    console.log('- records:', Array.isArray(tldrawData.records) ? `array with ${tldrawData.records.length} items` : 'not array');
    console.log('- store:', tldrawData.store ? `object with ${Object.keys(tldrawData.store).length} keys` : 'missing');
    console.log('- root keys:', Object.keys(tldrawData));
    
    // Handle different tldraw file formats
    let snapshotData;
    
    if (tldrawData.tldrawFileFormatVersion && tldrawData.records) {
      // New format (v1+) - records array format
      console.log('Loading new format .tldr file with records array');
      snapshotData = {
        store: tldrawData.records.reduce((acc: any, record: any) => {
          acc[record.id] = record;
          return acc;
        }, {}),
        schema: tldrawData.schema || {}
      };
    } else if (tldrawData.store) {
      // Middle format - store object format
      console.log('Loading middle format .tldr file with store object');
      console.log('🔥 MIDDLE FORMAT - Store keys count:', Object.keys(tldrawData.store).length);
      console.log('🔥 MIDDLE FORMAT - Sample shape with w property check...');
      
      // Log shapes with 'w' property to confirm the issue
      Object.values(tldrawData.store).forEach((record: any, index) => {
        if (record.type === 'text' && record.props && record.props.w !== undefined) {
          console.log(`🔥 FOUND TEXT SHAPE WITH W: ${record.id}`, {
            type: record.type,
            props: Object.keys(record.props),
            wValue: record.props.w
          });
        }
      });
      
      snapshotData = tldrawData;
    } else if (Array.isArray(tldrawData)) {
      // Legacy format - direct records array
      console.log('Loading legacy format .tldr file with direct records array');
      snapshotData = {
        store: tldrawData.reduce((acc: any, record: any) => {
          acc[record.id] = record;
          return acc;
        }, {})
      };
    } else if (typeof tldrawData === 'object' && Object.keys(tldrawData).length > 0) {
      // Try to detect if it's already a store format
      console.log('Loading assumed store format .tldr file');
      snapshotData = { store: tldrawData };
    } else {
      throw new Error('Formato de arquivo .tldr não reconhecido');
    }
    
    console.log('Snapshot data to load:');
    console.log('- snapshotData.store exists:', !!snapshotData.store);
    console.log('- snapshotData.store keys:', snapshotData.store ? Object.keys(snapshotData.store).length : 0);
    
    // Log a few sample records to understand structure
    if (snapshotData.store) {
      const sampleRecords = Object.values(snapshotData.store).slice(0, 3);
      console.log('Sample records:', sampleRecords);
    }
    
    let snapshotToLoad = snapshotData;

    // Se o arquivo tem a estrutura padrão (exportado pelo editor), não sanitize!
    if (
      snapshotData &&
      typeof snapshotData === 'object' &&
      snapshotData.store &&
      typeof snapshotData.store === 'object' &&
      snapshotData.schema
    ) {
      // Log shapes de texto antes do loadSnapshot
      Object.values(snapshotData.store).forEach((record: any) => {
        if (record.type === 'text') {
          console.log('Antes do loadSnapshot - Shape de texto:', record.id, 'props.w:', record.props.w, 'typeof:', typeof record.props.w);
        }
      });
      // Carregue diretamente
      loadSnapshot(editorInstance.store, snapshotData);
      // Forçar página ativa para a primeira encontrada
      const pageIds = Object.values(editorInstance.store.allRecords())
        .filter((r: any) => r.typeName === 'page')
        .map((r: any) => r.id);
      if (pageIds.length > 0) {
        editorInstance.setCurrentPage(pageIds[0]);
      }
      // Logs para debug
      console.log('IDs dos shapes na página atual:', Array.from(editorInstance.getCurrentPageShapeIds()));
      console.log('Todos os shapes no store:', editorInstance.store.allRecords().filter((r: any) => r.typeName === 'shape'));
      setTimeout(() => {
        try {
          editorInstance.setZoom(1);
        } catch (e) {
          console.warn('setZoom falhou:', e);
        }
      }, 500);
      setTimeout(() => {
        try {
          editorInstance.setZoom(1);
        } catch (e) {
          console.warn('setZoom falhou:', e);
        }
      }, 1500);
    } else {
      // Caso contrário, sanitize (para arquivos antigos ou de outras fontes)
      const sanitizedStore = sanitizeTldrawStore(snapshotData.store);
      // Log shapes de texto antes do loadSnapshot
      Object.values(sanitizedStore).forEach((record: any) => {
        if (record.type === 'text') {
          console.log('Antes do loadSnapshot (sanitized) - Shape de texto:', record.id, 'props.w:', record.props.w, 'typeof:', typeof record.props.w);
        }
      });
      const fullSnapshot = {
        store: sanitizedStore,
        schema: snapshotData.schema || {
          schemaVersion: 2,
          sequences: {
            "com.tldraw.store": 4,
            "com.tldraw.asset": 1,
            "com.tldraw.camera": 1,
            "com.tldraw.document": 2,
            "com.tldraw.instance": 25,
            "com.tldraw.instance_page_state": 5,
            "com.tldraw.page": 1,
            "com.tldraw.instance_presence": 6,
            "com.tldraw.pointer": 1,
            "com.tldraw.shape": 4,
            "com.tldraw.asset.bookmark": 2,
            "com.tldraw.asset.image": 5,
            "com.tldraw.asset.video": 5,
            "com.tldraw.shape.group": 0,
            "com.tldraw.shape.text": 3,
            "com.tldraw.shape.bookmark": 2,
            "com.tldraw.shape.draw": 2,
            "com.tldraw.shape.geo": 10,
            "com.tldraw.shape.note": 9,
            "com.tldraw.shape.line": 5,
            "com.tldraw.shape.frame": 1,
            "com.tldraw.shape.arrow": 6,
            "com.tldraw.shape.highlight": 2,
            "com.tldraw.shape.embed": 5,
            "com.tldraw.shape.image": 4,
            "com.tldraw.shape.video": 3
          }
        }
      };
      loadSnapshot(editorInstance.store, fullSnapshot);
      // Forçar página ativa para a primeira encontrada
      const pageIds = Object.values(editorInstance.store.allRecords())
        .filter((r: any) => r.typeName === 'page')
        .map((r: any) => r.id);
      if (pageIds.length > 0) {
        editorInstance.setCurrentPage(pageIds[0]);
      }
      // Logs para debug
      console.log('IDs dos shapes na página atual:', Array.from(editorInstance.getCurrentPageShapeIds()));
      console.log('Todos os shapes no store:', editorInstance.store.allRecords().filter((r: any) => r.typeName === 'shape'));
      setTimeout(() => {
        try {
          editorInstance.setZoom(1);
        } catch (e) {
          console.warn('setZoom falhou:', e);
        }
      }, 500);
      setTimeout(() => {
        try {
          editorInstance.setZoom(1);
        } catch (e) {
          console.warn('setZoom falhou:', e);
        }
      }, 1500);
    }
  }, [editorInstance]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editorInstance) return;

    try {
      // Check if it's a .tldr file
      if (file.name.toLowerCase().endsWith('.tldr')) {
        console.log('Loading .tldr file:', file.name);
        
        // Read .tldr file as text (JSON)
        const reader = new FileReader();
        reader.onload = async (e) => {
          console.log('🔥 FileReader onload triggered');
          try {
            const fileContent = e.target?.result as string;
            console.log('🔥 RAW FILE CONTENT LENGTH:', fileContent.length);
            console.log('🔥 FILE CONTENT PREVIEW:', fileContent.substring(0, 200));
            
            const tldrawData = JSON.parse(fileContent);
            loadTldrawData(tldrawData, 'disk file');
            console.log('- records:', Array.isArray(tldrawData.records) ? `array with ${tldrawData.records.length} items` : 'not array');
            console.log('- store:', tldrawData.store ? `object with ${Object.keys(tldrawData.store).length} keys` : 'missing');
            console.log('- root keys:', Object.keys(tldrawData));
            
            // Handle different tldraw file formats
            let snapshotData;
            
            if (tldrawData.tldrawFileFormatVersion && tldrawData.records) {
              // New format (v1+) - records array format
              console.log('Loading new format .tldr file with records array');
              snapshotData = {
                store: tldrawData.records.reduce((acc: any, record: any) => {
                  acc[record.id] = record;
                  return acc;
                }, {}),
                schema: tldrawData.schema || {}
              };
            } else if (tldrawData.store) {
              // Middle format - store object format
              console.log('Loading middle format .tldr file with store object');
              console.log('🔥 MIDDLE FORMAT - Store keys count:', Object.keys(tldrawData.store).length);
              console.log('🔥 MIDDLE FORMAT - Sample shape with w property check...');
              
              // Log shapes with 'w' property to confirm the issue
              Object.values(tldrawData.store).forEach((record: any, index) => {
                if (record.type === 'text' && record.props && record.props.w !== undefined) {
                  console.log(`🔥 FOUND TEXT SHAPE WITH W: ${record.id}`, {
                    type: record.type,
                    props: Object.keys(record.props),
                    wValue: record.props.w
                  });
                }
              });
              
              snapshotData = tldrawData;
            } else if (Array.isArray(tldrawData)) {
              // Legacy format - direct records array
              console.log('Loading legacy format .tldr file with direct records array');
              snapshotData = {
                store: tldrawData.reduce((acc: any, record: any) => {
                  acc[record.id] = record;
                  return acc;
                }, {})
              };
            } else if (typeof tldrawData === 'object' && Object.keys(tldrawData).length > 0) {
              // Try to detect if it's already a store format
              console.log('Loading assumed store format .tldr file');
              snapshotData = { store: tldrawData };
            } else {
              throw new Error('Formato de arquivo .tldr não reconhecido');
            }
            
            console.log('Snapshot data to load:');
            console.log('- snapshotData.store exists:', !!snapshotData.store);
            console.log('- snapshotData.store keys:', snapshotData.store ? Object.keys(snapshotData.store).length : 0);
            
            // Log a few sample records to understand structure
            if (snapshotData.store) {
              const sampleRecords = Object.values(snapshotData.store).slice(0, 3);
              console.log('Sample records:', sampleRecords);
            }
            
            let snapshotToLoad = snapshotData;

            // Se o arquivo tem a estrutura padrão (exportado pelo editor), não sanitize!
            if (
              snapshotData &&
              typeof snapshotData === 'object' &&
              snapshotData.store &&
              typeof snapshotData.store === 'object' &&
              snapshotData.schema
            ) {
              // Log shapes de texto antes do loadSnapshot
              Object.values(snapshotData.store).forEach((record: any) => {
                if (record.type === 'text') {
                  console.log('Antes do loadSnapshot - Shape de texto:', record.id, 'props.w:', record.props.w, 'typeof:', typeof record.props.w);
                }
              });
              // Carregue diretamente
              loadSnapshot(editorInstance.store, snapshotData);
              // Forçar página ativa para a primeira encontrada
              const pageIds = Object.values(editorInstance.store.allRecords())
                .filter((r: any) => r.typeName === 'page')
                .map((r: any) => r.id);
              if (pageIds.length > 0) {
                editorInstance.setCurrentPage(pageIds[0]);
              }
              // Logs para debug
              console.log('IDs dos shapes na página atual:', Array.from(editorInstance.getCurrentPageShapeIds()));
              console.log('Todos os shapes no store:', editorInstance.store.allRecords().filter((r: any) => r.typeName === 'shape'));
              setTimeout(() => {
                try {
                  editorInstance.setZoom(1);
                } catch (e) {
                  console.warn('setZoom falhou:', e);
                }
              }, 500);
              setTimeout(() => {
                try {
                  editorInstance.setZoom(1);
                } catch (e) {
                  console.warn('setZoom falhou:', e);
                }
              }, 1500);
            } else {
              // Caso contrário, sanitize (para arquivos antigos ou de outras fontes)
              const sanitizedStore = sanitizeTldrawStore(snapshotData.store);
              // Log shapes de texto antes do loadSnapshot
              Object.values(sanitizedStore).forEach((record: any) => {
                if (record.type === 'text') {
                  console.log('Antes do loadSnapshot (sanitized) - Shape de texto:', record.id, 'props.w:', record.props.w, 'typeof:', typeof record.props.w);
                }
              });
              const fullSnapshot = {
                store: sanitizedStore,
                schema: snapshotData.schema || {
                  schemaVersion: 2,
                  sequences: {
                    "com.tldraw.store": 4,
                    "com.tldraw.asset": 1,
                    "com.tldraw.camera": 1,
                    "com.tldraw.document": 2,
                    "com.tldraw.instance": 25,
                    "com.tldraw.instance_page_state": 5,
                    "com.tldraw.page": 1,
                    "com.tldraw.instance_presence": 6,
                    "com.tldraw.pointer": 1,
                    "com.tldraw.shape": 4,
                    "com.tldraw.asset.bookmark": 2,
                    "com.tldraw.asset.image": 5,
                    "com.tldraw.asset.video": 5,
                    "com.tldraw.shape.group": 0,
                    "com.tldraw.shape.text": 3,
                    "com.tldraw.shape.bookmark": 2,
                    "com.tldraw.shape.draw": 2,
                    "com.tldraw.shape.geo": 10,
                    "com.tldraw.shape.note": 9,
                    "com.tldraw.shape.line": 5,
                    "com.tldraw.shape.frame": 1,
                    "com.tldraw.shape.arrow": 6,
                    "com.tldraw.shape.highlight": 1,
                    "com.tldraw.shape.embed": 4,
                    "com.tldraw.shape.image": 5,
                    "com.tldraw.shape.video": 3,
                    "com.tldraw.binding.arrow": 1
                  }
                }
              };
              loadSnapshot(editorInstance.store, fullSnapshot);
              // Forçar página ativa para a primeira encontrada
              const pageIds = Object.values(editorInstance.store.allRecords())
                .filter((r: any) => r.typeName === 'page')
                .map((r: any) => r.id);
              if (pageIds.length > 0) {
                editorInstance.setCurrentPage(pageIds[0]);
              }
              // Logs para debug
              console.log('IDs dos shapes na página atual:', Array.from(editorInstance.getCurrentPageShapeIds()));
              console.log('Todos os shapes no store:', editorInstance.store.allRecords().filter((r: any) => r.typeName === 'shape'));
              setTimeout(() => {
                try {
                  editorInstance.setZoom(1);
                } catch (e) {
                  console.warn('setZoom falhou:', e);
                }
              }, 500);
              setTimeout(() => {
                try {
                  editorInstance.setZoom(1);
                } catch (e) {
                  console.warn('setZoom falhou:', e);
                }
              }, 1500);
            }
            
            console.log('Content loaded successfully');
            console.log('Store size after load:', editorInstance.store.allRecords().length);
            console.log('Number of shapes loaded:', editorInstance.getCurrentPageShapeIds().size);
            console.log('Sample shapes:', Array.from(editorInstance.getCurrentPageShapeIds()).slice(0, 3).map(id => ({ id, type: editorInstance.getShape(id)?.type })));
            console.log('Current page shapes:', editorInstance.getCurrentPageShapeIds().size);
            
          } catch (parseError) {
            console.error('Erro ao analisar arquivo .tldr:', parseError);
            console.error('Conteúdo do arquivo:', e.target?.result ? String(e.target.result).substring(0, 500) : 'vazio');
            toast({
              title: "Erro",
              description: `Erro ao carregar arquivo .tldr: ${parseError instanceof Error ? parseError.message : 'Formato inválido'}`,
              variant: "destructive"
            });
          }
        };
        try {
          reader.readAsText(file);
          console.log('🔥 FileReader.readAsText called successfully');
        } catch (readerError) {
          console.error('🔥 FileReader.readAsText failed:', readerError);
          throw readerError;
        }
        return;
      }

      // Handle image files (existing logic)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // Create image asset in tldraw
        const assetId = `asset:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const imageAsset = {
          id: assetId,
          type: 'image',
          typeName: 'asset',
          props: {
            name: file.name,
            src: dataUrl,
            w: 0,
            h: 0,
            mimeType: file.type,
            isAnimated: false,
          },
          meta: {},
        };

        editorInstance.createAssets([imageAsset]);
        
        // Create image shape
        const shapeId = `shape:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const center = editorInstance.getViewportPageBounds().center;
        editorInstance.createShapes([{
          id: shapeId,
          type: 'image',
          x: center.x - 100,
          y: center.y - 100,
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
      console.error('Erro ao carregar arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar arquivo",
        variant: "destructive"
      });
    }
  }, [editorInstance]);

  const handleAssetSelect = useCallback(async (asset: any) => {
    if (!editorInstance) return;

    try {
      // Check if this is a TLD file that should be loaded from file_metadata
      const isTldAsset = (asset.originAssetId === "Graph_TLD") || (asset.editor === "Graph_TLD");
      
      if (isTldAsset && asset.fileMetadata) {
        console.log('Loading TLD file from file_metadata...', {
          assetName: asset.name,
          assetType: asset.originAssetId || asset.editor,
          hasMetadata: !!asset.fileMetadata
        });
        
        try {
          // Parse the stored tldraw snapshot from file_metadata
          const tldrawData = JSON.parse(asset.fileMetadata);
          
          // Use the same loading function as disk files
          loadTldrawData(tldrawData, 'asset metadata');
          
          toast({
            title: "Sucesso",
            description: `Arquivo TLD "${asset.name}" carregado com sucesso`,
          });
          
          setShowImageModal(false);
          return;
        } catch (parseError) {
          console.error('Erro ao carregar snapshot TLD:', parseError);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados do arquivo TLD",
            variant: "destructive"
          });
          return;
        }
      }

      // For regular images (non-tldraw files)
      // Convert base64 to data URL if needed
      const src = asset.fileData.startsWith('data:') 
        ? asset.fileData 
        : `data:image/png;base64,${asset.fileData}`;

      // Create asset ID using custom generation
      const assetId = `asset:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the asset with the image - correct structure for tldraw
      editorInstance.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: asset.name,
          src,
          w: 0,
          h: 0,
          mimeType: 'image/png',
          isAnimated: false,
        },
        meta: {},
      }]);

      // Get viewport center for positioning
      const viewportCenter = editorInstance.getViewportPageBounds().center;
      
      // Create the shape on screen with proper ID
      const shapeId = `shape:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      editorInstance.createShapes([{
        id: shapeId,
        type: 'image',
        x: viewportCenter.x - 150,
        y: viewportCenter.y - 150,
        props: {
          assetId,
          w: 300,
          h: 300
        }
      }]);

      setShowImageModal(false);
    } catch (error) {
      console.error('Erro ao inserir imagem:', error);
    }
  }, [editorInstance]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header com controles */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="font-medium text-sm">Vector Graph Editor</h3>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-gray-600">Nome:</span>
            <Input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="vector-graph"
              className="h-7 w-32 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImageModal(true)}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            title="Carregar arquivo ou inserir imagem"
          >
            <ImagePlus className="w-3 h-3" />
            Carregar/Inserir
          </button>
          <button
            onClick={handleSaveToAssets}
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-1"
            title="Salvar em Meus Assets"
          >
            <Save className="w-3 h-3" />
            Salvar
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Exportar SVG
          </button>
          <button
            onClick={handleExportTldr}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Baixar .tldr
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
        accept="image/*,.tldr"
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
              <TabsTrigger value="document" disabled={!selectedEdition}>
                <FileImage className="w-4 h-4 mr-2" />
                My Assets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Carregar arquivo local</h3>
                <p className="text-sm text-gray-500 mb-4">Selecione uma imagem ou arquivo .tldr do seu computador</p>
                <Button onClick={handleLocalFileUpload}>
                  Selecionar Arquivo
                </Button>
                <div className="mt-4 text-xs text-gray-400 text-center">
                  <p>Formatos suportados:</p>
                  <p>• Imagens: PNG, JPG, GIF, etc.</p>
                  <p>• Arquivos tldraw: .tldr</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="global" className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {globalAssets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum asset global disponível
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Separar arquivos TLD dos outros */}
                    {globalAssets.filter(asset => asset.editor === "Graph_TLD").length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-green-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                          </svg>
                          Arquivos TLD globais (clique para carregar)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {globalAssets
                            .filter(asset => asset.editor === "Graph_TLD")
                            .map((asset: any) => (
                              <div
                                key={asset.id}
                                className="border-2 border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-50 transition-colors bg-green-25"
                                onClick={() => handleAssetSelect(asset)}
                              >
                                <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                                  <img
                                    src={asset.fileData.startsWith('data:') ? asset.fileData : `data:image/png;base64,${asset.fileData}`}
                                    alt={asset.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs text-center truncate text-green-700 font-medium" title={asset.name}>
                                  {asset.name}
                                </p>
                                <div className="text-center mt-1">
                                  <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                    tldraw
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Outros assets globais */}
                    {globalAssets.filter(asset => asset.editor !== "Graph_TLD").length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-gray-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                          </svg>
                          Outras imagens globais (inserir como shape)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {globalAssets
                            .filter(asset => asset.editor !== "Graph_TLD")
                            .map((asset: any) => (
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="document" className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {documentArtifacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum asset do documento disponível
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Separar arquivos tldraw dos outros */}
                    {documentArtifacts.filter(artifact => artifact.originAssetId === "Graph_TLD").length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-blue-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                          </svg>
                          Arquivos tldraw (clique para carregar)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {documentArtifacts
                            .filter(artifact => artifact.originAssetId === "Graph_TLD")
                            .map((artifact: any) => (
                              <div
                                key={artifact.id}
                                className="border-2 border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors bg-blue-25"
                                onClick={() => handleAssetSelect(artifact)}
                              >
                                <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                                  <img
                                    src={artifact.fileData.startsWith('data:') ? artifact.fileData : `data:image/png;base64,${artifact.fileData}`}
                                    alt={artifact.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs text-center truncate text-blue-700 font-medium" title={artifact.name}>
                                  {artifact.name}
                                </p>
                                <div className="text-center mt-1">
                                  <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    tldraw
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Outros arquivos de imagem */}
                    {documentArtifacts.filter(artifact => artifact.originAssetId === "Uploaded").length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 text-gray-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                          </svg>
                          Outras imagens (inserir como shape)
                        </h4>
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
                      </div>
                    )}
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