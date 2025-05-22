import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bold, Italic, Save, Palette, LayoutTemplate, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PluginModal from "@/components/plugin-modal";
import { Plugin, PluginType, PluginStatus, Template } from "@shared/schema";

interface TemplateSection {
  name: string;
  content: string;
  isOpen: boolean;
}

export default function BasicTextEditor() {
  const [content, setContent] = useState("");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);

  // Buscar templates estruturais
  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates/struct"],
  });

  // Buscar plugins disponíveis
  const { data: plugins } = useQuery<Plugin[]>({
    queryKey: ["/api/plugins"],
  });

  const openFreeHandCanvas = () => {
    // Procurar pelo plugin FreeHand Canvas nos plugins disponíveis
    const freeHandPlugin = plugins?.find(p => 
      p.pageName === "freehand-canvas-plugin" || 
      p.name.toLowerCase().includes("freehand") ||
      p.name.toLowerCase().includes("canvas")
    );
    
    if (freeHandPlugin) {
      setSelectedPlugin(freeHandPlugin);
      setIsPluginModalOpen(true);
    } else {
      // Aviso se o plugin não for encontrado
      console.warn("Plugin FreeHand Canvas não encontrado nos plugins disponíveis");
    }
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

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      // Verificar se há estrutura válida
      if (template.structure && typeof template.structure === 'string' && template.structure.trim() !== '') {
        try {
          const sections = JSON.parse(template.structure);
          if (Array.isArray(sections) && sections.length > 0) {
            // Criar seções colapsíveis baseadas no template
            const newSections: TemplateSection[] = sections.map((sectionName: string) => ({
              name: sectionName,
              content: '',
              isOpen: true // Começar todas abertas
            }));
            
            setTemplateSections(newSections);
            setContent(''); // Limpar o editor principal
            return;
          }
        } catch (error) {
          console.error('Erro ao processar estrutura do template:', error);
        }
      }
      
      // Se não há estrutura válida, criar seções padrão
      const defaultSections: TemplateSection[] = [
        { name: "Introdução", content: '', isOpen: true },
        { name: "Desenvolvimento", content: '', isOpen: true },
        { name: "Conclusão", content: '', isOpen: true }
      ];
      
      setTemplateSections(defaultSections);
      setContent('');
    }
  };

  const updateSectionContent = (index: number, newContent: string) => {
    setTemplateSections(prev => 
      prev.map((section, i) => 
        i === index ? { ...section, content: newContent } : section
      )
    );
  };

  const toggleSection = (index: number) => {
    setTemplateSections(prev => 
      prev.map((section, i) => 
        i === index ? { ...section, isOpen: !section.isOpen } : section
      )
    );
  };

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-gray-50 shrink-0">
        {/* Lado esquerdo - Ferramentas de formatação */}
        <div className="flex items-center gap-2">
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

        {/* Lado direito - Seletor de templates */}
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-gray-500" />
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar template..." />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4 overflow-auto">
        {templateSections.length > 0 ? (
          /* Layout com seções do template */
          <div className="space-y-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {templates?.find(t => t.id === selectedTemplate)?.code}
              </h1>
              <p className="text-gray-600">
                {templates?.find(t => t.id === selectedTemplate)?.description}
              </p>
            </div>
            
            {templateSections.map((section, index) => (
              <Collapsible
                key={index}
                open={section.isOpen}
                onOpenChange={() => toggleSection(index)}
                className="border border-gray-200 rounded-lg"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors">
                  <h3 className="text-lg font-medium text-gray-900">
                    {section.name}
                  </h3>
                  {section.isOpen ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border-t border-gray-200">
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSectionContent(index, e.target.value)}
                    className="w-full h-32 min-h-[8rem] resize-y border border-gray-300 rounded-md p-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Escreva o conteúdo para ${section.name}...`}
                  />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          /* Editor simples quando não há template selecionado */
          <textarea
            id="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comece a escrever seu documento ou selecione um template..."
            className="w-full h-full resize-none border-none outline-none text-gray-900 placeholder-gray-400"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          />
        )}
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