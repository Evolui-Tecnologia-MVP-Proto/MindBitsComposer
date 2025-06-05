import { useState } from "react";
import Layout from "@/components/Layout";
import LexicalEditor from "@/components/LexicalEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Download, Upload, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LexicalPage() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Documento salvo",
        description: "Seu documento foi salvo com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setContent("");
    toast({
      title: "Conteúdo limpo",
      description: "O editor foi limpo com sucesso.",
    });
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento-lexical.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Documento exportado",
      description: "O documento foi exportado com sucesso.",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setContent(text);
          toast({
            title: "Documento importado",
            description: "O documento foi importado com sucesso.",
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editor Lexical</h1>
          <p className="text-gray-600">
            Editor avançado com recursos de formatação rica e funcionalidades modernas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Painel de Controles */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Controles
                </CardTitle>
                <CardDescription>
                  Gerencie seu documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
                
                <Button 
                  onClick={handleExport}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
                
                <Button 
                  onClick={handleImport}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                
                <Button 
                  onClick={handleClear}
                  className="w-full"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </CardContent>
            </Card>

            {/* Estatísticas do Documento */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Caracteres:</span>
                    <span className="font-mono">{content.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Palavras:</span>
                    <span className="font-mono">
                      {content.trim() ? content.trim().split(/\s+/).length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Linhas:</span>
                    <span className="font-mono">
                      {content ? content.split('\n').length : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <LexicalEditor
                  content={content}
                  onChange={setContent}
                  className="h-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}