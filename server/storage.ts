import { users, templates, type User, type InsertUser, type Template, type InsertTemplate, UserStatus, UserRole, TemplateType } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

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
  
  // Template operations
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByCode(code: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  getAllTemplates(): Promise<Template[]>;
  getTemplatesByType(type: TemplateType): Promise<Template[]>;
  updateTemplate(id: string, data: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
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
  }

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
}

// Use DatabaseStorage for production or MemStorage for development
export const storage = process.env.NODE_ENV === 'production' 
  ? new DatabaseStorage()
  : new MemStorage();
