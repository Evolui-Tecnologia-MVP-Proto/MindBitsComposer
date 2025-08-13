import { pgTable, text, serial, timestamp, boolean, json, uuid, integer, bigint, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export enum UserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  USER = "USER"
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING"
}

export enum TemplateType {
  STRUCT = "struct",
  OUTPUT = "output"
}

export enum PluginStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DEVELOPMENT = "development"
}

// Plugin types are now loaded dynamically from system_params table
// This enum is kept for backward compatibility but is no longer restrictive
export enum PluginType {
  DATA_SOURCE = "DATA_SOURCE",
  AI_AGENT = "AI_AGENT", 
  CHART = "CHART",
  FORMATTER = "FORMATTER",
  INTEGRATION = "INTEGRATION",
  UTILITY = "UTILITY",
  WORKFLOW = "WORKFLOW",
  COMPOSER = "COMPOSER",
  DOCUMENT = "DOCUMENT",
  COMPOSER_ASSET = "COMPOSER_ASSET",
  DOCUMENT_PART = "DOCUMENT_PART",
  FLUX_ANALISER = "FLUX_ANALISER",
  FLUX_VALIDATOR = "FLUX_VALIDATOR"
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["ADMIN", "EDITOR", "USER"] }).notNull().default("USER"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE", "PENDING"] }).notNull().default("ACTIVE"),
  avatarUrl: text("avatar_url").default(""),
  mustChangePassword: boolean("must_change_password").default(false),
  flowProcessAcs: json("flow_process_acs").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["struct", "output"] }).notNull(),
  structure: json("structure").notNull(),
  mappings: json("mappings").$type<Record<string, string>>().default({}),
  repoPath: text("repo_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mondayMappings = pgTable("monday_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  boardId: text("board_id").notNull(),
  quadroMonday: text("quadro_monday").default(""),
  statusColumn: text("status_column").default(""),
  responsibleColumn: text("responsible_column").default(""),
  mappingFilter: text("mapping_filter").default(""),
  defaultValues: json("default_values").$type<Record<string, string>>().default({}),
  assetsMappings: json("assets_mappings").$type<Array<{id: string, columnId: string, columnTitle: string}>>().default([]),
  schedulesParams: json("schedules_params").$type<{enabled: boolean, frequency: string, time: string, days: string[]}>().default({enabled: false, frequency: "daily", time: "09:00", days: []}),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mondayColumns = pgTable("monday_columns", {
  id: uuid("id").defaultRandom().primaryKey(),
  mappingId: uuid("mapping_id").notNull().references(() => mondayMappings.id, { onDelete: "cascade" }),
  columnId: text("column_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mappingColumns = pgTable("mapping_columns", {
  id: uuid("id").defaultRandom().primaryKey(),
  mappingId: uuid("mapping_id").notNull().references(() => mondayMappings.id, { onDelete: "cascade" }),
  mondayColumnId: text("monday_column_id").notNull(),
  mondayColumnTitle: text("monday_column_title").notNull(),
  cpxField: text("cpx_field").notNull(),
  transformFunction: text("transform_function").default(""),
  isKey: boolean("is_key").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceConnections = pgTable("service_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceName: text("service_name").notNull().unique(),
  token: text("token").notNull(),
  description: text("description").default(""),
  parameters: text("parameters").array().default([]), // Array para armazenar parâmetros específicos do serviço
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const plugins = pgTable("plugins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // Plugin types are now loaded dynamically from system_params
  status: text("status").$type<PluginStatus>().notNull().default(PluginStatus.INACTIVE),
  version: text("version").notNull().default("1.0.0"),
  author: text("author"),
  icon: text("icon").default("Puzzle"),
  pageName: text("page_name"), // Nome da página do plugin para invocação
  configuration: json("configuration").$type<Record<string, any>>().default({}),
  endpoints: json("endpoints").$type<Record<string, string>>().default({}),
  permissions: json("permissions").$type<string[]>().default([]),
  dependencies: json("dependencies").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMondayMappingSchema = createInsertSchema(mondayMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMondayColumnSchema = createInsertSchema(mondayColumns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMappingColumnSchema = createInsertSchema(mappingColumns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceConnectionSchema = createInsertSchema(serviceConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPluginSchema = createInsertSchema(plugins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertMondayMapping = z.infer<typeof insertMondayMappingSchema>;
export type MondayMapping = typeof mondayMappings.$inferSelect;

export type InsertMondayColumn = z.infer<typeof insertMondayColumnSchema>;
export type MondayColumn = typeof mondayColumns.$inferSelect;

export type InsertMappingColumn = z.infer<typeof insertMappingColumnSchema>;
export type MappingColumn = typeof mappingColumns.$inferSelect;

export type InsertServiceConnection = z.infer<typeof insertServiceConnectionSchema>;
export type ServiceConnection = typeof serviceConnections.$inferSelect;

export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type Plugin = typeof plugins.$inferSelect;

// Documentos table
export const documentos = pgTable("documentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  origem: text("origem").notNull(),
  objeto: text("objeto").notNull(),
  tipo: text("tipo").notNull().default(""),
  cliente: text("cliente").notNull(),
  responsavel: text("responsavel").notNull(),
  sistema: text("sistema").notNull(),
  modulo: text("modulo").notNull(),
  descricao: text("descricao").notNull(),
  status: text("status").notNull().default("Processando"),
  statusOrigem: text("status_origem").notNull().default("Incluido"),
  solicitante: text("solicitante").notNull().default(""),
  aprovador: text("aprovador").notNull().default(""),
  agente: text("agente").notNull().default(""),
  taskState: text("task_state"), // Estado da tarefa: null/branco="Ação Pendente", "in_doc"="Documentando", "in_apr"="Em aprovação"
  idOrigem: bigint("id_origem", { mode: "bigint" }), // Campo para mapeamento com Monday.com
  idOrigemTxt: text("id_origem_txt"), // Campo texto para IDs externos (evita problemas de conversão)
  generalColumns: json("general_columns").$type<Record<string, any>>().default({}), // Armazena dados extras do sistema de origem
  mondayItemValues: json("monday_item_values").$type<Record<string, any>>().default({}), // Armazena valores dos itens do Monday.com
  assetsSynced: boolean("assets_synced").default(false), // Indica se os anexos foram sincronizados com sucesso
  userId: integer("user_id").references(() => users.id), // Associação opcional com usuário
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documentos schema
export const insertDocumentoSchema = createInsertSchema(documentos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumento = z.infer<typeof insertDocumentoSchema>;
export type Documento = typeof documentos.$inferSelect;

// Documents Artifacts table
export const documentsArtifacts = pgTable("documents_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentoId: uuid("documento_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileData: text("file_data").default(""), // Armazena fisicamente o arquivo como Base64
  fileName: text("file_name").default(""), // Nome original do arquivo
  fileSize: text("file_size"), // Tamanho do arquivo em bytes
  mimeType: text("mime_type").default("application/octet-stream"), // Tipo MIME do arquivo
  type: text("type").default("unknown"), // doc, pdf, txt, json, imagem, etc.
  originAssetId: text("origin_asset_id"), // ID do asset de origem (ex: Monday.com)
  isImage: text("is_image"), // Se é imagem ("true"/"false")
  mondayColumn: text("monday_column"), // Coluna Monday.com de origem do anexo
  fileMetadata: text("file_metadata"), // Metadados específicos do arquivo (ex: definição Mermaid)
  description: text("description").default(""), // Descrição opcional do artefato
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global Assets table - Assets accessible system-wide, not tied to specific documents
export const globalAssets = pgTable("global_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  fileData: text("file_data").default(""), // Stores file as Base64
  fileName: text("file_name").default(""), // Original file name
  fileSize: text("file_size"), // File size in bytes
  mimeType: text("mime_type").default("application/octet-stream"), // MIME type
  type: text("type").default("unknown"), // doc, pdf, txt, json, image, etc.
  isImage: text("is_image").default("false"), // Whether it's an image ("true"/"false")
  uploadedBy: integer("uploaded_by").references(() => users.id), // User who uploaded
  description: text("description").default(""), // Optional description
  tags: text("tags").default(""), // Comma-separated tags for organization
  fileMetadata: text("file_metadata"), // Metadata específicos do arquivo (ex: definições tldraw, Mermaid)
  editor: text("editor"), // Editor/plugin que criou o asset (ex: Graph_TLD, Mermaid, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Logs table
export const systemLogs = pgTable("app_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(), // Identificador do tipo de evento
  message: text("message").notNull(), // Mensagem descritiva do log
  parameters: json("parameters").$type<Record<string, any>>().default({}), // Parâmetros em formato JSON
  timestamp: timestamp("timestamp").defaultNow().notNull(), // Horário do evento
  userId: integer("user_id").references(() => users.id), // Usuário que executou a ação (opcional)
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents Artifacts schema
export const insertDocumentArtifactSchema = createInsertSchema(documentsArtifacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// System Logs schema
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentArtifact = z.infer<typeof insertDocumentArtifactSchema>;
export type DocumentArtifact = typeof documentsArtifacts.$inferSelect;

// Global Assets schema
export const insertGlobalAssetSchema = createInsertSchema(globalAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGlobalAsset = z.infer<typeof insertGlobalAssetSchema>;
export type GlobalAsset = typeof globalAssets.$inferSelect;

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

// Repo Structure table (with explicit type annotation to fix LSP errors)
export const repoStructure: any = pgTable("repo_structure", {
  uid: uuid("uid").defaultRandom().primaryKey(),
  folderName: text("folder_name").notNull(),
  linkedTo: uuid("linked_to").references((): any => repoStructure.uid, { onDelete: "cascade" }),
  isSync: boolean("is_sync").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Repo Structure schema
export const insertRepoStructureSchema = createInsertSchema(repoStructure).omit({
  uid: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRepoStructure = z.infer<typeof insertRepoStructureSchema>;
export type RepoStructure = typeof repoStructure.$inferSelect;

// Flow Types table
export const flowTypes = pgTable("flow_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  nodeMetadata: json("node_metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents Flows table
export const documentsFlows = pgTable("documents_flows", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  code: text("code").notNull().unique(),
  flowTypeId: uuid("flow_type_id").references(() => flowTypes.id),
  flowData: json("flow_data").$type<{
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
      data?: Record<string, any>;
    }>;
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  }>().notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").notNull().references(() => users.id),
  isLocked: boolean("is_locked").default(false), // Impede edição no editor
  isEnabled: boolean("is_enabled").default(true), // Controla se aparece em seleções
  applicationFilter: json("application_filter").$type<Record<string, any>>().default({}), // Filtragem de aplicação em formato JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Flow Executions table
export const documentFlowExecutions = pgTable("document_flow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  flowId: uuid("flow_id").notNull().references(() => documentsFlows.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["initiated", "in_progress", "completed", "failed", "transfered"] }).notNull().default("initiated"),
  executionData: json("execution_data").$type<Record<string, any>>().default({}),
  flowTasks: json("flow_tasks").$type<Record<string, any>>().default({}),
  startedBy: integer("started_by").notNull().references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Flow Executions schema
export const insertDocumentFlowExecutionSchema = createInsertSchema(documentFlowExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumentFlowExecution = z.infer<typeof insertDocumentFlowExecutionSchema>;
export type DocumentFlowExecution = typeof documentFlowExecutions.$inferSelect;

// Flow Actions table
export const flowActions = pgTable("flow_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  flowExecutionId: uuid("flow_execution_id").notNull().references(() => documentFlowExecutions.id, { onDelete: "cascade" }),
  actionDescription: text("action_description").notNull(),
  actor: integer("actor").notNull().references(() => users.id),
  flowNode: text("flow_node"),
  actionParams: json("action_params"),
  startedAt: timestamp("started_at").notNull(),
  endAt: timestamp("end_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flow Actions schema
export const insertFlowActionSchema = createInsertSchema(flowActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFlowAction = z.infer<typeof insertFlowActionSchema>;
export type FlowAction = typeof flowActions.$inferSelect;

// Flow Types schema
export const insertFlowTypeSchema = createInsertSchema(flowTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFlowType = z.infer<typeof insertFlowTypeSchema>;
export type FlowType = typeof flowTypes.$inferSelect;

// Documents Flows schema
export const insertDocumentsFlowSchema = createInsertSchema(documentsFlows).omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumentsFlow = z.infer<typeof insertDocumentsFlowSchema>;
export type DocumentsFlow = typeof documentsFlows.$inferSelect;

// Document Editions table
export const documentEditions = pgTable("document_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => documentos.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => templates.id, { onDelete: "cascade" }),
  startedBy: integer("started_by").references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["draft", "in_progress", "review", "ready_to_revise", "published", "archived", "done"] }).notNull().default("draft"),
  lexFile: text("lex_file"), // Texto base64 para armazenar arquivo LEX
  jsonFile: json("json_file").$type<Record<string, any>>().default({}), // JSON estruturado
  mdFile: text("md_file"), // Longtext para arquivo Markdown
  mdFileOld: text("md_file_old"), // Versão anterior do arquivo Markdown
  init: timestamp("init"), // Data/hora de início
  publish: timestamp("publish"), // Data/hora de publicação
  fluxNodeId: text("flux_node_id"), // ID do nó de fluxo relacionado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Editions schema
export const insertDocumentEditionSchema = createInsertSchema(documentEditions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocumentEdition = z.infer<typeof insertDocumentEditionSchema>;
export type DocumentEdition = typeof documentEditions.$inferSelect;

// Generic Tables
export const genericTables = pgTable("generic_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  content: json("content").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generic Tables schema
export const insertGenericTableSchema = createInsertSchema(genericTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGenericTable = z.infer<typeof insertGenericTableSchema>;
export type GenericTable = typeof genericTables.$inferSelect;

// Specialties table for "Áreas de Especialidade"
export const specialties = pgTable("specialties", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de associação entre especialidades e usuários
export const specialtyUsers = pgTable("specialty_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  specialtyId: uuid("specialty_id").notNull().references(() => specialties.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Garante que um usuário não seja associado mais de uma vez à mesma especialidade
  uniqueSpecialtyUser: unique().on(table.specialtyId, table.userId),
}));

// Specialties schema
export const insertSpecialtySchema = createInsertSchema(specialties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecialtyUserSchema = createInsertSchema(specialtyUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;
export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialtyUser = z.infer<typeof insertSpecialtyUserSchema>;
export type SpecialtyUser = typeof specialtyUsers.$inferSelect;

// System Parameters table
export const systemParams = pgTable("system_params", {
  id: uuid("id").defaultRandom().primaryKey(),
  paramName: text("param_name").notNull().unique(),
  paramDescription: text("param_description"),
  paramType: text("param_type").notNull(),
  paramValue: text("param_value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Parameters schema
export const insertSystemParamSchema = createInsertSchema(systemParams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSystemParam = z.infer<typeof insertSystemParamSchema>;
export type SystemParam = typeof systemParams.$inferSelect;
