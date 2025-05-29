export type DocumentoStatus = 'Incluido' | 'Integrado' | 'Processando' | 'Concluido';
export type DocumentoStatusOrigem = 'Manual' | 'Incluido' | 'Em CRP' | 'Em Aprovação' | 'Em DRP' | 'Concluido';

export interface DocumentoFiltros {
  responsavel?: string;
  modulo?: string;
  cliente?: string;
  statusOrigem?: string;
  arquivos?: string;
  nome?: string;
}

export interface Documento {
  id: number;
  origem: string;
  objeto: string;
  status: DocumentoStatus;
  statusOrigem: DocumentoStatusOrigem;
  nome: string;
  tipo: string;
  dataCriacao: string;
  responsavel?: string;
  modulo?: string;
  cliente?: string;
  arquivos?: DocumentArtifact[];
}

export interface InsertDocumento {
  origem: string;
  objeto: string;
  tipo?: string;
  cliente?: string;
  responsavel?: string;
  sistema?: string;
  modulo?: string;
  descricao?: string;
  status: DocumentoStatus;
  statusOrigem: DocumentoStatusOrigem;
  solicitante?: string;
  aprovador?: string;
  agente?: string;
}

export interface DocumentArtifact {
  id: string;
  documentoId: string;
  name: string;
  fileData: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  type: string;
  originAssetId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InsertDocumentArtifact {
  documentoId: string;
  name: string;
  fileData: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  type: string;
} 