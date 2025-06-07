import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { useEffect, useRef } from 'react';

import {
  $createImageNode,
  ImageNode,
  type ImagePayload,
} from './ImageNode';
import {
  $createImageWithMetadataNode,
  ImageWithMetadataNode,
  type ImageWithMetadataPayload,
} from './ImageWithMetadataNode';

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND',
);

export const UPLOAD_IMAGE_COMMAND: LexicalCommand<File> = createCommand(
  'UPLOAD_IMAGE_COMMAND',
);

export function $insertImageNode(payload: ImagePayload): void {
  const selection = $getSelection();
  
  if ($isRangeSelection(selection)) {
    // Criar nó de imagem tradicional (para compatibilidade)
    const imageNode = $createImageNode(payload);
    selection.insertNodes([imageNode]);
  } else {
    // Fallback para inserção sem seleção
    const imageNode = $createImageNode(payload);
    $insertNodeToNearestRoot(imageNode);
  }
}

export function $insertImageWithMetadataNode(payload: ImagePayload): void {
  const selection = $getSelection();
  
  // Gerar ID único para a imagem
  const imageId = Math.floor(Math.random() * 10000000000).toString();
  
  // Criar URL blob acessível para navegadores externos
  let displayUrl = payload.src;
  if (payload.src.startsWith('data:')) {
    try {
      // Converter data URL para blob
      const byteString = atob(payload.src.split(',')[1]);
      const mimeString = payload.src.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      displayUrl = URL.createObjectURL(blob);
    } catch (error) {
      displayUrl = `blob:${window.location.origin}/${imageId}`;
    }
  }
  
  const metadataText = `[image_id: ${imageId}] - [${displayUrl}]`;
  
  // Criar nó de imagem com metadata
  const imageWithMetadataPayload: ImageWithMetadataPayload = {
    src: payload.src,
    altText: payload.altText,
    imageId: imageId,
    metadataText: metadataText,
    width: payload.width,
    height: payload.height,
  };
  
  const imageWithMetadataNode = $createImageWithMetadataNode(imageWithMetadataPayload);
  
  if ($isRangeSelection(selection)) {
    selection.insertNodes([imageWithMetadataNode]);
  } else {
    $insertNodeToNearestRoot(imageWithMetadataNode);
  }
}

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url || data.path;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export function useImageUpload() {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    try {
      const url = await uploadImageFile(file);
      
      editor.update(() => {
        const payload: ImagePayload = {
          src: url,
          altText: file.name,
        };
        $insertImageWithMetadataNode(payload);
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    fileInputRef,
    openFileDialog,
    handleFileChange,
    handleFileUpload,
  };
}

export default function ImagePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagePlugin: ImageNode not registered on editor');
    }

    const removeInsertImageCommand = editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload: ImagePayload) => {
        editor.update(() => {
          $insertImageWithMetadataNode(payload);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    const removeUploadImageCommand = editor.registerCommand(
      UPLOAD_IMAGE_COMMAND,
      (file: File) => {
        uploadImageFile(file)
          .then((url) => {
            editor.update(() => {
              const payload: ImagePayload = {
                src: url,
                altText: file.name,
              };
              $insertImageWithMetadataNode(payload);
            });
          })
          .catch((error) => {
            console.error('Failed to upload image:', error);
            alert('Erro ao fazer upload da imagem. Tente novamente.');
          });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      removeInsertImageCommand();
      removeUploadImageCommand();
    };
  }, [editor]);

  return null;
}