import { pgTable, text, serial, timestamp, boolean, json, uuid } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["ADMIN", "EDITOR", "USER"] }).notNull().default("USER"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE", "PENDING"] }).notNull().default("ACTIVE"),
  avatarUrl: text("avatar_url").default(""),
  mustChangePassword: boolean("must_change_password").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["struct", "output"] }).notNull(),
  structure: json("structure").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mondayMappings = pgTable("monday_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  boardId: text("board_id").notNull(),
  statusColumn: text("status_column").default(""),
  responsibleColumn: text("responsible_column").default(""),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceConnections = pgTable("service_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceName: text("service_name").notNull().unique(),
  token: text("token").notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
