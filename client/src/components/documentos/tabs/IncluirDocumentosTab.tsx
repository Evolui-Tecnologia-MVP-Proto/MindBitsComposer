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
} from "lucide-react";
import { type Documento } from "@shared/schema";

interface IncluirDocumentosTabProps {
  documentos: Documento[];
  isLoading: boolean;
  artifactCounts: Record<string, number>;
  openViewModal: (documento: Documento) => void;
  openEditModal: (documento: Documento) => void;
  handleDeleteDocument: (documento: Documento) => void;
}

export function IncluirDocumentosTab({
  documentos,
  isLoading,
  artifactCounts,
  openViewModal,
  openEditModal,
  handleDeleteDocument,
}: IncluirDocumentosTabProps) {
  return (
    <TabsContent value="incluidos" className="slide-in">
      {isLoading ? (
        <div className="text-center py-6">Carregando documentos...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Objeto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Status Origem</TableHead>
              <TableHead>Anexos</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Ações</TableHead>
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