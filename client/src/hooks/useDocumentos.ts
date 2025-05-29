import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  type Documento, 
  type InsertDocumento, 
  type DocumentoFiltros,
  type DocumentArtifact,
  type InsertDocumentArtifact
} from '@/types/documentos';

export function useDocumentos() {
  const [filtros, setFiltros] = useState<DocumentoFiltros>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar documentos
  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ['/api/documentos'],
  });

  // Buscar contagem de anexos
  const { data: artifactCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['/api/documentos/artifacts-count'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const documento of documentos) {
        try {
          const response = await fetch(`/api/documentos/${documento.id}/artifacts`);
          if (response.ok) {
            const artifacts = await response.json();
            counts[documento.id] = artifacts.length;
          } else {
            counts[documento.id] = 0;
          }
        } catch {
          counts[documento.id] = 0;
        }
      }
      return counts;
    },
    enabled: documentos.length > 0,
  });

  // Mutation para criar documento
  const createDocumentoMutation = useMutation({
    mutationFn: async (data: InsertDocumento) => {
      const response = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar documento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      toast({
        title: 'Documento criado!',
        description: 'O documento foi criado com sucesso.',
      });
    },
  });

  // Mutation para atualizar documento
  const updateDocumentoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertDocumento }) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar documento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      toast({
        title: 'Documento atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
  });

  // Mutation para excluir documento
  const deleteDocumentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documentos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao excluir documento');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documentos'] });
      toast({
        title: 'Documento excluído',
        description: 'O documento foi excluído com sucesso.',
      });
    },
  });

  // Filtrar documentos
  const filteredDocumentos = useMemo(() => {
    return documentos.filter((doc) => {
      if (filtros.responsavel && !doc.responsavel?.toLowerCase().includes(filtros.responsavel.toLowerCase())) {
        return false;
      }
      if (filtros.modulo && !doc.modulo?.toLowerCase().includes(filtros.modulo.toLowerCase())) {
        return false;
      }
      if (filtros.cliente && !doc.cliente?.toLowerCase().includes(filtros.cliente.toLowerCase())) {
        return false;
      }
      if (filtros.statusOrigem && doc.statusOrigem !== filtros.statusOrigem) {
        return false;
      }
      if (filtros.nome && !doc.objeto?.toLowerCase().includes(filtros.nome.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [documentos, filtros]);

  return {
    documentos: filteredDocumentos,
    isLoading,
    filtros,
    setFiltros,
    createDocumentoMutation,
    updateDocumentoMutation,
    deleteDocumentoMutation,
    artifactCounts,
  };
} 