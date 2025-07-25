import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { type Documento } from "@shared/schema";

interface IntegradosTabProps {
  isLoading: boolean;
  filtros: {
    responsavel: string;
    modulo: string;
    cliente: string;
    statusOrigem: string;
    arquivos: string;
    nome: string;
  };
  setFiltros: React.Dispatch<React.SetStateAction<{
    responsavel: string;
    modulo: string;
    cliente: string;
    statusOrigem: string;
    arquivos: string;
    nome: string;
  }>>;
  responsaveisUnicos: string[];
  modulosUnicos: string[];
  clientesUnicos: string[];
  statusOrigensUnicos: string[];
  renderDocumentosTable: (documentos: Documento[], showFilters?: boolean) => JSX.Element;
  documentosIntegrados: Documento[];
  showFilters?: boolean;
}

export function IntegradosTab({
  isLoading,
  filtros,
  setFiltros,
  responsaveisUnicos,
  modulosUnicos,
  clientesUnicos,
  statusOrigensUnicos,
  renderDocumentosTable,
  documentosIntegrados,
  showFilters = true,
}: IntegradosTabProps) {
  return (
    <TabsContent value="integrados" className="slide-in">
      {/* Filtros */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-[#0F172A] rounded-lg border dark:border-[#374151]">
        <div className="flex items-center justify-end mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFiltros({
                responsavel: "",
                modulo: "",
                cliente: "",
                statusOrigem: "",
                arquivos: "",
                nome: "",
              })
            }
            className="text-xs dark:border-gray-600 dark:hover:bg-[#1F2937] dark:text-gray-200"
          >
            Limpar filtros
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Filtro por Nome */}
          <div>
            <Label htmlFor="filtro-nome" className="text-xs dark:text-gray-200">
              Nome
            </Label>
            <Input
              id="filtro-nome"
              placeholder="Filtrar por nome..."
              value={filtros.nome}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, nome: e.target.value }))
              }
              className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200"
            />
          </div>

          {/* Filtro por Responsável */}
          <div>
            <Label htmlFor="filtro-responsavel" className="text-xs dark:text-gray-200">
              Responsável
            </Label>
            <Select
              value={filtros.responsavel}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, responsavel: value }))
              }
            >
              <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                <SelectItem value="__todos__">Todos</SelectItem>
                {responsaveisUnicos.map((responsavel) => (
                  <SelectItem key={responsavel} value={responsavel}>
                    {responsavel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Módulo */}
          <div>
            <Label htmlFor="filtro-modulo" className="text-xs dark:text-gray-200">
              Módulo
            </Label>
            <Select
              value={filtros.modulo}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, modulo: value }))
              }
            >
              <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                <SelectItem value="__todos__">Todos</SelectItem>
                {modulosUnicos.map((modulo) => (
                  <SelectItem key={modulo} value={modulo}>
                    {modulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Cliente */}
          <div>
            <Label htmlFor="filtro-cliente" className="text-xs dark:text-gray-200">
              Cliente
            </Label>
            <Select
              value={filtros.cliente}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, cliente: value }))
              }
            >
              <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                <SelectItem value="__todos__">Todos</SelectItem>
                {clientesUnicos.map((cliente) => (
                  <SelectItem key={cliente} value={cliente}>
                    {cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Status Origem */}
          <div>
            <Label htmlFor="filtro-status-origem" className="text-xs dark:text-gray-200">
              Status Origem
            </Label>
            <Select
              value={filtros.statusOrigem}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, statusOrigem: value }))
              }
            >
              <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                <SelectItem value="__todos__">Todos</SelectItem>
                {statusOrigensUnicos.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Arquivos */}
          <div>
            <Label htmlFor="filtro-arquivos" className="text-xs dark:text-gray-200">
              Arquivos
            </Label>
            <Select
              value={filtros.arquivos}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, arquivos: value }))
              }
            >
              <SelectTrigger className="h-8 text-sm dark:bg-[#0F172A] dark:border-[#374151] dark:text-gray-200">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#0F172A] dark:border-[#374151]">
                <SelectItem value="__todos__">Todos</SelectItem>
                <SelectItem value="sem-arquivos">Sem arquivos</SelectItem>
                <SelectItem value="a-sincronizar">
                  A sincronizar
                </SelectItem>
                <SelectItem value="sincronizados">
                  Sincronizados
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6 dark:text-gray-200">Carregando documentos...</div>
      ) : (
        renderDocumentosTable(documentosIntegrados, showFilters)
      )}
    </TabsContent>
  );
}