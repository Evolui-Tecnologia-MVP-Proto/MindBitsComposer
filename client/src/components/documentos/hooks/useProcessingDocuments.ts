import { useMemo } from "react";
import { type Documento } from "@shared/schema";

interface Filtros {
  responsavel: string;
  modulo: string;
  cliente: string;
  origem: string;
  nome: string;
}

export function useProcessingDocuments(
  documentos: Documento[] | undefined,
  artifactCounts: Record<string, number>,
  filtros: Filtros
) {
  const filteredAndSortedDocumentos = useMemo(() => {
    if (!documentos) return [];

    // Aplicar filtros
    const filtered = documentos.filter((doc) => {
      // Filtro por responsável
      if (
        filtros.responsavel !== "__todos__" &&
        filtros.responsavel &&
        doc.responsavel !== filtros.responsavel
      ) {
        return false;
      }

      // Filtro por módulo
      if (
        filtros.modulo !== "__todos__" &&
        filtros.modulo &&
        doc.modulo !== filtros.modulo
      ) {
        return false;
      }

      // Filtro por cliente
      if (
        filtros.cliente !== "__todos__" &&
        filtros.cliente &&
        !doc.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())
      ) {
        return false;
      }

      // Filtro por origem
      if (
        filtros.origem !== "__todos__" &&
        filtros.origem &&
        doc.origem !== filtros.origem
      ) {
        return false;
      }

      // Filtro por nome/objeto
      if (
        filtros.nome &&
        !doc.objeto?.toLowerCase().includes(filtros.nome.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    // Ordenação alfabética por nome (objeto)
    filtered.sort((a, b) => {
      const nomeA = a.objeto?.toLowerCase() || "";
      const nomeB = b.objeto?.toLowerCase() || "";
      return nomeA.localeCompare(nomeB);
    });

    return filtered;
  }, [documentos, filtros, artifactCounts]);

  // Filtrar documentos por status
  const documentosProcessando = useMemo(
    () => filteredAndSortedDocumentos.filter((doc) => doc.status === "Em Processo"),
    [filteredAndSortedDocumentos]
  );

  return {
    documentosProcessando,
    filteredAndSortedDocumentos,
  };
}