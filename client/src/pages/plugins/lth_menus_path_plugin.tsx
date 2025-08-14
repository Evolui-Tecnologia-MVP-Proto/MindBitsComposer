import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Database, Settings, RefreshCw, X, Save, Check, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

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

interface Connection {
  id: string;
  name: string;
  code: string;
  description?: string;
  endpoint?: string;
  credentials?: {
    userType: string;
    login: string;
    password: string;
  };
}

interface Subsystem {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export default function LthMenusPathPlugin(props: LthMenusPathPluginProps | null | undefined) {
  const { onDataExchange, selectedEdition } = props || {};

  const [selectedDictionary, setSelectedDictionary] = useState<string>("");
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [menuStructure, setMenuStructure] = useState<MenuPath[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [pluginConfig, setPluginConfig] = useState<any>(null);
  const [pluginId, setPluginId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch plugin configuration
  const { data: plugins } = useQuery({
    queryKey: ['/api/plugins']
  });

  useEffect(() => {
    if (plugins && Array.isArray(plugins)) {
      const lthPlugin = plugins.find((p: any) => p.pageName === 'lth_menus_path_plugin');
      if (lthPlugin) {
        console.log("=== LTH PLUGIN CONFIG DEBUG ===");
        console.log("Plugin found:", lthPlugin);
        console.log("Configuration:", lthPlugin.configuration);
        console.log("Has connections:", !!lthPlugin.configuration?.connections);
        console.log("=== FIM DEBUG ===");
        
        setPluginId(lthPlugin.id);
        if (lthPlugin.configuration) {
          setPluginConfig(lthPlugin.configuration);
        }
      }
    }
  }, [plugins]);





  // Real data from API
  const [dictionaries, setDictionaries] = useState<Connection[]>([]);
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);

  // Load dictionaries from API
  const loadDictionaries = async () => {
    if (!authToken || !pluginId) return [];

    try {
      const response = await fetch("/api/plugin/lth-dictionaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pluginId: pluginId,
          authToken: authToken,
          pluginConfig: pluginConfig
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dictionaries: ${response.status}`);
      }

      const data = await response.json();
      
      // If we got updated plugin config, update it locally
      if (data.updatedConfig) {
        setPluginConfig(data.updatedConfig);
      }
      
      return data.dictionaries || [];
    } catch (error) {
      console.error("Failed to fetch dictionaries:", error);
      return [];
    }
  };

  // Load subsystems from API
  const loadSubsystems = async () => {
    if (!authToken || !pluginId) return [];

    try {
      const response = await fetch("/api/plugin/lth-subsystems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pluginId: pluginId,
          authToken: authToken
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subsystems: ${response.status}`);
      }

      const data = await response.json();
      return data.subsystems || [];
    } catch (error) {
      console.error("Failed to fetch subsystems:", error);
      return [];
    }
  };

  // Load menu structure from API
  const loadMenuStructure = async (subsystemId: string) => {
    if (!authToken || !pluginId || !subsystemId) return [];

    try {
      const response = await fetch("/api/plugin/lth-menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pluginId: pluginId,
          authToken: authToken,
          subsystemId: subsystemId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch menu structure: ${response.status}`);
      }

      const data = await response.json();
      return data.menuStructure || [];
    } catch (error) {
      console.error("Failed to fetch menu structure:", error);
      return [];
    }
  };

  // Function to authenticate with the API
  const authenticateConnection = async (connectionCode: string) => {
    if (!pluginId) {
      console.error("Plugin ID not available");
      setConnectionStatus('error');
      return false;
    }

    setConnectionStatus('connecting');
    
    try {
      const response = await fetch("/api/plugin/lth-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pluginId: pluginId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAuthToken(data.token);
        setConnectionStatus('connected');
        console.log("Authentication successful:", data);
        return true;
      } else {
        setConnectionStatus('error');
        console.error("Authentication failed:", data);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      setConnectionStatus('error');
      toast({
        title: "Erro de autenticação",
        description: "Falha ao autenticar com a conexão selecionada",
        variant: "destructive"
      });
    }
    return false;
  };

  // Function to fetch subsystems from API
  const fetchSubsystems = async (dictionaryId?: string) => {
    if (!authToken || !pluginId) return [];

    try {
      const response = await fetch("/api/plugin/lth-subsystems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          pluginId: pluginId,
          authToken: authToken,
          dictionaryId: dictionaryId || selectedDictionary
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subsystems: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.subsystems) {
        // Update subsystems with API data
        return data.subsystems;
      }
    } catch (error) {
      console.error("Failed to fetch subsystems:", error);
    }
    return [];
  };



  // Auto-test connection when plugin loads
  useEffect(() => {
    const testConnection = async () => {
      if (!pluginId) return;
      
      console.log("=== AUTO TESTING CONNECTION ===");
      setConnectionStatus('connecting');
      
      try {
        const response = await fetch("/api/plugin/lth-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            pluginId: pluginId
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.token) {
            setAuthToken(data.token);
            setConnectionStatus('connected');
            console.log("=== CONNECTION SUCCESS ===");
          } else {
            setConnectionStatus('error');
          }
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error("Auto connection test failed:", error);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, [pluginId]); // Executa quando pluginId estiver disponível

  // Load dictionaries when authentication token becomes available
  useEffect(() => {
    const loadData = async () => {
      if (!authToken || !pluginId) return;
      
      try {
        // Load dictionaries only - subsystems will be loaded when dictionary is selected
        const dictionariesData = await loadDictionaries();
        setDictionaries(dictionariesData);
        
        // Pre-select dictionary from plugin.parameters.LUTHIER_DB_ID if available
        if (pluginConfig?.plugin?.parameters?.LUTHIER_DB_ID) {
          const savedDictionaryId = pluginConfig.plugin.parameters.LUTHIER_DB_ID;
          console.log("Pre-selecting dictionary from LUTHIER_DB_ID:", savedDictionaryId);
          
          // Check if this ID exists in the loaded dictionaries
          const dictExists = dictionariesData.some((dict: any) => String(dict.id) === String(savedDictionaryId));
          if (dictExists) {
            setSelectedDictionary(String(savedDictionaryId));
            // Load subsystems for the pre-selected dictionary
            // Use forceRefresh to ensure fresh data on initial load
            const response = await fetch("/api/plugin/lth-subsystems", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ 
                pluginId, 
                dictionaryId: String(savedDictionaryId),
                forceRefresh: false  // Initial load can use cache
              })
            });

            if (response.ok) {
              const data = await response.json();
              const subsystemsData = data.subsystems || [];
              setSubsystems(subsystemsData);
            
              // Pre-select subsystem if saved in parameters
              if (pluginConfig?.plugin?.parameters?.SUBSYSTEM_ID) {
                const savedSubsystemId = pluginConfig.plugin.parameters.SUBSYSTEM_ID;
                console.log("Pre-selecting subsystem from SUBSYSTEM_ID:", savedSubsystemId);
                
                const subsystemExists = subsystemsData.some((sub: any) => String(sub.id) === String(savedSubsystemId));
                if (subsystemExists) {
                  setSelectedSubsystem(String(savedSubsystemId));
                  // Load menu structure for the pre-selected subsystem
                  const structure = await loadMenuStructure(String(savedSubsystemId));
                  setMenuStructure(structure);
                }
              }
            } else {
              console.error("Failed to load initial subsystems");
            }
          }
        }
      } catch (error) {
        console.error("Failed to load dictionaries:", error);
      }
    };

    loadData();
  }, [authToken, pluginId, pluginConfig]);

  const handleDictionaryChange = async (dictionaryCode: string) => {
    console.log("=== DICTIONARY CHANGE DEBUG ===");
    console.log("Dictionary Code:", dictionaryCode);
    console.log("Auth Token:", authToken ? "Present" : "Missing");
    console.log("Plugin ID:", pluginId);
    console.log("Plugin Config:", pluginConfig ? "Present" : "Missing");
    
    setSelectedDictionary(dictionaryCode);
    // Reset subsystem and menu structure when dictionary changes
    setSelectedSubsystem("");
    setMenuStructure([]);
    setExpandedPaths(new Set());
    setSelectedPath(null);
    
    // Save dictionary selection to plugin.parameters.LUTHIER_DB_ID
    if (dictionaryCode && pluginId && pluginConfig) {
      // PRESERVE ALL EXISTING PARAMETERS (BASE, API_KEY, etc.) and only update LUTHIER_DB_ID
      const existingPluginParams = pluginConfig.plugin?.parameters || {};
      const existingRootParams = pluginConfig.parameters || {};
      
      console.log("Existing plugin parameters:", existingPluginParams);
      console.log("Existing root parameters:", existingRootParams);
      
      // Update the plugin configuration preserving all original data
      // ONLY update plugin.parameters.LUTHIER_DB_ID, never create root-level parameters
      const updatedConfig = {
        ...pluginConfig,
        plugin: {
          ...pluginConfig.plugin,
          parameters: {
            ...existingPluginParams,  // Preserve BASE, API_KEY, etc.
            LUTHIER_DB_ID: dictionaryCode  // Only update this one
          }
        }
        // DO NOT create root-level parameters - causes duplicates and overwrites connection params
      };
      
      console.log("Saving LUTHIER_DB_ID:", dictionaryCode);
      
      // Save to database
      try {
        const response = await fetch(`/api/plugins/${pluginId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            configuration: updatedConfig
          })
        });
        
        if (response.ok) {
          setPluginConfig(updatedConfig);
          console.log("LUTHIER_DB_ID saved successfully");
          
          // Force refresh of plugins data
          queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
        } else {
          console.error("Failed to save LUTHIER_DB_ID");
        }
      } catch (error) {
        console.error("Error saving LUTHIER_DB_ID:", error);
      }
    }
    
    // FORCE reload subsystems for the selected dictionary (clear cache and fetch fresh data)
    if (dictionaryCode && authToken && pluginId) {
      console.log("🔄 Dictionary changed - FORCING fresh subsystem load for dictionary:", dictionaryCode);
      
      try {
        // Clear existing subsystems state immediately
        setSubsystems([]);
        
        // Force a fresh API call to load subsystems for this dictionary
        // This will trigger the API to refresh data from the LTH API instead of using cached data
        const response = await fetch("/api/plugin/lth-subsystems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ 
            pluginId, 
            dictionaryId: dictionaryCode,
            forceRefresh: true  // Flag to force API refresh
          })
        });

        if (response.ok) {
          const data = await response.json();
          const subsystemsData = data.subsystems || [];
          
          console.log(`✅ Loaded ${subsystemsData.length} fresh subsystems for dictionary ${dictionaryCode}`);
          setSubsystems(subsystemsData);
          
          // Clear any previous subsystem selection since dictionary changed
          // Don't pre-select subsystem - let user choose fresh
          console.log("🔄 Dictionary changed - subsystem selection cleared");
        } else {
          console.error("Failed to fetch fresh subsystems:", response.status, response.statusText);
          toast({
            title: "Erro ao carregar subsistemas",
            description: "Não foi possível carregar os subsistemas para o dicionário selecionado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading fresh subsystems for dictionary:", error);
        toast({
          title: "Erro de conexão",
          description: "Erro ao conectar com o servidor para carregar subsistemas.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubsystemChange = async (subsystemCode: string) => {
    setSelectedSubsystem(subsystemCode);
    setIsLoading(true);
    
    // Save subsystem selection to plugin.parameters.SUBSYSTEM_ID
    if (subsystemCode && pluginId && pluginConfig) {
      // Update the plugin configuration with the selected subsystem ID
      const updatedConfig = {
        ...pluginConfig,
        plugin: {
          ...pluginConfig.plugin,
          parameters: {
            ...pluginConfig.plugin?.parameters,
            SUBSYSTEM_ID: subsystemCode
          }
        }
      };
      
      console.log("Saving SUBSYSTEM_ID:", subsystemCode);
      
      // Save to database
      try {
        const response = await fetch(`/api/plugins/${pluginId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            configuration: updatedConfig
          })
        });
        
        if (response.ok) {
          setPluginConfig(updatedConfig);
          console.log("SUBSYSTEM_ID saved successfully");
          
          // Force refresh of plugins data
          queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
        } else {
          console.error("Failed to save SUBSYSTEM_ID");
        }
      } catch (error) {
        console.error("Error saving SUBSYSTEM_ID:", error);
      }
    }
    
    try {
      const structure = await loadMenuStructure(subsystemCode);
      setMenuStructure(structure);
      setExpandedPaths(new Set()); // Reset expanded state
      setSelectedPath(null); // Reset selected state
    } catch (error) {
      console.error("Failed to load menu structure:", error);
      setMenuStructure([]);
      toast({
        title: "Erro ao carregar estrutura",
        description: "Não foi possível carregar a estrutura de menus do subsistema.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const handleItemClick = (item: MenuPath) => {
    // Only allow selection of action items (funcionalidade)
    if (item.type !== 'action') {
      return;
    }
    
    // Single selection: if already selected, deselect; otherwise select
    if (selectedPath === item.id) {
      setSelectedPath(null);
    } else {
      setSelectedPath(item.id);
    }
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
      const isSelected = selectedPath === item.id;
      const hasChildren = item.children && item.children.length > 0;
      const paddingLeft = level * 24;
      const isSelectable = item.type === 'action';

      return (
        <div key={item.id} className="select-none">
          <div
            className={`flex items-center py-2 px-3 rounded-md transition-colors ${
              isSelectable 
                ? 'hover:bg-gray-50 dark:hover:bg-[#1F2937] cursor-pointer' 
                : 'cursor-default'
            } ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
            } ${
              !isSelectable ? 'opacity-75' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft + 12}px` }}
            onClick={() => handleItemClick(item)}
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
                   item.type === 'action' ? 'Funcionalidade' : 
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

  const handleAtualizar = async () => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "Conexão não estabelecida",
        description: "Aguarde a conexão ser estabelecida para atualizar os dados.",
        variant: "destructive",
      });
      return;
    }

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

    try {
      // Reload subsystems first
      const subsystemsData = await loadSubsystems();
      setSubsystems(subsystemsData);

      // Then reload menu structure for the selected subsystem
      await handleSubsystemChange(selectedSubsystem);
      
      toast({
        title: "Dados atualizados",
        description: "A estrutura do subsistema foi recarregada com sucesso.",
      });
    } catch (error) {
      console.error("Failed to update data:", error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para construir o path completo hierárquico (display na badge)
  const getFullPath = (selectedId: string): string => {
    const findPathRecursively = (items: MenuPath[], targetId: string, currentPath: string[] = []): string[] | null => {
      for (const item of items) {
        const newPath = [...currentPath, item.name];
        
        if (item.id === targetId) {
          return newPath;
        }
        
        if (item.children) {
          const found = findPathRecursively(item.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const pathArray = findPathRecursively(menuStructure, selectedId);
    return pathArray ? pathArray.join(' → ') : '';
  };

  // Função para construir o path no formato solicitado para envio
  const getFormattedPathForSave = (selectedId: string): string => {
    const findPathRecursively = (items: MenuPath[], targetId: string, currentPath: string[] = []): string[] | null => {
      for (const item of items) {
        const newPath = [...currentPath, item.name];
        
        if (item.id === targetId) {
          return newPath;
        }
        
        if (item.children) {
          const found = findPathRecursively(item.children, targetId, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const pathArray = findPathRecursively(menuStructure, selectedId);
    if (!pathArray) return '';

    const subsystemName = subsystems.find(s => s.code === selectedSubsystem)?.name || selectedSubsystem;
    const pathString = pathArray.join(' -> ');
    
    return `Subsystem: "${subsystemName}" - ${pathString}`;
  };

  const handleSalvar = () => {
    if (!selectedPath) {
      toast({
        title: "Nenhuma funcionalidade selecionada",
        description: "Selecione uma funcionalidade para salvar.",
        variant: "destructive",
      });
      return;
    }

    console.log('🎯 LTH Plugin - handleSalvar chamado');
    console.log('🎯 LTH Plugin - selectedSubsystem:', selectedSubsystem);
    console.log('🎯 LTH Plugin - selectedPath:', selectedPath);
    console.log('🎯 LTH Plugin - onDataExchange:', typeof onDataExchange, onDataExchange);

    // Encontrar o item selecionado na estrutura
    const findSelectedItem = (items: MenuPath[]): MenuPath | null => {
      for (const item of items) {
        if (item.id === selectedPath) {
          return item;
        }
        if (item.children) {
          const found = findSelectedItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    const selectedItem = findSelectedItem(menuStructure);
    
    if (!selectedItem) {
      toast({
        title: "Erro",
        description: "Item selecionado não encontrado.",
        variant: "destructive",
      });
      return;
    }

    // Gerar o caminho formatado para envio
    const formattedPath = getFormattedPathForSave(selectedPath);

    // Enviar o caminho formatado como string para o campo input
    if (onDataExchange) {
      console.log('🎯 LTH Plugin - Enviando dados via onDataExchange');
      console.log('🎯 LTH Plugin - Dados:', { value: formattedPath, closeModal: true });
      onDataExchange({
        value: formattedPath, // String formatada para o campo input
        closeModal: true // Fechar o modal após salvar
      });
      console.log('🎯 LTH Plugin - Dados enviados com sucesso!');
    } else {
      console.error('❌ LTH Plugin - onDataExchange não está definido!');
    }

    // Não mostrar toast quando usado no contexto de documento (onDataExchange disponível)
    // O toast só aparece quando usado fora do contexto de documento
    if (!onDataExchange) {
      toast({
        title: "Funcionalidade salva",
        description: `Caminho "${formattedPath}" foi salvo com sucesso.`,
      });
    }

    console.log('Caminho salvo do plugin LTH Menus Path:', formattedPath);
  };

  const handleCancelar = () => {
    // Reset all states
    setSelectedSubsystem("");
    setMenuStructure([]);
    setExpandedPaths(new Set());
    setSelectedPath(null);
    
    // Close modal without toast notification
    if (onDataExchange) {
      onDataExchange({ closeModal: true });
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'disconnected':
        return (
          <Badge variant="secondary" className="ml-2">
            <Circle className="h-2 w-2 mr-1" fill="currentColor" />
            desconectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="outline" className="ml-2 animate-pulse">
            <RefreshCw className="h-2 w-2 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      case 'connected':
        return (
          <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700">
            <Check className="h-2 w-2 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="ml-2">
            <X className="h-2 w-2 mr-1" />
            Erro
          </Badge>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0F172A] p-6">
      {/* Header com título e descrição */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-200">
            LTH Menus Path Plugin
          </h2>
          {getConnectionStatusBadge()}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selecione um subsistema e explore a estrutura hierárquica de menus para definir caminhos de navegação.
        </p>
      </div>

      {/* Dictionary Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dicionário
        </label>
        <Select value={selectedDictionary} onValueChange={handleDictionaryChange} disabled={connectionStatus !== 'connected'}>
          <SelectTrigger className="w-full bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            <SelectValue placeholder={connectionStatus !== 'connected' ? "Aguardando conexão..." : "Selecione uma conexao de dicionário"} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            {dictionaries.map((dictionary) => (
              <SelectItem key={dictionary.id} value={dictionary.code}>
                <span className="font-medium">{dictionary.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subsystem Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subsistema
        </label>
        <Select value={selectedSubsystem} onValueChange={handleSubsystemChange} disabled={connectionStatus !== 'connected' || !selectedDictionary}>
          <SelectTrigger className="w-full bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            <SelectValue placeholder={connectionStatus !== 'connected' ? "Aguardando conexão..." : !selectedDictionary ? "Selecione um dicionário primeiro..." : "Selecione um subsistema..."} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0F172A] border-gray-300 dark:border-[#374151]">
            {subsystems.map((subsystem) => (
              <SelectItem key={subsystem.id} value={subsystem.code}>
                <span className="font-medium">{subsystem.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Menu Structure Visualization */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
            Estrutura Hierárquica
          </h3>
          {selectedPath && (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-300 dark:border-gray-600">
              {getFullPath(selectedPath)}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 top-12 bottom-0 border dark:border-[#374151] rounded-lg bg-gray-50 dark:bg-[#111827] overflow-hidden">
          {connectionStatus === 'connected' && selectedSubsystem && menuStructure.length > 0 ? (
            <div className="absolute inset-0 p-4 overflow-y-auto overflow-x-hidden">
              <div className="space-y-1">
                {renderMenuTree(menuStructure)}
              </div>
            </div>
          ) : connectionStatus === 'connected' && selectedSubsystem ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum menu encontrado para este subsistema</p>
              </div>
            </div>
          ) : connectionStatus !== 'connected' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aguardando conexão...</p>
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
          disabled={connectionStatus !== 'connected' || !selectedSubsystem}
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
          disabled={!selectedPath}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
}