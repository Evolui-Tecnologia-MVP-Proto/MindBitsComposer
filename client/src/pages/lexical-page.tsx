import { useState } from "react";
import LexicalEditor from "@/components/LexicalEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Download, Upload, FileText, Trash2, Plus, FolderOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

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
    <div className="min-h-screen bg-background">
      {/* Header com navegação */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editor Lexical</h1>
              <p className="text-sm text-gray-600">Editor avançado com formatação rica</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-64"
              placeholder="Nome do documento"
            />
            <Button
              onClick={() => setShowDocumentList(!showDocumentList)}
              variant="outline"
              size="sm"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Documentos
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar de documentos (condicional) */}
        {showDocumentList && (
          <div className="w-80 border-r bg-white p-4 overflow-y-auto">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-4">Biblioteca</h3>
              {isLoadingDocuments ? (
                <div className="text-center py-4">Carregando...</div>
              ) : (
                <>
                  {documents?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento encontrado</p>
                    </div>
                  ) : (
                    documents?.map((doc: LexicalDocument) => (
                      <div
                        key={doc.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          currentDocumentId === doc.id ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => handleLoadDocument(doc)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{doc.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {doc.plainText || "Documento vazio"}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Editor principal */}
        <div className="flex-1 flex flex-col">
          {/* Barra de ferramentas do editor integrada */}
          <div className="flex-1 p-6">
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

        {/* Sidebar de controles */}
        <div className="w-80 border-l bg-gray-50 p-4 space-y-4">
          {/* Controles de documento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Controles</CardTitle>
              <CardDescription className="text-xs">
                Gerencie seu documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleExport}
                className="w-full"
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              
              <Button 
                onClick={handleImport}
                className="w-full"
                variant="outline"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              
              <Button 
                onClick={handleClear}
                className="w-full"
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </CardContent>
          </Card>

          {/* Estatísticas do Documento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Caracteres:</span>
                <span className="font-medium">{content.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Palavras:</span>
                <span className="font-medium">
                  {content.trim() ? content.trim().split(/\s+/).length : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Linhas:</span>
                <span className="font-medium">
                  {content.split('\n').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}