import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { TemplateType, insertTemplateSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication and user management routes
  setupAuth(app);
  
  // Template routes
  // Get all templates
  app.get("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Erro ao buscar templates:", error);
      res.status(500).send("Erro ao buscar templates");
    }
  });
  
  // Get templates by type
  app.get("/api/templates/:type", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { type } = req.params;
    if (type !== 'struct' && type !== 'output') {
      return res.status(400).send("Tipo de template inválido");
    }
    
    try {
      const templates = await storage.getTemplatesByType(type as TemplateType);
      res.json(templates);
    } catch (error) {
      console.error(`Erro ao buscar templates do tipo ${type}:`, error);
      res.status(500).send(`Erro ao buscar templates do tipo ${type}`);
    }
  });
  
  // Get template by ID
  app.get("/api/template/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).send("Template não encontrado");
      }
      res.json(template);
    } catch (error) {
      console.error("Erro ao buscar template:", error);
      res.status(500).send("Erro ao buscar template");
    }
  });
  
  // Create template
  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("Body recebido para criação de template:", JSON.stringify(req.body, null, 2));
      const templateData = insertTemplateSchema.parse(req.body);
      
      // Verificar se já existe template com o mesmo código
      const existingTemplate = await storage.getTemplateByCode(templateData.code);
      if (existingTemplate) {
        return res.status(400).send("Já existe um template com este código");
      }
      
      // Garantir que a estrutura seja um objeto e não uma string
      if (typeof templateData.structure === 'string') {
        try {
          templateData.structure = JSON.parse(templateData.structure);
        } catch (e) {
          console.warn("Não foi possível analisar a estrutura como JSON:", e);
        }
      }
      
      console.log("Dados do template a ser criado:", templateData);
      const newTemplate = await storage.createTemplate(templateData);
      console.log("Template criado com sucesso:", newTemplate);
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Erro ao criar template:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Dados inválidos para o template",
          errors: error.errors
        });
      }
      res.status(500).send("Erro ao criar template");
    }
  });
  
  // Update template
  app.put("/api/template/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      console.log("Body recebido para atualização de template:", JSON.stringify(req.body, null, 2));
      
      // Verificar se o template existe
      const existingTemplate = await storage.getTemplate(id);
      if (!existingTemplate) {
        return res.status(404).send("Template não encontrado");
      }
      
      // Se o código estiver sendo alterado, verificar duplicidade
      if (req.body.code && req.body.code !== existingTemplate.code) {
        const templateWithCode = await storage.getTemplateByCode(req.body.code);
        if (templateWithCode && templateWithCode.id !== id) {
          return res.status(400).send("Já existe um template com este código");
        }
      }
      
      // Garantir que a estrutura seja um objeto e não uma string
      const dataToUpdate = { ...req.body };
      if (typeof dataToUpdate.structure === 'string') {
        try {
          dataToUpdate.structure = JSON.parse(dataToUpdate.structure);
        } catch (e) {
          console.warn("Não foi possível analisar a estrutura como JSON:", e);
        }
      }
      
      console.log("Dados do template a ser atualizado:", dataToUpdate);
      const updatedTemplate = await storage.updateTemplate(id, dataToUpdate);
      console.log("Template atualizado com sucesso:", updatedTemplate);
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Erro ao atualizar template:", error);
      res.status(500).send("Erro ao atualizar template");
    }
  });
  
  // Delete template
  app.delete("/api/template/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o template existe
      const existingTemplate = await storage.getTemplate(id);
      if (!existingTemplate) {
        return res.status(404).send("Template não encontrado");
      }
      
      await storage.deleteTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      res.status(500).send("Erro ao excluir template");
    }
  });

  // The httpServer is needed for potential WebSocket connections later
  const httpServer = createServer(app);

  return httpServer;
}
