import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, Save, Palette } from "lucide-react";
import PluginModal from "@/components/plugin-modal";
import { Plugin, PluginType, PluginStatus } from "@shared/schema";

export default function BasicTextEditor() {
  const [content, setContent] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);

  const openFreeHandCanvas = () => {
    const freeHandPlugin: Plugin = {
      id: "freehand-canvas",
      name: "FreeHand Canvas",
      description: "Canvas de desenho livre",
      type: PluginType.UTILITY,
      status: PluginStatus.ACTIVE,
      version: "1.0.0",
      author: "Sistema",
      icon: "palette",
      pageName: "freehand-canvas-plugin",
      configuration: {} as Record<string, string>,
      endpoints: [],
      permissions: [],
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSelectedPlugin(freeHandPlugin);
    setIsPluginModalOpen(true);
  };

  const handlePluginClose = () => {
    setIsPluginModalOpen(false);
    setSelectedPlugin(null);
  };

  const insertFreeHandLink = (imageUrl: string) => {
    const linkText = `[Imagem FreeHand](${imageUrl})`;
    setContent(prev => prev + "\n" + linkText + "\n");
  };

  // Função para ser chamada pelo plugin quando uma imagem for exportada
  const handleImageExport = (imageUrl: string) => {
    insertFreeHandLink(imageUrl);
    handlePluginClose();
  };

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => {
            const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              const before = text.substring(0, start);
              const selected = text.substring(start, end);
              const after = text.substring(end);
              
              if (selected) {
                setContent(before + "**" + selected + "**" + after);
              }
            }
          }}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => {
            const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              const before = text.substring(0, start);
              const selected = text.substring(start, end);
              const after = text.substring(end);
              
              if (selected) {
                setContent(before + "*" + selected + "*" + after);
              }
            }
          }}
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={openFreeHandCanvas}
          className="flex items-center gap-1"
          title="Abrir FreeHand Canvas"
        >
          <Palette className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4">
        <textarea
          id="editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comece a escrever seu documento..."
          className="w-full h-full resize-none border-none outline-none text-gray-900 placeholder-gray-400"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        />
      </div>

      <PluginModal
        plugin={selectedPlugin}
        isOpen={isPluginModalOpen}
        onClose={handlePluginClose}
        onImageExport={handleImageExport}
      />
    </div>
  );
}