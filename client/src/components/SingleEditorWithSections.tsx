import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import TextEditor from "@/components/TextEditor";

interface Section {
  id: string;
  title: string;
  content: string;
  isOpen: boolean;
}

interface SingleEditorWithSectionsProps {
  template?: {
    structure: {
      sections?: Array<{
        id: string;
        title: string;
        description?: string;
        content?: string;
      }>;
    };
  };
}

export default function SingleEditorWithSections({ template }: SingleEditorWithSectionsProps) {
  // Estado das seções baseado na estrutura do template
  const [sections, setSections] = useState<Section[]>(() => {
    if (template?.structure?.sections) {
      return template.structure.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content || '',
        isOpen: false
      }));
    }
    return [];
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mainContent, setMainContent] = useState<string>('');

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isOpen: !section.isOpen }
        : { ...section, isOpen: false }
    ));
    
    // Se a seção está sendo aberta, torna-se ativa
    const section = sections.find(s => s.id === sectionId);
    if (section && !section.isOpen) {
      setActiveSection(sectionId);
    } else {
      setActiveSection(null);
    }
  };

  const handleContentChange = (content: string) => {
    if (activeSection) {
      // Atualizar conteúdo da seção ativa
      setSections(prev => prev.map(section =>
        section.id === activeSection
          ? { ...section, content }
          : section
      ));
    } else {
      // Atualizar conteúdo principal
      setMainContent(content);
    }
  };

  const getCurrentContent = () => {
    if (activeSection) {
      const section = sections.find(s => s.id === activeSection);
      return section?.content || '';
    }
    return mainContent;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Editor principal - ocupa a maior parte do espaço */}
      <div className="flex-1 min-h-0">
        <TextEditor 
          key={activeSection || 'main'} // Força re-render quando muda seção
          initialContent={getCurrentContent()}
          onContentChange={handleContentChange}
          placeholder={
            activeSection 
              ? `Editando seção: ${sections.find(s => s.id === activeSection)?.title}`
              : "Digite seu conteúdo principal aqui..."
          }
        />
      </div>

      {/* Seções colapsíveis na parte inferior */}
      {sections.length > 0 && (
        <div className="border-t bg-gray-50 p-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Seções do Template</h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <Collapsible 
                key={section.id} 
                open={section.isOpen}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant={activeSection === section.id ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-between text-left"
                  >
                    <span className="flex items-center">
                      {section.isOpen ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      {section.title}
                    </span>
                    {section.content && (
                      <span className="text-xs text-gray-500">
                        {section.content.length > 0 ? `${section.content.length} chars` : 'Vazio'}
                      </span>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-6 py-2">
                  <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                    {section.content ? (
                      <div>
                        <div className="font-medium mb-1">Prévia do conteúdo:</div>
                        <div className="line-clamp-3">
                          {section.content.substring(0, 200)}
                          {section.content.length > 200 && '...'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic">
                        Clique para editar esta seção no editor principal
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}