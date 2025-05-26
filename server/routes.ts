import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PluginStatus, PluginType, documentos } from "@shared/schema";
import { TemplateType, insertTemplateSchema, insertMondayMappingSchema, insertMondayColumnSchema, insertServiceConnectionSchema } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gte, lte, isNull } from "drizzle-orm";
import { systemLogs } from "@shared/schema";
import { ZodError } from "zod";
import fetch from "node-fetch";
import { jobManager } from "./job-manager";
import { SystemLogger } from "./logger";
import path from "path";
import fs from "fs";
import multer from "multer";

// Função compartilhada para executar mapeamento Monday
async function executeMondayMapping(mappingId: string, userId?: number, isHeadless: boolean = false) {
  console.log(`${isHeadless ? '🤖' : '👤'} INICIANDO EXECUÇÃO DO MAPEAMENTO:`, mappingId);
  
  // Verificar se o mapeamento existe
  const existingMapping = await storage.getMondayMapping(mappingId);
  if (!existingMapping) {
    throw new Error("Mapeamento não encontrado");
  }
  
  // Obter a chave da API
  const apiKey = await storage.getMondayApiKey();
  if (!apiKey) {
    throw new Error("Chave da API do Monday não configurada");
  }
  
  // Buscar colunas mapeadas para este mapeamento
  const mappingColumns = await storage.getMappingColumns(mappingId);
  console.log(`📊 ${mappingColumns.length} colunas mapeadas encontradas`);
  
  // Buscar dados do quadro Monday.com
  const boardId = existingMapping.boardId;
  console.log(`🎯 Buscando dados do quadro ${boardId}...`);
  
  const query = `
    query GetBoardItems($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
          }
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
    body: JSON.stringify({ query, variables: { boardId } })
  });
  
  if (!mondayResponse.ok) {
    throw new Error(`Erro na API do Monday: ${mondayResponse.status}`);
  }
  
  const mondayData: any = await mondayResponse.json();
  if (mondayData.errors) {
    throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(mondayData.errors)}`);
  }
  
  const items = mondayData.data.boards[0]?.items_page?.items || [];
  console.log(`📋 ${items.length} itens encontrados no quadro`);
  
  let documentsCreated = 0;
  let documentsSkipped = 0;
  let documentsPreExisting = 0;
  
  // Processar cada item
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    
    // Aplicar filtro se configurado
    if (existingMapping.mappingFilter && existingMapping.mappingFilter.trim()) {
      console.log(`🔍 VERIFICANDO FILTRO para item ${item.id}:`);
      console.log(`- mappingFilter existe? ${!!existingMapping.mappingFilter}`);
      console.log(`- mappingFilter não está vazio? ${existingMapping.mappingFilter}`);
      
      try {
        console.log(`✅ APLICANDO FILTRO para item ${item.id}`);
        console.log(`📋 FILTRO JAVASCRIPT: ${existingMapping.mappingFilter}`);
        
        const filterFunction = new Function('item', existingMapping.mappingFilter);
        const passesFilter = filterFunction(item);
        
        console.log(`🎯 RESULTADO DO FILTRO para item ${item.id}: ${passesFilter}`);
        
        if (!passesFilter) {
          console.log(`❌ Item ${item.id} foi FILTRADO (excluído) - não atende às condições`);
          documentsSkipped++;
          continue;
        } else {
          console.log(`✅ Item ${item.id} PASSOU no filtro - será processado`);
        }
      } catch (filterError) {
        console.error(`❌ ERRO no filtro para item ${item.id}:`, filterError);
        documentsSkipped++;
        continue;
      }
    }
    
    // Verificar se já existe um documento com este id_origem
    const idOrigem = BigInt(item.id);
    
    // Para execução automática, vamos pular a verificação de duplicatas por enquanto
    // e permitir que o banco de dados gerencie via constraints únicas
    console.log(`🔍 Processando item ${item.id} (ID origem: ${idOrigem})`);
    
    // Mapear dados do item para campos do documento
    const documentData: any = {
      objeto: item.name || `Item ${item.id}`,
      idOrigem: idOrigem,
      status: "Integrado"
    };
    
    // Aplicar valores padrão
    if (existingMapping.defaultValues) {
      try {
        const defaults = typeof existingMapping.defaultValues === 'string' 
          ? JSON.parse(existingMapping.defaultValues) 
          : existingMapping.defaultValues;
        Object.assign(documentData, defaults);
      } catch (e) {
        console.warn("Erro ao parsear valores padrão:", e);
      }
    }
    
    // Mapear colunas específicas
    for (const mapping of mappingColumns) {
      const columnValue = item.column_values.find((cv: any) => cv.id === mapping.mondayColumnId);
      if (columnValue && columnValue.text) {
        let value = columnValue.text;
        
        // Aplicar transformação se configurada
        if (mapping.transformFunction && mapping.transformFunction.trim()) {
          try {
            const transformFunction = new Function('value', mapping.transformFunction);
            value = transformFunction(value);
          } catch (transformError) {
            console.warn(`Erro na transformação para coluna ${mapping.cpxField}:`, transformError);
          }
        }
        
        documentData[mapping.cpxField] = value;
      }
    }
    
    try {
      // Criar o documento
      const createdDocument = await storage.createDocumento(documentData);
      console.log(`✅ Documento criado: ${createdDocument.id} - ${createdDocument.objeto}`);
      documentsCreated++;
      
      // Processar anexos se configurados
      if (existingMapping.assetsMappings) {
        const assetsMappings = typeof existingMapping.assetsMappings === 'string' 
          ? JSON.parse(existingMapping.assetsMappings) 
          : existingMapping.assetsMappings;
        for (const assetMapping of assetsMappings) {
          const columnValue = item.column_values.find((cv: any) => cv.id === assetMapping.columnId);
          if (columnValue && columnValue.value) {
            try {
              const files = JSON.parse(columnValue.value);
              if (files && files.files && Array.isArray(files.files)) {
                for (const file of files.files) {
                  await storage.createDocumentArtifact({
                    documentoId: createdDocument.id,
                    filename: file.name,
                    fileUrl: file.url,
                    fileSize: file.size || 0,
                    uploadedAt: new Date()
                  });
                }
              }
            } catch (fileError) {
              console.warn(`Erro ao processar anexos para item ${item.id}:`, fileError);
            }
          }
        }
      }
      
    } catch (docError) {
      console.error(`❌ Erro ao criar documento para item ${item.id}:`, docError);
      documentsSkipped++;
    }
    
    // Log de progresso a cada 100 itens
    if ((index + 1) % 100 === 0) {
      console.log(`📊 PROGRESSO: ${index + 1}/${items.length} itens processados | Criados: ${documentsCreated} | Filtrados: ${documentsSkipped}`);
    }
  }
  
  console.log(`🎉 EXECUÇÃO CONCLUÍDA: ${documentsCreated} documentos criados, ${documentsSkipped} filtrados, ${documentsPreExisting} já existentes`);
  
  return {
    itemsProcessed: items.length,
    documentsCreated,
    documentsSkipped,
    documentsPreExisting,
    columnsMapping: mappingColumns.length
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint para execução automática de jobs (sem autenticação)
  app.post("/api/monday/mappings/execute-headless", async (req: Request, res: Response) => {
    console.log("🤖 ENDPOINT HEADLESS ACIONADO");
    
    try {
      const { mappingId } = req.body;
      
      if (!mappingId) {
        return res.status(400).json({ error: "mappingId é obrigatório" });
      }

      console.log(`🤖 Executando mapeamento headless: ${mappingId}`);

      // Executar a sincronização
      const result = await executeMondayMapping(mappingId, undefined, true);
      
      console.log(`🤖 Resultado headless:`, result);
      
      return res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        documentsCreated: result.documentsCreated || 0,
        documentsFiltered: result.documentsSkipped || 0,
        itemsProcessed: result.itemsProcessed || 0
      });

    } catch (error: any) {
      console.error("🤖 Erro no endpoint headless:", error);
      
      // Log de erro
      await SystemLogger.logError(error, "monday_headless_execution", undefined, {
        mappingId: req.body.mappingId,
        executionType: "automatic"
      });
      
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message
      });
    }
  });

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
  
  // TESTE DE VERIFICAÇÃO DE DUPLICATAS
  app.get("/api/test-duplicates", async (req, res) => {
    try {
      const testId = 8333044806; // ID que sabemos que existe
      
      // Teste 1: Verificação SQL direta
      const duplicateCheck = await storage.db
        .select({ count: storage.sql`count(*)` })
        .from(storage.documentos)
        .where(storage.sql`id_origem = ${testId}`);
        
      const duplicateCount = Number(duplicateCheck[0].count);
      
      res.json({
        testId,
        duplicateCount,
        exists: duplicateCount > 0,
        message: `Teste de duplicata: ID ${testId} encontrado ${duplicateCount} vezes`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Execute Monday mapping synchronization
  app.post("/api/monday/mappings/:id/execute", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("❌ USUÁRIO NÃO AUTORIZADO");
      return res.status(401).send("Não autorizado");
    }
    
    const { id } = req.params;
    console.log("🚀 INICIANDO EXECUÇÃO DO MAPEAMENTO:", id);
    
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
      
      console.log("=== DIAGNÓSTICO DETALHADO ===");
      console.log("Token Monday encontrado:", apiKey ? `${apiKey.substring(0, 10)}... (${apiKey.length} chars)` : "NENHUM TOKEN");
      console.log("Board ID:", existingMapping.boardId);
      console.log("Colunas mapeadas:", mappingColumns.length);
      console.log("Status da API Key:", apiKey ? "EXISTE" : "NÃO EXISTE");
      console.log("FILTRO CONFIGURADO:", existingMapping.mappingFilter || "NENHUM FILTRO");
      console.log("FILTRO ESTÁ VAZIO?", !existingMapping.mappingFilter || !existingMapping.mappingFilter.trim());

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
                  text
                  value
                  column {
                    title
                  }
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
      let documentsPreExisting = 0;

      // Identificar campos marcados como chave para verificação de duplicatas
      const keyFields = mappingColumns.filter(col => col.isKey).map(col => col.cpxField);
      console.log(`🔑 CAMPOS CHAVE IDENTIFICADOS:`, keyFields);
      console.log(`📊 TOTAL DE COLUNAS MAPEADAS:`, mappingColumns.length);
      console.log(`🔑 COLUNAS COM is_key=true:`, mappingColumns.filter(col => col.isKey));

      // Processar cada item (linha) do Monday
      console.log(`🚀 INICIANDO PROCESSAMENTO DE ${items.length} ITENS`);
      console.log(`📋 FILTRO CONFIGURADO:`, existingMapping.mappingFilter);
      
      // DEBUG: Verificar se há itens para processar
      if (items.length === 0) {
        console.log(`❌ NENHUM ITEM ENCONTRADO NO QUADRO`);
        return res.json({
          success: false,
          message: "Nenhum item encontrado no quadro",
          itemsProcessed: 0,
          documentsCreated: 0,
          documentsSkipped: 0,
          documentsPreExisting: 0
        });
      }
      
      // DEBUG: Mostrar o primeiro item ANTES do loop
      console.log(`🔍 PRIMEIRO ITEM (ID: ${items[0].id}):`);
      console.log(`📝 NOME: ${items[0].name}`);
      console.log(`📊 TOTAL DE COLUNAS: ${items[0].column_values?.length || 0}`);
      if (items[0].column_values && items[0].column_values.length > 0) {
        console.log(`🎯 PRIMEIRAS 3 COLUNAS:`);
        items[0].column_values.slice(0, 3).forEach((col: any, idx: number) => {
          console.log(`  ${idx + 1}. ID: "${col.id}" | Título: "${col.column?.title}" | Texto: "${col.text}"`);
        });
      }
      
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        
        // Enviar progresso em tempo real (a cada 10 itens para não sobrecarregar)
        if (index % 10 === 0 || index === items.length - 1) {
          console.log(`📊 PROGRESSO: ${index + 1}/${items.length} itens processados | Criados: ${documentsCreated} | Filtrados: ${documentsSkipped}`);
        }
        try {
          // APLICAR FILTRO PRIMEIRO - antes de processar os dados
          console.log(`🔍 VERIFICANDO FILTRO para item ${item.id}:`);
          console.log(`- mappingFilter existe?`, !!existingMapping.mappingFilter);
          console.log(`- mappingFilter não está vazio?`, existingMapping.mappingFilter && existingMapping.mappingFilter.trim());
          
          // Aplicar filtro JavaScript se configurado
          if (existingMapping.mappingFilter && existingMapping.mappingFilter.trim()) {
            try {
              console.log(`✅ APLICANDO FILTRO para item ${item.id}`);
              console.log(`📋 FILTRO JAVASCRIPT:`, existingMapping.mappingFilter);
              
              // DEBUG: Mostrar estrutura completa do primeiro item
              if (item.id === items[0].id) {
                console.log(`🔍 ESTRUTURA COMPLETA DO PRIMEIRO ITEM:`, JSON.stringify(item, null, 2));
                console.log(`📊 COLUNAS DISPONÍVEIS:`);
                item.column_values.forEach((col: any) => {
                  console.log(`  - ID: "${col.id}" | Coluna: "${col.column?.title}" | Texto: "${col.text}" | Valor: ${JSON.stringify(col.value)}`);
                });
                
                // DEBUG: Verificar especificamente a coluna status6
                const status6Column = item.column_values.find((col: any) => col.id === 'status6');
                console.log(`🎯 COLUNA STATUS6 ESPECÍFICA:`, JSON.stringify(status6Column, null, 2));
                
                // DEBUG: Testar o filtro manualmente
                console.log(`🧪 TESTE MANUAL DO FILTRO:`);
                const hasStatus6 = item.column_values.some((col: any) => col.id === 'status6');
                console.log(`   - Tem coluna status6?`, hasStatus6);
                if (hasStatus6) {
                  const status6Value = item.column_values.find((col: any) => col.id === 'status6');
                  console.log(`   - Valor da coluna status6:`, status6Value?.text);
                  console.log(`   - É 'Em Análise Preliminar'?`, status6Value?.text === 'Em Análise Preliminar');
                  console.log(`   - É 'Em Detalhamento Técnico'?`, status6Value?.text === 'Em Detalhamento Técnico');
                }
              }
              
              // Criar função de filtro e executar
              const filterFunction = new Function('item', existingMapping.mappingFilter);
              const shouldInclude = filterFunction(item);
              
              console.log(`🎯 RESULTADO DO FILTRO para item ${item.id}:`, shouldInclude);
              
              if (!shouldInclude) {
                console.log(`❌ Item ${item.id} foi FILTRADO (excluído) - não atende às condições`);
                documentsSkipped++;
                continue; // Pular este item
              }
              
              console.log(`✅ Item ${item.id} PASSOU no filtro - será processado`);
              
            } catch (filterError) {
              console.error(`💥 ERRO ao aplicar filtro no item ${item.id}:`, filterError);
              console.log(`⚠️ Item ${item.id} será processado devido ao erro no filtro`);
              // Em caso de erro no filtro, processar o item (comportamento seguro)
            }
          } else {
            console.log(`⏭️ NENHUM FILTRO configurado - processando item ${item.id}`);
          }

          // Construir o documento baseado no mapeamento de colunas
          const documentData: any = {};
          
          // Coletar IDs das colunas já mapeadas
          const mappedColumnIds = new Set(mappingColumns.map(m => m.mondayColumnId));
          
          // Agrupar mapeamentos por campo para tratar múltiplas colunas
          const fieldMappings: Record<string, any[]> = {};
          mappingColumns.forEach(mapping => {
            if (!fieldMappings[mapping.cpxField]) {
              fieldMappings[mapping.cpxField] = [];
            }
            fieldMappings[mapping.cpxField].push(mapping);
          });

          // Processar cada campo com seus mapeamentos
          for (const [fieldName, mappings] of Object.entries(fieldMappings)) {
            const values: string[] = [];
            
            // Processar cada mapeamento do campo
            for (const mapping of mappings) {
              let value = "";
              
              // Verificar se o mapeamento é para o campo "name" (título do item)
              if (mapping.mondayColumnId === "name") {
                value = item.name || "";
              } else {
                // Buscar valor na coluna específica
                const columnValue = item.column_values.find((cv: any) => cv.id === mapping.mondayColumnId);
                value = columnValue?.text || "";
                
                // Log específico para ID Triagem
                if (mapping.cpxField === 'id_origem') {
                  console.log(`🎯 EXTRAINDO ID TRIAGEM:`, {
                    mondayColumnId: mapping.mondayColumnId,
                    columnValue: columnValue,
                    extractedValue: value,
                    itemId: item.id
                  });
                }
              }
              
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
                  } else {
                    // Executar função JavaScript personalizada
                    const func = new Function('value', mapping.transformFunction);
                    const result = func(value);
                    value = result !== undefined ? String(result) : value;
                    console.log(`Função de transformação aplicada no campo '${fieldName}':`, {
                      original: value,
                      transformed: result,
                      function: mapping.transformFunction
                    });
                  }
                } catch (transformError) {
                  console.warn(`Erro na transformação da coluna ${mapping.cpxField}:`, transformError);
                  // Manter valor original em caso de erro
                }
              }
              
              // Adicionar valor processado se não estiver vazio
              if (value && value.trim()) {
                values.push(value);
              }
            }
            
            // Mesclar valores para campos que permitem múltiplas colunas
            if (fieldName === 'descricao') {
              // Para descrição, mesclar com quebras de linha
              documentData[fieldName] = values.join('\n\n');
            } else if (fieldName === 'generalColumns') {
              // Para generalColumns mapeadas, criar objeto JSON com nome_coluna: valor
              const generalColumnsObj: Record<string, string> = {};
              mappings.forEach((mapping, index) => {
                if (values[index]) {
                  // Usar o título da coluna Monday como chave
                  const columnTitle = mapping.mondayColumnTitle || `coluna_${mapping.mondayColumnId}`;
                  generalColumnsObj[columnTitle] = values[index];
                }
              });
              documentData[fieldName] = generalColumnsObj;
            } else if (fieldName === 'id_origem') {
              // Para id_origem (bigint), trabalhar com string para IDs grandes
              const rawValue = values[0] || "";
              console.log(`🔍 PROCESSANDO CAMPO ID_ORIGEM:`, {
                fieldName,
                values: values,
                rawValue: rawValue,
                valuesLength: values.length
              });
              
              // Verificar se é um número válido (mesmo que como string)
              const numericValue = BigInt(rawValue);
              if (rawValue && !isNaN(Number(rawValue))) {
                // Mapear para o campo correto do schema: idOrigem (como string para bigint)
                documentData['idOrigem'] = rawValue;
                console.log(`✅ Campo id_origem definido: "${rawValue}" (bigint como string)`);
              } else {
                console.warn(`⚠️ Valor inválido para id_origem: "${rawValue}" - será ignorado`);
                console.log(`🔍 DEBUG VALUES:`, JSON.stringify(values, null, 2));
                // Não definir o campo se não for um número válido
              }
            } else {
              // Para outros campos, usar apenas o primeiro valor
              documentData[fieldName] = values[0] || "";
            }
            
            console.log(`Campo '${fieldName}' processado:`, {
              mappingsCount: mappings.length,
              valuesCount: values.length,
              finalValue: documentData[fieldName]
            });
          }

          // Capturar dados extras das colunas não mapeadas para general_columns
          const unmappedColumns: Record<string, any> = {};
          
          // Adicionar dados básicos do item
          unmappedColumns.monday_item_id = item.id;
          unmappedColumns.monday_item_name = item.name;
          
          // Capturar todas as colunas não mapeadas
          if (item.column_values && Array.isArray(item.column_values)) {
            item.column_values.forEach((columnValue: any) => {
              // Se a coluna não está mapeada, incluir nos dados extras
              if (!mappedColumnIds.has(columnValue.id)) {
                const columnTitle = columnValue.title || `coluna_${columnValue.id}`;
                unmappedColumns[columnTitle] = columnValue.text || "";
              }
            });
          }
          
          // Combinar generalColumns mapeadas com colunas não mapeadas
          if (documentData.generalColumns && typeof documentData.generalColumns === 'object') {
            // Se já existem generalColumns mapeadas, combinar com as não mapeadas
            documentData.generalColumns = {
              ...documentData.generalColumns,
              ...unmappedColumns
            };
          } else {
            // Se não há generalColumns mapeadas, usar apenas as não mapeadas
            documentData.generalColumns = unmappedColumns;
          }
          
          console.log("generalColumns final:", documentData.generalColumns);



          // Aplicar valores padrão configurados no mapeamento
          console.log("Valores padrão do mapeamento:", existingMapping.defaultValues);
          
          if (existingMapping.defaultValues) {
            for (const [field, defaultValue] of Object.entries(existingMapping.defaultValues)) {
              // Se o campo não está mapeado ou está vazio, aplicar valor padrão
              if (!documentData[field] || documentData[field].trim() === "") {
                // Remover aspas duplas se existirem no valor padrão
                const cleanValue = typeof defaultValue === 'string' 
                  ? defaultValue.replace(/^"(.*)"$/, '$1') 
                  : defaultValue;
                documentData[field] = cleanValue;
                console.log(`Campo '${field}' preenchido com valor padrão: '${cleanValue}'`);
              }
            }
          }

          // Definir origem sempre como "monday" se não configurado
          if (!documentData.origem) {
            documentData.origem = "monday";
          }
          
          // Verificar e preencher campos obrigatórios ainda em branco
          const requiredFields = ["objeto", "cliente", "responsavel", "sistema", "modulo", "descricao", "solicitante", "aprovador", "agente"];
          requiredFields.forEach(field => {
            if (!documentData[field] || documentData[field].trim() === "") {
              documentData[field] = "Valor não retornado pela API";
            }
          });

          // Definir valores padrão básicos se ainda não preenchidos
          if (!documentData.status) {
            documentData.status = "Processando";
          }
          if (!documentData.statusOrigem) {
            documentData.statusOrigem = "Monday.com";
          }

          // VERIFICAÇÃO CRÍTICA DE DUPLICATAS - SQL DIRETO
          if (documentData.idOrigem) {
            try {
              const duplicateCheck = await db.execute(sql`SELECT id FROM documentos WHERE id_origem = ${documentData.idOrigem} LIMIT 1`);
              
              if (duplicateCheck.rows.length > 0) {
                console.log(`❌ DUPLICATA: Item ${item.id} já existe como documento ${duplicateCheck.rows[0].id}`);
                documentsPreExisting++;
                continue; // Pular item duplicado
              }
            } catch (error) {
              console.log(`⚠️ Erro na verificação de duplicata para item ${item.id}:`, error);
              // Continuar mesmo com erro na verificação
            }
          }

          // DEBUG: Verificar dados finais antes de criar documento
          console.log(`📋 DADOS FINAIS DO DOCUMENTO ANTES DA CRIAÇÃO:`, {
            idOrigem: documentData.idOrigem,
            objeto: documentData.objeto,
            cliente: documentData.cliente
          });

          // Criar o documento
          const newDocument = await storage.createDocumento(documentData);
          documentsCreated++;
          console.log(`✅ DOCUMENTO CRIADO:`, newDocument.id);
          console.log(`📊 DOCUMENTO SALVO NO BANCO:`, {
            id_origem_salvo: newDocument.idOrigem,
            objeto_salvo: newDocument.objeto
          });
          
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
        documentsPreExisting,
        columnsMapping: mappingColumns.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Erro ao executar sincronização:", error);
      res.status(500).send(`Erro ao executar sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  });

  // Execute Monday mapping synchronization (headless mode for automation)
  app.post("/api/monday/mappings/execute-headless", async (req, res) => {
    const { mappingId } = req.body;
    
    if (!mappingId) {
      return res.status(400).send("mappingId é obrigatório");
    }
    
    console.log("🤖 EXECUÇÃO AUTOMÁTICA - Usando mesma lógica da manual:", mappingId);
    
    try {
      // Usar a mesma função da execução manual que funciona perfeitamente
      const result = await executeMondayMapping(mappingId, undefined, true);
      
      res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        documentsCreated: result.documentsCreated,
        documentsFiltered: result.documentsSkipped,
        itemsProcessed: result.itemsProcessed
      });
    } catch (error) {
      console.error('🤖 Erro na execução automática:', error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: (error as Error).message 
      });
    }
  });

  // Clear logs endpoint
  app.delete("/api/logs", async (req: Request, res: Response) => {
    try {
      await storage.clearAllLogs();
      res.json({ success: true, message: "Logs limpos com sucesso" });
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Job management endpoints
  app.post("/api/jobs/activate", async (req: Request, res: Response) => {
    const { mappingId, frequency, time } = req.body;
    
    if (!mappingId || !frequency || !time) {
      return res.status(400).json({ error: "mappingId, frequency e time são obrigatórios" });
    }

    try {
      const jobId = await jobManager.createJob(mappingId, frequency, time);
      
      await SystemLogger.log({
        eventType: 'JOB_ACTIVATED',
        message: `Job ativado para mapeamento ${mappingId}`,
        parameters: {
          mappingId,
          frequency,
          time,
          jobId
        }
      });

      res.json({
        success: true,
        jobId,
        message: "Job ativado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao ativar job:', error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: (error as Error).message 
      });
    }
  });

  app.post("/api/jobs/cancel", async (req: Request, res: Response) => {
    const { mappingId } = req.body;
    
    if (!mappingId) {
      return res.status(400).json({ error: "mappingId é obrigatório" });
    }

    try {
      const cancelled = await jobManager.cancelJob(mappingId);
      
      if (cancelled) {
        await SystemLogger.log({
          eventType: 'JOB_CANCELLED',
          message: `Job cancelado para mapeamento ${mappingId}`,
          parameters: { mappingId }
        });

        res.json({
          success: true,
          message: "Job cancelado com sucesso"
        });
      } else {
        res.status(404).json({
          error: "Job não encontrado"
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar job:', error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: (error as Error).message 
      });
    }
  });

  app.get("/api/jobs/status/:mappingId", async (req: Request, res: Response) => {
    const { mappingId } = req.params;
    
    try {
      const activeJob = jobManager.getActiveJob(mappingId);
      
      res.json({
        isActive: !!activeJob,
        job: activeJob || null
      });
    } catch (error) {
      console.error('Erro ao verificar status do job:', error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: (error as Error).message 
      });
    }
  });

  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      const activeJobs = jobManager.getActiveJobs();
      res.json(activeJobs);
    } catch (error) {
      console.error('Erro ao listar jobs:', error);
      res.status(500).json({ 
        error: "Erro interno do servidor",
        details: (error as Error).message 
      });
    }
  });
            items_page(limit: 500) {
              items {
                id
                name
                column_values(ids: [${mondayColumns.map(id => `"${id}"`).join(", ")}]) {
                  id
                  text
                  value
                  column {
                    title
                  }
                }
              }
            }
          }
        }
      `;

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

      const responseText = await mondayResponse.text();
      let mondayData;
      
      try {
        mondayData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`API do Monday retornou conteúdo inválido`);
      }
      
      if (mondayData.errors) {
        throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(mondayData.errors)}`);
      }

      const items = mondayData.data?.boards?.[0]?.items_page?.items || [];
      let documentsCreated = 0;
      let documentsSkipped = 0;
      let documentsPreExisting = 0;

      const keyFields = mappingColumns.filter(col => col.isKey).map(col => col.cpxField);
      console.log(`🤖 EXECUÇÃO AUTOMÁTICA - ${items.length} itens para processar`);
      
      // Processar cada item usando a mesma lógica do endpoint manual
      for (const [itemIndex, item] of items.entries()) {
        try {
          // Aplicar filtro se configurado
          if (existingMapping.mappingFilter && existingMapping.mappingFilter.trim()) {
            try {
              const filterFunction = new Function('item', existingMapping.mappingFilter);
              const shouldInclude = filterFunction(item);
              
              if (!shouldInclude) {
                documentsSkipped++;
                continue;
              }
            } catch (filterError) {
              console.error(`🤖 Erro ao aplicar filtro no item ${item.id}:`, filterError);
            }
          }

          // Construir o documento baseado no mapeamento de colunas
          const documentData: any = {};
          
          const fieldMappings: Record<string, any[]> = {};
          mappingColumns.forEach(mapping => {
            if (!fieldMappings[mapping.cpxField]) {
              fieldMappings[mapping.cpxField] = [];
            }
            fieldMappings[mapping.cpxField].push(mapping);
          });

          // Processar cada campo com seus mapeamentos
          for (const [fieldName, mappings] of Object.entries(fieldMappings)) {
            const values: string[] = [];
            
            for (const mapping of mappings) {
              let value = "";
              
              if (mapping.mondayColumnId === "name") {
                value = item.name || "";
              } else {
                const columnValue = item.column_values.find((cv: any) => cv.id === mapping.mondayColumnId);
                value = columnValue?.text || "";
              }
              
              // Aplicar função de transformação se existir
              if (mapping.transformFunction && mapping.transformFunction.trim()) {
                try {
                  if (mapping.transformFunction === "uppercase") {
                    value = value.toUpperCase();
                  } else if (mapping.transformFunction === "lowercase") {
                    value = value.toLowerCase();
                  } else if (mapping.transformFunction === "trim") {
                    value = value.trim();
                  } else {
                    const func = new Function('value', mapping.transformFunction);
                    const result = func(value);
                    value = result !== undefined ? String(result) : value;
                  }
                } catch (transformError) {
                  console.warn(`🤖 Erro na transformação:`, transformError);
                }
              }
              
              if (value && value.trim()) {
                values.push(value);
              }
            }
            
            // Mesclar valores para campos que permitem múltiplas colunas
            if (fieldName === 'descricao') {
              documentData[fieldName] = values.join('\n\n');
            } else if (fieldName === 'generalColumns') {
              documentData[fieldName] = values.length > 0 ? JSON.stringify(values.reduce((acc, val, idx) => {
                acc[`[${idx}]`] = val;
                return acc;
              }, {})) : null;
            } else {
              documentData[fieldName] = values.join(', ');
            }
          }

          // Garantir que idOrigem seja definido (crítico para detecção de duplicatas)
          documentData.idOrigem = BigInt(item.id);
          
          // VERIFICAÇÃO CRÍTICA DE DUPLICATAS ANTES DE CRIAR
          let isDuplicate = false;
          try {
            console.log(`🤖 VERIFICANDO DUPLICATA para idOrigem: ${documentData.idOrigem} (tipo: ${typeof documentData.idOrigem})`);
            const duplicateCheck = await db.execute(sql`SELECT id FROM documentos WHERE id_origem = ${documentData.idOrigem} LIMIT 1`);
            
            if (duplicateCheck.rows.length > 0) {
              console.log(`🤖 ❌ DUPLICATA DETECTADA: Item ${item.id} (idOrigem: ${documentData.idOrigem}) já existe como documento ${duplicateCheck.rows[0].id}`);
              isDuplicate = true;
              documentsPreExisting++;
              continue; // Pular para o próximo item
            } else {
              console.log(`🤖 ✅ NOVO DOCUMENTO: Item ${item.id} (idOrigem: ${documentData.idOrigem}) será criado`);
            }
          } catch (error) {
            console.log(`🤖 ⚠️ Erro na verificação de duplicata para item ${item.id}:`, error);
          }
          
          // Aplicar valores padrão se configurados
          if (existingMapping.defaultValues) {
            try {
              const defaults = JSON.parse(existingMapping.defaultValues);
              for (const [key, value] of Object.entries(defaults)) {
                if (!documentData[key] || documentData[key] === '') {
                  documentData[key] = value;
                }
              }
            } catch (error) {
              console.warn('🤖 Erro ao aplicar valores padrão:', error);
            }
          }
          
          console.log(`🤖 DEBUG - Item ${item.id} - idOrigem definido como: ${documentData.idOrigem}`);

          // VERIFICAÇÃO CRÍTICA DE DUPLICATAS - MESMA LÓGICA DA EXECUÇÃO MANUAL
          let isDuplicate = false;
          if (documentData.idOrigem) {
            try {
              console.log(`🤖 VERIFICANDO DUPLICATA para idOrigem: ${documentData.idOrigem} (tipo: ${typeof documentData.idOrigem})`);
              const duplicateCheck = await db.execute(sql`SELECT id FROM documentos WHERE id_origem = ${documentData.idOrigem} LIMIT 1`);
              
              if (duplicateCheck.rows.length > 0) {
                console.log(`🤖 ❌ DUPLICATA DETECTADA: Item ${item.id} (idOrigem: ${documentData.idOrigem}) já existe como documento ${duplicateCheck.rows[0].id}`);
                isDuplicate = true;
                documentsPreExisting++;
              } else {
                console.log(`🤖 ✅ NOVO DOCUMENTO: Item ${item.id} (idOrigem: ${documentData.idOrigem}) será criado`);
              }
            } catch (error) {
              console.log(`🤖 ⚠️ Erro na verificação de duplicata para item ${item.id}:`, error);
              // Continuar mesmo com erro na verificação
            }
          } else {
            console.log(`🤖 ⚠️ ATENÇÃO: Item ${item.id} não tem idOrigem definido!`);
          }

          if (!isDuplicate) {
            const savedDocument = await storage.createDocumento(documentData);
            documentsCreated++;

            // Processar anexos se configurado
            if (existingMapping.assetsMappings && existingMapping.assetsMappings.length > 0) {
              for (const assetMapping of existingMapping.assetsMappings) {
                const columnValue = item.column_values.find((cv: any) => cv.id === assetMapping.columnId);
                
                if (columnValue && columnValue.value) {
                  try {
                    const fileData = JSON.parse(columnValue.value);
                    if (fileData.files && fileData.files.length > 0) {
                      for (const file of fileData.files) {
                        if (file.url) {
                          await storage.createDocumentAttachment({
                            documentoId: savedDocument.id,
                            filename: file.name || 'file',
                            fileUrl: file.url,
                            relationshipId: assetMapping.relationshipId,
                            uploadedAt: new Date()
                          });
                        }
                      }
                    }
                  } catch (fileError) {
                    console.warn(`🤖 Erro ao processar anexo:`, fileError);
                  }
                }
              }
            }
          }
        } catch (itemError) {
          console.error(`🤖 Erro ao processar item ${item.id}:`, itemError);
          documentsSkipped++;
        }
      }

      // Atualizar a data de última sincronização
      await storage.updateMondayMappingLastSync(mappingId);

      console.log(`🤖 EXECUÇÃO AUTOMÁTICA CONCLUÍDA - Criados: ${documentsCreated} | Filtrados: ${documentsSkipped} | Pré-existentes: ${documentsPreExisting}`);

      // SEMPRE registrar log para execuções automáticas
      try {
        await SystemLogger.log({
          eventType: 'MONDAY_SYNC_COMPLETED',
          message: `Execução automática concluída para mapeamento "${existingMapping?.name || mappingId}"`,
          parameters: {
            mappingId,
            executionType: 'automatic',
            documentsCreated,
            documentsFiltered: documentsSkipped,
            documentsPreExisting,
            itemsProcessed: items.length,
            executedBy: 'scheduler'
          }
        });
        console.log(`🤖 LOG REGISTRADO NO BANCO para execução automática - Mapeamento: ${mappingId}`);
      } catch (logError) {
        console.error('🤖 ERRO ao registrar log de execução automática:', logError);
      }

      res.json({
        success: true,
        message: "Execução automática concluída com sucesso",
        mapping: existingMapping,
        itemsProcessed: items.length,
        documentsCreated,
        documentsSkipped,
        documentsPreExisting
      });
    } catch (error) {
      console.error("🤖 Erro na execução automática:", error);
      res.status(500).send(`Erro na execução automática: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      
      // Converter BigInt para string para serialização JSON
      const documentosSerializados = documentos.map(doc => ({
        ...doc,
        idOrigem: doc.idOrigem ? doc.idOrigem.toString() : null
      }));
      
      res.json(documentosSerializados);
    } catch (error: any) {
      console.error("Erro ao buscar documentos:", error);
      res.status(500).send("Erro ao buscar documentos");
    }
  });

  // Endpoint para buscar relacionamentos da tabela documentos
  app.get("/api/documentos-relationships", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    // Forçar cache bust
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      // Lista apenas o relacionamento real que existe na tabela documentos
      const relationships = [
        {
          id: "documents_artifacts",
          name: "documents_artifacts",
          description: "documentos.id(PK) -> documents_artifacts.documento_id(FK)",
          type: "one-to-many",
          targetTable: "documents_artifacts",
          foreignKey: "documento_id",
          primaryKey: "id"
        }
      ];
      
      res.json(relationships);
    } catch (error) {
      console.error("Erro ao buscar relacionamentos:", error);
      res.status(500).send("Erro ao buscar relacionamentos da tabela documentos");
    }
  });

  app.get("/api/documentos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documento = await storage.getDocumento(req.params.id);
      if (!documento) {
        return res.status(404).send("Documento não encontrado");
      }
      
      // Converter BigInt para string para serialização JSON
      const documentoSerializado = {
        ...documento,
        idOrigem: documento.idOrigem ? documento.idOrigem.toString() : null
      };
      
      res.json(documentoSerializado);
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

  // System Logs endpoints
  
  // Create a system log entry
  app.post("/api/logs", async (req, res) => {
    try {
      await SystemLogger.log({
        eventType: req.body.eventType,
        message: req.body.message,
        parameters: req.body.parameters || {},
        userId: req.user?.id || null
      });
      
      res.status(201).json({ success: true, message: "Log criado com sucesso" });
    } catch (error) {
      console.error("Erro ao criar log do sistema:", error);
      res.status(500).send("Erro ao criar log do sistema");
    }
  });

  // Get unique event types from logs
  app.get("/api/logs/event-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // Buscar todos os logs e extrair tipos únicos
      const allLogs = await db.select().from(systemLogs);
      const uniqueTypes = [...new Set(allLogs.map(log => log.eventType).filter(Boolean))].sort();
      
      res.json(uniqueTypes);
    } catch (error) {
      console.error("Erro ao buscar tipos de eventos:", error);
      res.status(500).send("Erro ao buscar tipos de eventos");
    }
  });

  // Get system logs
  app.get("/api/logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const eventType = req.query.eventType as string;
      const userId = req.query.userId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      let query = db
        .select()
        .from(systemLogs)
        .orderBy(desc(systemLogs.timestamp))
        .limit(limit);
      
      // Aplicar filtros
      const conditions = [];
      
      if (eventType && eventType.trim()) {
        conditions.push(eq(systemLogs.eventType, eventType));
      }
      
      if (userId && userId.trim()) {
        if (userId === "null") {
          conditions.push(isNull(systemLogs.userId));
        } else {
          const userIdNum = parseInt(userId);
          if (!isNaN(userIdNum)) {
            conditions.push(eq(systemLogs.userId, userIdNum));
          }
        }
      }
      
      if (startDate && startDate.trim()) {
        // Ajustar para compensar diferença de fuso horário
        // O input datetime-local envia no formato "YYYY-MM-DDTHH:MM" em hora local
        const localStartDate = new Date(startDate + ':00'); // Adiciona segundos se necessário
        // Ajustar para UTC considerando o offset do timezone local
        const offsetMinutes = localStartDate.getTimezoneOffset();
        const utcStartDate = new Date(localStartDate.getTime() - (offsetMinutes * 60000));
        conditions.push(gte(systemLogs.timestamp, utcStartDate));
      }
      
      if (endDate && endDate.trim()) {
        // Ajustar para compensar diferença de fuso horário
        const localEndDate = new Date(endDate + ':00'); // Adiciona segundos se necessário
        // Ajustar para UTC considerando o offset do timezone local
        const offsetMinutes = localEndDate.getTimezoneOffset();
        const utcEndDate = new Date(localEndDate.getTime() - (offsetMinutes * 60000));
        conditions.push(lte(systemLogs.timestamp, utcEndDate));
      }
      
      // Aplicar todas as condições se existirem
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const logs = await query;
      res.json(logs);
    } catch (error) {
      console.error("Erro ao buscar logs do sistema:", error);
      res.status(500).send("Erro ao buscar logs do sistema");
    }
  });

  // Clear system logs
  app.delete("/api/logs", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await db.delete(systemLogs);
      
      // Log the clear action
      await SystemLogger.logUserAction(
        req.user!.id,
        "CLEAR_LOGS",
        { message: "Todos os logs do sistema foram removidos" }
      );
      
      res.json({ message: "Logs limpos com sucesso" });
    } catch (error) {
      console.error("Erro ao limpar logs do sistema:", error);
      res.status(500).send("Erro ao limpar logs do sistema");
    }
  });

  // Rotas para gerenciamento de jobs de agendamento
  
  // Criar/Ativar job de agendamento
  app.post("/api/jobs/activate", async (req: Request, res: Response) => {
    try {
      const { mappingId, frequency, time } = req.body;
      
      if (!mappingId || !frequency || !time) {
        return res.status(400).send("Parâmetros obrigatórios: mappingId, frequency, time");
      }

      // Buscar informações do mapeamento para o log
      const mapping = await storage.getMondayMapping(mappingId);
      if (!mapping) {
        return res.status(404).send("Mapeamento não encontrado");
      }

      const jobId = await jobManager.createJob(mappingId, frequency, time);
      
      // Calcular próxima execução
      const now = new Date();
      const [hours, minutes] = time.split(':');
      const nextExecution = new Date();
      nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Se o horário já passou hoje, agendar para amanhã
      if (nextExecution <= now) {
        nextExecution.setDate(nextExecution.getDate() + 1);
      }
      
      // Converter frequência para texto legível
      const frequencyMap: Record<string, string> = {
        '15min': '15 minutos',
        '30min': '30 minutos', 
        '1hour': '1 hora',
        '6hours': '6 horas',
        'daily': '24 horas'
      };
      
      // Criar log do sistema
      await SystemLogger.log({
        eventType: `MONDAY_SYNC_${mapping.name.replace(/\s+/g, '_').toUpperCase()}`,
        message: "JOB de sincronização agendado",
        parameters: {
          proximaExecucao: nextExecution.toLocaleString('pt-BR'),
          intervalo: frequencyMap[frequency] || frequency,
          mapeamento: mapping.name,
          quadroMonday: mapping.quadroMonday || 'N/A'
        },
        userId: req.user?.id
      });
      
      res.json({ 
        success: true, 
        jobId,
        message: "Job ativado com sucesso"
      });
    } catch (error) {
      console.error("Erro ao ativar job:", error);
      res.status(500).send("Erro ao ativar job");
    }
  });

  // Cancelar job de agendamento
  app.post("/api/jobs/cancel", async (req: Request, res: Response) => {
    try {
      const { mappingId } = req.body;
      
      if (!mappingId) {
        return res.status(400).send("Parâmetro obrigatório: mappingId");
      }

      // Buscar informações do mapeamento para o log
      const mapping = await storage.getMondayMapping(mappingId);
      
      const success = jobManager.cancelJob(mappingId);
      
      // Criar log do cancelamento se o job foi encontrado e cancelado
      if (success && mapping) {
        await SystemLogger.log({
          eventType: `MONDAY_SYNC_${mapping.name.replace(/\s+/g, '_').toUpperCase()}`,
          message: "JOB de sincronização cancelado",
          parameters: {
            mapeamento: mapping.name,
            quadroMonday: mapping.quadroMonday || 'N/A',
            canceladoEm: new Date().toLocaleString('pt-BR')
          },
          userId: req.user?.id
        });
      }
      
      res.json({ 
        success,
        message: success ? "Job cancelado com sucesso" : "Job não encontrado"
      });
    } catch (error) {
      console.error("Erro ao cancelar job:", error);
      res.status(500).send("Erro ao cancelar job");
    }
  });

  // Verificar status do job
  app.get("/api/jobs/status/:mappingId", async (req: Request, res: Response) => {
    try {
      const { mappingId } = req.params;
      
      const hasActiveJob = jobManager.hasActiveJob(mappingId);
      const activeJob = jobManager.getActiveJob(mappingId);
      
      res.json({ 
        hasActiveJob,
        activeJob: activeJob ? {
          id: activeJob.id,
          frequency: activeJob.frequency,
          time: activeJob.time,
          createdAt: activeJob.createdAt
        } : null
      });
    } catch (error) {
      console.error("Erro ao verificar status do job:", error);
      res.status(500).send("Erro ao verificar status do job");
    }
  });

  // Listar todos os jobs ativos
  app.get("/api/jobs", async (req: Request, res: Response) => {
    try {
      const activeJobs = jobManager.getActiveJobs();
      
      res.json(activeJobs.map(job => ({
        id: job.id,
        mappingId: job.mappingId,
        frequency: job.frequency,
        time: job.time,
        createdAt: job.createdAt
      })));
    } catch (error) {
      console.error("Erro ao listar jobs:", error);
      res.status(500).send("Erro ao listar jobs");
    }
  });



  // The httpServer is needed for potential WebSocket connections later
  const httpServer = createServer(app);

  return httpServer;
}
