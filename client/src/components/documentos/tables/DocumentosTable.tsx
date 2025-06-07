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
  setSelectedDocument: (documento: Documento | null) => void;
  setIsDocumentationModalOpen: (isOpen: boolean) => void;
  isDocumentationModalOpen: boolean;
  deleteDocumentoMutation: any;
  getActiveFlow: (documentId: string) => any;
  getConcludedFlow: (documentId: string) => any;
  openFlowDiagramModal: (execution: any) => void;
  flowExecutions?: any[];
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
  setSelectedDocument,
  setIsDocumentationModalOpen,
  isDocumentationModalOpen,
  deleteDocumentoMutation,
  getActiveFlow,
  getConcludedFlow,
  openFlowDiagramModal,
  flowExecutions = [],
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
      (execution.status === "concluded" || execution.status === "initiated" || execution.status === "completed" || execution.status === "transfered")
    );
  };

  const handleFlowButtonClick = (evento: React.MouseEvent, documento: Documento) => {
    evento.preventDefault();
    evento.stopPropagation();


    
    // Documentos que sabemos que têm fluxos pelos logs:
    const knownFlowDocuments = ["c382deea-21da-493d-8d6d-892ad0e45a31", "2f0078c9-71b4-4485-ba24-fd7bce9ae19f", "9ef9937a-5e02-45af-9d71-e5fb26b71a5e"];
    if (knownFlowDocuments.includes(documento.id)) {
      console.log("🔴 DROPDOWN: ATENÇÃO - Este documento deveria ter fluxos!", documento.id);
    }

    if (activeTab === "concluidos") {
      const documentFlows = getDocumentFlows(documento.id);
      console.log("🔴 DROPDOWN: Fluxos encontrados para", documento.id, ":", documentFlows);
      

      
      if (documentFlows.length >= 1) {
        console.log("🔴 DROPDOWN: Fluxos encontrados - abrindo dropdown");
        // Mostrar dropdown sempre que há fluxos (mesmo que seja apenas 1)
        setDropdown({
          isOpen: true,
          documentId: documento.id,
          position: { x: evento.clientX - 340, y: evento.clientY },
          flows: documentFlows,
        });
      } else {

        // Fallback para o método original
        const flowToShow = getConcludedFlow(documento.id);
        if (flowToShow) {

          openFlowDiagramModal({
            flowTasks: flowToShow,
            document: { objeto: documento.objeto }
          });
        } else {
          console.log("🔴 DROPDOWN: Nenhum fluxo encontrado para:", documento.id);
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
      <div className="border rounded-lg">
        <div className="max-h-[calc(100vh-450px)] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="bg-gray-50 border-b w-[130px]">
                  Origem
                </TableHead>
                <TableHead className="bg-gray-50 border-b">Nome</TableHead>
                <TableHead className="bg-gray-50 border-b">Status</TableHead>
                <TableHead className="bg-gray-50 border-b w-[155px]">
                  Data Integração
                </TableHead>
                <TableHead className="bg-gray-50 border-b">
                  Status Origem
                </TableHead>
                <TableHead className="bg-gray-50 border-b">Anexos</TableHead>
                <TableHead className="bg-gray-50 border-b text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-compact">
              {documentos.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {documento.origem === "Monday" ? (
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          Monday
                        </div>
                      ) : (
                        <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                          {documento.origem}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
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
                  <TableCell className="text-xs text-gray-500">
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
                              className="bg-gray-100 text-gray-500 border-gray-300"
                            >
                              none
                            </Badge>
                          );
                        } else {
                          // Badge amarelo com "files" quando tem conteúdo
                          return (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-700 border-yellow-300"
                            >
                              files
                            </Badge>
                          );
                        }
                      })()}

                      {/* Badge sync verde quando assets_synced é true */}
                      {documento.assetsSynced && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-300"
                        >
                          sync
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {activeTab === "integrados" && (
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
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-gray-500"
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Incluído</TableHead>
            <TableHead>Iniciado</TableHead>
            {activeTab === "em-processo" && <TableHead>Fluxo Atual</TableHead>}
            <TableHead>Status</TableHead>
            {activeTab === "em-processo" && <TableHead className="w-[120px]">Tsk.Status</TableHead>}
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento) => (
            <TableRow key={documento.id}>
            <TableCell>
              <div className="flex items-center">
                {documento.origem === "Monday" ? (
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    Monday
                  </div>
                ) : (
                  <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                    {documento.origem}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium">{documento.objeto}</TableCell>
            <TableCell>
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {formatDate(documento.createdAt)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {formatDate(documento.updatedAt)}
              </div>
            </TableCell>
            {activeTab === "em-processo" && (
              <TableCell>
                {(() => {
                  const activeFlow = getActiveFlow(documento.id);
                  if (activeFlow) {
                    return (
                      <div className="flex items-center text-gray-500 text-sm">
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
            <TableCell>
              <Badge
                variant={getStatusBadgeVariant(documento.status) as any}
                className="flex items-center gap-1 whitespace-nowrap"
              >
                {getStatusIcon(documento.status)}
                {documento.status}
              </Badge>
            </TableCell>
            {activeTab === "em-processo" && (
              <TableCell>
                {(() => {
                  if (!documento.taskState || documento.taskState === '') {
                    return (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Ação Pendente
                      </Badge>
                    );
                  } else if (documento.taskState === 'in_doc') {
                    return (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                        Documentando
                      </Badge>
                    );
                  } else if (documento.taskState === 'in_apr') {
                    return (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                        Em aprovação
                      </Badge>
                    );
                  } else {
                    return (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
                        {documento.taskState}
                      </Badge>
                    );
                  }
                })()}
              </TableCell>
            )}
            <TableCell className="text-right">
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
                    {activeTab === "concluidos" && getDocumentFlows(documento.id).length > 1 && (
                      <ChevronDown className="h-3 w-3 ml-1 text-purple-500" />
                    )}
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
                {activeTab !== "integrados" && activeTab !== "em-processo" && activeTab !== "concluidos" && (
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
              colSpan={activeTab === "integrados" ? 7 : activeTab === "em-processo" ? 8 : 6}
              className="text-center py-6 text-gray-500"
            >
              Nenhum documento encontrado nesta categoria.
            </TableCell>
          </TableRow>
        )}
        </TableBody>
      </Table>

      {/* Dropdown de fluxos na posição do mouse */}
      {dropdown.isOpen && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl min-w-[250px] max-w-[400px]"
          style={{
            left: Math.max(10, dropdown.position.x),
            top: dropdown.position.y + 10,
            zIndex: 99999,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-medium text-sm text-gray-900">Fluxos Associados</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecione um fluxo para visualizar o diagrama
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {dropdown.flows.map((flow, index) => {
              // Parse execution_data if it's a string
              const executionData = typeof flow.executionData === 'string' 
                ? JSON.parse(flow.executionData) 
                : flow.executionData || {};
              
              return (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                  onClick={() => {
                    openFlowDiagramModal({
                      flowTasks: flow.flowTasks || flow,
                      document: { objeto: documentos.find(doc => doc.id === dropdown.documentId)?.objeto || "Documento" }
                    });
                    setDropdown(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 mb-1">
                        {executionData.flowName || flow.flowName || flow.name || "Fluxo sem nome"}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        ID: {flow.id || "N/A"}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          flow.status === "concluded" 
                            ? "bg-green-100 text-green-700" 
                            : flow.status === "initiated"
                            ? "bg-blue-100 text-blue-700"
                            : flow.status === "transfered"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {flow.status === "concluded" ? "Concluído" : 
                           flow.status === "initiated" ? "Em andamento" :
                           flow.status === "transfered" ? "Transferido" : 
                           flow.status}
                        </span>
                        {flow.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(flow.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Network className="h-4 w-4 text-purple-500" />
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