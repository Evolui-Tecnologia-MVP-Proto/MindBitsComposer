import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Database, Settings, RefreshCw, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LthMenusPathPluginProps {
  onDataExchange?: (data: any) => void;
  selectedEdition?: any;
}

interface MenuPath {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  level: number;
  type: 'menu' | 'submenu' | 'action' | 'item';
  subsystem: string;
  icon?: string;
  description?: string;
  children?: MenuPath[];
}

interface Subsystem {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export default function LthMenusPathPlugin(props: LthMenusPathPluginProps | null | undefined) {
  const { onDataExchange, selectedEdition } = props || {};
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [menuStructure, setMenuStructure] = useState<MenuPath[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for subsystems - em produção seria uma API
  const subsystems: Subsystem[] = [
    { id: "1", name: "Gestão de Documentos", code: "DOC", description: "Sistema de gestão documental" },
    { id: "2", name: "Recursos Humanos", code: "RH", description: "Sistema de recursos humanos" },
    { id: "3", name: "Financeiro", code: "FIN", description: "Sistema financeiro" },
    { id: "4", name: "Tributário", code: "TRIB", description: "Sistema tributário" },
    { id: "5", name: "Contábil", code: "CONT", description: "Sistema contábil" }
  ];

  // Mock data for menu structure - em produção seria uma API baseada no subsistema selecionado
  const generateMenuStructure = (subsystemCode: string): MenuPath[] => {
    const baseMenus: Record<string, MenuPath[]> = {
      DOC: [
        {
          id: "doc_1",
          name: "Documentos",
          path: "/documentos",
          level: 0,
          type: "menu",
          subsystem: "DOC",
          icon: "FileText",
          children: [
            {
              id: "doc_1_1",
              name: "Consultar Documentos",
              path: "/documentos/consultar",
              parentId: "doc_1",
              level: 1,
              type: "submenu",
              subsystem: "DOC",
              icon: "Database",
              children: [
                {
                  id: "doc_1_1_1",
                  name: "Busca Avançada",
                  path: "/documentos/consultar/busca-avancada",
                  parentId: "doc_1_1",
                  level: 2,
                  type: "submenu",
                  subsystem: "DOC",
                  icon: "Settings",
                  children: [
                    {
                      id: "doc_1_1_1_1",
                      name: "Por Data de Criação",
                      path: "/documentos/consultar/busca-avancada/data-criacao",
                      parentId: "doc_1_1_1",
                      level: 3,
                      type: "action",
                      subsystem: "DOC"
                    },
                    {
                      id: "doc_1_1_1_2",
                      name: "Por Tipo de Documento",
                      path: "/documentos/consultar/busca-avancada/tipo-documento",
                      parentId: "doc_1_1_1",
                      level: 3,
                      type: "submenu",
                      subsystem: "DOC",
                      children: [
                        {
                          id: "doc_1_1_1_2_1",
                          name: "Contratos",
                          path: "/documentos/consultar/busca-avancada/tipo-documento/contratos",
                          parentId: "doc_1_1_1_2",
                          level: 4,
                          type: "action",
                          subsystem: "DOC"
                        },
                        {
                          id: "doc_1_1_1_2_2",
                          name: "Relatórios",
                          path: "/documentos/consultar/busca-avancada/tipo-documento/relatorios",
                          parentId: "doc_1_1_1_2",
                          level: 4,
                          type: "submenu",
                          subsystem: "DOC",
                          children: [
                            {
                              id: "doc_1_1_1_2_2_1",
                              name: "Financeiros",
                              path: "/documentos/consultar/busca-avancada/tipo-documento/relatorios/financeiros",
                              parentId: "doc_1_1_1_2_2",
                              level: 5,
                              type: "action",
                              subsystem: "DOC"
                            },
                            {
                              id: "doc_1_1_1_2_2_2",
                              name: "Operacionais",
                              path: "/documentos/consultar/busca-avancada/tipo-documento/relatorios/operacionais",
                              parentId: "doc_1_1_1_2_2",
                              level: 5,
                              type: "action",
                              subsystem: "DOC"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      id: "doc_1_1_1_3",
                      name: "Por Status",
                      path: "/documentos/consultar/busca-avancada/status",
                      parentId: "doc_1_1_1",
                      level: 3,
                      type: "action",
                      subsystem: "DOC"
                    }
                  ]
                },
                {
                  id: "doc_1_1_2",
                  name: "Filtros Personalizados",
                  path: "/documentos/consultar/filtros",
                  parentId: "doc_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "DOC"
                }
              ]
            },
            {
              id: "doc_1_2",
              name: "Incluir Documento",
              path: "/documentos/incluir",
              parentId: "doc_1",
              level: 1,
              type: "action",
              subsystem: "DOC"
            }
          ]
        },
        {
          id: "doc_2",
          name: "Templates",
          path: "/templates",
          level: 0,
          type: "menu",
          subsystem: "DOC",
          icon: "Settings",
          children: [
            {
              id: "doc_2_1",
              name: "Gerenciar Templates",
              path: "/templates/gerenciar",
              parentId: "doc_2",
              level: 1,
              type: "submenu",
              subsystem: "DOC",
              children: [
                {
                  id: "doc_2_1_1",
                  name: "Criar Template",
                  path: "/templates/gerenciar/criar",
                  parentId: "doc_2_1",
                  level: 2,
                  type: "action",
                  subsystem: "DOC"
                },
                {
                  id: "doc_2_1_2",
                  name: "Editar Template",
                  path: "/templates/gerenciar/editar",
                  parentId: "doc_2_1",
                  level: 2,
                  type: "action",
                  subsystem: "DOC"
                }
              ]
            }
          ]
        }
      ],
      RH: [
        {
          id: "rh_1",
          name: "Funcionários",
          path: "/funcionarios",
          level: 0,
          type: "menu",
          subsystem: "RH",
          icon: "FileText",
          children: [
            {
              id: "rh_1_1",
              name: "Cadastro",
              path: "/funcionarios/cadastro",
              parentId: "rh_1",
              level: 1,
              type: "submenu",
              subsystem: "RH",
              children: [
                {
                  id: "rh_1_1_1",
                  name: "Dados Pessoais",
                  path: "/funcionarios/cadastro/dados-pessoais",
                  parentId: "rh_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "RH"
                },
                {
                  id: "rh_1_1_2",
                  name: "Dados Funcionais",
                  path: "/funcionarios/cadastro/dados-funcionais",
                  parentId: "rh_1_1",
                  level: 2,
                  type: "submenu",
                  subsystem: "RH",
                  children: [
                    {
                      id: "rh_1_1_2_1",
                      name: "Cargo e Salário",
                      path: "/funcionarios/cadastro/dados-funcionais/cargo-salario",
                      parentId: "rh_1_1_2",
                      level: 3,
                      type: "action",
                      subsystem: "RH"
                    },
                    {
                      id: "rh_1_1_2_2",
                      name: "Horário de Trabalho",
                      path: "/funcionarios/cadastro/dados-funcionais/horario",
                      parentId: "rh_1_1_2",
                      level: 3,
                      type: "action",
                      subsystem: "RH"
                    }
                  ]
                }
              ]
            },
            {
              id: "rh_1_2",
              name: "Consulta",
              path: "/funcionarios/consulta",
              parentId: "rh_1",
              level: 1,
              type: "action",
              subsystem: "RH"
            }
          ]
        }
      ],
      FIN: [
        {
          id: "fin_1",
          name: "Contas a Pagar",
          path: "/contas-pagar",
          level: 0,
          type: "menu",
          subsystem: "FIN",
          icon: "Database",
          children: [
            {
              id: "fin_1_1",
              name: "Lançamentos",
              path: "/contas-pagar/lancamentos",
              parentId: "fin_1",
              level: 1,
              type: "submenu",
              subsystem: "FIN",
              children: [
                {
                  id: "fin_1_1_1",
                  name: "Manual",
                  path: "/contas-pagar/lancamentos/manual",
                  parentId: "fin_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "FIN"
                },
                {
                  id: "fin_1_1_2",
                  name: "Importação",
                  path: "/contas-pagar/lancamentos/importacao",
                  parentId: "fin_1_1",
                  level: 2,
                  type: "submenu",
                  subsystem: "FIN",
                  children: [
                    {
                      id: "fin_1_1_2_1",
                      name: "Excel/CSV",
                      path: "/contas-pagar/lancamentos/importacao/excel",
                      parentId: "fin_1_1_2",
                      level: 3,
                      type: "action",
                      subsystem: "FIN"
                    },
                    {
                      id: "fin_1_1_2_2",
                      name: "Integração Bancária",
                      path: "/contas-pagar/lancamentos/importacao/bancaria",
                      parentId: "fin_1_1_2",
                      level: 3,
                      type: "action",
                      subsystem: "FIN"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      TRIB: [
        {
          id: "trib_1",
          name: "Obrigações",
          path: "/obrigacoes",
          level: 0,
          type: "menu",
          subsystem: "TRIB",
          icon: "Settings",
          children: [
            {
              id: "trib_1_1",
              name: "DCTF",
              path: "/obrigacoes/dctf",
              parentId: "trib_1",
              level: 1,
              type: "submenu",
              subsystem: "TRIB",
              children: [
                {
                  id: "trib_1_1_1",
                  name: "Gerar Arquivo",
                  path: "/obrigacoes/dctf/gerar",
                  parentId: "trib_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "TRIB"
                },
                {
                  id: "trib_1_1_2",
                  name: "Validar Arquivo",
                  path: "/obrigacoes/dctf/validar",
                  parentId: "trib_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "TRIB"
                }
              ]
            }
          ]
        }
      ],
      CONT: [
        {
          id: "cont_1",
          name: "Plano de Contas",
          path: "/plano-contas",
          level: 0,
          type: "menu",
          subsystem: "CONT",
          icon: "FileText",
          children: [
            {
              id: "cont_1_1",
              name: "Gerenciar Contas",
              path: "/plano-contas/gerenciar",
              parentId: "cont_1",
              level: 1,
              type: "submenu",
              subsystem: "CONT",
              children: [
                {
                  id: "cont_1_1_1",
                  name: "Contas Analíticas",
                  path: "/plano-contas/gerenciar/analiticas",
                  parentId: "cont_1_1",
                  level: 2,
                  type: "submenu",
                  subsystem: "CONT",
                  children: [
                    {
                      id: "cont_1_1_1_1",
                      name: "Ativo",
                      path: "/plano-contas/gerenciar/analiticas/ativo",
                      parentId: "cont_1_1_1",
                      level: 3,
                      type: "action",
                      subsystem: "CONT"
                    },
                    {
                      id: "cont_1_1_1_2",
                      name: "Passivo",
                      path: "/plano-contas/gerenciar/analiticas/passivo",
                      parentId: "cont_1_1_1",
                      level: 3,
                      type: "action",
                      subsystem: "CONT"
                    }
                  ]
                },
                {
                  id: "cont_1_1_2",
                  name: "Contas Sintéticas",
                  path: "/plano-contas/gerenciar/sinteticas",
                  parentId: "cont_1_1",
                  level: 2,
                  type: "action",
                  subsystem: "CONT"
                }
              ]
            }
          ]
        }
      ]
    };

    return baseMenus[subsystemCode] || [];
  };

  const handleSubsystemChange = (subsystemCode: string) => {
    setSelectedSubsystem(subsystemCode);
    setIsLoading(true);
    
    // Simular carregamento de dados
    setTimeout(() => {
      const structure = generateMenuStructure(subsystemCode);
      setMenuStructure(structure);
      setExpandedPaths(new Set()); // Reset expanded state
      setSelectedPaths(new Set()); // Reset selected state
      setIsLoading(false);
    }, 500);
  };

  const toggleExpanded = (pathId: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(pathId)) {
      newExpanded.delete(pathId);
    } else {
      newExpanded.add(pathId);
    }
    setExpandedPaths(newExpanded);
  };

  const toggleSelected = (pathId: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(pathId)) {
      newSelected.delete(pathId);
    } else {
      newSelected.add(pathId);
    }
    setSelectedPaths(newSelected);
  };

  const getIcon = (iconName?: string, type?: string, isExpanded?: boolean) => {
    if (type === 'menu' || type === 'submenu') {
      return isExpanded ? <FolderOpen className="h-4 w-4 text-blue-500" /> : <Folder className="h-4 w-4 text-blue-500" />;
    }
    
    switch (iconName) {
      case 'FileText':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'Database':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'Settings':
        return <Settings className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderMenuTree = (menuItems: MenuPath[], level = 0): JSX.Element[] => {
    return menuItems.map((item) => {
      const isExpanded = expandedPaths.has(item.id);
      const isSelected = selectedPaths.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const paddingLeft = level * 24;

      return (
        <div key={item.id} className="select-none">
          <div
            className={`flex items-center py-2 px-3 hover:bg-gray-50 dark:hover:bg-[#1F2937] cursor-pointer rounded-md transition-colors ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft + 12}px` }}
            onClick={() => toggleSelected(item.id)}
          >
            <div className="flex items-center flex-1 min-w-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-4 w-4 mr-2 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(item.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-6" />}
              
              <div className="mr-2">
                {getIcon(item.icon, item.type, isExpanded)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.path}
                </div>
              </div>
              
              <div className="ml-2 shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.type === 'menu' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                    : item.type === 'submenu'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                    : item.type === 'action'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                }`}>
                  {item.type === 'menu' ? 'Menu' : 
                   item.type === 'submenu' ? 'Submenu' : 
                   item.type === 'action' ? 'Ação' : 
                   item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div>
              {renderMenuTree(item.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleAtualizar = () => {
    if (!selectedSubsystem) {
      toast({
        title: "Subsistema não selecionado",
        description: "Selecione um subsistema para atualizar os dados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Atualizando dados",
      description: "Carregando estrutura atualizada do subsistema...",
    });

    // Simular atualização de dados
    setTimeout(() => {
      handleSubsystemChange(selectedSubsystem);
      toast({
        title: "Dados atualizados",
        description: "A estrutura do subsistema foi recarregada com sucesso.",
      });
    }, 1000);
  };

  const handleSalvar = () => {
    if (selectedPaths.size === 0) {
      toast({
        title: "Nenhum caminho selecionado",
        description: "Selecione pelo menos um caminho de menu para salvar.",
        variant: "destructive",
      });
      return;
    }

    const selectedMenus = menuStructure
      .filter(menu => selectedPaths.has(menu.id))
      .concat(
        menuStructure
          .flatMap(menu => menu.children || [])
          .filter(submenu => selectedPaths.has(submenu.id))
      )
      .concat(
        menuStructure
          .flatMap(menu => menu.children || [])
          .flatMap(submenu => submenu.children || [])
          .filter(action => selectedPaths.has(action.id))
      );

    const resultData = {
      subsystem: subsystems.find(s => s.code === selectedSubsystem),
      selectedPaths: Array.from(selectedPaths),
      selectedMenus: selectedMenus,
      timestamp: new Date().toISOString()
    };

    // Chamar função de troca de dados se disponível
    if (onDataExchange) {
      onDataExchange(resultData);
    }

    toast({
      title: "Dados salvos",
      description: `${selectedPaths.size} caminhos de menu foram salvos com sucesso.`,
    });

    console.log('Dados do plugin LTH Menus Path:', resultData);
  };

  const handleCancelar = () => {
    // Reset all states
    setSelectedSubsystem("");
    setMenuStructure([]);
    setExpandedPaths(new Set());
    setSelectedPaths(new Set());
    
    toast({
      title: "Operação cancelada",
      description: "Todas as seleções foram limpa.",
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0F172A] p-6">
      {/* Header com título e descrição */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-200 mb-2">
          LTH Menus Path Plugin
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selecione um subsistema e explore a estrutura hierárquica de menus para definir caminhos de navegação.
        </p>
      </div>

      {/* Subsystem Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subsistema
        </label>
        <Select value={selectedSubsystem} onValueChange={handleSubsystemChange}>
          <SelectTrigger className="w-full bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            <SelectValue placeholder="Selecione um subsistema..." />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            {subsystems.map((subsystem) => (
              <SelectItem key={subsystem.id} value={subsystem.code}>
                <div className="flex flex-col">
                  <span className="font-medium">{subsystem.name}</span>
                  <span className="text-xs text-gray-500">{subsystem.code}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Menu Structure Visualization */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
            Estrutura Hierárquica
          </h3>
          {selectedPaths.size > 0 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm font-medium">
              {selectedPaths.size} selecionado{selectedPaths.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="border dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#111827]" style={{ height: '350px', maxHeight: '350px', minHeight: '350px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Carregando estrutura...</span>
              </div>
            </div>
          ) : selectedSubsystem && menuStructure.length > 0 ? (
            <div 
              className="p-4 space-y-1" 
              style={{ 
                height: '350px', 
                maxHeight: '350px', 
                overflowY: 'auto', 
                overflowX: 'hidden'
              }}
            >
              {renderMenuTree(menuStructure)}
            </div>
          ) : selectedSubsystem ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum menu encontrado para este subsistema</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Selecione um subsistema para visualizar a estrutura</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-[#374151]">
        <Button
          variant="outline"
          onClick={handleAtualizar}
          disabled={!selectedSubsystem || isLoading}
          className="border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1F2937]"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        
        <Button
          variant="outline"
          onClick={handleCancelar}
          className="border-gray-300 dark:border-[#374151] hover:bg-gray-50 dark:hover:bg-[#1F2937]"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        
        <Button
          onClick={handleSalvar}
          disabled={selectedPaths.size === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}