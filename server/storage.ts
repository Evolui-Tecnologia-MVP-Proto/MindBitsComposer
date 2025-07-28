import { users, templates, mondayMappings, mondayColumns, mappingColumns, serviceConnections, plugins, documentos, documentsArtifacts, globalAssets, repoStructure, systemLogs, documentEditions, genericTables, specialties,
  type User, type InsertUser, type Template, type InsertTemplate, 
  type MondayMapping, type InsertMondayMapping, type MondayColumn, type InsertMondayColumn, 
  type MappingColumn, type InsertMappingColumn, type ServiceConnection, type InsertServiceConnection,
  type Plugin, type InsertPlugin, type Documento, type InsertDocumento,
  type DocumentArtifact, type InsertDocumentArtifact, type GlobalAsset, type InsertGlobalAsset,
  type RepoStructure, type InsertRepoStructure,
  type SystemLog, type InsertSystemLog, type DocumentEdition, type InsertDocumentEdition,
  type GenericTable, type InsertGenericTable, type Specialty, type InsertSpecialty,
  UserStatus, UserRole, TemplateType, PluginStatus, PluginType } from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import crypto from "crypto";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserStatus(id: number, status: UserStatus): Promise<User>;
  updateUserMustChangePassword(id: number, mustChange: boolean): Promise<void>;
  deleteUser(id: number): Promise<void>;
  
  // Template operations
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByCode(code: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  getAllTemplates(): Promise<Template[]>;
  getTemplatesByType(type: TemplateType): Promise<Template[]>;
  updateTemplate(id: string, data: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Monday Mapping operations
  getMondayMapping(id: string): Promise<MondayMapping | undefined>;
  getBoardMapping(id: string): Promise<BoardMapping | undefined>;
  getMondayMappingByBoardId(boardId: string): Promise<MondayMapping | undefined>;
  createMondayMapping(mapping: InsertMondayMapping): Promise<MondayMapping>;
  getAllMondayMappings(): Promise<MondayMapping[]>;
  updateMondayMapping(id: string, data: Partial<MondayMapping>): Promise<MondayMapping>;
  updateMondayMappingLastSync(id: string): Promise<MondayMapping>;
  deleteMondayMapping(id: string): Promise<void>;
  
  // Service Connection operations
  getServiceConnection(serviceName: string): Promise<ServiceConnection | undefined>;
  saveServiceConnection(connection: InsertServiceConnection): Promise<ServiceConnection>;
  getAllServiceConnections(): Promise<ServiceConnection[]>;
  updateServiceConnection(id: string, data: Partial<ServiceConnection>): Promise<ServiceConnection>;
  deleteServiceConnection(id: string): Promise<void>;
  
  // Métodos legados - serão removidos após migração
  saveMondayApiKey(apiKey: string): Promise<void>;
  getMondayApiKey(): Promise<string | undefined>;
  
  // Monday Column operations
  getMondayColumns(mappingId: string): Promise<MondayColumn[]>;
  getMondayColumnById(id: string): Promise<MondayColumn | undefined>;
  createMondayColumn(column: InsertMondayColumn): Promise<MondayColumn>;
  createManyMondayColumns(columns: InsertMondayColumn[]): Promise<MondayColumn[]>;
  deleteMondayColumns(mappingId: string): Promise<void>;
  
  // Mapping Column operations
  getMappingColumns(mappingId: string): Promise<MappingColumn[]>;
  getMappingColumnById(id: string): Promise<MappingColumn | undefined>;
  createMappingColumn(column: InsertMappingColumn): Promise<MappingColumn>;
  createManyMappingColumns(columns: InsertMappingColumn[]): Promise<MappingColumn[]>;
  updateMappingColumn(id: string, data: Partial<MappingColumn>): Promise<MappingColumn>;
  deleteMappingColumn(id: string): Promise<void>;
  deleteMappingColumns(mappingId: string): Promise<void>;
  
  // Plugin operations
  getPlugin(id: string): Promise<Plugin | undefined>;
  getPluginByName(name: string): Promise<Plugin | undefined>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  getAllPlugins(): Promise<Plugin[]>;
  getPluginsByType(type: PluginType): Promise<Plugin[]>;
  getPluginsByStatus(status: PluginStatus): Promise<Plugin[]>;
  updatePlugin(id: string, data: Partial<Plugin>): Promise<Plugin>;
  togglePluginStatus(id: string): Promise<Plugin>;
  deletePlugin(id: string): Promise<void>;
  
  // Documento operations
  getDocumento(id: string): Promise<Documento | undefined>;
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  getAllDocumentos(): Promise<Documento[]>;
  updateDocumento(id: string, data: Partial<Documento>): Promise<Documento>;
  deleteDocumento(id: string): Promise<void>;
  getDocumentosByKeyFields(keyFields: string[], documentData: any): Promise<Documento[]>;
  getDocumentosWithMondayId(): Promise<Documento[]>;
  
  // Document Artifact operations
  getDocumentArtifact(id: string): Promise<DocumentArtifact | undefined>;
  getDocumentArtifactsByDocumento(documentoId: string): Promise<DocumentArtifact[]>;
  createDocumentArtifact(artifact: InsertDocumentArtifact): Promise<DocumentArtifact>;
  updateDocumentArtifact(id: string, data: Partial<DocumentArtifact>): Promise<DocumentArtifact>;
  deleteDocumentArtifact(id: string): Promise<void>;

  // Global Asset operations
  getGlobalAsset(id: string): Promise<GlobalAsset | undefined>;
  getAllGlobalAssets(): Promise<GlobalAsset[]>;
  createGlobalAsset(asset: InsertGlobalAsset): Promise<GlobalAsset>;
  updateGlobalAsset(id: string, data: Partial<GlobalAsset>): Promise<GlobalAsset>;
  deleteGlobalAsset(id: string): Promise<void>;
  
  // Repo Structure operations
  getRepoStructure(uid: string): Promise<RepoStructure | undefined>;
  getAllRepoStructures(): Promise<RepoStructure[]>;
  getRepoStructureByParent(parentUid?: string): Promise<RepoStructure[]>;
  createRepoStructure(structure: InsertRepoStructure): Promise<RepoStructure>;
  updateRepoStructure(uid: string, data: Partial<RepoStructure>): Promise<RepoStructure>;
  updateRepoStructureSync(uid: string, isSync: boolean): Promise<RepoStructure>;
  deleteRepoStructure(uid: string): Promise<void>;
  
  // System Log operations
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
  getSystemLogsByEventType(eventType: string, limit?: number): Promise<SystemLog[]>;
  getSystemLogsByUser(userId: number, limit?: number): Promise<SystemLog[]>;
  
  // Document Edition operations
  getDocumentEdition(id: string): Promise<DocumentEdition | undefined>;
  getDocumentEditionsByDocumentId(documentId: string): Promise<DocumentEdition[]>;
  getAllDocumentEditions(): Promise<DocumentEdition[]>;
  createDocumentEdition(edition: InsertDocumentEdition): Promise<DocumentEdition>;
  updateDocumentEdition(id: string, data: Partial<DocumentEdition>): Promise<DocumentEdition>;
  updateDocumentEditionStatus(id: string, status: string): Promise<DocumentEdition>;
  publishDocumentEdition(id: string): Promise<DocumentEdition>;
  deleteDocumentEdition(id: string): Promise<void>;
  
  // Generic Table operations
  getGenericTableByName(name: string): Promise<GenericTable | undefined>;
  
  // Specialty operations
  getSpecialty(id: string): Promise<Specialty | undefined>;
  getSpecialtyByCode(code: string): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;
  getAllSpecialties(): Promise<Specialty[]>;
  updateSpecialty(id: string, data: Partial<Specialty>): Promise<Specialty>;
  deleteSpecialty(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        tableName: 'sessions', 
        createTableIfMissing: true 
      });
    } else {
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // 24 hours
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
  }

  async updateUserStatus(id: number, status: UserStatus): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserMustChangePassword(id: number, mustChangePassword: boolean): Promise<void> {
    await db
      .update(users)
      .set({ mustChangePassword })
      .where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  // Template operations
  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async getTemplateByCode(code: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.code, code));
    return template;
  }

  async createTemplate(templateData: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values(templateData)
      .returning();
    return template;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplatesByType(type: TemplateType): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.type, type));
  }

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    const [updatedTemplate] = await db
      .update(templates)
      .set(data)
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db
      .delete(templates)
      .where(eq(templates.id, id));
  }
  
  // Monday mapping implementation
  async getMondayMapping(id: string): Promise<MondayMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(mondayMappings)
      .where(eq(mondayMappings.id, id));
    return mapping;
  }

  async getMondayMappingByBoardId(boardId: string): Promise<MondayMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(mondayMappings)
      .where(eq(mondayMappings.boardId, boardId));
    return mapping;
  }

  async createMondayMapping(mappingData: InsertMondayMapping): Promise<MondayMapping> {
    const [mapping] = await db
      .insert(mondayMappings)
      .values(mappingData)
      .returning();
    return mapping;
  }

  async getAllMondayMappings(): Promise<MondayMapping[]> {
    return await db.select().from(mondayMappings);
  }

  async updateMondayMapping(id: string, data: Partial<MondayMapping>): Promise<MondayMapping> {
    const [mapping] = await db
      .update(mondayMappings)
      .set(data)
      .where(eq(mondayMappings.id, id))
      .returning();
    
    if (!mapping) {
      throw new Error("Mapeamento não encontrado");
    }
    
    return mapping;
  }

  async updateMondayMappingLastSync(id: string): Promise<MondayMapping> {
    const [mapping] = await db
      .update(mondayMappings)
      .set({
        lastSync: new Date()
      })
      .where(eq(mondayMappings.id, id))
      .returning();
    
    if (!mapping) {
      throw new Error("Mapeamento não encontrado");
    }
    
    return mapping;
  }

  async deleteMondayMapping(id: string): Promise<void> {
    await db
      .delete(mondayMappings)
      .where(eq(mondayMappings.id, id));
  }

  // Métodos para Service Connections
  async getServiceConnection(serviceName: string): Promise<ServiceConnection | undefined> {
    const [connection] = await db
      .select()
      .from(serviceConnections)
      .where(eq(serviceConnections.serviceName, serviceName));
    
    return connection;
  }

  async saveServiceConnection(connection: InsertServiceConnection): Promise<ServiceConnection> {
    // Verificar se já existe uma conexão com este nome de serviço
    const existingConnection = await this.getServiceConnection(connection.serviceName);
    
    if (existingConnection) {
      // Se existe, atualiza
      const [updated] = await db
        .update(serviceConnections)
        .set({
          token: connection.token,
          description: connection.description,
          updatedAt: new Date()
        })
        .where(eq(serviceConnections.id, existingConnection.id))
        .returning();
      
      return updated;
    } else {
      // Se não existe, cria
      const [newConnection] = await db
        .insert(serviceConnections)
        .values(connection)
        .returning();
      
      return newConnection;
    }
  }

  async getAllServiceConnections(): Promise<ServiceConnection[]> {
    return await db
      .select()
      .from(serviceConnections);
  }

  async updateServiceConnection(id: string, data: Partial<ServiceConnection>): Promise<ServiceConnection> {
    const [updated] = await db
      .update(serviceConnections)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(serviceConnections.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Conexão de serviço não encontrada");
    }
    
    return updated;
  }

  async deleteServiceConnection(id: string): Promise<void> {
    await db
      .delete(serviceConnections)
      .where(eq(serviceConnections.id, id));
  }
  
  // Métodos legados - usam a nova implementação internamente
  async saveMondayApiKey(apiKey: string): Promise<void> {
    await this.saveServiceConnection({
      serviceName: "monday",
      token: apiKey,
      description: "API Key do Monday.com"
    });
  }

  async getMondayApiKey(): Promise<string | undefined> {
    const connection = await this.getServiceConnection("monday");
    return connection?.token;
  }
  
  // Monday Column implementations
  async getMondayColumns(mappingId: string): Promise<MondayColumn[]> {
    return await db
      .select()
      .from(mondayColumns)
      .where(eq(mondayColumns.mappingId, mappingId));
  }
  
  async getMondayColumnById(id: string): Promise<MondayColumn | undefined> {
    const [column] = await db
      .select()
      .from(mondayColumns)
      .where(eq(mondayColumns.id, id));
    return column;
  }
  
  async createMondayColumn(column: InsertMondayColumn): Promise<MondayColumn> {
    const [newColumn] = await db
      .insert(mondayColumns)
      .values(column)
      .returning();
    return newColumn;
  }
  
  async createManyMondayColumns(columns: InsertMondayColumn[]): Promise<MondayColumn[]> {
    if (columns.length === 0) {
      return [];
    }
    
    const newColumns = await db
      .insert(mondayColumns)
      .values(columns)
      .returning();
    return newColumns;
  }
  
  async deleteMondayColumns(mappingId: string): Promise<void> {
    await db
      .delete(mondayColumns)
      .where(eq(mondayColumns.mappingId, mappingId));
  }

  // Implementação das operações de mapeamento de colunas
  async getMappingColumns(mappingId: string): Promise<MappingColumn[]> {
    return await db
      .select()
      .from(mappingColumns)
      .where(eq(mappingColumns.mappingId, mappingId));
  }
  
  async getMappingColumnById(id: string): Promise<MappingColumn | undefined> {
    const [column] = await db
      .select()
      .from(mappingColumns)
      .where(eq(mappingColumns.id, id));
    return column;
  }
  
  async createMappingColumn(column: InsertMappingColumn): Promise<MappingColumn> {
    const [newColumn] = await db
      .insert(mappingColumns)
      .values(column)
      .returning();
    return newColumn;
  }
  
  async createManyMappingColumns(columns: InsertMappingColumn[]): Promise<MappingColumn[]> {
    if (columns.length === 0) {
      return [];
    }
    
    const newColumns = await db
      .insert(mappingColumns)
      .values(columns)
      .returning();
    return newColumns;
  }
  
  async updateMappingColumn(id: string, data: Partial<MappingColumn>): Promise<MappingColumn> {
    const [updatedColumn] = await db
      .update(mappingColumns)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(mappingColumns.id, id))
      .returning();
    
    if (!updatedColumn) {
      throw new Error("Mapeamento de coluna não encontrado");
    }
    
    return updatedColumn;
  }
  
  async deleteMappingColumn(id: string): Promise<void> {
    await db
      .delete(mappingColumns)
      .where(eq(mappingColumns.id, id));
  }
  
  async deleteMappingColumns(mappingId: string): Promise<void> {
    await db
      .delete(mappingColumns)
      .where(eq(mappingColumns.mappingId, mappingId));
  }

  // Plugin operations
  async getPlugin(id: string): Promise<Plugin | undefined> {
    const [plugin] = await db
      .select()
      .from(plugins)
      .where(eq(plugins.id, id));
    return plugin;
  }

  async getPluginByName(name: string): Promise<Plugin | undefined> {
    const [plugin] = await db
      .select()
      .from(plugins)
      .where(eq(plugins.name, name));
    return plugin;
  }

  async createPlugin(pluginData: InsertPlugin): Promise<Plugin> {
    const [plugin] = await db
      .insert(plugins)
      .values(pluginData)
      .returning();
    return plugin;
  }

  async getAllPlugins(): Promise<Plugin[]> {
    return await db
      .select()
      .from(plugins);
  }

  async getPluginsByType(type: PluginType): Promise<Plugin[]> {
    return await db
      .select()
      .from(plugins)
      .where(eq(plugins.type, type));
  }

  async getPluginsByStatus(status: PluginStatus): Promise<Plugin[]> {
    return await db
      .select()
      .from(plugins)
      .where(eq(plugins.status, status));
  }

  async updatePlugin(id: string, data: Partial<Plugin>): Promise<Plugin> {
    const [updatedPlugin] = await db
      .update(plugins)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(plugins.id, id))
      .returning();
    
    if (!updatedPlugin) {
      throw new Error("Plugin não encontrado");
    }
    
    return updatedPlugin;
  }

  async togglePluginStatus(id: string): Promise<Plugin> {
    const plugin = await this.getPlugin(id);
    if (!plugin) {
      throw new Error("Plugin não encontrado");
    }

    const newStatus = plugin.status === PluginStatus.ACTIVE ? PluginStatus.INACTIVE : PluginStatus.ACTIVE;
    return await this.updatePlugin(id, { status: newStatus });
  }

  async deletePlugin(id: string): Promise<void> {
    await db
      .delete(plugins)
      .where(eq(plugins.id, id));
  }

  // Documento operations
  async getDocumento(id: string): Promise<Documento | undefined> {
    const [documento] = await db.select().from(documentos).where(eq(documentos.id, id));
    return documento || undefined;
  }

  async getDocumentoByIdOrigem(idOrigem: string | number): Promise<Documento | undefined> {
    const idNum = typeof idOrigem === 'string' ? parseInt(idOrigem) : idOrigem;
    const [documento] = await db.select().from(documentos).where(eq(documentos.idOrigem, idNum));
    return documento || undefined;
  }

  async createDocumento(documentoData: InsertDocumento): Promise<Documento> {
    // Debug: verificar dados antes de inserir no banco
    console.log(`🎯 DADOS SENDO INSERIDOS NO BANCO:`, {
      idOrigem: documentoData.idOrigem,
      objeto: documentoData.objeto,
      tipoIdOrigem: typeof documentoData.idOrigem
    });
    
    const [documento] = await db
      .insert(documentos)
      .values(documentoData)
      .returning();
      
    console.log(`✅ DOCUMENTO CRIADO NO BANCO:`, {
      id: documento.id,
      idOrigem: documento.idOrigem,
      objeto: documento.objeto
    });
    
    return documento;
  }

  async getAllDocumentos(): Promise<Documento[]> {
    return await db.select().from(documentos);
  }

  async updateDocumento(id: string, data: Partial<Documento>): Promise<Documento> {
    console.log("STORAGE - Atualizando documento:", id, data);
    const [updatedDocumento] = await db
      .update(documentos)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(documentos.id, id))
      .returning();
    
    if (!updatedDocumento) {
      console.log("STORAGE - Documento não encontrado:", id);
      throw new Error("Documento não encontrado");
    }
    
    console.log("STORAGE - Documento atualizado com sucesso:", updatedDocumento);
    return updatedDocumento;
  }

  async deleteDocumento(id: string): Promise<void> {
    await db
      .delete(documentos)
      .where(eq(documentos.id, id));
  }

  async getDocumentosByKeyFields(keyFields: string[], documentData: any): Promise<Documento[]> {
    // Se não há campos chave, retorna array vazio
    if (keyFields.length === 0) {
      return [];
    }

    // Para o campo id_origem, usar comparação numérica direta
    if (keyFields.includes('id_origem')) {
      const idOrigemValue = documentData.idOrigem || documentData.id_origem;
      if (idOrigemValue) {
        // Converter para número para comparação correta
        const idOrigemNum = Number(idOrigemValue);
        console.log(`✅ DUPLICATA CHECK: Buscando id_origem = ${idOrigemNum} (número)`);
        
        // Usar SQL direto com comparação numérica
        const results = await db
          .select()
          .from(documentos)
          .where(sql`id_origem = ${idOrigemNum}`);
          
        console.log(`📊 DUPLICATA RESULT: Encontrados ${results.length} documentos com mesmo id_origem`);
        return results;
      }
    }

    // Para outros campos, usar a lógica normal
    const conditions = [];
    
    for (const field of keyFields) {
      if (field === 'id_origem') continue; // Já tratado acima
      
      const value = documentData[field];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      let condition = null;
      switch (field) {
        case 'objeto': condition = eq(documentos.objeto, value); break;
        case 'cliente': condition = eq(documentos.cliente, value); break;
        case 'sistema': condition = eq(documentos.sistema, value); break;
        case 'modulo': condition = eq(documentos.modulo, value); break;
        case 'responsavel': condition = eq(documentos.responsavel, value); break;
        case 'solicitante': condition = eq(documentos.solicitante, value); break;
        case 'aprovador': condition = eq(documentos.aprovador, value); break;
        case 'agente': condition = eq(documentos.agente, value); break;
        case 'tipo': condition = eq(documentos.tipo, value); break;
        case 'status': condition = eq(documentos.status, value); break;
        case 'statusOrigem': condition = eq(documentos.statusOrigem, value); break;
      }
      
      if (condition) {
        conditions.push(condition);
      }
    }

    if (conditions.length === 0) {
      return [];
    }

    const results = await db
      .select()
      .from(documentos)
      .where(and(...conditions));
      
    return results;
  }

  // Document Artifact operations
  async getDocumentArtifact(id: string): Promise<DocumentArtifact | undefined> {
    const [artifact] = await db.select().from(documentsArtifacts).where(eq(documentsArtifacts.id, id));
    return artifact || undefined;
  }

  async getDocumentArtifactsByDocumento(documentoId: string): Promise<DocumentArtifact[]> {
    return await db.select().from(documentsArtifacts).where(eq(documentsArtifacts.documentoId, documentoId));
  }

  async createDocumentArtifact(artifactData: InsertDocumentArtifact): Promise<DocumentArtifact> {
    const [artifact] = await db
      .insert(documentsArtifacts)
      .values(artifactData)
      .returning();
    return artifact;
  }

  async updateDocumentArtifact(id: string, data: Partial<DocumentArtifact>): Promise<DocumentArtifact> {
    const [updatedArtifact] = await db
      .update(documentsArtifacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(documentsArtifacts.id, id))
      .returning();
    
    if (!updatedArtifact) {
      throw new Error("Artefato não encontrado");
    }
    
    return updatedArtifact;
  }

  async deleteDocumentArtifact(id: string): Promise<void> {
    await db
      .delete(documentsArtifacts)
      .where(eq(documentsArtifacts.id, id));
  }

  // Global Asset operations
  async getGlobalAsset(id: string): Promise<GlobalAsset | undefined> {
    const [asset] = await db.select().from(globalAssets).where(eq(globalAssets.id, id));
    return asset || undefined;
  }

  async getAllGlobalAssets(): Promise<GlobalAsset[]> {
    return await db.select().from(globalAssets).orderBy(globalAssets.createdAt);
  }

  async createGlobalAsset(assetData: InsertGlobalAsset): Promise<GlobalAsset> {
    const [asset] = await db
      .insert(globalAssets)
      .values(assetData)
      .returning();
    return asset;
  }

  async updateGlobalAsset(id: string, data: Partial<GlobalAsset>): Promise<GlobalAsset> {
    const [updatedAsset] = await db
      .update(globalAssets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(globalAssets.id, id))
      .returning();
    
    if (!updatedAsset) {
      throw new Error("Asset global não encontrado");
    }
    
    return updatedAsset;
  }

  async deleteGlobalAsset(id: string): Promise<void> {
    await db
      .delete(globalAssets)
      .where(eq(globalAssets.id, id));
  }

  // Repo Structure operations
  async getRepoStructure(uid: string): Promise<RepoStructure | undefined> {
    const [structure] = await db.select().from(repoStructure).where(eq(repoStructure.uid, uid));
    return structure || undefined;
  }

  async getAllRepoStructures(): Promise<RepoStructure[]> {
    return await db.select().from(repoStructure).orderBy(repoStructure.createdAt);
  }

  async getRepoStructureTree(): Promise<RepoStructure[]> {
    // Buscar todas as estruturas
    const allStructures = await db.select().from(repoStructure);
    console.log("DB: Estruturas encontradas:", allStructures.length);
    console.log("DB: Lista completa:", JSON.stringify(allStructures, null, 2));
    
    // Construir mapa de estruturas
    const structureMap = new Map<string, RepoStructure & { children?: RepoStructure[] }>();
    const rootStructures: (RepoStructure & { children?: RepoStructure[] })[] = [];
    
    // Primeiro, criar o mapa de todas as estruturas
    allStructures.forEach(structure => {
      structureMap.set(structure.uid, { ...structure, children: [] });
      console.log(`DB: Mapeando ${structure.folderName} (${structure.uid})`);
    });
    
    // Depois, organizar hierarquicamente
    allStructures.forEach(structure => {
      const structureWithChildren = structureMap.get(structure.uid)!;
      
      if (structure.linkedTo) {
        // É uma subpasta - adicionar ao pai
        const parent = structureMap.get(structure.linkedTo);
        console.log(`DB: ${structure.folderName} é filho de:`, parent?.folderName);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(structureWithChildren);
        }
      } else {
        // É uma pasta raiz
        rootStructures.push(structureWithChildren);
        console.log(`DB: ${structure.folderName} é pasta raiz`);
      }
    });
    
    // Função recursiva para achatar a árvore mantendo a hierarquia
    function flattenTree(structures: (RepoStructure & { children?: RepoStructure[] })[]): RepoStructure[] {
      const result: RepoStructure[] = [];
      
      structures.forEach(structure => {
        // Adicionar a estrutura atual
        const { children, ...structureData } = structure;
        result.push(structureData);
        console.log(`DB: Adicionando ${structure.folderName} ao resultado`);
        
        // Adicionar recursivamente os filhos
        if (children && children.length > 0) {
          console.log(`DB: ${structure.folderName} tem ${children.length} filhos`);
          result.push(...flattenTree(children));
        }
      });
      
      return result;
    }
    
    const finalResult = flattenTree(rootStructures);
    console.log("DB: Resultado final:", finalResult.length, finalResult.map(f => f.folderName));
    return finalResult;
  }

  async getRepoStructureByParent(parentUid?: string): Promise<RepoStructure[]> {
    if (parentUid) {
      return await db.select().from(repoStructure).where(eq(repoStructure.linkedTo, parentUid));
    } else {
      return await db.select().from(repoStructure).where(isNull(repoStructure.linkedTo));
    }
  }

  async createRepoStructure(structureData: InsertRepoStructure): Promise<RepoStructure> {
    const [structure] = await db
      .insert(repoStructure)
      .values(structureData)
      .returning();
    return structure;
  }

  async updateRepoStructure(uid: string, data: Partial<RepoStructure>): Promise<RepoStructure> {
    const [updatedStructure] = await db
      .update(repoStructure)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(repoStructure.uid, uid))
      .returning();
    
    if (!updatedStructure) {
      throw new Error("Estrutura do repositório não encontrada");
    }
    
    return updatedStructure;
  }

  async updateRepoStructureSync(uid: string, isSync: boolean): Promise<RepoStructure> {
    const [updatedStructure] = await db
      .update(repoStructure)
      .set({ isSync, updatedAt: new Date() })
      .where(eq(repoStructure.uid, uid))
      .returning();
    
    if (!updatedStructure) {
      throw new Error("Estrutura do repositório não encontrada");
    }
    
    return updatedStructure;
  }

  async deleteRepoStructure(uid: string): Promise<void> {
    await db
      .delete(repoStructure)
      .where(eq(repoStructure.uid, uid));
  }

  // System Log operations
  async createSystemLog(logData: InsertSystemLog): Promise<SystemLog> {
    const [newLog] = await db
      .insert(systemLogs)
      .values(logData)
      .returning();
    return newLog;
  }

  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  async getSystemLogsByEventType(eventType: string, limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .where(eq(systemLogs.eventType, eventType))
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  async getSystemLogsByUser(userId: number, limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .where(eq(systemLogs.userId, userId))
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  // Document Edition operations
  async getDocumentEdition(id: string): Promise<DocumentEdition | undefined> {
    const [edition] = await db.select().from(documentEditions).where(eq(documentEditions.id, id));
    return edition;
  }

  async getDocumentEditionsByDocumentId(documentId: string): Promise<DocumentEdition[]> {
    return await db
      .select()
      .from(documentEditions)
      .where(eq(documentEditions.documentId, documentId))
      .orderBy(sql`${documentEditions.createdAt} DESC`);
  }

  async getAllDocumentEditions(): Promise<DocumentEdition[]> {
    return await db
      .select()
      .from(documentEditions)
      .orderBy(sql`${documentEditions.createdAt} DESC`);
  }

  async createDocumentEdition(insertEdition: InsertDocumentEdition): Promise<DocumentEdition> {
    const [edition] = await db
      .insert(documentEditions)
      .values({
        ...insertEdition,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return edition;
  }

  async updateDocumentEdition(id: string, data: Partial<DocumentEdition>): Promise<DocumentEdition> {
    const [edition] = await db
      .update(documentEditions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(documentEditions.id, id))
      .returning();
    
    if (!edition) {
      throw new Error("Edição de documento não encontrada");
    }
    
    return edition;
  }

  async updateDocumentEditionStatus(id: string, status: string): Promise<DocumentEdition> {
    return await this.updateDocumentEdition(id, { status: status as any });
  }

  async publishDocumentEdition(id: string): Promise<DocumentEdition> {
    return await this.updateDocumentEdition(id, { 
      status: "published" as any,
      publish: new Date()
    });
  }

  async deleteDocumentEdition(id: string): Promise<void> {
    await db.delete(documentEditions).where(eq(documentEditions.id, id));
  }

  // Generic Table operations
  async getGenericTableByName(name: string): Promise<GenericTable | undefined> {
    const [table] = await db.select().from(genericTables).where(eq(genericTables.name, name));
    return table;
  }

  // Specialty operations
  async getSpecialty(id: string): Promise<Specialty | undefined> {
    const [specialty] = await db.select().from(specialties).where(eq(specialties.id, id));
    return specialty;
  }

  async getSpecialtyByCode(code: string): Promise<Specialty | undefined> {
    const [specialty] = await db.select().from(specialties).where(eq(specialties.code, code));
    return specialty;
  }

  async createSpecialty(specialtyData: InsertSpecialty): Promise<Specialty> {
    const [specialty] = await db.insert(specialties).values(specialtyData).returning();
    return specialty;
  }

  async getAllSpecialties(): Promise<Specialty[]> {
    return await db.select().from(specialties).orderBy(specialties.name);
  }

  async updateSpecialty(id: string, data: Partial<Specialty>): Promise<Specialty> {
    const [specialty] = await db
      .update(specialties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(specialties.id, id))
      .returning();
    return specialty;
  }

  async deleteSpecialty(id: string): Promise<void> {
    await db.delete(specialties).where(eq(specialties.id, id));
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<string, Template>;
  private mondayMappings: Map<string, MondayMapping>;
  private mondayColumns: Map<string, MondayColumn>;
  private mappingColumns: Map<string, MappingColumn>;
  private serviceConnections: Map<string, ServiceConnection>;
  private plugins: Map<string, Plugin>;
  private documentos: Map<string, Documento>;
  private documentArtifacts: Map<string, DocumentArtifact>;
  private repoStructures: Map<string, RepoStructure>;
  private mondayApiKey: string | undefined; // Legado
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.mondayMappings = new Map();
    this.mondayColumns = new Map();
    this.mappingColumns = new Map();
    this.serviceConnections = new Map<string, ServiceConnection>();
    this.plugins = new Map();
    this.documentos = new Map();
    this.documentArtifacts = new Map();
    this.repoStructures = new Map();
    this.mondayApiKey = undefined;
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Add a default admin user for testing
    this.createUser({
      name: "Administrador",
      email: "admin@exemplo.com",
      password: "senha-inicial",
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: true,
    });
    
    // Add some example templates
    this.createTemplate({
      code: "STRUCT001",
      description: "Template de Estrutura Padrão",
      type: "struct",
      structure: { sections: ["Introdução", "Desenvolvimento", "Conclusão"] }
    });
    
    this.createTemplate({
      code: "OUTPUT001",
      description: "Template de Saída Básico",
      type: "output",
      structure: { format: "texto", variables: ["nome", "data"] }
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id,
      name: insertUser.name,
      email: insertUser.email,
      password: insertUser.password,
      role: insertUser.role || UserRole.USER,
      status: insertUser.status || UserStatus.ACTIVE,
      avatarUrl: insertUser.avatarUrl || "",
      mustChangePassword: insertUser.mustChangePassword ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updatedUser = { 
      ...user, 
      ...data,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    user.password = password;
    user.updatedAt = new Date();
    this.users.set(id, user);
  }

  async updateUserStatus(id: number, status: UserStatus): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updatedUser = { 
      ...user, 
      status,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserMustChangePassword(id: number, mustChangePassword: boolean): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    user.mustChangePassword = mustChangePassword;
    user.updatedAt = new Date();
    this.users.set(id, user);
  }
  
  async deleteUser(id: number): Promise<void> {
    if (!this.users.has(id)) {
      throw new Error("Usuário não encontrado");
    }
    this.users.delete(id);
  }
  
  // Template operations
  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async getTemplateByCode(code: string): Promise<Template | undefined> {
    return Array.from(this.templates.values()).find(
      (template) => template.code === code,
    );
  }

  async createTemplate(templateData: InsertTemplate): Promise<Template> {
    const id = crypto.randomUUID();
    const template: Template = {
      id,
      code: templateData.code,
      description: templateData.description,
      type: templateData.type,
      structure: templateData.structure,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.templates.set(id, template);
    return template;
  }

  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByType(type: TemplateType): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.type === type
    );
  }

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error("Template não encontrado");
    }

    const updatedTemplate = {
      ...template,
      ...data,
      updatedAt: new Date()
    };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error("Template não encontrado");
    }
    this.templates.delete(id);
  }
  
  // Monday mapping implementation
  async getMondayMapping(id: string): Promise<MondayMapping | undefined> {
    return this.mondayMappings.get(id);
  }

  async getBoardMapping(id: string): Promise<any> {
    const [mapping] = await db
      .select()
      .from(mondayMappings)
      .where(eq(mondayMappings.id, id));
    return mapping || null;
  }
  
  async getMondayMappingByBoardId(boardId: string): Promise<MondayMapping | undefined> {
    return Array.from(this.mondayMappings.values()).find(
      mapping => mapping.boardId === boardId
    );
  }
  
  async createMondayMapping(mappingData: InsertMondayMapping): Promise<MondayMapping> {
    const id = crypto.randomUUID();
    const mapping: MondayMapping = {
      id,
      name: mappingData.name,
      description: mappingData.description || "",
      boardId: mappingData.boardId,
      statusColumn: mappingData.statusColumn || "",
      responsibleColumn: mappingData.responsibleColumn || "",
      lastSync: mappingData.lastSync || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mondayMappings.set(id, mapping);
    return mapping;
  }
  
  async getAllMondayMappings(): Promise<MondayMapping[]> {
    return Array.from(this.mondayMappings.values());
  }
  
  async updateMondayMapping(id: string, data: Partial<MondayMapping>): Promise<MondayMapping> {
    const mapping = this.mondayMappings.get(id);
    if (!mapping) {
      throw new Error("Mapeamento não encontrado");
    }
    
    const updatedMapping = {
      ...mapping,
      ...data,
      updatedAt: new Date()
    };
    
    this.mondayMappings.set(id, updatedMapping);
    return updatedMapping;
  }
  
  async updateMondayMappingLastSync(id: string): Promise<MondayMapping> {
    const mapping = this.mondayMappings.get(id);
    if (!mapping) {
      throw new Error("Mapeamento não encontrado");
    }
    
    const updatedMapping = {
      ...mapping,
      lastSync: new Date(),
      updatedAt: new Date()
    };
    
    this.mondayMappings.set(id, updatedMapping);
    return updatedMapping;
  }
  
  async deleteMondayMapping(id: string): Promise<void> {
    if (!this.mondayMappings.has(id)) {
      throw new Error("Mapeamento não encontrado");
    }
    this.mondayMappings.delete(id);
  }
  
  // Service Connection implementations
  async getServiceConnection(serviceName: string): Promise<ServiceConnection | undefined> {
    const serviceConnections = Array.from(this.serviceConnections.values());
    return serviceConnections.find(conn => conn.serviceName === serviceName);
  }
  
  async saveServiceConnection(connection: InsertServiceConnection): Promise<ServiceConnection> {
    const existingConnection = await this.getServiceConnection(connection.serviceName);
    
    if (existingConnection) {
      // Se existe, atualiza
      const updatedConnection: ServiceConnection = {
        ...existingConnection,
        token: connection.token,
        description: connection.description || existingConnection.description,
        parameters: connection.parameters || existingConnection.parameters || [],
        updatedAt: new Date()
      };
      
      this.serviceConnections.set(existingConnection.id, updatedConnection);
      return updatedConnection;
    } else {
      // Se não existe, cria um novo
      const id = crypto.randomUUID();
      const newConnection: ServiceConnection = {
        id,
        serviceName: connection.serviceName,
        token: connection.token,
        description: connection.description || "",
        parameters: connection.parameters || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.serviceConnections.set(id, newConnection);
      return newConnection;
    }
  }
  
  async getAllServiceConnections(): Promise<ServiceConnection[]> {
    return Array.from(this.serviceConnections.values());
  }
  
  async updateServiceConnection(id: string, data: Partial<ServiceConnection>): Promise<ServiceConnection> {
    const connection = this.serviceConnections.get(id);
    
    if (!connection) {
      throw new Error("Conexão de serviço não encontrada");
    }
    
    const updatedConnection: ServiceConnection = {
      ...connection,
      ...data,
      updatedAt: new Date()
    };
    
    this.serviceConnections.set(id, updatedConnection);
    return updatedConnection;
  }
  
  async deleteServiceConnection(id: string): Promise<void> {
    if (!this.serviceConnections.has(id)) {
      throw new Error("Conexão de serviço não encontrada");
    }
    
    this.serviceConnections.delete(id);
  }
  
  // Métodos legados - usam a nova implementação internamente
  async saveMondayApiKey(apiKey: string): Promise<void> {
    const connection: InsertServiceConnection = {
      serviceName: "monday",
      token: apiKey,
      description: "API Key do Monday.com"
    };
    
    await this.saveServiceConnection(connection);
    this.mondayApiKey = apiKey; // Mantém compatibilidade
  }
  
  async getMondayApiKey(): Promise<string | undefined> {
    const connection = await this.getServiceConnection("monday");
    return connection?.token || this.mondayApiKey; // Busca na nova implementação ou no legado
  }
  
  // Monday Column operations
  async getMondayColumns(mappingId: string): Promise<MondayColumn[]> {
    return Array.from(this.mondayColumns.values())
      .filter(column => column.mappingId === mappingId);
  }
  
  async getMondayColumnById(id: string): Promise<MondayColumn | undefined> {
    return this.mondayColumns.get(id);
  }
  
  async createMondayColumn(column: InsertMondayColumn): Promise<MondayColumn> {
    const id = crypto.randomUUID();
    const newColumn: MondayColumn = {
      id,
      mappingId: column.mappingId,
      columnId: column.columnId,
      title: column.title,
      type: column.type,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mondayColumns.set(id, newColumn);
    return newColumn;
  }
  
  async createManyMondayColumns(columns: InsertMondayColumn[]): Promise<MondayColumn[]> {
    const newColumns: MondayColumn[] = [];
    
    for (const column of columns) {
      const newColumn = await this.createMondayColumn(column);
      newColumns.push(newColumn);
    }
    
    return newColumns;
  }
  
  async deleteMondayColumns(mappingId: string): Promise<void> {
    const columnsToDelete = Array.from(this.mondayColumns.entries())
      .filter(([_, column]) => column.mappingId === mappingId)
      .map(([id, _]) => id);
    
    for (const id of columnsToDelete) {
      this.mondayColumns.delete(id);
    }
  }
  
  // Implementação das operações de mapeamento de colunas
  async getMappingColumns(mappingId: string): Promise<MappingColumn[]> {
    return Array.from(this.mappingColumns.values())
      .filter(column => column.mappingId === mappingId);
  }
  
  async getMappingColumnById(id: string): Promise<MappingColumn | undefined> {
    return this.mappingColumns.get(id);
  }
  
  async createMappingColumn(column: InsertMappingColumn): Promise<MappingColumn> {
    const id = crypto.randomUUID();
    const newColumn: MappingColumn = {
      id,
      mappingId: column.mappingId,
      mondayColumnId: column.mondayColumnId,
      mondayColumnTitle: column.mondayColumnTitle,
      cpxField: column.cpxField,
      transformFunction: column.transformFunction || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mappingColumns.set(id, newColumn);
    return newColumn;
  }
  
  async createManyMappingColumns(columns: InsertMappingColumn[]): Promise<MappingColumn[]> {
    const newColumns: MappingColumn[] = [];
    
    for (const column of columns) {
      const newColumn = await this.createMappingColumn(column);
      newColumns.push(newColumn);
    }
    
    return newColumns;
  }
  
  async updateMappingColumn(id: string, data: Partial<MappingColumn>): Promise<MappingColumn> {
    const column = this.mappingColumns.get(id);
    if (!column) {
      throw new Error("Mapeamento de coluna não encontrado");
    }
    
    const updatedColumn = {
      ...column,
      ...data,
      updatedAt: new Date()
    };
    
    this.mappingColumns.set(id, updatedColumn);
    return updatedColumn;
  }
  
  async deleteMappingColumn(id: string): Promise<void> {
    this.mappingColumns.delete(id);
  }
  
  async deleteMappingColumns(mappingId: string): Promise<void> {
    const columnsToDelete = Array.from(this.mappingColumns.entries())
      .filter(([_, column]) => column.mappingId === mappingId)
      .map(([id, _]) => id);
    
    for (const id of columnsToDelete) {
      this.mappingColumns.delete(id);
    }
  }

  // Plugin operations
  async getPlugin(id: string): Promise<Plugin | undefined> {
    return this.plugins.get(id);
  }

  async getPluginByName(name: string): Promise<Plugin | undefined> {
    return Array.from(this.plugins.values()).find(plugin => plugin.name === name);
  }

  async createPlugin(insertPlugin: InsertPlugin): Promise<Plugin> {
    const plugin: Plugin = {
      id: crypto.randomUUID(),
      ...insertPlugin,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  async getAllPlugins(): Promise<Plugin[]> {
    return Array.from(this.plugins.values());
  }

  async getPluginsByType(type: PluginType): Promise<Plugin[]> {
    return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
  }

  async getPluginsByStatus(status: PluginStatus): Promise<Plugin[]> {
    return Array.from(this.plugins.values()).filter(plugin => plugin.status === status);
  }

  async updatePlugin(id: string, data: Partial<Plugin>): Promise<Plugin> {
    const existingPlugin = this.plugins.get(id);
    if (!existingPlugin) {
      throw new Error("Plugin não encontrado");
    }

    const updatedPlugin: Plugin = {
      ...existingPlugin,
      ...data,
      updatedAt: new Date()
    };
    this.plugins.set(id, updatedPlugin);
    return updatedPlugin;
  }

  async togglePluginStatus(id: string): Promise<Plugin> {
    const plugin = await this.getPlugin(id);
    if (!plugin) {
      throw new Error("Plugin não encontrado");
    }

    const newStatus = plugin.status === PluginStatus.ACTIVE ? PluginStatus.INACTIVE : PluginStatus.ACTIVE;
    return await this.updatePlugin(id, { status: newStatus });
  }

  async deletePlugin(id: string): Promise<void> {
    this.plugins.delete(id);
  }

  // Documento operations
  async getDocumento(id: string): Promise<Documento | undefined> {
    return this.documentos.get(id);
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const documento: Documento = {
      id: crypto.randomUUID(),
      ...insertDocumento,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.documentos.set(documento.id, documento);
    return documento;
  }

  async getAllDocumentos(): Promise<Documento[]> {
    return Array.from(this.documentos.values());
  }

  async updateDocumento(id: string, data: Partial<Documento>): Promise<Documento> {
    const existingDocumento = this.documentos.get(id);
    if (!existingDocumento) {
      throw new Error("Documento não encontrado");
    }

    const updatedDocumento: Documento = {
      ...existingDocumento,
      ...data,
      updatedAt: new Date()
    };
    this.documentos.set(id, updatedDocumento);
    return updatedDocumento;
  }

  async deleteDocumento(id: string): Promise<void> {
    this.documentos.delete(id);
    // Remover todos os artefatos relacionados
    for (const [artifactId, artifact] of this.documentArtifacts) {
      if (artifact.documentoId === id) {
        this.documentArtifacts.delete(artifactId);
      }
    }
  }

  async getDocumentosByKeyFields(keyFields: string[], documentData: any): Promise<Documento[]> {
    // Se não há campos chave, retorna array vazio
    if (keyFields.length === 0) {
      return [];
    }

    // Filtrar documentos que tenham todos os valores dos campos chave iguais
    const allDocumentos = Array.from(this.documentos.values());
    
    return allDocumentos.filter(doc => {
      return keyFields.every(field => {
        const expectedValue = documentData[field];
        
        // Se o valor esperado está vazio, pular verificação
        if (expectedValue === undefined || expectedValue === null || expectedValue === '') {
          return true;
        }
        
        // Comparar valor do documento com valor esperado
        const docValue = (doc as any)[field];
        return docValue === expectedValue;
      });
    });
  }

  // Document Artifact operations
  async getDocumentArtifact(id: string): Promise<DocumentArtifact | undefined> {
    return this.documentArtifacts.get(id);
  }

  async getDocumentArtifactsByDocumento(documentoId: string): Promise<DocumentArtifact[]> {
    return Array.from(this.documentArtifacts.values()).filter(
      artifact => artifact.documentoId === documentoId
    );
  }

  async createDocumentArtifact(insertArtifact: InsertDocumentArtifact): Promise<DocumentArtifact> {
    const artifact: DocumentArtifact = {
      id: crypto.randomUUID(),
      ...insertArtifact,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.documentArtifacts.set(artifact.id, artifact);
    return artifact;
  }

  async updateDocumentArtifact(id: string, data: Partial<DocumentArtifact>): Promise<DocumentArtifact> {
    const existingArtifact = this.documentArtifacts.get(id);
    if (!existingArtifact) {
      throw new Error("Artefato não encontrado");
    }

    const updatedArtifact: DocumentArtifact = {
      ...existingArtifact,
      ...data,
      updatedAt: new Date()
    };
    this.documentArtifacts.set(id, updatedArtifact);
    return updatedArtifact;
  }

  async deleteDocumentArtifact(id: string): Promise<void> {
    this.documentArtifacts.delete(id);
  }

  // Repo Structure operations
  async getRepoStructure(uid: string): Promise<RepoStructure | undefined> {
    return this.repoStructures.get(uid);
  }

  async getAllRepoStructures(): Promise<RepoStructure[]> {
    return Array.from(this.repoStructures.values());
  }

  async getRepoStructureByParent(parentUid?: string): Promise<RepoStructure[]> {
    return Array.from(this.repoStructures.values()).filter(structure => 
      structure.linkedTo === parentUid
    );
  }

  async createRepoStructure(insertStructure: InsertRepoStructure): Promise<RepoStructure> {
    const structure: RepoStructure = {
      uid: crypto.randomUUID(),
      ...insertStructure,
      isSync: insertStructure.isSync ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.repoStructures.set(structure.uid, structure);
    return structure;
  }

  async updateRepoStructure(uid: string, data: Partial<RepoStructure>): Promise<RepoStructure> {
    const existingStructure = this.repoStructures.get(uid);
    if (!existingStructure) {
      throw new Error("Estrutura do repositório não encontrada");
    }

    const updatedStructure: RepoStructure = {
      ...existingStructure,
      ...data,
      updatedAt: new Date()
    };
    this.repoStructures.set(uid, updatedStructure);
    return updatedStructure;
  }

  async updateRepoStructureSync(uid: string, isSync: boolean): Promise<RepoStructure> {
    return this.updateRepoStructure(uid, { isSync });
  }

  async deleteRepoStructure(uid: string): Promise<void> {
    this.repoStructures.delete(uid);
  }



  // System Log implementations
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const [newLog] = await db
      .insert(systemLogs)
      .values({
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      })
      .returning();
    return newLog;
  }

  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  async getSystemLogsByEventType(eventType: string, limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .where(eq(systemLogs.eventType, eventType))
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  async getSystemLogsByUser(userId: number, limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .where(eq(systemLogs.userId, userId))
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(limit);
  }

  // Document Edition operations
  async getDocumentEdition(id: string): Promise<DocumentEdition | undefined> {
    const [edition] = await db.select().from(documentEditions).where(eq(documentEditions.id, id));
    return edition;
  }

  async getDocumentEditionsByDocumentId(documentId: string): Promise<DocumentEdition[]> {
    return await db
      .select()
      .from(documentEditions)
      .where(eq(documentEditions.documentId, documentId))
      .orderBy(sql`${documentEditions.createdAt} DESC`);
  }

  async getAllDocumentEditions(): Promise<DocumentEdition[]> {
    return await db
      .select()
      .from(documentEditions)
      .orderBy(sql`${documentEditions.createdAt} DESC`);
  }

  async createDocumentEdition(insertEdition: InsertDocumentEdition): Promise<DocumentEdition> {
    const [edition] = await db
      .insert(documentEditions)
      .values({
        ...insertEdition,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return edition;
  }

  async updateDocumentEdition(id: string, data: Partial<DocumentEdition>): Promise<DocumentEdition> {
    const [edition] = await db
      .update(documentEditions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(documentEditions.id, id))
      .returning();
    
    if (!edition) {
      throw new Error("Edição de documento não encontrada");
    }
    
    return edition;
  }

  async updateDocumentEditionStatus(id: string, status: string): Promise<DocumentEdition> {
    return await this.updateDocumentEdition(id, { status: status as any });
  }

  async publishDocumentEdition(id: string): Promise<DocumentEdition> {
    return await this.updateDocumentEdition(id, { 
      status: "published" as any,
      publish: new Date()
    });
  }

  async deleteDocumentEdition(id: string): Promise<void> {
    await db.delete(documentEditions).where(eq(documentEditions.id, id));
  }

  // Generic Table operations
  async getGenericTableByName(name: string): Promise<GenericTable | undefined> {
    try {
      console.log("🔍 [Storage] Buscando tabela genérica:", name);
      
      // Use direct SQL query to avoid potential circular dependency issues
      const result = await pool.query(
        'SELECT id, name, description, content, created_at, updated_at FROM generic_tables WHERE name = $1 LIMIT 1',
        [name]
      );
      
      if (result.rows.length === 0) {
        console.log("🔍 [Storage] Nenhum resultado encontrado para:", name);
        return undefined;
      }
      
      const row = result.rows[0];
      const genericTable: GenericTable = {
        id: row.id,
        name: row.name,
        description: row.description,
        content: row.content || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      console.log("🔍 [Storage] Resultado encontrado:", genericTable);
      return genericTable;
    } catch (error) {
      console.error("❌ [Storage] Erro ao buscar tabela genérica:", error);
      throw error;
    }
  }

  // Specialty operations
  async getSpecialty(id: string): Promise<Specialty | undefined> {
    const [specialty] = await db.select().from(specialties).where(eq(specialties.id, id));
    return specialty || undefined;
  }

  async getSpecialtyByCode(code: string): Promise<Specialty | undefined> {
    const [specialty] = await db.select().from(specialties).where(eq(specialties.code, code));
    return specialty || undefined;
  }

  async createSpecialty(specialtyData: InsertSpecialty): Promise<Specialty> {
    const [specialty] = await db
      .insert(specialties)
      .values(specialtyData)
      .returning();
    return specialty;
  }

  async getAllSpecialties(): Promise<Specialty[]> {
    return await db.select().from(specialties).orderBy(specialties.name);
  }

  async updateSpecialty(id: string, data: Partial<Specialty>): Promise<Specialty> {
    const [updatedSpecialty] = await db
      .update(specialties)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(specialties.id, id))
      .returning();
    
    if (!updatedSpecialty) {
      throw new Error("Área de especialidade não encontrada");
    }
    
    return updatedSpecialty;
  }

  async deleteSpecialty(id: string): Promise<void> {
    await db
      .delete(specialties)
      .where(eq(specialties.id, id));
  }

}

// Always use DatabaseStorage to ensure data persistence
export const storage = new DatabaseStorage();
