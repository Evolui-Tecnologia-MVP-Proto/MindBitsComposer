import { useState, useRef, useEffect } from "react";
import LexicalEditor from "@/components/LexicalEditor";
import MarkdownPreview from "@/components/MarkdownPreview";
import SaveFileModal from "@/components/SaveFileModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Download, Upload, FileText, Trash2, Plus, FolderOpen, ArrowLeft, Paperclip, PenTool, Eye, Edit, File, Image, Video, FileAudio, FileCode2, CircleChevronLeft, Globe, Split, FileInput, FileOutput, Puzzle, Palette, Settings, Database, Brain, BarChart, Zap, Wrench, Code, Cpu, Lock, Mail, Music, Calendar, Clock, Users, Star, Heart, Flag, Target, Bookmark, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConfirmationToast } from "@/hooks/use-confirmation-toast";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_IMAGE_COMMAND } from '@/components/lexical/ImagePlugin';
import type { ImagePayload } from '@/components/lexical/ImageNode';
import { createMarkdownConverter } from '@/components/markdown-converter';
import { $getRoot } from 'lexical';
import PluginModal from '@/components/plugin-modal';
import type { Plugin } from '@shared/schema';

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

interface GlobalAsset {
  id: string;
  name: string;
  fileData: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  type: string;
  isImage: string;
  uploadedBy: string;
  description?: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

interface Plugin {
  id: string;
  name: string;
  description: string;
  type: string;
  version: string;
  author: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LexicalPage() {
  const [content, setContent] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("Novo Documento");
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'mdx'>('editor');
  const [selectedEdition, setSelectedEdition] = useState<any>(null);
  const [editorState, setEditorState] = useState<string>('');
  const [initialEditorState, setInitialEditorState] = useState<string | undefined>(undefined);
  const [editorKey, setEditorKey] = useState<number>(0); // Chave para forçar re-render do editor
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [hasEditorContent, setHasEditorContent] = useState(false); // Estado para controlar se há conteúdo no editor
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [pluginSelectValue, setPluginSelectValue] = useState<string>("");
  const { toast } = useToast();
  const { showConfirmation } = useConfirmationToast();
  const { hasUnsavedChanges, setHasUnsavedChanges, setSaveFunction } = useNavigationGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lexicalFileInputRef = useRef<HTMLInputElement>(null);

  // Dicionário de ícones disponíveis para plugins
  const availableIcons = {
    "Palette": Palette,
    "Settings": Settings,
    "Database": Database,
    "Brain": Brain,
    "BarChart": BarChart,
    "FileText": FileText,
    "Zap": Zap,
    "Wrench": Wrench,
    "Puzzle": Puzzle,
    "Code": Code,
    "Cpu": Cpu,
    "Globe": Globe,
    "Lock": Lock,
    "Mail": Mail,
    "Image": Image,
    "Video": Video,
    "Music": Music,
    "Calendar": Calendar,
    "Clock": Clock,
    "Users": Users,
    "Star": Star,
    "Heart": Heart,
    "Flag": Flag,
    "Target": Target,
    "Bookmark": Bookmark,
    "Search": Search,
    "Upload": Upload
  };

  // Função para renderizar ícone do plugin
  const getPluginIcon = (iconName: string | null) => {
    if (!iconName) return <Puzzle className="w-3 h-3" />;
    const IconComponent = availableIcons[iconName as keyof typeof availableIcons] || Puzzle;
    return <IconComponent className="w-3 h-3" />;
  };

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
          className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-[#374151]"
        />
      );
    }
    return (
      <div className="w-12 h-12 bg-gray-100 dark:bg-[#111827] rounded border border-gray-200 dark:border-[#374151] flex items-center justify-center">
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

  // Query para buscar document_editions em progresso - sempre ativa para detectar composer
  const { data: documentEditions = [], isLoading: isLoadingEditions } = useQuery({
    queryKey: ['/api/document-editions-in-progress'],
    enabled: true,
    onSuccess: (data) => {
      console.log('🔥 Query document-editions-in-progress carregada:', data?.length || 0, 'documentos');
    }
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

  // Query para buscar global assets
  const { data: globalAssets = [], isLoading: isLoadingGlobalAssets } = useQuery<GlobalAsset[]>({
    queryKey: ['/api/global-assets'],
    enabled: showAttachments,
  });

  // Query para buscar plugins ativos - sempre ativa para mostrar seletor quando editor está vazio
  const { data: activePlugins = [], isLoading: isLoadingPlugins } = useQuery<Plugin[]>({
    queryKey: ['/api/plugins', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/plugins');
      if (!response.ok) throw new Error('Erro ao buscar plugins');
      const plugins = await response.json();
      return plugins.filter((plugin: Plugin) => plugin.status === 'active');
    },
    enabled: true,
  });

  // Função para abrir plugin selecionado
  const handleOpenPlugin = (pluginId: string) => {
    const plugin = activePlugins.find(p => p.id === pluginId);
    if (plugin) {
      setSelectedPlugin(plugin);
      setIsPluginModalOpen(true);
      // Reset the select value to show placeholder again
      setPluginSelectValue("");
    }
  };

  // Função para fechar modal do plugin
  const handleClosePluginModal = () => {
    setIsPluginModalOpen(false);
    setSelectedPlugin(null);
  };

  // useEffect para abrir painel quando há documentos composer disponíveis (apenas na inicialização)
  const [hasInitializedPanel, setHasInitializedPanel] = useState(false);
  
  useEffect(() => {
    if (Array.isArray(documentEditions) && documentEditions.length > 0 && !hasInitializedPanel) {
      console.log('🔥 Detectados documentos composer, abrindo painel esquerdo na inicialização', documentEditions.length);
      setShowDocumentList(true);
      setHasInitializedPanel(true);
    }
  }, [documentEditions, hasInitializedPanel]);



  // Monitorar mudanças no conteúdo do editor para detectar alterações não salvas
  useEffect(() => {
    // Verificar se há conteúdo no editor que pode ser salvo
    const hasUnsaved = hasEditorContent && (selectedEdition || !currentDocumentId);
    setHasUnsavedChanges(hasUnsaved);
  }, [hasEditorContent, selectedEdition, currentDocumentId, setHasUnsavedChanges]);

  // Função para receber dados do plugin
  const handlePluginDataExchange = (data: any) => {
    console.log('Dados recebidos do plugin:', data);
    // Aqui você pode processar os dados do plugin se necessário
  };

  // Função para inserir imagem no editor
  const handleInsertImage = (artifact: DocumentArtifact) => {
    try {
      console.log('🚀 handleInsertImage chamado com artifact:', artifact);
      
      if (artifact.fileData && artifact.mimeType) {
        const imageUrl = `data:${artifact.mimeType};base64,${artifact.fileData}`;
        
        // Check if this is a Mermaid asset
        console.log('🔍 Verificando se é asset Mermaid. originAssetId:', artifact.originAssetId);
        
        if (artifact.originAssetId === "Mermaid") {
          // For Mermaid assets, create a table with image and code block
          const mermaidCode = (artifact as any).fileMetadata || '';
          
          console.log('✅ Asset Mermaid detectado!');
          console.log('📝 Código Mermaid recuperado:', mermaidCode);
          console.log('🖼️ URL da imagem:', imageUrl.substring(0, 100) + '...');
          
          const insertMermaidTableEvent = new CustomEvent('insertMermaidTable', {
            detail: {
              imageUrl,
              altText: artifact.name || 'Diagrama Mermaid',
              artifactId: artifact.id,
              mermaidCode
            }
          });
          
          console.log('📡 Disparando evento insertMermaidTable com detail:', insertMermaidTableEvent.detail);
          window.dispatchEvent(insertMermaidTableEvent);
          
          toast({
            title: "Diagrama Mermaid inserido",
            description: `O diagrama "${artifact.name}" foi inserido como tabela com código.`,
          });
        } else {
          console.log('📷 Asset regular detectado, usando inserção normal');
          
          // For regular images, use the existing logic
          const insertImageEvent = new CustomEvent('insertImage', {
            detail: {
              src: imageUrl,
              altText: artifact.name || 'Imagem',
              artifactId: artifact.id, // Passar o ID do artifact para gerar URL HTTPS
            }
          });
          
          // Disparar evento para o editor
          window.dispatchEvent(insertImageEvent);
          
          toast({
            title: "Imagem inserida",
            description: `A imagem "${artifact.name}" foi inserida no documento.`,
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro em handleInsertImage:', error);
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
    mutationFn: async (data: { title: string; content: string; plainText: string; editorState?: string; editionId?: string }) => {
      // Se há um document edition selecionado, salvar no lex_file, json_file e md_file
      if (data.editionId) {
        // Obter o estado JSON não serializado do editor
        let jsonData = null;
        let markdownContent = "";
        
        try {
          if (editorInstance) {
            const currentEditorState = editorInstance.getEditorState();
            // Converter para JSON não serializado
            jsonData = currentEditorState.toJSON();
            // Converter para markdown
            markdownContent = convertToMarkdown(currentEditorState);
          }
        } catch (error) {
          console.error('Erro ao obter dados do editor:', error);
        }
        
        return apiRequest("PUT", `/api/document-editions/${data.editionId}/content`, {
          lexFile: data.editorState || data.content,
          jsonFile: jsonData,
          mdFile: markdownContent
        });
      }
      // Caso contrário, salvar como documento lexical normal
      else if (currentDocumentId) {
        return apiRequest("PUT", `/api/lexical-documents/${currentDocumentId}`, data);
      } else {
        return apiRequest("POST", '/api/lexical-documents', data);
      }
    },
    onSuccess: (data: any, variables) => {
      if (variables.editionId) {
        // Atualizar o selectedEdition com o novo lex_file
        setSelectedEdition({ ...selectedEdition, lexFile: variables.editorState || variables.content });
        queryClient.invalidateQueries({ queryKey: ['/api/document-editions-in-progress'] });
        toast({
          title: "Documento salvo",
          description: `Conteúdo salvo no documento "${selectedEdition?.origem} - ${selectedEdition?.objeto}".`,
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

  // Mutation para upload de arquivo
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedEdition) {
        throw new Error("Nenhum documento selecionado");
      }

      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover o prefixo data:type;base64,
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Criar artifact com arquivo uploadado
      const artifactData = {
        documentoId: selectedEdition.documentId,
        name: file.name,
        fileName: file.name,
        fileData: base64,
        fileSize: file.size.toString(),
        mimeType: file.type,
        type: file.type,
        originAssetId: "Uploaded", // Marcar como arquivo uploadado
        isImage: file.type.startsWith('image/') ? 'true' : 'false'
      };

      return apiRequest("POST", `/api/documentos/${selectedEdition.documentId}/artifacts`, artifactData);
    },
    onSuccess: (data: any) => {
      // Invalidar cache dos artifacts para recarregar a lista
      queryClient.invalidateQueries({ 
        queryKey: ['/api/document-editions', selectedEdition?.id, 'artifacts'] 
      });
      
      toast({
        title: "Arquivo carregado",
        description: `"${data.name}" foi adicionado aos seus assets.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao carregar arquivo",
        description: error.message || "Ocorreu um erro ao fazer upload do arquivo.",
        variant: "destructive",
      });
    }
  });

  // Mutation para upload de global asset
  const uploadGlobalAssetMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('description', '');
      formData.append('tags', '');

      const response = await fetch('/api/global-assets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do asset global');
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-assets'] });
      toast({
        title: "Asset global carregado",
        description: `"${data.name}" foi adicionado aos assets globais.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao carregar asset global",
        description: error.message || "Ocorreu um erro ao fazer upload do asset global.",
        variant: "destructive",
      });
    }
  });

  // Função para abrir o seletor de arquivos
  const handleFileUpload = () => {
    if (!selectedEdition) {
      toast({
        title: "Nenhum documento selecionado",
        description: "Selecione um documento em edição para fazer upload de arquivos.",
        variant: "destructive",
      });
      return;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para processar arquivo selecionado
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (limite de 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      uploadFileMutation.mutate(file);
    }
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Função para abrir o seletor de arquivos globais
  const handleGlobalFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Verificar tamanho do arquivo (limite de 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: "O arquivo deve ter no máximo 10MB.",
            variant: "destructive",
          });
          return;
        }

        uploadGlobalAssetMutation.mutate(file);
      }
    };
    input.click();
  };

  // Função para inserir imagem global no editor
  const handleInsertGlobalImage = (asset: GlobalAsset) => {
    try {
      // Use the public URL instead of base64 data URL
      const imageUrl = `/api/public/images/${asset.id}`;
      
      // Criar evento customizado para inserir imagem
      const insertImageEvent = new CustomEvent('insertImage', {
        detail: {
          src: imageUrl,
          altText: asset.name || 'Imagem',
          artifactId: asset.id, // Usar o ID do global asset
        }
      });
      
      // Disparar evento para o editor
      window.dispatchEvent(insertImageEvent);
      
      toast({
        title: "Imagem inserida",
        description: `A imagem "${asset.name}" foi inserida no documento.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao inserir imagem",
        description: "Não foi possível inserir a imagem no documento.",
        variant: "destructive",
      });
    }
  };

  // Função para baixar arquivo global
  const handleDownloadGlobalFile = (asset: GlobalAsset) => {
    try {
      if (asset.fileData && asset.mimeType) {
        // Criar blob a partir do base64
        const byteCharacters = atob(asset.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: asset.mimeType });

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = asset.fileName || asset.name || 'arquivo';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Download iniciado",
          description: `Download de "${asset.name}" foi iniciado.`,
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

  // Mutation para excluir asset global
  const deleteGlobalAssetMutation = useMutation({
    mutationFn: (assetId: string) => apiRequest("DELETE", `/api/global-assets/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/global-assets'] });
      toast({
        title: "Asset excluído",
        description: "O asset global foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir asset",
        description: error.message || "Ocorreu um erro ao excluir o asset global.",
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir artifact do documento
  const deleteMyAssetMutation = useMutation({
    mutationFn: (artifactId: string) => apiRequest("DELETE", `/api/artifacts/${artifactId}`),
    onSuccess: () => {
      if (selectedEdition) {
        queryClient.invalidateQueries({ queryKey: ['/api/document-editions', selectedEdition.id, 'artifacts'] });
      }
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir arquivo",
        description: error.message || "Ocorreu um erro ao excluir o arquivo.",
        variant: "destructive",
      });
    }
  });

  // Função para excluir asset global
  const handleDeleteGlobalAsset = (assetId: string) => {
    deleteGlobalAssetMutation.mutate(assetId);
  };

  // Função para excluir my asset
  const handleDeleteMyAsset = (artifactId: string) => {
    deleteMyAssetMutation.mutate(artifactId);
  };

  const handleSave = (forceExit = false) => {
    // Se está forçando saída (navegando para outro menu) e não há conteúdo, apenas sair
    if (forceExit && !hasEditorContent) {
      return;
    }

    // 1. Documentos Composer selecionado: salvar com estado do editor
    if (selectedEdition) {
      const plainText = content.replace(/<[^>]*>/g, '').trim();
      
      // Capturar o estado atual do editor Lexical
      let editorStateToSave = editorState;
      
      // Se não há estado do editor mas há conteúdo, usar o conteúdo
      if (!editorStateToSave && content) {
        editorStateToSave = content;
      }
      
      // Fazer requisição para salvar no documento composer
      saveMutation.mutate({
        title,
        content,
        plainText,
        editorState: editorStateToSave, // Adicionar estado do editor
        editionId: selectedEdition.id // Adicionar ID da edition
      });
      return;
    }

    // 2. Templates Estruturais selecionado: mostrar toast (apenas se não for navegação forçada)
    if (selectedTemplate && !forceExit) {
      toast({
        title: "Funcionalidade a Implementar",
        description: "O salvamento de templates estruturais será implementado em breve.",
        variant: "default",
      });
      return;
    }

    // 3. Editor sem seleção: salvar localmente no formato .lexical (apenas se não for navegação forçada)
    if (!forceExit) {
      handleSaveLocal();
    }
  };

  const handleSaveLocal = () => {
    setShowSaveModal(true);
  };

  // Configurar função de salvamento para o sistema de proteção de navegação
  useEffect(() => {
    setSaveFunction(() => () => handleSave(true)); // forceExit = true para navegação
  }, [setSaveFunction, selectedEdition]);

  // Função para obter nome padrão do arquivo baseado no contexto
  const getDefaultFilename = () => {
    if (loadedFileName) {
      // Remove a extensão .lexical se existir
      return loadedFileName.replace(/\.lexical$/, '');
    }
    return title.replace(/[^a-z0-9\-_\s]/gi, '').trim() || "documento";
  };

  // Função para abrir arquivo .lexical local
  const handleOpenLexicalFile = () => {
    // Verificar se há conteúdo não salvo no editor
    if (hasEditorContent && !currentDocumentId) {
      showConfirmation({
        title: "Conteúdo não salvo",
        description: "Há conteúdo em edição que será perdido se não for salvo. Deseja continuar carregando o novo arquivo?",
        onConfirm: () => {
          lexicalFileInputRef.current?.click();
        },
        confirmText: "Continuar",
        cancelText: "Cancelar",
        variant: "destructive"
      });
    } else {
      lexicalFileInputRef.current?.click();
    }
  };

  // Função para processar arquivo .lexical selecionado
  const handleLexicalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é arquivo .lexical
    if (!file.name.endsWith('.lexical')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo com extensão .lexical",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const lexicalData = JSON.parse(fileContent);
        
        // Verificar se tem a estrutura esperada de um documento lexical
        if (lexicalData.title && lexicalData.editorState) {
          // Limpar seleções atuais
          setCurrentDocumentId(null);
          setSelectedTemplate(null);
          setSelectedEdition(null);
          
          // Definir arquivo carregado
          setLoadedFileName(file.name);
          
          // Carregar dados do arquivo
          setTitle(lexicalData.title);
          
          // Usar o editorState que contém o estado JSON serializado
          let editorStateToUse = lexicalData.editorState;
          
          // Se editorState é uma string, usar diretamente
          // Se é um objeto, serializar
          if (typeof editorStateToUse === 'object') {
            editorStateToUse = JSON.stringify(editorStateToUse);
          }
          
          // Verificar se é JSON válido
          try {
            JSON.parse(editorStateToUse);
            setContent(editorStateToUse);
            setInitialEditorState(editorStateToUse);
          } catch (e) {
            throw new Error("Estado do editor inválido no arquivo");
          }
          
          // Forçar re-render do editor
          setEditorKey(prev => prev + 1);
          
          toast({
            title: "Arquivo carregado",
            description: `O arquivo "${file.name}" foi carregado com sucesso.`,
          });
        } else {
          throw new Error("Estrutura de arquivo inválida - título ou estado do editor ausente");
        }
      } catch (error) {
        console.error('Erro ao processar arquivo .lexical:', error);
        toast({
          title: "Erro ao carregar arquivo",
          description: "O arquivo selecionado não é um documento Lexical válido.",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const extractImagesFromContent = () => {
    const images: any[] = [];
    
    // Primeiro, tentar extrair diretamente do editor ativo
    if (editorInstance) {
      try {
        editorInstance.read(() => {
          const root = $getRoot();
          
          // Função para percorrer recursivamente todos os nós
          const traverseNodes = (node: any) => {
            const nodeType = node.getType();
            console.log('🔎 Analisando nó do editor, tipo:', nodeType);
            
            if (nodeType === 'image' || nodeType === 'image-with-metadata' || nodeType === 'imageWithMetadata') {
              console.log('📸 Nó de imagem encontrado no editor:', node);
              const src = node.getSrc ? node.getSrc() : node.__src;
              const alt = node.getAltText ? node.getAltText() : (node.__altText || node.__alt || `Imagem ${images.length + 1}`);
              const artifactId = node.getArtifactId ? node.getArtifactId() : (node.__artifactId || node.__imageId);
              
              if (src) {
                const imageData = {
                  index: images.length,
                  src,
                  alt,
                  artifactId,
                  isBase64: src.startsWith('data:'),
                  isArtifact: !!artifactId
                };
                console.log('✅ Imagem adicionada do editor ativo:', imageData);
                images.push(imageData);
              }
            }
            
            // Percorrer filhos
            const children = node.getChildren ? node.getChildren() : [];
            children.forEach((child: any) => traverseNodes(child));
          };
          
          traverseNodes(root);
        });
        
        console.log('🎯 Total de imagens extraídas do editor ativo:', images.length, images);
        return images;
      } catch (error) {
        console.error('Erro ao extrair do editor ativo:', error);
      }
    }
    
    // Fallback: tentar extrair do estado JSON
    try {
      const stateToUse = editorState || content;
      if (!stateToUse) {
        console.log('Nenhum estado disponível para extração');
        return images;
      }
      
      const parsedState = typeof stateToUse === 'string' ? JSON.parse(stateToUse) : stateToUse;
      console.log('🔍 Estado do editor para extração de imagens:', parsedState);
      
      // Função recursiva para percorrer o estado do Lexical
      const extractImagesFromNode = (node: any, depth = 0) => {
        const indent = '  '.repeat(depth);
        console.log(`${indent}🔎 Analisando nó tipo: ${node.type}`);
        
        if (node.type === 'image' || node.type === 'image-with-metadata' || node.type === 'imageWithMetadata') {
          console.log(`${indent}📸 Imagem encontrada:`, node);
          const src = node.src;
          const alt = node.altText || node.alt || `Imagem ${images.length + 1}`;
          const artifactId = node.artifactId || node.imageId;
          
          if (src) {
            const imageData = {
              index: images.length,
              src,
              alt,
              artifactId,
              isBase64: src.startsWith('data:'),
              isArtifact: !!artifactId
            };
            console.log(`${indent}✅ Imagem adicionada:`, imageData);
            images.push(imageData);
          }
        }
        
        // Recursivamente verificar filhos
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => extractImagesFromNode(child, depth + 1));
        }
      };
      
      // Começar pela raiz
      if (parsedState && parsedState.root) {
        extractImagesFromNode(parsedState.root);
      }
      
      console.log('🎯 Total de imagens extraídas do estado JSON:', images.length, images);
    } catch (error) {
      console.error('Erro ao extrair imagens do estado do Lexical:', error);
      
      // Último fallback: tentar extrair do HTML
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content || '';
        const imgElements = tempDiv.querySelectorAll('img');
        
        imgElements.forEach((img, index) => {
          const src = img.getAttribute('src');
          const alt = img.getAttribute('alt') || `Imagem ${index + 1}`;
          const artifactId = img.getAttribute('data-artifact-id');
          
          if (src) {
            images.push({
              index,
              src,
              alt,
              artifactId,
              isBase64: src.startsWith('data:'),
              isArtifact: !!artifactId
            });
          }
        });
        
        console.log('🎯 Total de imagens extraídas do HTML fallback:', images.length, images);
      } catch (htmlError) {
        console.error('Erro no fallback HTML:', htmlError);
      }
    }
    
    return images;
  };

  // Use the same function that works in the preview mode
  const convertToMarkdown = (editorState: any): string => {
    const converter = createMarkdownConverter();
    
    return editorState.read(() => {
      const root = $getRoot();
      return converter.convert(root);
    });
  };

  const convertLexicalToMarkdown = (): string => {
    try {
      if (editorInstance) {
        const editorState = editorInstance.getEditorState();
        const markdown = convertToMarkdown(editorState);
        return markdown;
      }

      return "Editor não disponível para conversão.";
    } catch (error) {
      console.error('Erro ao converter para Markdown:', error);
      return "Erro ao converter o conteúdo para Markdown.";
    }
  };

  // Function to capture markdown content from editor for MDX preview
  const captureMarkdownContent = () => {
    try {
      if (editorInstance) {
        const editorState = editorInstance.getEditorState();
        const markdown = convertToMarkdown(editorState);
        setMarkdownContent(markdown);
        return markdown;
      }
      return "";
    } catch (error) {
      console.error('Erro ao capturar markdown para preview:', error);
      return "";
    }
  };

  const handleSaveFile = (filename: string, format: string, includeImages?: boolean) => {
    const cleanFilename = filename.replace(/[^a-z0-9\-_\s]/gi, '').trim();
    
    // Se havia um arquivo carregado e o nome foi alterado, atualizar a badge
    if (loadedFileName && cleanFilename !== loadedFileName.replace(/\.lexical$/, '')) {
      setLoadedFileName(`${cleanFilename}.lexical`);
    }

    switch (format) {
      case "lexical":
        saveLexicalFile(cleanFilename, includeImages || false);
        break;
      case "markdown":
        saveMarkdownFile(cleanFilename);
        break;
      case "both":
        saveLexicalFile(cleanFilename, includeImages || false);
        setTimeout(() => {
          saveMarkdownFile(cleanFilename);
        }, 500);
        break;
    }
  };

  const saveLexicalFile = async (filename: string, includeImages: boolean) => {
    let documentData: any = {
      title,
      content,
      editorState: editorState || content,
      timestamp: new Date().toISOString(),
      includeImages
    };

    if (includeImages) {
      const images = extractImagesFromContent();
      
      if (images.length > 0) {
        // Mostrar progresso para conversão de imagens
        toast({
          title: "Processando imagens",
          description: `Convertendo ${images.length} imagem(ns) para base64...`,
        });
      }
      
      // Processar imagens para incluir base64
      const processedImages = await Promise.all(images.map(async (img, index) => {
        if (img.isBase64) {
          return img;
        } else if (img.isArtifact) {
          try {
            console.log(`🔄 Baixando imagem ${index + 1}/${images.length}:`, img.src);
            // Tentar baixar a imagem do banco e converter para base64
            const response = await fetch(img.src);
            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              
              console.log(`✅ Imagem ${index + 1} convertida para base64`);
              return {
                ...img,
                src: base64,
                originalSrc: img.src,
                isBase64: true,
                note: "Convertido para base64 a partir do banco de dados"
              };
            } else {
              console.log(`❌ Erro ao baixar imagem ${index + 1}: ${response.status}`);
              return {
                ...img,
                note: "Erro ao baixar imagem do banco de dados - mantida referência original"
              };
            }
          } catch (error) {
            console.error(`❌ Erro ao converter imagem ${index + 1} para base64:`, error);
            return {
              ...img,
              note: "Erro ao baixar imagem do banco de dados - mantida referência original"
            };
          }
        }
        return img;
      }));
      
      documentData.images = processedImages;
    } else {
      const images = extractImagesFromContent();
      documentData.imageReferences = images.map(img => ({
        index: img.index,
        alt: img.alt,
        artifactId: img.artifactId,
        originalSrc: img.src,
        type: img.isArtifact ? "database_reference" : "external_url"
      }));
    }

    const jsonData = JSON.stringify(documentData, null, 2);
    const fileName = `${filename}.lexical`;

    // Download padrão
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Contar imagens convertidas com sucesso
    const convertedImages = includeImages ? documentData.images.filter((img: any) => img.isBase64).length : 0;
    const totalImages = includeImages ? documentData.images.length : (documentData.imageReferences ? documentData.imageReferences.length : 0);
    
    let description = `O arquivo "${fileName}" foi salvo`;
    if (includeImages && totalImages > 0) {
      description += ` com ${convertedImages}/${totalImages} imagem(ns) convertida(s) para base64`;
    } else if (!includeImages && totalImages > 0) {
      description += ` com ${totalImages} referência(s) de imagem`;
    }
    description += '.';
    
    toast({
      title: "Documento salvo em Lexical",
      description,
    });
  };

  const saveMarkdownFile = async (filename: string) => {
    const markdownContent = convertLexicalToMarkdown();
    const fileName = `${filename}.md`;

    // Download padrão
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Documento salvo em Markdown",
      description: `O arquivo "${fileName}" foi salvo (imagens como referências).`,
    });
  };



  const handleNewDocument = () => {
    setCurrentDocumentId(null);
    setTitle("Novo Documento");
    setContent("");
  };

  const handleLoadDocument = (document: LexicalDocument) => {
    // Verificar se há conteúdo não salvo no editor
    if (hasEditorContent && !currentDocumentId) {
      showConfirmation({
        title: "Conteúdo não salvo",
        description: "Há conteúdo em edição que será perdido se não for salvo. Deseja continuar carregando o documento?",
        onConfirm: () => {
          setCurrentDocumentId(document.id);
          setTitle(document.title);
          setContent(document.content);
          setSelectedTemplate(null); // Limpar template ao carregar documento
          setLoadedFileName(null); // Limpar arquivo carregado
          setSelectedEdition(null); // Limpar edition selecionada

        },
        confirmText: "Continuar",
        cancelText: "Cancelar",
        variant: "destructive"
      });
    } else {
      setCurrentDocumentId(document.id);
      setTitle(document.title);
      setContent(document.content);
      setSelectedTemplate(null); // Limpar template ao carregar documento
      setLoadedFileName(null); // Limpar arquivo carregado
      setSelectedEdition(null); // Limpar edition selecionada

    }
  };

  const handleSelectEdition = (edition: any) => {
    // Verificar se há conteúdo não salvo no editor
    if (hasEditorContent && !currentDocumentId) {
      showConfirmation({
        title: "Conteúdo não salvo",
        description: "Há conteúdo em edição que será perdido se não for salvo. Deseja continuar carregando este documento composer?",
        onConfirm: () => {
          executeSelectEdition(edition);
        },
        confirmText: "Continuar",
        cancelText: "Cancelar",
        variant: "destructive"
      });
    } else {
      executeSelectEdition(edition);
    }
  };

  const executeSelectEdition = (edition: any) => {
    console.log('Selecionando edition:', edition);
    setSelectedEdition(edition);
    setCurrentDocumentId(null);
    setLoadedFileName(null);
    
    // Se lex_file estiver vazio ou null, carregar o template
    if (!edition.lexFile || edition.lexFile.trim() === '') {
      console.log('Carregando template, lex_file está vazio');
      console.log('Template structure:', edition.templateStructure);
      
      // Criar objeto template para aplicar as seções
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
      
      // Limpar estado inicial do editor para usar template
      setInitialEditorState(undefined);
      
      // Limpar conteúdo para que o template seja aplicado
      setContent('');
      setTitle(`${edition.templateCode} - ${edition.origem} - ${edition.objeto}`);
      
      // Forçar re-render do editor para aplicar as seções do template
      setEditorKey(prev => prev + 1);
    } else {
      console.log('Carregando lex_file existente, não aplicar template');
      
      // Limpar template para não aplicar seções
      setSelectedTemplate(null);
      
      // Carregar estado serializado do Lexical
      setInitialEditorState(edition.lexFile);
      setContent(''); // Limpar conteúdo pois usaremos o estado serializado
      setTitle(`${edition.templateCode} - ${edition.origem} - ${edition.objeto}`);
      
      // Forçar re-render do editor
      setEditorKey(prev => prev + 1);
    }
    
    // Abrir painel esquerdo automaticamente ao carregar composer
    setShowDocumentList(true);
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
    showConfirmation({
      title: "Excluir Documento",
      description: "Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        if (currentDocumentId === id) {
          handleNewDocument();
        }
      },
      confirmText: "Excluir",
      cancelText: "Cancelar",
      variant: "destructive"
    });
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

  // Função para descartar e limpar o editor
  const handleDiscard = () => {
    showConfirmation({
      title: "Descartar Alterações",
      description: "Tem certeza que deseja descartar todas as alterações? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        // Limpar todo o estado do editor
        setContent('');
        setTitle('Documento sem título');
        setEditorState('');
        setInitialEditorState(undefined);
        
        // Desassociar template e documento
        setSelectedTemplate(null);
        setSelectedEdition(null);
        setCurrentDocumentId(null);
        setLoadedFileName(null);
        
        // Forçar re-render do editor
        setEditorKey(prev => prev + 1);
        
        toast({
          title: "Editor limpo",
          description: "O editor foi limpo e está pronto para uma nova edição.",
        });
      },
      confirmText: "Descartar",
      cancelText: "Cancelar",
      variant: "destructive"
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header com navegação */}
      <div className="flex-shrink-0 p-6 pb-4 bg-gray-50 dark:bg-[#1F2937] border-b border-gray-200 dark:border-[#374151]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#6B7280] flex items-center gap-3">
                <Edit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Composer Editor
              </h1>
              <p className="text-muted-foreground dark:text-[#9CA3AF]">Edição avançada e integrada de documentação técnica de processos</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2 mt-1" style={{ width: 'calc(100vw - 320px - 48px)', justifyContent: 'flex-end' }}>
            <div className="flex flex-col space-y-1">
              {selectedEdition && (
                <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                  {selectedEdition.origem} - {selectedEdition.objeto}
                </Badge>
              )}
              {(selectedTemplate || selectedEdition) && (
                <Badge variant="secondary" className="text-xs">
                  Template: {selectedTemplate?.code || selectedEdition?.templateCode}
                </Badge>
              )}
              {loadedFileName && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Arquivo carregado: {loadedFileName}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col items-center space-y-1 border border-gray-300 rounded-lg p-3">
              <span className="text-xs text-gray-500 font-medium">Visualização</span>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => setViewMode('editor')}
                  variant={viewMode === 'editor' ? "default" : "outline"}
                  size="sm"
                  className={viewMode === 'editor' ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  title="Modo Editor"
                  disabled={!hasEditorContent}
                >
                  <Edit className={`w-4 h-4 ${viewMode === 'editor' ? "text-white" : ""}`} />
                </Button>
                <Button
                  onClick={() => {
                    setViewMode('preview');
                  }}
                  variant={viewMode === 'preview' ? "default" : "outline"}
                  size="sm"
                  className={viewMode === 'preview' ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  title="Visualizar Markdown Raw"
                  disabled={!hasEditorContent}
                >
                  <FileCode2 className={`w-4 h-4 ${viewMode === 'preview' ? "text-white" : ""}`} />
                </Button>
                <Button
                  onClick={() => {
                    captureMarkdownContent();
                    setViewMode('mdx');
                  }}
                  variant={viewMode === 'mdx' ? "default" : "outline"}
                  size="sm"
                  className={viewMode === 'mdx' ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  title="Preview MDX"
                  disabled={!hasEditorContent}
                >
                  <Eye className={`w-4 h-4 ${viewMode === 'mdx' ? "text-white" : ""}`} />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-1 border border-gray-300 rounded-lg p-3">
              <span className="text-xs text-gray-500 font-medium">Side Panels</span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowDocumentList(!showDocumentList)}
                  variant={showDocumentList ? "default" : "outline"}
                  size="sm"
                  className={showDocumentList ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  title="Biblioteca"
                  disabled={viewMode === 'preview'}
                >
                  <FolderOpen className={`w-4 h-4 ${showDocumentList ? "text-white" : ""}`} />
                </Button>
                <Button
                  onClick={() => setShowAttachments(!showAttachments)}
                  variant={showAttachments ? "default" : "outline"}
                  size="sm"
                  className={showAttachments ? "bg-green-600 text-white hover:bg-green-700" : ""}
                  title="Anexos"
                  disabled={viewMode === 'preview' || (selectedTemplate && selectedTemplate.type === 'struct' && !currentDocumentId)}
                >
                  <Paperclip className={`w-4 h-4 ${showAttachments ? "text-white" : ""}`} />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-1 border border-gray-300 rounded-lg p-3 pl-[12px] pr-[12px]">
              <span className="text-xs text-gray-500 font-medium">Ações</span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleOpenLexicalFile}
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  title="Abrir arquivo .lexical local"
                  disabled={viewMode === 'preview'}
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleDiscard}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  disabled={!hasEditorContent || viewMode === 'preview'}
                  title="Descartar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleSave()}
                  disabled={saveMutation.isPending || !hasEditorContent || viewMode === 'preview'}
                  size="sm"
                  title={saveMutation.isPending ? "Salvando..." : "Salvar"}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {}} // Placeholder for future functionality
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  disabled={!selectedEdition || viewMode === 'preview'}
                  title="Publicar"
                >
                  <Split className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Área do editor - ocupa todo o espaço restante */}
      <div className="flex-1 px-6 py-0 min-h-0 composer-layout-container">
        <div className="flex h-full">
          {/* Sidebar de documentos (condicional) */}
        {showDocumentList && (
          <div className="w-80 border-r bg-white dark:bg-[#0F172A] border-gray-200 dark:border-[#374151] flex flex-col composer-side-panel composer-library-panel rounded-tl-xl overflow-hidden">
            {/* Header fixo */}
            <div className="p-4 border-b bg-white dark:bg-[#111827] border-gray-200 dark:border-[#374151] rounded-tl-xl">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E5E7EB]">Biblioteca</h3>
              </div>
            </div>
            
            {/* Área com scroll */}
            <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden rounded-bl-xl">
              <Accordion type="multiple" defaultValue={[]} className="w-full overflow-hidden">
                {/* Grupo 1: Templates Estruturais */}
                <AccordionItem value="templates">
                  <AccordionTrigger className="text-md font-medium text-gray-700 dark:text-[#9CA3AF] hover:no-underline">
                    Templates Estruturais
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="space-y-2 pt-2 overflow-x-hidden">
                      {isLoadingTemplates ? (
                        <div className="text-center py-2 text-sm">Carregando templates...</div>
                      ) : (
                        <>
                          {!structTemplates || (Array.isArray(structTemplates) && structTemplates.length === 0) ? (
                            <div className="text-center py-4 text-gray-500 dark:text-[#6B7280]">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Nenhum template encontrado</p>
                            </div>
                          ) : (
                            Array.isArray(structTemplates) && structTemplates.map((template: Template) => (
                              <div
                                key={template.id}
                                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E293B] border-green-200 dark:border-[#374151] hover:border-green-300 dark:hover:border-[#4B5563] bg-white dark:bg-[#111827] overflow-hidden"
                                onClick={() => {
                                  // Verificar se há conteúdo não salvo no editor
                                  if (hasEditorContent && !currentDocumentId) {
                                    showConfirmation({
                                      title: "Conteúdo não salvo",
                                      description: "Há conteúdo em edição que será perdido se não for salvo. Deseja continuar carregando este template?",
                                      onConfirm: () => {
                                        setTitle(template.name);
                                        setContent(''); // Limpar conteúdo para o plugin processar
                                        setCurrentDocumentId(null);
                                        setSelectedTemplate(template);
                                        setLoadedFileName(null); // Limpar arquivo carregado
                                        setSelectedEdition(null); // Limpar edition selecionada
                                      },
                                      confirmText: "Continuar",
                                      cancelText: "Cancelar",
                                      variant: "destructive"
                                    });
                                  } else {
                                    setTitle(template.name);
                                    setContent(''); // Limpar conteúdo para o plugin processar
                                    setCurrentDocumentId(null);
                                    setSelectedTemplate(template);
                                    setLoadedFileName(null); // Limpar arquivo carregado
                                    setSelectedEdition(null); // Limpar edition selecionada
                                  }
                                }}
                              >
                                <div className="flex-1 overflow-hidden">
                                  <h5 className="font-medium text-sm text-green-700 dark:text-green-400 truncate">{template.code} - {template.name}</h5>
                                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-1 line-clamp-2">
                                    {template.description}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-2">
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
                  <AccordionTrigger className="text-md font-medium text-gray-700 dark:text-[#9CA3AF] hover:no-underline">
                    Documentos Composer
                  </AccordionTrigger>
                  <AccordionContent className="overflow-hidden">
                    <div className="space-y-2 pt-2 overflow-x-hidden">
                      {isLoadingEditions ? (
                        <div className="text-center py-2 text-sm">Carregando documentos em progresso...</div>
                      ) : (
                        <>
                          {!documentEditions || (Array.isArray(documentEditions) && documentEditions.length === 0) ? (
                            <div className="text-center py-4 text-gray-500 dark:text-[#6B7280]">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Nenhum documento em progresso encontrado</p>
                            </div>
                          ) : (
                            Array.isArray(documentEditions) && documentEditions.map((edition: any) => (
                              <div
                                key={edition.id}
                                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E293B] dark:bg-[#111827] dark:border-[#374151] relative overflow-hidden ${
                                  selectedEdition?.id === edition.id ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : ''
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
                                  <div className="flex-1 pr-8 overflow-hidden">
                                    <h5 className="font-medium text-sm text-blue-600 dark:text-blue-400 truncate">
                                      {edition.templateCode}
                                    </h5>
                                    <div className="mt-1 space-y-1">
                                      <p className="text-xs text-gray-600 dark:text-[#9CA3AF] truncate">
                                        <span className="font-medium">Origem:</span> {edition.origem || 'N/A'}
                                      </p>
                                      <p className="text-xs text-gray-600 dark:text-[#9CA3AF] truncate">
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
        <div className={`flex-1 flex flex-col composer-editor-container ${!showDocumentList ? 'editor-left-rounded' : ''} ${!showAttachments || (selectedTemplate && selectedTemplate.type === 'struct' && !currentDocumentId) ? 'editor-right-rounded' : ''}`}>
          {/* Barra de ferramentas do editor integrada */}
          <div className="flex-1 pl-0 pr-0 pt-0 pb-0 min-h-0 overflow-hidden">
            <Card className="h-full composer-editor-card flex flex-col">
              <CardContent className="p-0 flex-1 relative overflow-hidden min-h-0">
                {/* Placeholder quando não há conteúdo nem template selecionado */}
                {!hasEditorContent && (!content || content.trim() === '') && !selectedTemplate && !currentDocumentId && viewMode === 'editor' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <PenTool className="w-[100px] h-[100px] mb-4 opacity-20" />
                    <p className="text-lg font-medium text-center mb-6 pointer-events-none dark:text-[#111214]">Selecione um documento ou template para iniciar...</p>
                    

                  </div>
                )}
                <LexicalEditor
                  key={editorKey}
                  content={content}
                  onChange={setContent}
                  onEditorStateChange={setEditorState}
                  onContentStatusChange={setHasEditorContent}
                  onEditorInstanceChange={setEditorInstance}
                  className="h-full"
                  templateSections={selectedTemplate ? extractTemplateSections(selectedTemplate) : undefined}
                  viewMode={viewMode}
                  initialEditorState={initialEditorState}
                  markdownContent={markdownContent}
                  mdFileOld={selectedEdition?.mdFileOld || ''}
                  // Debug do selectedEdition
                  {...(console.log('🔥 LEXICAL PAGE selectedEdition:', selectedEdition) || {})}
                  isEnabled={!!(currentDocumentId || selectedTemplate || selectedEdition || loadedFileName)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Painel de Anexos - desabilitado apenas quando há template struct sem documento composer */}
        {showAttachments && !(selectedTemplate && selectedTemplate.type === 'struct' && !currentDocumentId) && (
          <div className="w-80 border-l bg-gray-50 dark:bg-[#0F172A] border-gray-200 dark:border-[#374151] flex flex-col composer-side-panel composer-attachments-panel rounded-tr-xl rounded-br-xl">
            {/* Header fixo */}
            <div className="p-4 border-b bg-gray-50 dark:bg-[#111827] border-gray-200 dark:border-[#374151] rounded-tr-xl">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  <h3 className="font-semibold text-gray-900 dark:text-[#E5E7EB]">Anexos</h3>
                </div>
                {/* Combo de Plugins - desabilitado apenas quando há template struct sem documento composer */}
                {activePlugins.length > 0 && !(selectedTemplate && selectedTemplate.type === 'struct' && !currentDocumentId) && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Select value={pluginSelectValue} onValueChange={handleOpenPlugin}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Plugins" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePlugins.map((plugin) => (
                          <SelectItem key={plugin.id} value={plugin.id}>
                            <div className="flex items-center gap-2">
                              {getPluginIcon(plugin.icon)}
                              <span className="text-xs">{plugin.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Área de conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-4 rounded-br-xl">
              <Accordion type="multiple" className="w-full space-y-2">
                {/* Global Assets */}
                <AccordionItem value="global-assets" className="border rounded-lg bg-white dark:bg-[#0F172A] border-gray-200 dark:border-[#374151]">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline dark:text-[#E5E7EB]">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">Global</span>
                      </div>
                      <Badge variant="secondary" className="dark:bg-[#374151] dark:text-[#9CA3AF] dark:border-[#374151]">
                        {globalAssets.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white dark:bg-[#1E40AF] dark:hover:bg-[#1E3A8A]"
                        size="sm"
                        onClick={handleGlobalFileUpload}
                        disabled={uploadGlobalAssetMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {uploadGlobalAssetMutation.isPending ? "Carregando..." : "Adicionar Asset Global"}
                      </Button>
                      {isLoadingGlobalAssets ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">Carregando...</p>
                        </div>
                      ) : globalAssets.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400">
                            Nenhum asset global encontrado
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {globalAssets.map((asset: GlobalAsset) => (
                            <div 
                              key={asset.id}
                              className="p-3 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-[#374151]"
                            >
                              {/* Botões de ação no topo */}
                              <div className="flex justify-between mb-3">
                                {asset.isImage === 'true' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-7"
                                    onClick={() => handleInsertGlobalImage(asset)}
                                    title="Inserir imagem no documento"
                                  >
                                    <CircleChevronLeft className="w-3 h-3 mr-1" />
                                    Inserir
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1 h-7"
                                    onClick={() => handleDownloadGlobalFile(asset)}
                                    title="Baixar arquivo"
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Baixar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1 h-7 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleDeleteGlobalAsset(asset.id)}
                                  title="Excluir asset global"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Excluir
                                </Button>
                              </div>
                              
                              {/* Conteúdo do card */}
                              <div className="flex items-center gap-3">
                                {/* Miniatura ou ícone */}
                                {asset.isImage === "true" && asset.fileData ? (
                                  <img 
                                    src={`data:${asset.mimeType};base64,${asset.fileData}`} 
                                    alt={asset.name}
                                    className="w-12 h-12 object-cover rounded border dark:border-[#374151]"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 dark:bg-[#111827] rounded border border-gray-200 dark:border-[#374151] flex items-center justify-center">
                                    {getFileIcon(asset.mimeType, asset.isImage)}
                                  </div>
                                )}
                                
                                {/* Informações do arquivo */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-gray-900 dark:text-[#E5E7EB]" title={asset.description || asset.name}>
                                    {asset.description || asset.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                      {asset.editor || asset.type || 'Global'}
                                    </Badge>
                                    {asset.fileSize && (
                                      <span className="text-xs text-gray-500">
                                        {Math.round(parseInt(asset.fileSize) / 1024)} KB
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* My Assets */}
                {selectedEdition && (
                  <AccordionItem value="my-assets" className="border rounded-lg bg-white dark:bg-[#0F172A] border-gray-200 dark:border-[#374151]">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline dark:text-[#E5E7EB]">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <FileOutput className="w-4 h-4" />
                          <span className="font-medium">My Assets</span>
                        </div>
                        <Badge variant="secondary" className="dark:bg-[#374151] dark:text-[#9CA3AF] dark:border-[#374151]">
                          {documentArtifacts.filter(artifact => 
                            artifact.originAssetId === "Uploaded" || 
                            artifact.originAssetId === "Mermaid" ||
                            artifact.originAssetId === "Graph_TLD" ||
                            !artifact.mondayColumn || 
                            artifact.mondayColumn.trim() === ""
                          ).length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white dark:bg-[#1E40AF] dark:hover:bg-[#1E3A8A]"
                          size="sm"
                          onClick={handleFileUpload}
                          disabled={uploadFileMutation.isPending || !selectedEdition}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {uploadFileMutation.isPending ? "Carregando..." : "Adicionar Arquivo"}
                        </Button>
                        {isLoadingArtifacts ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">Carregando...</p>
                          </div>
                        ) : documentArtifacts.filter(artifact => 
                            artifact.originAssetId === "Uploaded" || 
                            artifact.originAssetId === "Mermaid" ||
                            !artifact.mondayColumn || 
                            artifact.mondayColumn.trim() === ""
                          ).length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">
                              Nenhum arquivo carregado
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {documentArtifacts
                              .filter(artifact => 
                                artifact.originAssetId === "Uploaded" || 
                                artifact.originAssetId === "Mermaid" ||
                                artifact.originAssetId === "Graph_TLD" ||
                                !artifact.mondayColumn || 
                                artifact.mondayColumn.trim() === ""
                              )
                              .map((artifact: DocumentArtifact) => (
                                <div 
                                  key={artifact.id}
                                  className="p-3 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-[#374151]"
                                >
                                  {/* Botões de ação no topo */}
                                  <div className="flex justify-between mb-3">
                                    {artifact.isImage === 'true' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs px-2 py-1 h-7"
                                        onClick={() => handleInsertImage(artifact)}
                                        title="Inserir imagem no documento"
                                      >
                                        <CircleChevronLeft className="w-3 h-3 mr-1" />
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
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-7 text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleDeleteMyAsset(artifact.id)}
                                      title="Excluir arquivo"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Excluir
                                    </Button>
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
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                          {artifact.originAssetId === "Uploaded" ? "Uploaded" : 
                                           artifact.originAssetId === "Mermaid" ? "Mermaid" : 
                                           artifact.originAssetId === "Graph_TLD" ? "Graph_TLD" :
                                           "My Asset"}
                                        </Badge>
                                        {artifact.fileSize && (
                                          <span className="text-xs text-gray-500">
                                            {Math.round(parseInt(artifact.fileSize) / 1024)} KB
                                          </span>
                                        )}
                                      </div>
                                      {artifact.description && (
                                        <p className="text-xs text-gray-600 mt-1 truncate">
                                          {artifact.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Origin Assets */}
                {documentArtifacts.filter(artifact => 
                  artifact.originAssetId && 
                  artifact.originAssetId.trim() !== "" && 
                  artifact.originAssetId !== "Uploaded" && 
                  artifact.originAssetId !== "Mermaid"
                ).length > 0 && (
                  <AccordionItem value="origin-assets" className="border rounded-lg bg-white dark:bg-[#0F172A] border-gray-200 dark:border-[#374151]">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline dark:text-[#E5E7EB]">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <FileInput className="w-4 h-4" />
                          <span className="font-medium">Origin Assets</span>
                        </div>
                        <Badge variant="secondary" className="dark:bg-[#374151] dark:text-[#9CA3AF] dark:border-[#374151]">
                          {documentArtifacts.filter(artifact => 
                            artifact.originAssetId && 
                            artifact.originAssetId.trim() !== "" && 
                            artifact.originAssetId !== "Uploaded" && 
                            artifact.originAssetId !== "Mermaid"
                          ).length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {isLoadingArtifacts ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">Carregando...</p>
                          </div>
                        ) : documentArtifacts.filter(artifact => 
                          artifact.originAssetId && 
                          artifact.originAssetId.trim() !== "" && 
                          artifact.originAssetId !== "Uploaded" && 
                          artifact.originAssetId !== "Mermaid"
                        ).length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">
                              Nenhum arquivo vinculado
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {documentArtifacts
                              .filter(artifact => 
                                artifact.originAssetId && 
                                artifact.originAssetId.trim() !== "" && 
                                artifact.originAssetId !== "Uploaded" && 
                                artifact.originAssetId !== "Mermaid"
                              )
                              .map((artifact: DocumentArtifact) => {
                              // Log para debug dos campos
                              console.log('Artifact data completo:', artifact);
                              
                              return (
                                <div 
                                  key={artifact.id}
                                  className="p-3 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-[#374151]"
                                >
                                {/* Botões de ação no topo */}
                                <div className="flex justify-between mb-3">
                                  <div className="flex gap-2">
                                    {artifact.isImage === 'true' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs px-2 py-1 h-7"
                                        onClick={() => handleInsertImage(artifact)}
                                        title="Inserir imagem no documento"
                                      >
                                        <CircleChevronLeft className="w-3 h-3 mr-1" />
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
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
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
                )}
              </Accordion>
            </div>
          </div>
        )}
        </div>
      </div>
      {/* Hidden file input for upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="*/*"
      />
      
      {/* Hidden file input for .lexical files */}
      <input
        type="file"
        ref={lexicalFileInputRef}
        onChange={handleLexicalFileChange}
        style={{ display: 'none' }}
        accept=".lexical"
      />
      
      {/* Save File Modal */}
      <SaveFileModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveFile}
        defaultFilename={getDefaultFilename()}
      />

      {/* Plugin Modal */}
      {selectedPlugin && (
        <PluginModal
          isOpen={isPluginModalOpen}
          onClose={handleClosePluginModal}
          pluginName={selectedPlugin.name}
          plugin={selectedPlugin}
          onDataExchange={handlePluginDataExchange}
          selectedEdition={selectedEdition}
          globalAssets={globalAssets}
          documentArtifacts={documentArtifacts}
        />
      )}
    </div>
  );
};