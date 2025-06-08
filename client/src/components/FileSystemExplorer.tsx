import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Folder, HardDrive, Home, Download, AlertCircle } from "lucide-react";

interface FileSystemExplorerProps {
  onDirectorySelected: (directoryHandle: any) => void;
  selectedPath: string;
  onPathChange: (path: string) => void;
}

export default function FileSystemExplorer({ 
  onDirectorySelected, 
  selectedPath, 
  onPathChange 
}: FileSystemExplorerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);

  useEffect(() => {
    // Verificar se o navegador suporta File System Access API
    setIsSupported('showDirectoryPicker' in window);
  }, []);

  const handleSelectDirectory = async () => {
    if (!isSupported) {
      // Fallback: mostrar input manual do caminho
      const path = prompt("Digite o caminho do diretório (ex: C:\\Documentos\\):");
      if (path) {
        onPathChange(path);
      }
      return;
    }

    try {
      // @ts-ignore - File System Access API ainda não tem tipos oficiais
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      setDirectoryHandle(dirHandle);
      onPathChange(dirHandle.name);
      onDirectorySelected(dirHandle);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Erro ao selecionar diretório:', error);
      }
    }
  };

  const getDefaultPaths = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) {
      return [
        { name: 'Downloads', path: 'Downloads', icon: Download },
        { name: 'Documentos', path: 'Documentos', icon: Folder },
        { name: 'Área de Trabalho', path: 'Desktop', icon: Folder },
      ];
    } else if (userAgent.includes('Mac')) {
      return [
        { name: 'Downloads', path: '~/Downloads', icon: Download },
        { name: 'Documentos', path: '~/Documents', icon: Folder },
        { name: 'Desktop', path: '~/Desktop', icon: Folder },
      ];
    } else {
      return [
        { name: 'Downloads', path: '~/Downloads', icon: Download },
        { name: 'Documentos', path: '~/Documents', icon: Folder },
        { name: 'Home', path: '~/', icon: Home },
      ];
    }
  };

  const defaultPaths = getDefaultPaths();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Diretório de salvamento</Label>
        
        {/* Caminho selecionado */}
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gray-500" />
          <Input
            value={selectedPath}
            onChange={(e) => onPathChange(e.target.value)}
            placeholder="Caminho do diretório"
            className="flex-1"
          />
        </div>
      </div>

      {/* Botão para selecionar diretório */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSelectDirectory}
          className="w-full flex items-center gap-2"
        >
          <FolderOpen className="w-4 h-4" />
          {isSupported ? 'Explorar e Selecionar Diretório' : 'Definir Caminho Manualmente'}
        </Button>

        {/* Atalhos para diretórios comuns */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">Atalhos rápidos:</Label>
          <div className="grid grid-cols-1 gap-1">
            {defaultPaths.map((pathItem) => (
              <Button
                key={pathItem.path}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPathChange(pathItem.path)}
                className="justify-start h-8 px-2 text-xs"
              >
                <pathItem.icon className="w-3 h-3 mr-2" />
                {pathItem.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Aviso sobre compatibilidade */}
      {!isSupported && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-medium">Navegador com suporte limitado</p>
            <p>Seu navegador não suporta seleção avançada de diretórios. Os arquivos serão salvos na pasta de downloads padrão.</p>
          </div>
        </div>
      )}

      {isSupported && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Folder className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <p className="font-medium">Explorador de arquivos ativo</p>
            <p>Você pode selecionar qualquer diretório no seu sistema para salvar os arquivos.</p>
          </div>
        </div>
      )}
    </div>
  );
}