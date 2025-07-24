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

  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = () => {
      setDropdown(prev => ({ ...prev, isOpen: false }));
    };

    if (dropdown.isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [dropdown.isOpen]);

  const getDocumentFlows = (documentId: string) => {
    return flowExecutions?.filter(execution => execution.documentId === documentId) || [];
  };

  const handleFlowButtonClick = (e: React.MouseEvent, documento: Documento) => {
    e.stopPropagation();
    
    const flows = getDocumentFlows(documento.id);
    
    if (flows.length === 0) {
      return;
    }
    
    if (flows.length === 1) {
      openFlowDiagramModal(flows[0]);
      return;
    }
    
    // Multiple flows - show dropdown
    setDropdown({
      isOpen: true,
      documentId: documento.id,
      position: { x: e.clientX, y: e.clientY },
      flows: flows,
    });
  };

  // Render for integrados tab with fixed header structure
  if (activeTab === "integrados") {
    return (
      <div className="border rounded-lg dark:border-[#374151] dark:bg-[#111827]">
        <Table>
          <TableHeader className="bg-white dark:bg-[#111827] border-b dark:border-[#374151]">
            <TableRow>
              <TableHead className="w-[130px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Origem
              </TableHead>
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Nome
              </TableHead>
              <TableHead className="w-[120px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                ID no Sistema
              </TableHead>
              <TableHead className="w-[120px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Incluído
              </TableHead>
              <TableHead className="w-[120px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Anexos
              </TableHead>
              <TableHead className="w-[100px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Status
              </TableHead>
              <TableHead className="text-right bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        <div className="max-h-[calc(100vh-590px)] overflow-y-auto">
          <Table>
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead className="w-[130px]">Origem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[120px]">ID no Sistema</TableHead>
                <TableHead className="w-[120px]">Incluído</TableHead>
                <TableHead className="w-[120px]">Anexos</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow key={documento.id} className="dark:border-[#374151]">
                  <TableCell>
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
                  <TableCell className="font-medium dark:text-gray-300">
                    {documento.objeto}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {documento.systemId || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {formatDate(documento.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {documento.assetsSynced && (
                      <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded text-xs font-medium">
                        Sincronizado
                      </div>
                    )}
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

  // Render for other tabs with fixed header structure
  return (
    <>
      <div className="border rounded-lg dark:border-[#374151] dark:bg-[#111827]">
        <Table>
          <TableHeader className="bg-white dark:bg-[#111827] border-b dark:border-[#374151]">
            <TableRow>
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Origem
              </TableHead>
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Nome
              </TableHead>
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Incluído
              </TableHead>
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Iniciado
              </TableHead>
              {activeTab === "em-processo" && (
                <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                  Fluxo Atual
                </TableHead>
              )}
              <TableHead className="bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Status
              </TableHead>
              {activeTab === "em-processo" && (
                <TableHead className="w-[120px] bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                  Tsk.Status
                </TableHead>
              )}
              <TableHead className="text-right bg-gray-50 dark:bg-[#111827] dark:text-gray-200">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        <div className="max-h-[calc(100vh-590px)] overflow-y-auto">
          <Table>
            <TableHeader className="sr-only">
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
                <TableRow key={documento.id} className="dark:border-[#374151]">
                  <TableCell>
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
                  <TableCell className="font-medium dark:text-gray-300">{documento.objeto}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {formatDate(documento.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
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
                            <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-600">
                              Ação Pendente
                            </Badge>
                          );
                        } else if (documento.taskState === 'in_doc') {
                          return (
                            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-600">
                              Documentando
                            </Badge>
                          );
                        } else if (documento.taskState === 'in_apr') {
                          return (
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-600">
                              Em aprovação
                            </Badge>
                          );
                        } else if (documento.taskState === 'completed') {
                          return (
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-600">
                              Concluído
                            </Badge>
                          );
                        } else if (documento.taskState === 'blocked') {
                          return (
                            <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-600">
                              Bloqueado
                            </Badge>
                          );
                        } else if (documento.taskState === 'review') {
                          return (
                            <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-600">
                              Em revisão
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600">
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
                          {(activeTab === "concluidos" || activeTab === "em-processo") && getDocumentFlows(documento.id).length > 1 && (
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
                <TableRow className="dark:border-[#374151]">
                  <TableCell
                    colSpan={activeTab === "em-processo" ? 8 : 6}
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
                            : flow.status === "initiated"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : flow.status === "transfered"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                            : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                        }`}>
                          {flow.status === "concluded" ? "Concluído" : 
                           flow.status === "initiated" ? "Em andamento" :
                           flow.status === "transfered" ? "Transferido" : 
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