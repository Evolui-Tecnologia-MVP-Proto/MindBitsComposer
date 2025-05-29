import { DocumentoFiltros } from "@/types/documentos";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DocumentoFiltersProps {
  filtros: DocumentoFiltros;
  onFiltrosChange: (filtros: DocumentoFiltros) => void;
}

export function DocumentoFilters({ filtros, onFiltrosChange }: DocumentoFiltersProps) {
  const handleChange = (field: keyof DocumentoFiltros, value: string) => {
    onFiltrosChange({
      ...filtros,
      [field]: value && value !== "all" ? value : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          value={filtros.nome || ""}
          onChange={(e) => handleChange("nome", e.target.value)}
          placeholder="Buscar por nome..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsavel">Responsável</Label>
        <Input
          id="responsavel"
          value={filtros.responsavel || ""}
          onChange={(e) => handleChange("responsavel", e.target.value)}
          placeholder="Filtrar por responsável..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modulo">Módulo</Label>
        <Select
          value={filtros.modulo || "all"}
          onValueChange={(value) => handleChange("modulo", value === "all" ? undefined : value)}
        >
          <SelectTrigger id="modulo">
            <SelectValue placeholder="Selecione o módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="CRM">CRM</SelectItem>
            <SelectItem value="ERP">ERP</SelectItem>
            <SelectItem value="Financeiro">Financeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cliente">Cliente</Label>
        <Input
          id="cliente"
          value={filtros.cliente || ""}
          onChange={(e) => handleChange("cliente", e.target.value)}
          placeholder="Filtrar por cliente..."
        />
      </div>
    </div>
  );
} 