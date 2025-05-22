import { users, templates, mondayMappings, mondayColumns, mappingColumns, serviceConnections, plugins,
  type User, type InsertUser, type Template, type InsertTemplate, 
  type MondayMapping, type InsertMondayMapping, type MondayColumn, type InsertMondayColumn, 
  type MappingColumn, type InsertMappingColumn, type ServiceConnection, type InsertServiceConnection,
  type Plugin, type InsertPlugin,
  UserStatus, UserRole, TemplateType, PluginStatus, PluginType } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<string, Template>;
  private mondayMappings: Map<string, MondayMapping>;
  private mondayColumns: Map<string, MondayColumn>;
  private mappingColumns: Map<string, MappingColumn>;
  private serviceConnections: Map<string, ServiceConnection>;
  private plugins: Map<string, Plugin>;
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
}

// Always use DatabaseStorage to ensure data persistence
export const storage = new DatabaseStorage();
