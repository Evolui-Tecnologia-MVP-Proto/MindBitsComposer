import { storage } from "./storage";
import type { InsertSystemLog } from "@shared/schema";
import { db } from "./db";
import { systemLogs } from "@shared/schema";
import crypto from "crypto";

// Event types for better organization and consistency
export const EventTypes = {
  // User events
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_PASSWORD_CHANGED: "USER_PASSWORD_CHANGED",
  
  // Document events
  DOCUMENT_CREATED: "DOCUMENT_CREATED",
  DOCUMENT_UPDATED: "DOCUMENT_UPDATED",
  DOCUMENT_DELETED: "DOCUMENT_DELETED",
  DOCUMENT_ARTIFACT_ADDED: "DOCUMENT_ARTIFACT_ADDED",
  
  // Monday.com integration events
  MONDAY_MAPPING_CREATED: "MONDAY_MAPPING_CREATED",
  MONDAY_MAPPING_UPDATED: "MONDAY_MAPPING_UPDATED",
  MONDAY_SYNC_STARTED: "MONDAY_SYNC_STARTED",
  MONDAY_SYNC_COMPLETED: "MONDAY_SYNC_COMPLETED",
  MONDAY_SYNC_ERROR: "MONDAY_SYNC_ERROR",
  MONDAY_SYNC_MANUAL: "MONDAY_SYNC_MANUAL",
  MONDAY_SYNC_TRIAGEM_DE_REQUISIÇÕES_DE_CLIENTES: "MONDAY_SYNC_TRIAGEM_DE_REQUISIÇÕES_DE_CLIENTES",
  
  // GitHub integration events
  GITHUB_SYNC_STARTED: "GITHUB_SYNC_STARTED",
  GITHUB_SYNC_COMPLETED: "GITHUB_SYNC_COMPLETED",
  GITHUB_SYNC_ERROR: "GITHUB_SYNC_ERROR",
  
  // System events
  SYSTEM_ERROR: "SYSTEM_ERROR",
  API_ERROR: "API_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  
  // Job events
  JOB_ACTIVATED: "JOB_ACTIVATED",
  JOB_CANCELLED: "JOB_CANCELLED",
  
  // Template events
  TEMPLATE_CREATED: "TEMPLATE_CREATED",
  TEMPLATE_UPDATED: "TEMPLATE_UPDATED",
  TEMPLATE_DELETED: "TEMPLATE_DELETED",
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

interface LogParams {
  eventType: EventType;
  message: string;
  parameters?: Record<string, any>;
  userId?: number;
}

export class SystemLogger {
  static async log({ eventType, message, parameters = {}, userId }: LogParams): Promise<void> {
    try {
      const logData: InsertSystemLog = {
        eventType,
        message,
        parameters,
        userId: userId || null,
        timestamp: new Date()
      };

      // Inserir log diretamente no banco
      await db.insert(systemLogs).values({
        id: crypto.randomUUID(),
        eventType: logData.eventType,
        message: logData.message,
        parameters: logData.parameters,
        userId: logData.userId,
        timestamp: new Date()
      });
    } catch (error) {
      // Avoid infinite loops by not logging log errors
      console.error("Erro ao criar log do sistema:", error);
    }
  }

  // Convenience methods for common log types
  static async logUserAction(userId: number, action: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      eventType: EventTypes.USER_LOGIN, // Will be updated based on action
      message: `Usuário executou ação: ${action}`,
      parameters: { action, ...details },
      userId
    });
  }

  static async logDocumentAction(userId: number, documentId: string, action: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      eventType: EventTypes.DOCUMENT_CREATED, // Will be updated based on action
      message: `Ação no documento ${documentId}: ${action}`,
      parameters: { documentId, action, ...details },
      userId
    });
  }

  static async logMondaySync(userId: number, mappingId: string, status: 'started' | 'completed' | 'error', details?: Record<string, any>): Promise<void> {
    const eventTypes = {
      started: EventTypes.MONDAY_SYNC_STARTED,
      completed: EventTypes.MONDAY_SYNC_COMPLETED,
      error: EventTypes.MONDAY_SYNC_ERROR
    };

    await this.log({
      eventType: eventTypes[status],
      message: `Sincronização Monday.com ${status} para mapeamento ${mappingId}`,
      parameters: { mappingId, status, ...details },
      userId
    });
  }

  static async logGitHubSync(userId: number, repository: string, status: 'started' | 'completed' | 'error', details?: Record<string, any>): Promise<void> {
    const eventTypes = {
      started: EventTypes.GITHUB_SYNC_STARTED,
      completed: EventTypes.GITHUB_SYNC_COMPLETED,
      error: EventTypes.GITHUB_SYNC_ERROR
    };

    await this.log({
      eventType: eventTypes[status],
      message: `Sincronização GitHub ${status} para repositório ${repository}`,
      parameters: { repository, status, ...details },
      userId
    });
  }

  static async logError(error: Error, context?: string, userId?: number, additionalData?: Record<string, any>): Promise<void> {
    await this.log({
      eventType: EventTypes.SYSTEM_ERROR,
      message: `Erro do sistema${context ? ` em ${context}` : ''}: ${error.message}`,
      parameters: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        ...additionalData
      },
      userId
    });
  }
}

// Função de conveniência para logging de eventos do sistema
export async function logSystemEvent(
  eventType: EventType,
  message: string,
  parameters?: Record<string, any>,
  userId?: number
): Promise<void> {
  await SystemLogger.log({
    eventType,
    message,
    parameters,
    userId
  });
}