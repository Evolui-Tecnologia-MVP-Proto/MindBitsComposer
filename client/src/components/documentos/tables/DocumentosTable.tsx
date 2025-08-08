import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Pencil,
  Trash2,
  Clock,
  CircleCheck,
  CircleX,
  AlertCircle,
  Loader2,
  BookOpen,
  Network,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { type Documento } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentosTableProps {
  documentos: Documento[];
  activeTab: string;
  flowExecutionCounts: Record<string, number>;
  getStatusBadgeVariant: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusOrigemBadgeVariant: (statusOrigem: string) => string;
  formatDate: (date: Date | null) => string;
  openViewModal: (documento: Documento) => void;
  openEditModal: (documento: Documento) => void;
  handleDeleteDocument: (documento: Documento) => void;
  handleResetDocument?: (documento: Documento) => void;
  setSelectedDocument: (documento: Documento | null) => void;
  setIsDocumentationModalOpen: (isOpen: boolean) => void;
  isDocumentationModalOpen: boolean;
  deleteDocumentoMutation: any;
  getActiveFlow: (documentId: string) => any;
  getConcludedFlow: (documentId: string) => any;
  openFlowDiagramModal: (execution: any) => void;
  flowExecutions?: any[];
  showFilters?: boolean;
  hideStatusColumn?: boolean;
}

export function DocumentosTable({
  documentos,
  activeTab,
  flowExecutionCounts,
  getStatusBadgeVariant,
  getStatusIcon,
  getStatusOrigemBadgeVariant,
  formatDate,
  openViewModal,
  openEditModal,
  handleDeleteDocument,
  handleResetDocument,
  setSelectedDocument,
  setIsDocumentationModalOpen,
  isDocumentationModalOpen,
  deleteDocumentoMutation,
  getActiveFlow,
  getConcludedFlow,
  openFlowDiagramModal,
  flowExecutions = [],
  showFilters = true,
  hideStatusColumn = false,
}: DocumentosTableProps) {
  const [dropdown, setDropdown] = useState<{
    isOpen: boolean;
    documentId: string;
    position: { x: number; y: number };
    flows: any[];
  }>({
    isOpen: false,
    documentId: "",
    position: { x: 0, y: 0 },
    flows: [],
  });

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdown.isOpen) {
        setDropdown(prev => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdown.isOpen]);

  // Função para obter todos os fluxos de um documento
  const getDocumentFlows = (documentId: string) => {
    if (!flowExecutions || flowExecutions.length === 0) {
      return [];
    }

    return flowExecutions.filter(execution => 
      execution.documentId === documentId && 
      (execution.status === "concluded" || execution.status === "initiated" || execution.status === "completed" || execution.status === "transfered" || execution.status === "finished")
    );
  };

  const handleFlowButtonClick = (evento: React.MouseEvent, documento: Documento) => {
    evento.preventDefault();
    evento.stopPropagation();

    console.log("🔵 handleFlowButtonClick - activeTab:", activeTab);
    console.log("🔵 handleFlowButtonClick - documento.id:", documento.id);
    
    if (activeTab === "concluidos" || activeTab === "em-processo") {
      const documentFlows = getDocumentFlows(documento.id);
      console.log("🔵 handleFlowButtonClick - documentFlows:", documentFlows);
      console.log("🔵 handleFlowButtonClick - documentFlows.length:", documentFlows.length);
      
      if (documentFlows.length > 1) {
        // Mostrar dropdown apenas quando há múltiplos fluxos
        console.log("🔵 Abrindo dropdown com múltiplos fluxos");
        setDropdown({
          isOpen: true,
          documentId: documento.id,
          position: { x: evento.clientX - 340, y: evento.clientY },
          flows: documentFlows,
        });
      } else if (documentFlows.length === 1) {
        // Abrir diretamente quando há apenas um fluxo
        console.log("🔵 Abrindo modal diretamente com fluxo único:", documentFlows[0]);
        openFlowDiagramModal(documentFlows[0]);
      } else {
        // Fallback para o método original
        console.log("🔵 Nenhum fluxo encontrado, tentando fallback");
        const flowToShow = activeTab === "concluidos" 
          ? getConcludedFlow(documento.id)
          : getActiveFlow(documento.id);
        console.log("🔵 Fallback flowToShow:", flowToShow);
        if (flowToShow) {
          openFlowDiagramModal({
            flowTasks: flowToShow,
            document: { objeto: documento.objeto }
          });
        }
      }
    } else {
      // Comportamento original para outras abas
      const flowToShow = activeTab === "concluidos" 
        ? getConcludedFlow(documento.id)
        : getActiveFlow(documento.id);
        
      if (flowToShow) {
        openFlowDiagramModal({
          flowTasks: flowToShow,
          document: { objeto: documento.objeto }
        });
      }
    }
  };
  const queryClient = useQueryClient();

  if (activeTab === "integrados") {
    return (
      <div className="border rounded-lg dark:border-[#374151] dark:bg-[#111827]">
        <div className={`overflow-y-auto ${showFilters ? 'max-h-[calc(100vh-510px)]' : 'max-h-[calc(100vh-350px)]'}`}>
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-[#111827] border-b dark:border-[#374151] z-10">
              <TableRow>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] w-[130px] dark:text-gray-200">
                  Origem
                </TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Nome</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Status</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] w-[155px] dark:text-gray-200">
                  Data Integração
                </TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">
                  Status Origem
                </TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Anexos</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] text-right dark:text-gray-200">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-compact">
              {documentos.map((documento) => (
                <TableRow key={documento.id} className="dark:border-[#374151]">
                  <TableCell className="dark:text-gray-200">
                    <div className="flex items-center">
                      {documento.origem === "Monday" ? (
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                          Monday
                        </div>
                      ) : (
                        <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium">
                          {documento.origem}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium dark:text-gray-200">
                    {documento.objeto}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(documento.status) as any}
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      {getStatusIcon(documento.status)}
                      {documento.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(documento.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getStatusOrigemBadgeVariant(
                          documento.statusOrigem,
                        ) as any
                      }
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      {documento.statusOrigem}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Verificar se monday_item_values tem conteúdo
                        const hasMonValues =
                          documento.mondayItemValues &&
                          Array.isArray(documento.mondayItemValues) &&
                          documento.mondayItemValues.length > 0;

                        if (!hasMonValues) {
                          // Badge cinza com "none" para monday_item_values vazio
                          return (
                            <Badge
                              variant="outline"
                              className="bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                            >
                              none
                            </Badge>
                          );
                        } else {
                          // Badge amarelo com "files" quando tem conteúdo
                          return (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600"
                            >
                              files
                            </Badge>
                          );
                        }
                      })()}

                      {/* Badge sync verde quando assets_synced é true */}
                      {documento.assetsSynced && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-medium">
                          sync
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {(activeTab === "integrados" || activeTab === "em-processo" || activeTab === "concluidos") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              console.log(
                                "Botão documentação clicado",
                                documento,
                              );
                              console.log(
                                "Estado atual da modal:",
                                isDocumentationModalOpen,
                              );
                              setSelectedDocument(documento);
                              
                              // Forçar atualização dos dados necessários para a modal
                              queryClient.invalidateQueries({
                                queryKey: ["/api/documentos", documento.id, "artifacts"],
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["/api/documentos/artifacts-count"],
                              });
                              
                              setIsDocumentationModalOpen(true);
                              console.log("Tentando abrir modal...");
                            }}
                            title="Iniciar Documentação"
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>


                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openViewModal(documento)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {documentos.length === 0 && (
                <TableRow className="dark:border-[#374151]">
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                  >
                    Nenhum documento encontrado nesta categoria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Determinar se deve usar scroll interno
  const shouldUseScroll = activeTab === "em-processo" || activeTab === "concluidos" || activeTab === "incluidos";
  const headerClasses = shouldUseScroll ? "bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200" : "";
  
  if (shouldUseScroll) {
    return (
      <>
        <div className="border rounded-lg dark:border-[#374151] dark:bg-[#111827] h-full flex flex-col">
          <div className="flex-1 overflow-y-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-[#111827] border-b dark:border-[#374151] z-10">
                <TableRow>
                  <TableHead className={headerClasses}>Origem</TableHead>
                  <TableHead className={headerClasses}>Nome</TableHead>
                  <TableHead className={headerClasses}>Incluído</TableHead>
                  <TableHead className={headerClasses}>Iniciado</TableHead>
                  {activeTab === "em-processo" && (
                    <TableHead className={headerClasses}>Fluxo Atual</TableHead>
                  )}
                  {!hideStatusColumn && (
                    <TableHead className={headerClasses}>Status</TableHead>
                  )}
                  {activeTab === "em-processo" && (
                    <TableHead className={`w-[120px] ${headerClasses}`}>Tsk.Status</TableHead>
                  )}
                  <TableHead className={`text-right ${headerClasses}`}>Ações</TableHead>
                </TableRow>
              </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
            <TableCell className="dark:bg-[#0F172A]">
              <div className="flex items-center">
                {documento.origem === "Monday" ? (
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                    Monday
                  </div>
                ) : (
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium">
                    {documento.origem}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium dark:bg-[#0F172A] dark:text-gray-200">{documento.objeto}</TableCell>
            <TableCell className="dark:bg-[#0F172A]">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {formatDate(documento.createdAt)}
              </div>
            </TableCell>
            <TableCell className="dark:bg-[#0F172A]">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {formatDate(documento.updatedAt)}
              </div>
            </TableCell>
            {activeTab === "em-processo" && (
              <TableCell className="dark:bg-[#0F172A]">
                {(() => {
                  const activeFlow = getActiveFlow(documento.id);
                  if (activeFlow) {
                    return (
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                        [{activeFlow.flowCode}] - {activeFlow.flowName}
                      </div>
                    );
                  }
                  return (
                    <div className="text-xs text-gray-400">
                      -
                    </div>
                  );
                })()}
              </TableCell>
            )}
            {!hideStatusColumn && (
              <TableCell className="dark:bg-[#0F172A]">
                <Badge
                  variant={getStatusBadgeVariant(documento.status) as any}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  {getStatusIcon(documento.status)}
                  {documento.status}
                </Badge>
              </TableCell>
            )}
            {activeTab === "em-processo" && (
              <TableCell className="dark:bg-[#0F172A]">
                {(() => {
                  if (!documento.taskState || documento.taskState === '') {
                    return (
                      <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-600 text-center flex justify-center">
                        Ação Pendente
                      </Badge>
                    );
                  } else if (documento.taskState === 'in_doc') {
                    return (
                      <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-600 text-center flex justify-center">
                        Documentando
                      </Badge>
                    );
                  } else if (documento.taskState === 'in_apr') {
                    return (
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-600 text-center flex justify-center">
                        Em aprovação
                      </Badge>
                    );
                  } else if (documento.taskState === 'ready_to_next') {
                    return (
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-600 text-center flex justify-center">
                        Edição Concluída
                      </Badge>
                    );
                  } else if (documento.taskState === 'completed') {
                    return (
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-600 text-center flex justify-center">
                        Concluído
                      </Badge>
                    );
                  } else if (documento.taskState === 'blocked') {
                    return (
                      <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-600 text-center flex justify-center">
                        Bloqueado
                      </Badge>
                    );
                  } else if (documento.taskState === 'review') {
                    return (
                      <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-600 text-center flex justify-center">
                        Em revisão
                      </Badge>
                    );
                  } else if (documento.taskState === 'ready_to_publish') {
                    return (
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-600 text-center flex justify-center">
                        Pronto para Publicar
                      </Badge>
                    );
                  } else if (documento.taskState === 'to_refact') {
                    return (
                      <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-600 text-center flex justify-center">
                        Necessária Revisão
                      </Badge>
                    );
                  } else {
                    return (
                      <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600 text-center flex justify-center">
                        {documento.taskState}
                      </Badge>
                    );
                  }
                })()}
              </TableCell>
            )}
            <TableCell className="text-right dark:bg-[#0F172A]">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openViewModal(documento)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {(activeTab === "em-processo" || activeTab === "concluidos") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleFlowButtonClick(e, documento)}
                    title="Mostrar diagrama do fluxo"
                  >
                    <Network className="h-4 w-4 text-purple-500" />
                    {(activeTab === "concluidos" || activeTab === "em-processo") && getDocumentFlows(documento.id).length > 1 && (
                      <ChevronDown className="h-3 w-3 ml-1 text-purple-500" />
                    )}
                  </Button>
                )}
                {activeTab === "em-processo" && handleResetDocument && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleResetDocument(documento)}
                    title="Reset documento - remove todo histórico e volta ao estado inicial"
                  >
                    <RotateCcw className="h-4 w-4 text-red-500" />
                  </Button>
                )}
                {(activeTab === "em-processo" || activeTab === "concluidos") && flowExecutionCounts[documento.id] && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
                    title="Número de fluxos executados"
                  >
                    {flowExecutionCounts[documento.id]}
                  </Badge>
                )}
                {activeTab === "incluidos" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditModal(documento)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteDocument(documento)}
                      disabled={deleteDocumentoMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {documentos.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={
                hideStatusColumn
                  ? (activeTab === "em-processo" ? 7 : 5)
                  : (activeTab === "em-processo" ? 8 : 6)
              }
              className="text-center py-6 text-gray-500 dark:text-gray-400 dark:bg-[#0F172A]"
            >
              Nenhum documento encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Dropdown de fluxos na posição do mouse */}
        {dropdown.isOpen && (
        <div
          className="fixed bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#374151] rounded-lg shadow-xl min-w-[250px] max-w-[400px]"
          style={{
            left: Math.max(10, dropdown.position.x),
            top: dropdown.position.y + 10,
            zIndex: 99999,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >

          <div className="max-h-64 overflow-y-auto">
            {dropdown.flows.map((flow, index) => {
              // Parse execution_data if it's a string
              const executionData = typeof flow.executionData === 'string' 
                ? JSON.parse(flow.executionData) 
                : flow.executionData || {};
              
              return (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-[#1F2937] cursor-pointer border-b border-gray-50 dark:border-[#374151] last:border-b-0"
                  onClick={() => {
                    openFlowDiagramModal(flow);
                    setDropdown(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-200 mb-1">
                        {executionData.flowName || flow.flowName || flow.name || "Fluxo sem nome"}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          flow.status === "concluded" 
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                            : flow.status === "finished"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : flow.status === "initiated"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : flow.status === "transfered"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                            : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                        }`}>
                          {flow.status === "concluded" ? "Concluído" : 
                           flow.status === "initiated" ? "Em andamento" :
                           flow.status === "transfered" ? "Transferido" : 
                           flow.status === "finished" ? "Encerrado" :
                           flow.status}
                        </span>
                        {flow.createdAt && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(flow.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Network className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
    );
  }

  // Versão sem scroll para outras tabs
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Incluído</TableHead>
            <TableHead>Iniciado</TableHead>
            {!hideStatusColumn && (
              <TableHead>Status</TableHead>
            )}
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
              <TableCell className="dark:bg-[#0F172A]">
                <div className="flex items-center">
                  {documento.origem === "Monday" ? (
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                      Monday
                    </div>
                  ) : (
                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium">
                      {documento.origem}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium dark:bg-[#0F172A] dark:text-gray-200">{documento.objeto}</TableCell>
              <TableCell className="dark:bg-[#0F172A]">
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatDate(documento.createdAt)}
                </div>
              </TableCell>
              <TableCell className="dark:bg-[#0F172A]">
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {formatDate(documento.updatedAt)}
                </div>
              </TableCell>
              {!hideStatusColumn && (
                <TableCell className="dark:bg-[#0F172A]">
                  <Badge
                    variant={getStatusBadgeVariant(documento.status) as any}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    {getStatusIcon(documento.status)}
                    {documento.status}
                  </Badge>
                </TableCell>
              )}
              <TableCell className="text-right dark:bg-[#0F172A]">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openViewModal(documento)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditModal(documento)}
                  >
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteDocument(documento)}
                    disabled={deleteDocumentoMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {documentos.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={hideStatusColumn ? 5 : 6}
                className="text-center py-6 text-gray-500 dark:text-gray-400 dark:bg-[#0F172A]"
              >
                Nenhum documento encontrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}