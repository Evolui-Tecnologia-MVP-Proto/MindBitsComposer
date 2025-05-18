import TextEditor from "@/components/TextEditor";
import { Button } from "@/components/ui/button";
import { Save, FileText, Upload, Download, Settings } from "lucide-react";

export default function EditorPage() {
  return (
    <div className="h-full fade-in flex flex-col">
      {/* Área do editor - ocupando todo o espaço disponível */}
      <div className="flex-grow">
        <TextEditor />
      </div>
      
      {/* Barra de botões inferior */}
      <div className="h-14 bg-white border-t border-gray-200 shadow-sm flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="h-9">
            <FileText className="h-4 w-4 mr-2" />
            Novo
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="h-9">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button size="sm" className="h-9">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}