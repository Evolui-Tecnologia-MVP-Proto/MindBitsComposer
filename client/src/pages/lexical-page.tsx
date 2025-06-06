import { useState } from "react";
import LexicalEditor from "@/components/LexicalEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Download, Upload, FileText, Trash2, Plus, FolderOpen, ArrowLeft, Paperclip, PenTool, Eye, Edit, File, Image, Video, FileAudio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_IMAGE_COMMAND } from '@/components/lexical/ImagePlugin';
import type { ImagePayload } from '@/components/lexical/ImageNode';

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

interface Template {
  id: string;
  name: string;
  code: string;
  description: string;
  type: string;
  structure: any;
  mappings: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface DocumentArtifact {
  id: string;
  documentoId: string;
  name: string;
  fileData: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  type: string;
  originAssetId?: string;
  isImage?: string;
  mondayColumn?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LexicalPage() {
  const [content, setContent] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Novo Documento");
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [selectedEdition, setSelectedEdition] = useState<any>(null);
  const [editorState, setEditorState] = useState<string>('');
  const [initialEditorState, setInitialEditorState] = useState<string | undefined>(undefined);
  const [editorKey, setEditorKey] = useState<number>(0); // Chave para forçar re-render do editor
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const { toast } = useToast();

  // Função para obter ícone baseado no tipo de arquivo
  const getFileIcon = (mimeType: string | undefined, isImage: string | undefined) => {
    if (isImage === "true" || (mimeType && mimeType.startsWith("image/"))) {
      return <Image className="w-4 h-4" />;
    }
    if (mimeType && mimeType.startsWith("video/")) {
      return <Video className="w-4 h-4" />;
    }
    if (mimeType && mimeType.startsWith("audio/")) {
      return <FileAudio className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  // Função para renderizar miniatura de imagem
  const renderThumbnail = (artifact: DocumentArtifact) => {
    if (artifact.isImage === "true" && artifact.fileData) {
      const imageSrc = `data:${artifact.mimeType};base64,${artifact.fileData}`;
      return (
        <img 
          src={imageSrc} 
          alt={artifact.name}
          className="w-12 h-12 object-cover rounded border"
        />
      );
    }
    return (
      <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
        {getFileIcon(artifact.mimeType, artifact.isImage)}
      </div>
    );
  };

  // Função para extrair seções do template
  const extractTemplateSections = (template: Template): string[] => {
    try {
      let structure = template.structure;
      
      // Se for string, fazer parse
      if (typeof structure === 'string' && structure.trim()) {
        structure = JSON.parse(structure);
      }
      
      if (structure && structure.sections) {
        return Object.keys(structure.sections);
      }
    } catch (error) {
      console.error('Erro ao processar estrutura do template:', error);
    }
    
    return [];
  };

  // Query para buscar documentos do usuário
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/lexical-documents'],
    enabled: showDocumentList
  });

  // Query para buscar templates do tipo 'struct'
  const { data: structTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/templates/struct'],
    enabled: showDocumentList
  });

  // Query para buscar document_editions em progresso
  const { data: documentEditions = [], isLoading: isLoadingEditions } = useQuery({
    queryKey: ['/api/document-editions-in-progress'],
    enabled: showDocumentList
  });

  // Query para buscar artifacts do documento selecionado
  const { data: documentArtifacts = [], isLoading: isLoadingArtifacts } = useQuery<DocumentArtifact[]>({
    queryKey: ['/api/document-editions', selectedEdition?.id, 'artifacts'],
    queryFn: async () => {
      if (!selectedEdition?.id) return [];
      console.log('🔥 Buscando artifacts para editionId:', selectedEdition.id);
      const response = await fetch(`/api/document-editions/${selectedEdition.id}/artifacts`);
      if (!response.ok) throw new Error('Erro ao buscar artifacts');
      const data = await response.json();
      console.log('🔥 Artifacts recebidos:', data);
      return data;
    },
    enabled: !!selectedEdition?.id
  });

  // Função para inserir imagem no editor
  const handleInsertImage = (artifact: DocumentArtifact) => {
    try {
      if (artifact.fileData && artifact.mimeType) {
        const imageUrl = `data:${artifact.mimeType};base64,${artifact.fileData}`;
        
        // Criar evento customizado para inserir imagem
        const insertImageEvent = new CustomEvent('insertImage', {
          detail: {
            src: imageUrl,
            altText: artifact.name || 'Imagem',
          }
        });
        
        // Disparar evento para o editor
        window.dispatchEvent(insertImageEvent);
        
        toast({
          title: "Imagem inserida",
          description: `A imagem "${artifact.name}" foi inserida no documento.`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao inserir imagem",
        description: "Não foi possível inserir a imagem no documento.",
        variant: "destructive",
      });
    }
  };

  // Função para baixar arquivo
  const handleDownloadFile = (artifact: DocumentArtifact) => {
    try {
      if (artifact.fileData && artifact.mimeType) {
        // Criar blob a partir do base64
        const byteCharacters = atob(artifact.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: artifact.mimeType });

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = artifact.fileName || artifact.name || 'arquivo';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download iniciado",
          description: `O arquivo "${artifact.name}" está sendo baixado.`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  // Mutation para salvar documento
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; plainText: string }) => {
      // Se há um document edition selecionado, salvar no lex_file
      if (selectedEdition) {
        return apiRequest("PUT", `/api/document-editions/${selectedEdition.id}/lex-file`, {
          lexFile: editorState || data.content
        });
      }
      // Caso contrário, salvar como documento lexical normal
      else if (currentDocumentId) {
        return apiRequest("PUT", `/api/lexical-documents/${currentDocumentId}`, data);
      } else {
        return apiRequest("POST", '/api/lexical-documents', data);
      }
    },
    onSuccess: (data: any) => {
      if (selectedEdition) {
        // Atualizar o selectedEdition com o novo lex_file
        setSelectedEdition({ ...selectedEdition, lexFile: content });
        queryClient.invalidateQueries({ queryKey: ['/api/document-editions-in-progress'] });
        toast({
          title: "Documento salvo",
          description: `Conteúdo salvo no documento "${selectedEdition.origem} - ${selectedEdition.objeto}".`,
        });
      } else {
        setCurrentDocumentId(data.id);
        queryClient.invalidateQueries({ queryKey: ['/api/lexical-documents'] });
        toast({
          title: "Documento salvo",
          description: `"${title}" foi salvo com sucesso.`,
        });
      }
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
    setSelectedTemplate(null); // Limpar template ao carregar documento
    setShowDocumentList(false);
  };

  const handleSelectEdition = (edition: any) => {
    console.log('Selecionando edition:', edition);
    setSelectedEdition(edition);
    setCurrentDocumentId(null);
    
    // Criar objeto template para exibir o badge
    const template = {
      id: edition.templateId,
      name: edition.templateCode,
      code: edition.templateCode,
      description: '',
      type: 'struct' as const,
      structure: edition.templateStructure,
      mappings: {},
      createdAt: '',
      updatedAt: ''
    };
    setSelectedTemplate(template);
    
    // Se lex_file estiver vazio ou null, carregar o template
    if (!edition.lexFile) {
      console.log('Carregando template, lex_file está vazio');
      console.log('Template structure:', edition.templateStructure);
      
      // Limpar estado inicial do editor para usar template
      setInitialEditorState(undefined);
      
      // Usar a função existente para carregar template
      if (edition.templateStructure) {
        const templateSections = extractTemplateSections(template);
        console.log('Template sections:', templateSections);
        // Usar as seções do template como templateSections para o plugin
        setContent(''); // Deixar vazio para usar o plugin de template
      } else {
        setContent('');
      }
      setTitle(`${edition.templateCode} - ${edition.origem} - ${edition.objeto}`);
    } else {
      console.log('Carregando lex_file existente');
      // Carregar estado serializado do Lexical
      setInitialEditorState(edition.lexFile);
      setContent(''); // Limpar conteúdo pois usaremos o estado serializado
      setTitle(`${edition.templateCode} - ${edition.origem} - ${edition.objeto}`);
    }
    
    // Forçar re-render do editor para aplicar novo estado
    setEditorKey(prev => prev + 1);
    setShowDocumentList(false);
  };

  const convertTemplateToContent = (structure: any): string => {
    if (!structure || !structure.containers) return "";
    
    // Criar conteúdo do editor com containers colapsíveis
    const containers = structure.containers.map((container: any) => {
      return `<div class="collapsible-container collapsed">
        <div class="collapsible-title">${container.title || 'Container'}</div>
        <div class="collapsible-content"></div>
      </div>`;
    }).join('\n\n');
    
    return containers;
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header com navegação */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Composer Editor</h1>
              <p className="text-muted-foreground">Edição avançada e integrada de documentação técnica de processos</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              {selectedEdition && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  {selectedEdition.origem} - {selectedEdition.objeto}
                </Badge>
              )}
              {selectedTemplate && (
                <Badge variant="secondary" className="text-xs">
                  Template: {selectedTemplate.code}
                </Badge>
              )}
              <Button
                onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
                variant="outline"
                size="sm"
                title={viewMode === 'editor' ? 'Visualizar Markdown' : 'Modo Editor'}
              >
                {viewMode === 'editor' ? (
                  <Eye className="w-4 h-4 mr-2" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                {viewMode === 'editor' ? 'Markdown' : 'Editor'}
              </Button>
              <Button
                onClick={() => setShowDocumentList(!showDocumentList)}
                variant={showDocumentList ? "default" : "outline"}
                size="sm"
                className={showDocumentList ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
              >
                <FolderOpen className={`w-4 h-4 mr-2 ${showDocumentList ? "text-white" : ""}`} />
                Biblioteca
              </Button>
            </div>
            <Button
              onClick={() => setShowAttachments(!showAttachments)}
              variant={showAttachments ? "default" : "outline"}
              size="sm"
              className={showAttachments ? "bg-green-600 text-white hover:bg-green-700" : ""}
            >
              <Paperclip className={`w-4 h-4 mr-2 ${showAttachments ? "text-white" : ""}`} />
              Anexos
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
      {/* Área do editor - ocupa todo o espaço restante */}
      <div className="flex-1 px-6 pb-[5px] min-h-0">
        <div className="flex h-full">
          {/* Sidebar de documentos (condicional) */}
        {showDocumentList && (
          <div className="w-80 border-r bg-white p-4 overflow-y-auto">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Biblioteca</h3>
              
              <Accordion type="multiple" defaultValue={[]} className="w-full">
                {/* Grupo 1: Templates Estruturais */}
                <AccordionItem value="templates">
                  <AccordionTrigger className="text-md font-medium text-gray-700 hover:no-underline">
                    Templates Estruturais
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {isLoadingTemplates ? (
                        <div className="text-center py-2 text-sm">Carregando templates...</div>
                      ) : (
                        <>
                          {!structTemplates || (Array.isArray(structTemplates) && structTemplates.length === 0) ? (
                            <div className="text-center py-4 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Nenhum template encontrado</p>
                            </div>
                          ) : (
                            Array.isArray(structTemplates) && structTemplates.map((template: Template) => (
                              <div
                                key={template.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-green-200 hover:border-green-300"
                                onClick={() => {
                                  setTitle(template.name);
                                  setContent(''); // Limpar conteúdo para o plugin processar
                                  setCurrentDocumentId(null);
                                  setSelectedTemplate(template);
                                }}
                              >
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm text-green-700">{template.code} - {template.name}</h5>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {template.description}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    Template • {new Date(template.updatedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Grupo 2: Documentos Composer */}
                <AccordionItem value="documents">
                  <AccordionTrigger className="text-md font-medium text-gray-700 hover:no-underline">
                    Documentos Composer
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {isLoadingEditions ? (
                        <div className="text-center py-2 text-sm">Carregando documentos em progresso...</div>
                      ) : (
                        <>
                          {!documentEditions || (Array.isArray(documentEditions) && documentEditions.length === 0) ? (
                            <div className="text-center py-4 text-gray-500">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Nenhum documento em progresso encontrado</p>
                            </div>
                          ) : (
                            Array.isArray(documentEditions) && documentEditions.map((edition: any) => (
                              <div
                                key={edition.id}
                                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 relative ${
                                  selectedEdition?.id === edition.id ? 'border-blue-500 bg-blue-50' : ''
                                }`}
                                onClick={() => handleSelectEdition(edition)}
                              >
                                {edition.lexFile && (
                                  <div className="absolute top-2 right-2">
                                    <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                                      Edit
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 pr-8">
                                    <h5 className="font-medium text-sm text-blue-600">
                                      {edition.templateCode}
                                    </h5>
                                    <div className="mt-1 space-y-1">
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">Origem:</span> {edition.origem || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">Objeto:</span> {edition.objeto || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}

        {/* Editor principal */}
        <div className="flex-1 flex flex-col">
          {/* Barra de ferramentas do editor integrada */}
          <div className="flex-1 pl-0 pr-4 pt-4 pb-0">
            <Card className="h-full">
              <CardContent className="p-0 h-full relative overflow-hidden">
                {/* Placeholder quando não há conteúdo nem template selecionado */}
                {(!content || content.trim() === '') && !selectedTemplate && !selectedEdition && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                    <PenTool className="w-[100px] h-[100px] mb-4 opacity-20" />
                    <p className="text-lg font-medium text-center">Selecione um documento ou template para iniciar...</p>
                  </div>
                )}
                <LexicalEditor
                  key={editorKey}
                  content={content}
                  onChange={setContent}
                  onEditorStateChange={setEditorState}
                  className="h-full"
                  templateSections={selectedTemplate ? extractTemplateSections(selectedTemplate) : undefined}
                  viewMode={viewMode}
                  initialEditorState={initialEditorState}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Painel de Anexos */}
        {showAttachments && (
          <div className="w-80 border-l bg-gray-50 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-5 h-5" />
                <h3 className="font-semibold">Anexos</h3>
              </div>

              <Accordion type="multiple" className="w-full space-y-2">
                {/* My Assets */}
                <AccordionItem value="my-assets" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">My Assets</span>
                      <Badge variant="secondary" className="ml-auto">
                        0
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 mb-3">
                        Seus arquivos pessoais e uploads
                      </p>
                      <Button 
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Arquivo
                      </Button>
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400">
                          Nenhum arquivo carregado
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Origin Assets */}
                <AccordionItem value="origin-assets" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span className="font-medium">Origin Assets</span>
                      <Badge variant="secondary" className="ml-auto">
                        {documentArtifacts.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 mb-3">
                        Arquivos vinculados ao documento
                      </p>
                      
                      {isLoadingArtifacts ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">Carregando...</p>
                        </div>
                      ) : documentArtifacts.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">
                            Nenhum arquivo vinculado
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documentArtifacts.map((artifact: DocumentArtifact) => {
                            // Log para debug dos campos
                            console.log('Artifact data completo:', artifact);
                            
                            return (
                              <div 
                                key={artifact.id}
                                className="p-3 bg-gray-50 rounded-lg border"
                              >
                                {/* Botões de ação no topo */}
                                <div className="flex justify-end mb-3">
                                  {artifact.isImage === 'true' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-7"
                                      onClick={() => handleInsertImage(artifact)}
                                      title="Inserir imagem no documento"
                                    >
                                      <Image className="w-3 h-3 mr-1" />
                                      Inserir
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-7"
                                      onClick={() => handleDownloadFile(artifact)}
                                      title="Baixar arquivo"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Baixar
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Conteúdo do card */}
                                <div className="flex items-center gap-3">
                                  {/* Miniatura ou ícone */}
                                  {renderThumbnail(artifact)}
                                  
                                  {/* Informações do arquivo */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" title={artifact.name}>
                                      {artifact.name}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate font-mono" title={artifact.fileName}>
                                      {artifact.fileName || 'Nome do arquivo não disponível'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {artifact.type === 'vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'word.docx' : (artifact.type || 'unknown')}
                                      </Badge>
                                      {artifact.fileSize && (
                                        <span className="text-xs text-gray-500">
                                          {Math.round(parseInt(artifact.fileSize) / 1024)} KB
                                        </span>
                                      )}

                                    </div>
                                    {artifact.mondayColumn && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Monday: {(artifact as any).mondayColumnTitle || artifact.mondayColumn}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}