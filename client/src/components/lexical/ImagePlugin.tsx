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

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND',
);

export const UPLOAD_IMAGE_COMMAND: LexicalCommand<File> = createCommand(
  'UPLOAD_IMAGE_COMMAND',
);

export function $insertImageNode(payload: ImagePayload): void {
  const imageNode = $createImageNode(payload);
  $insertNodeToNearestRoot(imageNode);
  
  // Gerar ID único para a imagem
  const imageId = Math.floor(Math.random() * 10000000000).toString();
  
  // Criar parágrafo com informações da imagem
  const infoParagraph = $createParagraphNode();
  const infoText = $createTextNode(`[image_id: ${imageId}] - [${payload.src}]`);
  infoParagraph.append(infoText);
  
  // Inserir o parágrafo após a imagem
  $insertNodeToNearestRoot(infoParagraph);
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
        $insertImageNode(payload);
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
          $insertImageNode(payload);
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
              $insertImageNode(payload);
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