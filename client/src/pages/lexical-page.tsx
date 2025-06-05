import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import LexicalEditor from "@/components/LexicalEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Download, Upload, FileText, Trash2, Plus, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LexicalDocument {
  id: string;
  title: string;
  content: string;
  plainText: string;
  userId: number;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function LexicalPage() {
  const [content, setContent] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Novo Documento");
  const [showDocumentList, setShowDocumentList] = useState(false);
  const { toast } = useToast();

  // Query para buscar documentos do usuário
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/lexical-documents'],
    enabled: showDocumentList
  });

  // Mutation para salvar documento
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; plainText: string }) => {
      if (currentDocumentId) {
        return apiRequest(`/api/lexical-documents/${currentDocumentId}`, "PUT", data);
      } else {
        return apiRequest('/api/lexical-documents', "POST", data);
      }
    },
    onSuccess: (data: any) => {
      setCurrentDocumentId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/lexical-documents'] });
      toast({
        title: "Documento salvo",
        description: `"${title}" foi salvo com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o documento.",
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir documento
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/lexical-documents/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lexical-documents'] });
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Ocorreu um erro ao excluir o documento.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    const plainText = content.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags para texto plano
    saveMutation.mutate({
      title,
      content,
      plainText
    });
  };

  const handleNewDocument = () => {
    setCurrentDocumentId(null);
    setTitle("Novo Documento");
    setContent("");
    setShowDocumentList(false);
  };

  const handleClear = () => {
    setContent("");
    toast({
      title: "Conteúdo limpo",
      description: "O editor foi limpo com sucesso.",
    });
  };

  const handleLoadDocument = (document: LexicalDocument) => {
    setCurrentDocumentId(document.id);
    setTitle(document.title);
    setContent(document.content);
    setShowDocumentList(false);
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(id);
      if (currentDocumentId === id) {
        handleNewDocument();
      }
    }
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
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
          setTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extensão do arquivo
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
                  disabled={saveMutation.isPending}
                  className="w-full"
                  variant="default"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
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