import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import {
  Eye,
  Pencil,
  Trash2,
  File,
  RefreshCw,
  Plus,
} from "lucide-react";
import { type Documento } from "@shared/schema";

interface IncluirDocumentosTabProps {
  documentos: Documento[];
  isLoading: boolean;
  artifactCounts: Record<string, number>;
  openViewModal: (documento: Documento) => void;
  openEditModal: (documento: Documento) => void;
  handleDeleteDocument: (documento: Documento) => void;
  onRefresh: () => void;
  onCreateDocument: () => void;
}

export function IncluirDocumentosTab({
  documentos,
  isLoading,
  artifactCounts,
  openViewModal,
  openEditModal,
  handleDeleteDocument,
  onRefresh,
  onCreateDocument,
}: IncluirDocumentosTabProps) {
  return (
    <TabsContent value="incluidos" className="slide-in">
      {/* Cabeçalho com botões */}
      <div className="flex items-center justify-end p-4 rounded-lg bg-gray-50 dark:bg-[#0F172A] mb-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={onRefresh}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-[#1F2937] dark:text-gray-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button
            onClick={onCreateDocument}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-[#1E40AF] dark:hover:bg-[#1E40AF]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Incluir Documento
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        <div className="border rounded-lg dark:border-[#374151] dark:bg-[#111827]">
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-[#111827] z-10 shadow-sm">
              <TableRow>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Origem</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Objeto</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Status</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Status Origem</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Anexos</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Criado em</TableHead>
                <TableHead className="bg-gray-50 dark:bg-[#111827] border-b dark:border-[#374151] dark:text-gray-200">Ações</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {documentos
              ?.filter((doc) => doc.status === "Incluido")
              .map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-800 border-purple-200"
                    >
                      {documento.origem}
                    </Badge>
                  </TableCell>
                  <TableCell>{documento.objeto}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 border-green-200"
                    >
                      {documento.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {documento.statusOrigem}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800"
                    >
                      {artifactCounts[documento.id] || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {documento.createdAt
                      ? new Date(documento.createdAt).toLocaleDateString(
                          "pt-BR",
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openViewModal(documento)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(documento)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteDocument(documento)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
          </Table>
        </div>
      )}

      {documentos?.filter((doc) => doc.status === "Incluido").length ===
        0 &&
        !isLoading && (
          <div className="text-center py-12">
            <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum documento incluído
            </h3>
            <p className="text-gray-500">
              Documentos com status "Incluído" aparecerão aqui.
            </p>
          </div>
        )}
    </TabsContent>
  );
}