import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PluginStatus, PluginType } from "@shared/schema";
import { TemplateType, insertTemplateSchema, insertMondayMappingSchema, insertMondayColumnSchema, insertServiceConnectionSchema } from "@shared/schema";
import { db } from "./db";
import { ZodError } from "zod";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import multer from "multer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication and user management routes
  setupAuth(app);

  // DOCUMENTO UPDATE - PRIORIDADE MÁXIMA
  app.all("/api/doc-update/:id", async (req, res) => {
    console.log("🔥 ENDPOINT DIRETO ACIONADO:", req.method, req.params.id);
    
    // Forçar resposta como texto simples para contornar Vite
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    
    if (!req.isAuthenticated()) {
      console.log("🔥 Não autorizado");
      return res.status(401).send("UNAUTHORIZED");
    }
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      console.log("🔥 SUCESSO DIRETO:", documento);
      
      // Resposta como texto que o frontend pode interpretar
      return res.status(200).send("SUCCESS:" + JSON.stringify({
        success: true,
        data: documento
      }));
    } catch (error: any) {
      console.error("🔥 ERRO DIRETO:", error);
      return res.status(500).send("ERROR:" + error.message);
    }
  });
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  // File upload route
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${timestamp}_${req.file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Save file to disk
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Return file path for database storage
      const relativePath = `/uploads/documents/${fileName}`;
      
      res.json({ 
        path: relativePath,
        originalName: req.file.originalname,
        size: req.file.size
      });
      
    } catch (error) {
      console.error("Erro ao fazer upload do arquivo:", error);
      res.status(500).json({ error: "Erro ao fazer upload do arquivo" });
    }
  });
  
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

  // Monday.com integration routes
  // Rotas para gerenciar conexões de serviço (tokens)
  
  // Listar todas as conexões de serviço
  app.get("/api/services/connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const connections = await storage.getAllServiceConnections();
      res.json(connections);
    } catch (error: any) {
      console.error("Erro ao listar conexões de serviço:", error);
      res.status(500).send("Erro ao listar conexões de serviço");
    }
  });
  
  // Obter uma conexão específica por nome do serviço
  app.get("/api/services/connections/:serviceName", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { serviceName } = req.params;
    
    try {
      const connection = await storage.getServiceConnection(serviceName);
      if (!connection) {
        return res.status(404).send("Conexão de serviço não encontrada");
      }
      res.json(connection);
    } catch (error: any) {
      console.error(`Erro ao buscar conexão de serviço ${serviceName}:`, error);
      res.status(500).send("Erro ao buscar conexão de serviço");
    }
  });
  
  // Criar ou atualizar uma conexão de serviço
  app.post("/api/services/connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const connectionData = insertServiceConnectionSchema.parse(req.body);
      const connection = await storage.saveServiceConnection(connectionData);
      res.status(201).json(connection);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao salvar conexão de serviço:", error);
      res.status(500).send("Erro ao salvar conexão de serviço");
    }
  });
  
  // Excluir uma conexão de serviço
  app.delete("/api/services/connections/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      await storage.deleteServiceConnection(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(`Erro ao excluir conexão de serviço ${id}:`, error);
      res.status(500).send("Erro ao excluir conexão de serviço");
    }
  });
  
  // Rotas legadas para compatibilidade com código existente
  
  // Get API Key
  app.get("/api/monday/apikey", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const apiKey = await storage.getMondayApiKey();
      res.json({ apiKey: apiKey || "" });
    } catch (error: any) {
      console.error("Erro ao buscar chave da API:", error);
      res.status(500).send("Erro ao buscar chave da API");
    }
  });
  
  // Save API Key
  app.post("/api/monday/apikey", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).send("Chave da API inválida");
    }
    
    try {
      // Salva na nova estrutura e mantém compatibilidade com código legado
      await storage.saveMondayApiKey(apiKey);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao salvar chave da API:", error);
      res.status(500).send("Erro ao salvar chave da API");
    }
  });
  
  // Get all Monday mappings
  app.get("/api/monday/mappings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const mappings = await storage.getAllMondayMappings();
      
      // Para cada mapeamento, buscar a contagem de colunas mapeadas
      const mappingsWithColumnCount = [];
      
      for (const mapping of mappings) {
        try {
          // Usar Drizzle ORM para consultar as colunas mapeadas
          const columns = await storage.getMappingColumns(mapping.id);
          const count = columns.length;
          
          console.log(`Mapeamento ID ${mapping.id} (${mapping.name}): ${count} colunas mapeadas`);
          
          mappingsWithColumnCount.push({
            ...mapping,
            columnCount: count
          });
        } catch (error) {
          console.error(`Erro ao buscar colunas para mapeamento ${mapping.id}:`, error);
          mappingsWithColumnCount.push({
            ...mapping,
            columnCount: 0
          });
        }
      }
      
      res.json(mappingsWithColumnCount);
    } catch (error) {
      console.error("Erro ao buscar mapeamentos:", error);
      res.status(500).send("Erro ao buscar mapeamentos");
    }
  });
  
  // Get Monday mapping by ID
  app.get("/api/monday/mappings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      const mapping = await storage.getMondayMapping(id);
      if (!mapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      res.json(mapping);
    } catch (error) {
      console.error("Erro ao buscar mapeamento:", error);
      res.status(500).send("Erro ao buscar mapeamento");
    }
  });
  
  // Create Monday mapping
  app.post("/api/monday/mappings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("Body recebido para criação de mapeamento:", JSON.stringify(req.body, null, 2));
      const mappingData = insertMondayMappingSchema.parse(req.body);
      
      // Removida a verificação de mapeamento existente para permitir múltiplos mapeamentos
      // para o mesmo quadro do Monday
      
      console.log("Dados do mapeamento a ser criado:", mappingData);
      const newMapping = await storage.createMondayMapping(mappingData);
      console.log("Mapeamento criado com sucesso:", newMapping);
      
      res.status(201).json(newMapping);
    } catch (error) {
      console.error("Erro ao criar mapeamento:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Dados inválidos para o mapeamento",
          errors: error.errors
        });
      }
      res.status(500).send("Erro ao criar mapeamento");
    }
  });
  
  // Update Monday mapping
  app.patch("/api/monday/mappings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      console.log("Body recebido para atualização de mapeamento:", JSON.stringify(req.body, null, 2));
      
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      // Se o boardId estiver sendo alterado, verificar duplicidade
      if (req.body.boardId && req.body.boardId !== existingMapping.boardId) {
        const mappingWithBoardId = await storage.getMondayMappingByBoardId(req.body.boardId);
        if (mappingWithBoardId && mappingWithBoardId.id !== id) {
          return res.status(400).send("Já existe um mapeamento para este quadro");
        }
      }
      
      console.log("Dados do mapeamento a ser atualizado:", req.body);
      const updatedMapping = await storage.updateMondayMapping(id, req.body);
      console.log("Mapeamento atualizado com sucesso:", updatedMapping);
      
      res.json(updatedMapping);
    } catch (error) {
      console.error("Erro ao atualizar mapeamento:", error);
      res.status(500).send("Erro ao atualizar mapeamento");
    }
  });
  
  // Update last sync time for a Monday mapping
  app.post("/api/monday/mappings/:id/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      const updatedMapping = await storage.updateMondayMappingLastSync(id);
      res.json(updatedMapping);
    } catch (error) {
      console.error("Erro ao atualizar data de sincronização:", error);
      res.status(500).send("Erro ao atualizar data de sincronização");
    }
  });
  
  // Verify and get columns from a Monday.com board
  app.get("/api/monday/board/:boardId/columns", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { boardId } = req.params;
    
    try {
      // Obter a chave da API
      const apiKey = await storage.getMondayApiKey();
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: "API key do Monday não configurada"
        });
      }
      
      // Fazer requisição à API do Monday.com para verificar se o quadro existe
      const query = `
        query {
          boards(ids: ${boardId}) {
            id
            name
            columns {
              id
              title
              type
            }
          }
        }
      `;
      
      const mondayResponse = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey
        },
        body: JSON.stringify({ query })
      });
      
      if (!mondayResponse.ok) {
        return res.status(500).json({
          success: false,
          message: `Erro na API do Monday: ${mondayResponse.status}`
        });
      }
      
      const data = await mondayResponse.json();
      
      if (data.errors) {
        return res.status(400).json({
          success: false,
          message: `Erro na consulta GraphQL: ${JSON.stringify(data.errors)}`
        });
      }
      
      // Verificar se o quadro existe
      if (!data.data?.boards || data.data.boards.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quadro não encontrado no Monday.com"
        });
      }
      
      const board = data.data.boards[0];
      const columns = board.columns || [];
      
      res.json({
        success: true,
        boardName: board.name,
        columns: columns
      });
    } catch (error) {
      console.error("Erro ao validar quadro:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao validar quadro"
      });
    }
  });

  // Validate Monday board
  app.get("/api/monday/boards/:boardId/validate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { boardId } = req.params;
    
    try {
      // Obter a chave da API
      const apiKey = await storage.getMondayApiKey();
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: "API key do Monday não configurada"
        });
      }
      
      // Fazer requisição à API do Monday.com para verificar se o quadro existe
      const query = `
        query {
          boards(ids: ${boardId}) {
            id
            name
          }
        }
      `;
      
      const mondayResponse = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey
        },
        body: JSON.stringify({ query })
      });
      
      if (!mondayResponse.ok) {
        return res.status(500).json({
          success: false,
          message: `Erro na API do Monday: ${mondayResponse.status} ${mondayResponse.statusText}`
        });
      }
      
      const data = await mondayResponse.json();
      
      if (data.errors) {
        return res.status(400).json({
          success: false,
          message: `Erro na consulta GraphQL: ${JSON.stringify(data.errors)}`
        });
      }
      
      // Verifica se o quadro existe e tem dados válidos
      if (!data.data?.boards || data.data.boards.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Quadro não encontrado"
        });
      }
      
      res.json({
        success: true,
        message: "Quadro encontrado",
        board: data.data.boards[0]
      });
    } catch (error) {
      console.error("Erro ao validar quadro:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao validar quadro"
      });
    }
  });

  // Rotas para mapeamento de colunas
  // Obter mapeamentos de colunas para um mapeamento
  app.get("/api/monday/mappings/:id/column-mappings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      // Buscar as colunas mapeadas e as colunas do Monday
      const mappingColumns = await storage.getMappingColumns(id);
      const mondayColumns = await storage.getMondayColumns(id);
      
      // Adicionar o tipo da coluna diretamente nas colunas mapeadas
      const columnsWithType = mappingColumns.map(column => {
        // Encontrar a coluna do Monday correspondente 
        const mondayColumn = mondayColumns.find(mc => mc.columnId === column.mondayColumnId);
        
        return {
          ...column,
          columnType: mondayColumn?.type || "desconhecido"
        };
      });
      
      res.json(columnsWithType);
    } catch (error) {
      console.error("Erro ao buscar mapeamentos de colunas:", error);
      res.status(500).send("Erro ao buscar mapeamentos de colunas");
    }
  });
  
  // Criar mapeamento de coluna
  app.post("/api/monday/mappings/:id/column-mappings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      const columnMapping = {
        mappingId: id,
        ...req.body
      };
      
      const newColumnMapping = await storage.createMappingColumn(columnMapping);
      res.status(201).json(newColumnMapping);
    } catch (error) {
      console.error("Erro ao criar mapeamento de coluna:", error);
      res.status(500).send("Erro ao criar mapeamento de coluna");
    }
  });
  
  // Atualizar mapeamento de coluna
  app.patch("/api/monday/mappings/column-mappings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento de coluna existe
      const existingColumnMapping = await storage.getMappingColumnById(id);
      if (!existingColumnMapping) {
        return res.status(404).send("Mapeamento de coluna não encontrado");
      }
      
      const updatedColumnMapping = await storage.updateMappingColumn(id, req.body);
      res.json(updatedColumnMapping);
    } catch (error) {
      console.error("Erro ao atualizar mapeamento de coluna:", error);
      res.status(500).send("Erro ao atualizar mapeamento de coluna");
    }
  });
  
  // Excluir mapeamento de coluna
  app.delete("/api/monday/mappings/column-mappings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento de coluna existe
      const existingColumnMapping = await storage.getMappingColumnById(id);
      if (!existingColumnMapping) {
        return res.status(404).send("Mapeamento de coluna não encontrado");
      }
      
      await storage.deleteMappingColumn(id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir mapeamento de coluna:", error);
      res.status(500).send("Erro ao excluir mapeamento de coluna");
    }
  });

  // Delete Monday mapping
  app.delete("/api/monday/mappings/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      // Primeiro excluímos as colunas associadas a este mapeamento
      await storage.deleteMondayColumns(id);
      
      // Depois excluímos o mapeamento
      await storage.deleteMondayMapping(id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir mapeamento:", error);
      res.status(500).send("Erro ao excluir mapeamento");
    }
  });
  
  // Get columns for a Monday mapping
  app.get("/api/monday/mappings/:id/columns", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      const columns = await storage.getMondayColumns(id);
      res.json(columns);
    } catch (error) {
      console.error("Erro ao buscar colunas:", error);
      res.status(500).send("Erro ao buscar colunas");
    }
  });
  
  // Execute Monday mapping synchronization
  app.post("/api/monday/mappings/:id/execute", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      // Obter a chave da API
      const apiKey = await storage.getMondayApiKey();
      if (!apiKey) {
        return res.status(400).send("Chave da API do Monday não configurada");
      }
      
      // Buscar as colunas mapeadas para este mapeamento
      const mappingColumns = await storage.getMappingColumns(id);
      if (mappingColumns.length === 0) {
        return res.status(400).send("Nenhuma coluna mapeada encontrada para este mapeamento");
      }
      
      console.log("Token Monday encontrado:", apiKey ? apiKey.substring(0, 10) + "..." : "NENHUM");
      console.log("Board ID:", existingMapping.boardId);
      console.log("Colunas mapeadas:", mappingColumns.length);

      // Obter dados do quadro Monday
      const mondayColumns = mappingColumns.map(col => col.mondayColumnId);
      const query = `
        query {
          boards(ids: [${existingMapping.boardId}]) {
            items_page(limit: 500) {
              items {
                id
                name
                column_values(ids: [${mondayColumns.map(id => `"${id}"`).join(", ")}]) {
                  id
                  title
                  text
                  value
                }
              }
            }
          }
        }
      `;
      
      console.log("Query GraphQL:", query);

      const mondayResponse = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey,
          "API-Version": "2023-10"
        },
        body: JSON.stringify({ query })
      });

      if (!mondayResponse.ok) {
        const errorText = await mondayResponse.text();
        throw new Error(`Erro na API do Monday (${mondayResponse.status}): ${errorText}`);
      }

      // Verificar se a resposta é JSON válido
      const responseText = await mondayResponse.text();
      let mondayData;
      
      try {
        mondayData = JSON.parse(responseText);
        console.log("Resposta da API Monday:", JSON.stringify(mondayData, null, 2));
      } catch (parseError) {
        console.error("=== CONTEÚDO COMPLETO RETORNADO PELA API MONDAY ===");
        console.error(responseText);
        console.error("=== FIM DO CONTEÚDO ===");
        throw new Error(`API do Monday retornou HTML em vez de JSON. Conteúdo: ${responseText.substring(0, 200)}...`);
      }
      
      if (mondayData.errors) {
        console.error("Erros GraphQL:", mondayData.errors);
        throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(mondayData.errors)}`);
      }

      const items = mondayData.data?.boards?.[0]?.items_page?.items || [];
      let documentsCreated = 0;
      let documentsSkipped = 0;

      // Processar cada item (linha) do Monday
      for (const item of items) {
        try {
          // Construir o documento baseado no mapeamento de colunas
          const documentData: any = {};
          
          // Mapear cada coluna do Monday para o campo correspondente
          for (const mapping of mappingColumns) {
            const columnValue = item.column_values.find((cv: any) => cv.id === mapping.mondayColumnId);
            let value = columnValue?.text || "";
            
            // Aplicar função de transformação se existir
            if (mapping.transformFunction && mapping.transformFunction.trim()) {
              try {
                // Implementar funções básicas de transformação
                if (mapping.transformFunction === "uppercase") {
                  value = value.toUpperCase();
                } else if (mapping.transformFunction === "lowercase") {
                  value = value.toLowerCase();
                } else if (mapping.transformFunction === "trim") {
                  value = value.trim();
                }
              } catch (transformError) {
                console.warn(`Erro na transformação da coluna ${mapping.cpxField}:`, transformError);
              }
            }
            
            documentData[mapping.cpxField] = value;
          }

          // Verificar se todos os campos obrigatórios estão preenchidos
          const requiredFields = ["origem", "objeto", "cliente", "responsavel", "sistema", "modulo", "descricao"];
          const missingFields = requiredFields.filter(field => !documentData[field] || documentData[field].trim() === "");
          
          if (missingFields.length > 0) {
            console.warn(`Item ${item.id} pulado - campos obrigatórios em branco: ${missingFields.join(", ")}`);
            documentsSkipped++;
            continue;
          }

          // Definir valores padrão se não mapeados
          if (!documentData.status) {
            documentData.status = "Processando";
          }
          if (!documentData.statusOrigem) {
            documentData.statusOrigem = "Monday.com";
          }

          // Criar o documento
          const newDocument = await storage.createDocumento(documentData);
          documentsCreated++;
          
        } catch (itemError) {
          console.error(`Erro ao processar item ${item.id}:`, itemError);
          documentsSkipped++;
        }
      }
      
      // Atualizar a data de última sincronização
      await storage.updateMondayMappingLastSync(id);
      
      res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        mapping: existingMapping,
        itemsProcessed: items.length,
        documentsCreated,
        documentsSkipped,
        columnsMapping: mappingColumns.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Erro ao executar sincronização:", error);
      res.status(500).send(`Erro ao executar sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  });

  // Fetch columns from Monday.com API and save them
  app.post("/api/monday/mappings/:id/fetch-columns", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se o mapeamento existe
      const existingMapping = await storage.getMondayMapping(id);
      if (!existingMapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }
      
      // Obter a chave da API
      const apiKey = await storage.getMondayApiKey();
      if (!apiKey) {
        return res.status(400).send("Chave da API do Monday não configurada");
      }
      
      // Fazer requisição à API do Monday.com para obter as colunas do quadro
      const query = `
        query {
          boards(ids: ${existingMapping.boardId}) {
            columns {
              id
              title
              type
            }
          }
        }
      `;
      
      try {
        const mondayResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": apiKey
          },
          body: JSON.stringify({ query })
        });
        
        if (!mondayResponse.ok) {
          throw new Error(`Erro na API do Monday: ${mondayResponse.status} ${mondayResponse.statusText}`);
        }
        
        const data = await mondayResponse.json();
        
        if (data.errors) {
          throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(data.errors)}`);
        }
        
        if (!data.data?.boards?.[0]?.columns) {
          throw new Error("Não foi possível obter as colunas do quadro");
        }
        
        const columns = data.data.boards[0].columns;
        
        // Excluir as colunas existentes
        await storage.deleteMondayColumns(id);
        
        // Inserir as novas colunas
        const columnsToInsert = columns.map((column: any) => ({
          mappingId: id,
          columnId: column.id,
          title: column.title,
          type: column.type
        }));
        
        const savedColumns = await storage.createManyMondayColumns(columnsToInsert);
        
        // Atualizar a data de última sincronização
        await storage.updateMondayMappingLastSync(id);
        
        res.status(200).json(savedColumns);
      } catch (error) {
        console.error("Erro ao comunicar com a API do Monday:", error);
        res.status(500).send(`Erro ao comunicar com a API do Monday: ${error.message}`);
      }
    } catch (error) {
      console.error("Erro ao buscar colunas:", error);
      res.status(500).send("Erro ao buscar colunas");
    }
  });
  
  // Rotas para conexões de serviços externos
  
  // Obter todas as conexões de serviço
  app.get("/api/service-connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const connections = await storage.getAllServiceConnections();
      res.json(connections);
    } catch (error) {
      console.error("Erro ao buscar conexões de serviço:", error);
      res.status(500).send("Erro ao buscar conexões de serviço");
    }
  });
  
  // Obter uma conexão de serviço pelo nome do serviço
  app.get("/api/service-connections/name/:serviceName", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { serviceName } = req.params;
    
    try {
      const connection = await storage.getServiceConnection(serviceName);
      if (!connection) {
        return res.status(404).send("Conexão não encontrada");
      }
      res.json(connection);
    } catch (error) {
      console.error("Erro ao buscar conexão de serviço:", error);
      res.status(500).send("Erro ao buscar conexão de serviço");
    }
  });
  
  // Criar uma conexão de serviço
  app.post("/api/service-connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // Validar os dados recebidos
      const connectionData = insertServiceConnectionSchema.parse(req.body);
      
      // Verificar se já existe uma conexão para este serviço
      const existingConnection = await storage.getServiceConnection(connectionData.serviceName);
      
      // Se já existir, atualizamos em vez de criar nova
      if (existingConnection) {
        console.log("Conexão já existe, atualizando:", connectionData.serviceName);
        const updatedConnection = await storage.updateServiceConnection(existingConnection.id, connectionData);
        return res.json(updatedConnection);
      }
      
      // Salvar a conexão de serviço
      console.log("Criando nova conexão:", connectionData.serviceName);
      const connection = await storage.saveServiceConnection(connectionData);
      console.log("Conexão salva com sucesso:", connection);
      res.status(201).json(connection);
    } catch (error) {
      console.error("Erro ao salvar conexão de serviço:", error);
      
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      
      res.status(500).send(`Erro ao salvar conexão de serviço: ${error.message}`);
    }
  });
  
  // Atualizar uma conexão de serviço
  app.put("/api/service-connections/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Validar os dados recebidos
      const connectionData = insertServiceConnectionSchema.parse(req.body);
      
      // Atualizar a conexão de serviço
      const connection = await storage.updateServiceConnection(id, connectionData);
      console.log("Conexão atualizada com sucesso:", connection);
      res.json(connection);
    } catch (error) {
      console.error("Erro ao atualizar conexão de serviço:", error);
      
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      
      res.status(500).send(`Erro ao atualizar conexão de serviço: ${error.message}`);
    }
  });
  
  // Excluir uma conexão de serviço
  app.delete("/api/service-connections/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      await storage.deleteServiceConnection(id);
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir conexão de serviço:", error);
      res.status(500).send(`Erro ao excluir conexão de serviço: ${error.message}`);
    }
  });

  // Plugin routes
  app.get("/api/plugins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugins = await storage.getAllPlugins();
      res.json(plugins);
    } catch (error) {
      console.error("Erro ao buscar plugins:", error);
      res.status(500).send("Erro ao buscar plugins");
    }
  });

  app.get("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.getPlugin(req.params.id);
      if (!plugin) {
        return res.status(404).send("Plugin não encontrado");
      }
      res.json(plugin);
    } catch (error) {
      console.error("Erro ao buscar plugin:", error);
      res.status(500).send("Erro ao buscar plugin");
    }
  });

  app.post("/api/plugins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.createPlugin(req.body);
      res.status(201).json(plugin);
    } catch (error) {
      console.error("Erro ao criar plugin:", error);
      res.status(500).send("Erro ao criar plugin");
    }
  });

  app.put("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.updatePlugin(req.params.id, req.body);
      res.json(plugin);
    } catch (error) {
      console.error("Erro ao atualizar plugin:", error);
      res.status(500).send("Erro ao atualizar plugin");
    }
  });

  app.post("/api/plugins/:id/toggle", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.togglePluginStatus(req.params.id);
      res.json(plugin);
    } catch (error) {
      console.error("Erro ao alterar status do plugin:", error);
      res.status(500).send("Erro ao alterar status do plugin");
    }
  });

  app.delete("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deletePlugin(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir plugin:", error);
      res.status(500).send("Erro ao excluir plugin");
    }
  });

  // Testar plugin
  app.post("/api/plugins/:id/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.getPlugin(req.params.id);
      
      if (!plugin) {
        return res.status(404).json({ message: "Plugin não encontrado" });
      }

      // Verificar se o plugin está ativo
      if (plugin.status !== "active") {
        return res.status(400).json({ 
          message: "Plugin deve estar ativo para ser testado",
          status: plugin.status 
        });
      }

      // Dados recebidos da aplicação para o teste
      const testData = req.body;

      // Simular a execução do plugin baseado no seu tipo
      let testResult: any;

      switch (plugin.type) {
        case "data_source":
          testResult = {
            type: "data_source",
            pluginName: plugin.name,
            message: "Plugin de fonte de dados executado com sucesso",
            dataFetched: {
              records: 25,
              lastUpdate: new Date().toISOString(),
              source: "API Externa"
            },
            processedInput: testData
          };
          break;

        case "ai_agent":
          testResult = {
            type: "ai_agent",
            pluginName: plugin.name,
            message: "Agente de IA processou a solicitação",
            aiResponse: "Baseado no contexto fornecido, o plugin de IA analisou os dados e gerou uma resposta inteligente.",
            confidence: 0.87,
            suggestions: ["Sugestão 1", "Sugestão 2", "Sugestão 3"],
            processedInput: testData
          };
          break;

        case "chart":
          testResult = {
            type: "chart",
            pluginName: plugin.name,
            message: "Plugin de gráfico gerou visualização",
            chartData: {
              type: "bar",
              data: [10, 20, 30, 40, 50],
              labels: ["Jan", "Fev", "Mar", "Abr", "Mai"],
              title: "Dados de Exemplo"
            },
            processedInput: testData
          };
          break;

        case "formatter":
          testResult = {
            type: "formatter",
            pluginName: plugin.name,
            message: "Plugin formatador processou o texto",
            originalText: testData.applicationContext?.selectedText || "Texto de teste",
            formattedText: "**Texto formatado com sucesso pelo plugin**",
            format: "markdown",
            processedInput: testData
          };
          break;

        case "integration":
          testResult = {
            type: "integration",
            pluginName: plugin.name,
            message: "Plugin de integração conectou com serviço externo",
            serviceConnected: true,
            syncStatus: "success",
            recordsSynced: 15,
            lastSync: new Date().toISOString(),
            processedInput: testData
          };
          break;

        case "utility":
          testResult = {
            type: "utility",
            pluginName: plugin.name,
            message: "Plugin utilitário executou tarefa",
            taskCompleted: true,
            result: "Operação concluída com sucesso",
            executionTime: "0.5s",
            processedInput: testData
          };
          break;

        default:
          testResult = {
            type: "unknown",
            pluginName: plugin.name,
            message: "Plugin executado (tipo não reconhecido)",
            processedInput: testData
          };
      }

      // Adicionar informações de comunicação API
      testResult.communication = {
        endpoint: `/api/plugins/${plugin.id}/test`,
        method: "POST",
        timestamp: new Date().toISOString(),
        dataExchange: {
          received: Object.keys(testData).length > 0,
          sent: true,
          dataTypes: ["text", "json", "objects"]
        }
      };

      console.log(`Plugin ${plugin.name} testado com sucesso:`, testResult);
      
      res.status(200).json(testResult);
    } catch (error: any) {
      console.error("Erro ao testar plugin:", error);
      res.status(500).json({ 
        message: "Erro interno do servidor ao testar plugin",
        error: error.message 
      });
    }
  });

  // Canvas selection upload endpoint
  app.post("/api/canvas/upload-selection", upload.single('image'), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // Verificar se há arquivo de imagem
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhuma imagem fornecida"
        });
      }
      
      const timestamp = new Date().toISOString();
      const filename = `selection_${Date.now()}.jpg`;
      const filepath = path.join(process.cwd(), "uploads", "canvas", filename);
      
      // Salvar arquivo no servidor
      await fs.promises.writeFile(filepath, req.file.buffer);
      
      const result = {
        success: true,
        filename,
        timestamp,
        message: "Seleção do canvas salva com sucesso",
        url: `/uploads/canvas/${filename}`,
        metadata: {
          format: "jpeg",
          quality: 0.9,
          uploadedBy: req.user?.name || "Usuário",
          size: req.file.size
        }
      };

      console.log("Seleção do canvas recebida:", {
        user: req.user?.name,
        filename,
        timestamp,
        size: req.file.size
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Erro ao fazer upload da seleção:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao fazer upload da seleção",
        error: error.message 
      });
    }
  });

  // Documento routes
  app.get("/api/documentos", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documentos = await storage.getAllDocumentos();
      res.json(documentos);
    } catch (error: any) {
      console.error("Erro ao buscar documentos:", error);
      res.status(500).send("Erro ao buscar documentos");
    }
  });

  app.get("/api/documentos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documento = await storage.getDocumento(req.params.id);
      if (!documento) {
        return res.status(404).send("Documento não encontrado");
      }
      res.json(documento);
    } catch (error: any) {
      console.error("Erro ao buscar documento:", error);
      res.status(500).send("Erro ao buscar documento");
    }
  });

  app.post("/api/documentos", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documento = await storage.createDocumento(req.body);
      res.status(201).json(documento);
    } catch (error: any) {
      console.error("Erro ao criar documento:", error);
      res.status(500).send("Erro ao criar documento");
    }
  });

  // Endpoint de teste direto
  app.post("/api/documentos/:id/update", async (req, res) => {
    console.log("🎯 ENDPOINT DE UPDATE ACIONADO - ID:", req.params.id);
    console.log("🎯 DADOS:", JSON.stringify(req.body));
    
    // Forçar cabeçalhos JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autorizado" });
    }
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      console.log("✅ SUCESSO:", documento);
      
      // Resposta JSON explícita
      const response = {
        success: true,
        data: documento
      };
      
      return res.status(200).json(response);
    } catch (error: any) {
      console.error("❌ ERRO:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.put("/api/documentos/:id", async (req, res) => {
    console.log("🚀 PUT /api/documentos/:id CHAMADO - ID:", req.params.id);
    console.log("🚀 DADOS RECEBIDOS:", JSON.stringify(req.body));
    
    if (!req.isAuthenticated()) {
      console.log("❌ Não autorizado");
      return res.status(401).json({ error: "Não autorizado" });
    }
    
    try {
      console.log("✅ Iniciando atualização no storage...");
      const documento = await storage.updateDocumento(req.params.id, req.body);
      console.log("✅ Documento atualizado com sucesso:", documento);
      
      return res.status(200).json({
        success: true,
        data: documento,
        message: "Documento atualizado com sucesso"
      });
    } catch (error: any) {
      console.error("❌ Erro ao atualizar documento:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.patch("/api/documentos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      res.json(documento);
    } catch (error: any) {
      console.error("Erro ao atualizar documento:", error);
      res.status(500).send("Erro ao atualizar documento");
    }
  });

  app.delete("/api/documentos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteDocumento(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      res.status(500).send("Erro ao excluir documento");
    }
  });

  // Document Artifacts routes
  app.get("/api/documentos/:documentoId/artifacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const artifacts = await storage.getDocumentArtifactsByDocumento(req.params.documentoId);
      res.json(artifacts);
    } catch (error: any) {
      console.error("Erro ao buscar artefatos:", error);
      res.status(500).send("Erro ao buscar artefatos");
    }
  });

  app.get("/api/artifacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const artifact = await storage.getDocumentArtifact(req.params.id);
      if (!artifact) {
        return res.status(404).send("Artefato não encontrado");
      }
      res.json(artifact);
    } catch (error: any) {
      console.error("Erro ao buscar artefato:", error);
      res.status(500).send("Erro ao buscar artefato");
    }
  });

  app.post("/api/documentos/:documentoId/artifacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const artifactData = {
        ...req.body,
        documentoId: req.params.documentoId
      };
      const artifact = await storage.createDocumentArtifact(artifactData);
      res.status(201).json(artifact);
    } catch (error: any) {
      console.error("Erro ao criar artefato:", error);
      res.status(500).send("Erro ao criar artefato");
    }
  });

  app.patch("/api/artifacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const artifact = await storage.updateDocumentArtifact(req.params.id, req.body);
      res.json(artifact);
    } catch (error: any) {
      console.error("Erro ao atualizar artefato:", error);
      res.status(500).send("Erro ao atualizar artefato");
    }
  });

  app.delete("/api/artifacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteDocumentArtifact(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao excluir artefato:", error);
      res.status(500).send("Erro ao excluir artefato");
    }
  });

  // Repo Structure routes
  app.get("/api/repo-structure", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    // Desabilitar cache para forçar busca nova
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const parentUid = req.query.parent as string;
      if (parentUid) {
        // Se especificar um parent, buscar por parent
        const structures = await storage.getRepoStructureByParent(parentUid);
        res.json(structures);
      } else {
        // Forçar busca direta de todas as estruturas sem cache
        const allStructures = await storage.getAllRepoStructures();
        console.log("API: Total de estruturas encontradas:", allStructures.length);
        console.log("API: Estruturas completas:", JSON.stringify(allStructures, null, 2));
        res.json(allStructures);
      }
    } catch (error: any) {
      console.error("Erro ao buscar estrutura do repositório:", error);
      res.status(500).send("Erro ao buscar estrutura do repositório");
    }
  });

  app.post("/api/repo-structure", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const structure = await storage.createRepoStructure(req.body);
      res.status(201).json(structure);
    } catch (error: any) {
      console.error("Erro ao criar estrutura do repositório:", error);
      res.status(500).send("Erro ao criar estrutura do repositório");
    }
  });

  app.put("/api/repo-structure/:uid/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { uid } = req.params;
      const { isSync } = req.body;
      const structure = await storage.updateRepoStructureSync(uid, isSync);
      res.json(structure);
    } catch (error: any) {
      console.error("Erro ao atualizar sincronização:", error);
      res.status(500).send("Erro ao atualizar sincronização");
    }
  });

  // DELETE: Remover pasta do banco local (não do GitHub)
  app.delete("/api/repo-structure/:uid", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { uid } = req.params;
      
      // Verificar se a pasta existe
      const structure = await storage.getRepoStructure(uid);
      if (!structure) {
        return res.status(404).send("Pasta não encontrada");
      }
      
      // Remover apenas do banco local
      console.log(`Removendo pasta ${structure.folderName} (${uid}) do banco`);
      await storage.deleteRepoStructure(uid);
      console.log(`Pasta ${structure.folderName} removida com sucesso`);
      
      res.json({ 
        message: `Pasta "${structure.folderName}" removida do banco local com sucesso.`,
        folderName: structure.folderName 
      });
    } catch (error: any) {
      console.error("Erro ao remover pasta:", error);
      res.status(500).send("Erro ao remover pasta do banco");
    }
  });

  // Endpoint para sincronizar estrutura do GitHub para o banco local
  app.post("/api/repo-structure/sync-from-github", async (req, res) => {
    try {
      // Buscar conexão GitHub
      const connections = await storage.getAllServiceConnections();
      const githubConnection = connections.find((c: any) => c.serviceName === "github");
      if (!githubConnection) {
        return res.status(400).json({ error: "Conexão GitHub não configurada" });
      }

      const token = githubConnection.token;
      const repository = githubConnection.parameters![0]; // formato: owner/repo
      const [owner, repo] = repository.split('/');

      // Buscar estrutura de pastas do GitHub
      const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      
      const githubResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EVO-MindBits-Composer',
        },
      });

      console.log('Content-Type da resposta:', githubResponse.headers.get('content-type'));
      console.log('Status da resposta:', githubResponse.status);

      if (!githubResponse.ok) {
        const errorText = await githubResponse.text();
        console.error('Erro na resposta do GitHub:', errorText);
        return res.status(400).json({ 
          error: "Erro ao buscar estrutura do GitHub",
          details: `Status: ${githubResponse.status}` 
        });
      }

      const contentType = githubResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await githubResponse.text();
        console.error('Resposta não é JSON:', responseText.substring(0, 200));
        return res.status(500).json({ 
          error: "GitHub retornou HTML em vez de JSON",
          details: "Possível problema de autenticação ou rate limit"
        });
      }

      let githubContent;
      try {
        githubContent = await githubResponse.json();
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta do GitHub:', parseError);
        
        // Se falhar, apenas sincronizar com base no que temos no banco
        const existingStructures = await storage.getAllRepoStructures();
        let updatedCount = 0;
        
        // Marcar todas as pastas como não sincronizadas por precaução
        for (const structure of existingStructures) {
          if (structure.isSync) {
            await storage.updateRepoStructureSync(structure.uid, false);
            updatedCount++;
          }
        }
        
        return res.json({ 
          message: `Token GitHub pode estar inválido. ${updatedCount} pasta(s) marcadas como não sincronizadas.`,
          importedCount: 0,
          updatedCount,
          warning: "Verifique o token do GitHub"
        });
      }
      const githubFolders = githubContent.filter((item: any) => item.type === 'dir');

      // Buscar estruturas existentes no banco
      const existingStructures = await storage.getAllRepoStructures();
      const existingFolderNames = existingStructures.map((s: any) => s.folderName);
      const githubFolderNames = githubFolders.map((f: any) => f.name);

      let importedCount = 0;
      let updatedCount = 0;

      // Importar pastas que existem no GitHub mas não no banco
      for (const folder of githubFolders) {
        if (!existingFolderNames.includes(folder.name)) {
          await storage.createRepoStructure({
            folderName: folder.name,
            linkedTo: null, // Pastas raiz por padrão
            isSync: true, // Já existem no GitHub, então estão sincronizadas
          });
          importedCount++;
          console.log(`Pasta importada do GitHub: ${folder.name}`);
        }
      }

      // Atualizar status de pastas que existem no banco mas foram deletadas do GitHub
      for (const structure of existingStructures) {
        if (!githubFolderNames.includes(structure.folderName)) {
          // Pasta existe no banco mas não no GitHub (foi deletada)
          await storage.updateRepoStructureSync(structure.uid, false);
          updatedCount++;
          console.log(`Status atualizado - pasta deletada do GitHub: ${structure.folderName}`);
        } else {
          // Pasta existe em ambos - garantir que está marcada como sincronizada
          if (!structure.isSync) {
            await storage.updateRepoStructureSync(structure.uid, true);
            updatedCount++;
            console.log(`Status atualizado - pasta re-sincronizada: ${structure.folderName}`);
          }
        }
      }

      res.json({ 
        message: `Sincronização concluída. ${importedCount} pasta(s) importadas e ${updatedCount} pasta(s) atualizadas.`,
        importedCount,
        updatedCount
      });
    } catch (error: any) {
      console.error("Erro ao sincronizar do GitHub:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Endpoint para sincronizar pasta individual com GitHub (DEVE vir DEPOIS do sync-from-github)
  app.post("/api/repo-structure/:uid/sync-github", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { uid } = req.params;
      console.log(`🔄 ENDPOINT RECEBIDO - Sincronizando UID: ${uid}`);
      const structure = await storage.getRepoStructure(uid);
      console.log(`📁 Estrutura encontrada:`, structure);
      
      if (!structure) {
        return res.status(404).send("Estrutura não encontrada");
      }

      // Buscar conexão GitHub
      const githubConnection = await storage.getServiceConnection("github");
      if (!githubConnection) {
        return res.status(400).send("Conexão GitHub não encontrada");
      }

      const [owner, repo] = githubConnection.parameters[0].split('/');
      
      // Construir caminho da pasta
      let folderPath = structure.folderName;
      let parent = structure.linkedTo ? await storage.getRepoStructure(structure.linkedTo) : null;
      
      while (parent) {
        folderPath = `${parent.folderName}/${folderPath}`;
        parent = parent.linkedTo ? await storage.getRepoStructure(parent.linkedTo) : null;
      }

      console.log(`Sincronizando pasta: ${structure.folderName} -> caminho: ${folderPath}`);

      // Primeiro, verificar se a pasta já existe no GitHub
      const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${githubConnection.token}`,
        },
      });

      if (checkResponse.ok) {
        // Pasta já existe no GitHub, apenas marcar como sincronizada
        console.log(`Pasta ${folderPath} já existe no GitHub, marcando como sincronizada`);
        await storage.updateRepoStructureSync(uid, true);
        res.json({ success: true, message: "Pasta já existe no GitHub e foi marcada como sincronizada" });
      } else if (checkResponse.status === 404) {
        // Pasta não existe, criar nova
        console.log(`Pasta ${folderPath} não existe, criando nova`);
        const createResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}/.gitkeep`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubConnection.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Criar pasta ${folderPath}`,
            content: Buffer.from('# Pasta criada pelo EVO-MindBits Composer').toString('base64')
          })
        });

        if (createResponse.ok) {
          console.log(`Pasta ${folderPath} criada com sucesso no GitHub`);
          await storage.updateRepoStructureSync(uid, true);
          res.json({ success: true, message: "Pasta criada no GitHub com sucesso" });
        } else {
          const errorData = await createResponse.json();
          console.log(`Erro ao criar pasta ${folderPath}:`, errorData);
          res.status(400).json({ success: false, message: errorData.message });
        }
      } else {
        // Outro erro
        const errorData = await checkResponse.json();
        console.log(`Erro ao verificar pasta ${folderPath}:`, errorData);
        res.status(400).json({ success: false, message: errorData.message });
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar com GitHub:", error);
      res.status(500).send("Erro ao sincronizar com GitHub");
    }
  });

  // The httpServer is needed for potential WebSocket connections later
  const httpServer = createServer(app);

  return httpServer;
}
