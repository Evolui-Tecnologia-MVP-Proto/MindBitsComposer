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

  const existingMapping = await storage.getMondayMapping(mappingId);
  if (!existingMapping) throw new Error("Mapeamento não encontrado");

  const apiKey = await storage.getMondayApiKey();
  if (!apiKey) throw new Error("Chave da API do Monday não configurada");

  const mappingColumns = await storage.getMappingColumns(mappingId);

  // Log forçado para diagnosticar - FUNÇÃO REAL EXECUTADA
  await SystemLogger.log({
    eventType: 'MONDAY_SYNC_MANUAL',
    message: `FUNÇÃO REAL EXECUTADA - Mapeamento ${mappingId} iniciado na função executeMondayMapping`,
    parameters: { mappingId, functionName: 'executeMondayMapping' },
    userId: userId
  });

  const boardId = existingMapping.boardId;

  // Obter colunas de assets para incluir na query
  const mondayColumns = mappingColumns.map(col => col.mondayColumnId);
  let assetsColumns: string[] = [];
  
  if (existingMapping.assetsMappings) {
    const assetsMappings = typeof existingMapping.assetsMappings === 'string'
      ? JSON.parse(existingMapping.assetsMappings)
      : existingMapping.assetsMappings;
    
    assetsColumns = assetsMappings
      .filter((asset: any) => asset.columnId && asset.columnId !== "documents_item")
      .map((asset: any) => asset.columnId);
  }

  const allColumns = [...new Set([...mondayColumns, ...assetsColumns])];
  
  // Log forçado das colunas incluídas
  await SystemLogger.log({
    eventType: 'MONDAY_SYNC_MANUAL',
    message: `COLUNAS INCLUÍDAS NA QUERY: ${allColumns.map(id => `"${id}"`).join(", ")}`,
    parameters: { 
      mappingId,
      mondayColumns: mondayColumns,
      assetsColumns: assetsColumns,
      totalColumns: allColumns
    },
    userId: userId
  });

  // Buscar todos os itens com paginação por cursor
  let items: any[] = [];
  let cursor: string | null = null;

  do {
    // Log do boardId para debug
    
    const query = `
      query GetBoardItems($boardId: ID!, $cursor: String) {
        boards(ids: [$boardId]) {
          items_page(limit: 500, cursor: $cursor) {
            cursor
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

    const variables = { boardId, cursor };

    // Retry com delay para tratar erros temporários
    let response;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": apiKey
          },
          body: JSON.stringify({ query, variables })
        });

        if (response.ok) break; // Sucesso, sair do loop
        
        // Se erro 500/502/503 (temporários), tentar novamente
        if (response.status >= 500 && response.status < 600 && attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        throw new Error(`Erro na API do Monday: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }

    if (!response?.ok) throw lastError || new Error(`Erro na API do Monday`);

    const data: any = await response.json();

    if (data.errors) {
      throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(data.errors)}`);
    }

    const page = data.data.boards[0]?.items_page;
    if (page?.items) {
      items.push(...page.items);
    }

    cursor = page?.cursor || null;
  } while (cursor);


  let documentsCreated = 0;
  let documentsSkipped = 0;
  let documentsPreExisting = 0;

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    // Filtro (JavaScript string)
    if (existingMapping.mappingFilter?.trim()) {
      try {
        const filterFunction = new Function('item', existingMapping.mappingFilter);
        const passesFilter = filterFunction(item);
        if (!passesFilter) {
          documentsSkipped++;
          continue;
        }
      } catch (filterError) {
        documentsSkipped++;
        continue;
      }
    }

    // Verificação de duplicatas
    try {
      const duplicateCheck = await db.execute(sql`
        SELECT id FROM documentos WHERE id_origem_txt = ${item.id} LIMIT 1
      `);

      if (duplicateCheck.rows.length > 0) {
        documentsPreExisting++;
        continue;
      }
    } catch (error) {
    }

    const idOrigem = BigInt(item.id);
    const documentData: any = {
      objeto: item.name || `Item ${item.id}`,
      idOrigem: idOrigem,
      status: "Integrado"
    };

    // Capturar valores das colunas de assets para monday_item_values
    const mondayItemValues: any[] = [];
    
    // Mostrar debug apenas para os primeiros 3 itens que passam pelo filtro
    if (index < 3) {
    }
    
    if (existingMapping.assetsMappings) {
      const assetsMappings = typeof existingMapping.assetsMappings === 'string'
        ? JSON.parse(existingMapping.assetsMappings)
        : existingMapping.assetsMappings;
      
      if (index < 3) {
      }
      
      // Filtrar apenas colunas de assets (exceto documents_item)
      const assetsColumnIds = assetsMappings
        .filter((asset: any) => asset.columnId && asset.columnId !== "documents_item")
        .map((asset: any) => asset.columnId);
      
      if (index < 3) {
      }
      
      // Para cada coluna de assets, buscar o valor no item
      for (const columnId of assetsColumnIds) {
        const columnValue = item.column_values.find((cv: any) => cv.id === columnId);
        if (index < 3) {
          if (columnValue) {
          }
        }
        
        if (columnValue?.value) {
          mondayItemValues.push({
            columnid: columnId,
            value: columnValue.value // Manter como string serializada, não fazer parse
          });
          if (index < 3) {
          }
        }
      }
    }
    
    if (index < 3) {
    }
    documentData.mondayItemValues = mondayItemValues;

    // Valores padrão
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

    // Mapear colunas configuradas
    for (const mapping of mappingColumns) {
      const columnValue = item.column_values.find((cv: any) => cv.id === mapping.mondayColumnId);
      if (columnValue?.text) {
        let value = columnValue.text;
        if (mapping.transformFunction?.trim()) {
          try {
            const transformFunction = new Function('value', mapping.transformFunction);
            value = transformFunction(value);
          } catch (transformError) {
            console.warn(`Erro na transformação da coluna ${mapping.cpxField}:`, transformError);
          }
        }
        documentData[mapping.cpxField] = value;
      }
    }

    try {
      const createdDocument = await storage.createDocumento(documentData);
      documentsCreated++;

      // Anexos (colunas de arquivos)
      if (existingMapping.assetsMappings) {
        const assetsMappings = typeof existingMapping.assetsMappings === 'string'
          ? JSON.parse(existingMapping.assetsMappings)
          : existingMapping.assetsMappings;

        for (const assetMapping of assetsMappings) {
          const columnValue = item.column_values.find((cv: any) => cv.id === assetMapping.columnId);
          if (columnValue?.value) {
            try {
              const files = JSON.parse(columnValue.value);
              if (Array.isArray(files?.files)) {
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
              console.warn(`Erro ao processar anexos do item ${item.id}:`, fileError);
            }
          }
        }
      }
    } catch (docError) {
      documentsSkipped++;
    }

    // Log de progresso removido para logs mais limpos
  }


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
    
    try {
      const { mappingId } = req.body;
      
      if (!mappingId) {
        return res.status(400).json({ error: "mappingId é obrigatório" });
      }


      // Executar a sincronização
      const result = await executeMondayMapping(mappingId, undefined, true);
      
      
      return res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        documentsCreated: result.documentsCreated || 0,
        documentsFiltered: result.documentsSkipped || 0,
        itemsProcessed: result.itemsProcessed || 0
      });

    } catch (error: any) {
      
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
    
    // Forçar resposta como texto simples para contornar Vite
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    
    if (!req.isAuthenticated()) {
      return res.status(401).send("UNAUTHORIZED");
    }
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      
      // Resposta como texto que o frontend pode interpretar
      return res.status(200).send("SUCCESS:" + JSON.stringify({
        success: true,
        data: documento
      }));
    } catch (error: any) {
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
      res.status(500).send("Erro ao buscar template");
    }
  });
  
  // Create template
  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
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
      
      const newTemplate = await storage.createTemplate(templateData);
      
      res.status(201).json(newTemplate);
    } catch (error) {
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
      
      const updatedTemplate = await storage.updateTemplate(id, dataToUpdate);
      
      res.json(updatedTemplate);
    } catch (error) {
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
          
          
          mappingsWithColumnCount.push({
            ...mapping,
            columnCount: count
          });
        } catch (error) {
          mappingsWithColumnCount.push({
            ...mapping,
            columnCount: 0
          });
        }
      }
      
      res.json(mappingsWithColumnCount);
    } catch (error) {
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
      res.status(500).send("Erro ao buscar mapeamento");
    }
  });
  
  // Create Monday mapping
  app.post("/api/monday/mappings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const mappingData = insertMondayMappingSchema.parse(req.body);
      
      // Removida a verificação de mapeamento existente para permitir múltiplos mapeamentos
      // para o mesmo quadro do Monday
      
      const newMapping = await storage.createMondayMapping(mappingData);
      
      res.status(201).json(newMapping);
    } catch (error) {
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
      
      const updatedMapping = await storage.updateMondayMapping(id, req.body);
      
      res.json(updatedMapping);
    } catch (error) {
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
      res.status(500).json({
        success: false,
        message: "Erro ao validar quadro"
      });
    }
  });

  // Buscar anexos de um item do Monday.com
  app.get("/api/monday/attachments/:itemId", async (req, res) => {
    
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { itemId } = req.params;
    
    try {
      // Buscar a API key do Monday
      const mondayConnection = await storage.getServiceConnection("monday");
      if (!mondayConnection || !mondayConnection.token) {
        return res.status(400).json({
          success: false,
          message: "API key do Monday não configurada"
        });
      }
      
      const apiKey = mondayConnection.token;
      
      // Query para buscar anexos do item
      const query = `
        query {
          items(ids: [${itemId}]) {
            id
            name
            assets {
              id
              name
              url
              file_extension
              file_size
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
      
      // Verifica se o item existe
      if (!data.data?.items || data.data.items.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Item não encontrado"
        });
      }
      
      const item = data.data.items[0];
      const attachments = [];
      
      // Processar cada anexo
      for (const asset of item.assets || []) {
        try {
          // Baixar o arquivo
          const fileResponse = await fetch(asset.url);
          if (fileResponse.ok) {
            const arrayBuffer = await fileResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Data = buffer.toString('base64');
            
            // Determinar MIME type baseado na extensão
            const mimeType = getMimeType(asset.file_extension);
            
            attachments.push({
              id: asset.id,
              name: asset.name,
              fileName: asset.name,
              fileData: base64Data,
              mimeType: mimeType,
              fileSize: asset.file_size ? `${asset.file_size} bytes` : null
            });
          }
        } catch (downloadError) {
          // Continua com os outros anexos mesmo se um falhar
        }
      }
      
      res.json(attachments);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar anexos do Monday"
      });
    }
  });

  // Buscar anexos de colunas específicas baseado no Assets Map
  app.post("/api/monday/assets-map/:itemId", async (req, res) => {
      itemId: req.params.itemId, 
      body: req.body,
      isAuthenticated: req.isAuthenticated?.() 
    });
    
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { itemId } = req.params;
    const { columnIds, boardId } = req.body;
    
    if (!columnIds || !Array.isArray(columnIds) || columnIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "columnIds é obrigatório e deve conter as colunas do Assets Map"
      });
    }
    
    try {
      // Buscar a API key do Monday
      const mondayConnection = await storage.getServiceConnection("monday");
      if (!mondayConnection || !mondayConnection.token) {
        return res.status(400).json({
          success: false,
          message: "API key do Monday não configurada"
        });
      }
      
      const apiKey = mondayConnection.token;
      
      // Query corrigida para buscar item específico com suas colunas
      const query = `
        query {
          items(ids: [${itemId}]) {
            id
            name
            column_values {
              id
              type
              value
              text
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
      
      
      const responseText = await mondayResponse.text();
      
      // SEMPRE salvar JSON - método mais simples
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `monday-api-response-${itemId}-${timestamp}.json`;
        const filepath = `./uploads/${filename}`;
        
        
        // Usar writeFileSync síncrono para garantir que funcione
        require('fs').writeFileSync(filepath, responseText);
        
      } catch (saveError) {
      }

      if (!mondayResponse.ok) {
        return res.status(500).json({
          success: false,
          message: `Erro na API do Monday: ${mondayResponse.status}`,
          details: responseText
        });
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return res.status(500).json({
          success: false,
          message: "Erro ao processar resposta do Monday.com",
          details: responseText
        });
      }
      
      if (data.errors) {
        return res.status(500).json({
          success: false,
          message: "Erro na consulta do Monday",
          errors: data.errors,
          query: query
        });
      }
      
      const item = data.data.items[0];
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item não encontrado no Monday.com"
        });
      }

      
      const attachments = [];
      
      // Processar cada coluna especificada no Assets Map
      for (const targetColumnId of columnIds) {
        
        // Encontrar a coluna correspondente nos dados retornados
        const column = item.column_values?.find((col: any) => col.id === targetColumnId);
        
        if (column) {
            id: column.id,
            type: column.type,
            hasValue: !!column.value,
            valueLength: column.value ? column.value.length : 0
          });
          
          // Se a coluna tem valor e é do tipo file
          if (column.value && column.type === 'file') {
            try {
              const fileData = JSON.parse(column.value);
              
              // Monday.com retorna arrays de arquivos para colunas do tipo file
              if (fileData.files && Array.isArray(fileData.files)) {
                
                for (const file of fileData.files) {
                  // A URL do arquivo está no campo 'text' da coluna, não no objeto file
                  const fileUrl = column.text || file.url;
                  
                    name: file.name,
                    assetId: file.assetId,
                    url: fileUrl,
                    columnText: column.text
                  });
                  
                  if (!fileUrl) {
                    continue;
                  }
                  
                  // Adicionar informações do arquivo sem fazer download
                  attachments.push({
                    columnId: column.id,
                    columnTitle: column.title || `Coluna ${column.id}`,
                    fileName: file.name,
                    fileUrl: fileUrl,
                    assetId: file.assetId,
                    isImage: file.isImage === "true",
                    fileType: file.fileType,
                    createdAt: file.createdAt ? new Date(file.createdAt).toLocaleString('pt-BR') : null,
                    createdBy: file.createdBy
                  });
                  
                }
              } else {
              }
            } catch (parseError) {
            }
          } else {
          }
        } else {
        }
      }
      
      
      return res.json({
        success: true,
        attachments: attachments,
        itemName: item.name,
        message: `${attachments.length} anexo(s) encontrado(s) nas colunas do Assets Map`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar anexos do Monday"
      });
    }
  });

  // Endpoint para listar arquivos JSON salvos
  app.get("/api/monday/saved-json-files", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return res.json({ files: [] });
      }
      
      const files = fs.readdirSync(uploadsDir)
        .filter((file: string) => file.startsWith('monday-api-response-'))
        .map((file: string) => {
          const filepath = path.join(uploadsDir, file);
          const stats = fs.statSync(filepath);
          return {
            name: file,
            size: stats.size,
            created: stats.mtime,
            path: filepath
          };
        })
        .sort((a: any, b: any) => b.created - a.created);
      
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar arquivos" });
    }
  });

  // Debug: Verificar documentos com idOrigemTxt
  app.get("/api/debug/documentos-monday", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const allDocuments = await storage.getAllDocumentos();
      const documentosComMondayId = allDocuments.filter(doc => doc.idOrigemTxt && doc.idOrigemTxt.trim() !== '');
      
      res.json({
        total: documentosComMondayId.length,
        documentos: documentosComMondayId.map(doc => ({
          id: doc.id,
          objeto: doc.objeto,
          origem: doc.origem,
          statusOrigem: doc.statusOrigem,
          idOrigemTxt: doc.idOrigemTxt
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Função auxiliar para determinar MIME type baseado na extensão
  function getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[extension?.toLowerCase()] || 'application/octet-stream';
  }

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
      return res.status(401).send("Não autorizado");
    }
    
    const { id } = req.params;
    
    try {
      const result = await executeMondayMapping(id, req.user?.id, false);
      res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        ...result
      });
    } catch (error) {
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
        res.status(500).send(`Erro ao comunicar com a API do Monday: ${error.message}`);
      }
    } catch (error) {
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
        const updatedConnection = await storage.updateServiceConnection(existingConnection.id, connectionData);
        return res.json(updatedConnection);
      }
      
      // Salvar a conexão de serviço
      const connection = await storage.saveServiceConnection(connectionData);
      res.status(201).json(connection);
    } catch (error) {
      
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
      res.json(connection);
    } catch (error) {
      
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
      res.status(500).send("Erro ao buscar plugin");
    }
  });

  app.post("/api/plugins", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.createPlugin(req.body);
      res.status(201).json(plugin);
    } catch (error) {
      res.status(500).send("Erro ao criar plugin");
    }
  });

  app.put("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.updatePlugin(req.params.id, req.body);
      res.json(plugin);
    } catch (error) {
      res.status(500).send("Erro ao atualizar plugin");
    }
  });

  app.post("/api/plugins/:id/toggle", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const plugin = await storage.togglePluginStatus(req.params.id);
      res.json(plugin);
    } catch (error) {
      res.status(500).send("Erro ao alterar status do plugin");
    }
  });

  app.delete("/api/plugins/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deletePlugin(req.params.id);
      res.status(204).end();
    } catch (error) {
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

      
      res.status(200).json(testResult);
    } catch (error: any) {
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

        user: req.user?.name,
        filename,
        timestamp,
        size: req.file.size
      });

      res.status(200).json(result);
    } catch (error: any) {
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
      res.status(500).send("Erro ao buscar documento");
    }
  });

  app.post("/api/documentos", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documento = await storage.createDocumento(req.body);
      res.status(201).json(documento);
    } catch (error: any) {
      res.status(500).send("Erro ao criar documento");
    }
  });

  // Endpoint de teste direto
  app.post("/api/documentos/:id/update", async (req, res) => {
    
    // Forçar cabeçalhos JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autorizado" });
    }
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      
      // Resposta JSON explícita
      const response = {
        success: true,
        data: documento
      };
      
      return res.status(200).json(response);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.put("/api/documentos/:id", async (req, res) => {
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autorizado" });
    }
    
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      
      return res.status(200).json({
        success: true,
        data: documento,
        message: "Documento atualizado com sucesso"
      });
    } catch (error: any) {
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
      res.status(500).send("Erro ao atualizar documento");
    }
  });

  app.delete("/api/documentos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteDocumento(req.params.id);
      res.status(204).send();
    } catch (error: any) {
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
      res.status(500).send("Erro ao criar artefato");
    }
  });

  app.patch("/api/artifacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const artifact = await storage.updateDocumentArtifact(req.params.id, req.body);
      res.json(artifact);
    } catch (error: any) {
      res.status(500).send("Erro ao atualizar artefato");
    }
  });

  app.delete("/api/artifacts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteDocumentArtifact(req.params.id);
      res.status(204).send();
    } catch (error: any) {
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
        res.json(allStructures);
      }
    } catch (error: any) {
      res.status(500).send("Erro ao buscar estrutura do repositório");
    }
  });

  app.post("/api/repo-structure", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const structure = await storage.createRepoStructure(req.body);
      res.status(201).json(structure);
    } catch (error: any) {
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
      await storage.deleteRepoStructure(uid);
      
      res.json({ 
        message: `Pasta "${structure.folderName}" removida do banco local com sucesso.`,
        folderName: structure.folderName 
      });
    } catch (error: any) {
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


      if (!githubResponse.ok) {
        const errorText = await githubResponse.text();
        return res.status(400).json({ 
          error: "Erro ao buscar estrutura do GitHub",
          details: `Status: ${githubResponse.status}` 
        });
      }

      const contentType = githubResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await githubResponse.text();
        return res.status(500).json({ 
          error: "GitHub retornou HTML em vez de JSON",
          details: "Possível problema de autenticação ou rate limit"
        });
      }

      let githubContent;
      try {
        githubContent = await githubResponse.json();
      } catch (parseError) {
        
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
        }
      }

      // Atualizar status de pastas que existem no banco mas foram deletadas do GitHub
      for (const structure of existingStructures) {
        if (!githubFolderNames.includes(structure.folderName)) {
          // Pasta existe no banco mas não no GitHub (foi deletada)
          await storage.updateRepoStructureSync(structure.uid, false);
          updatedCount++;
        } else {
          // Pasta existe em ambos - garantir que está marcada como sincronizada
          if (!structure.isSync) {
            await storage.updateRepoStructureSync(structure.uid, true);
            updatedCount++;
          }
        }
      }

      res.json({ 
        message: `Sincronização concluída. ${importedCount} pasta(s) importadas e ${updatedCount} pasta(s) atualizadas.`,
        importedCount,
        updatedCount
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Endpoint para sincronizar pasta individual com GitHub (DEVE vir DEPOIS do sync-from-github)
  app.post("/api/repo-structure/:uid/sync-github", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { uid } = req.params;
      const structure = await storage.getRepoStructure(uid);
      
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


      // Primeiro, verificar se a pasta já existe no GitHub
      const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${githubConnection.token}`,
        },
      });

      if (checkResponse.ok) {
        // Pasta já existe no GitHub, apenas marcar como sincronizada
        await storage.updateRepoStructureSync(uid, true);
        res.json({ success: true, message: "Pasta já existe no GitHub e foi marcada como sincronizada" });
      } else if (checkResponse.status === 404) {
        // Pasta não existe, criar nova
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
          await storage.updateRepoStructureSync(uid, true);
          res.json({ success: true, message: "Pasta criada no GitHub com sucesso" });
        } else {
          const errorData = await createResponse.json();
          res.status(400).json({ success: false, message: errorData.message });
        }
      } else {
        // Outro erro
        const errorData = await checkResponse.json();
        res.status(400).json({ success: false, message: errorData.message });
      }
    } catch (error: any) {
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
      
      // Salvar as configurações de agendamento no banco
      await storage.updateMondayMapping(mappingId, {
        schedulesParams: {
          enabled: true,
          frequency: frequency,
          time: time,
          days: []
        }
      });
      
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
      
      // Atualizar as configurações de agendamento no banco (desativar)
      if (success && mapping) {
        await storage.updateMondayMapping(mappingId, {
          schedulesParams: {
            enabled: false,
            frequency: mapping.schedulesParams?.frequency || 'daily',
            time: mapping.schedulesParams?.time || '09:00',
            days: mapping.schedulesParams?.days || []
          }
        });
      }
      
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
      res.status(500).send("Erro ao listar jobs");
    }
  });

  // Endpoint para buscar colunas da tabela documentos dinamicamente
  app.get("/api/documentos-columns", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const columns = [
        { name: "id", type: "uuid", description: "id" },
        { name: "origem", type: "text", description: "origem" },
        { name: "objeto", type: "text", description: "objeto" },
        { name: "tipo", type: "text", description: "tipo" },
        { name: "cliente", type: "text", description: "cliente" },
        { name: "responsavel", type: "text", description: "responsavel" },
        { name: "sistema", type: "text", description: "sistema" },
        { name: "modulo", type: "text", description: "modulo" },
        { name: "descricao", type: "text", description: "descricao" },
        { name: "status", type: "text", description: "status" },
        { name: "statusOrigem", type: "text", description: "statusOrigem" },
        { name: "solicitante", type: "text", description: "solicitante" },
        { name: "aprovador", type: "text", description: "aprovador" },
        { name: "agente", type: "text", description: "agente" },
        { name: "idOrigem", type: "bigint", description: "idOrigem" },
        { name: "idOrigemTxt", type: "text", description: "idOrigemTxt" },
        { name: "generalColumns", type: "json", description: "generalColumns" },
        { name: "createdAt", type: "timestamp", description: "createdAt" },
        { name: "updatedAt", type: "timestamp", description: "updatedAt" }
      ];
      
      res.json(columns);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // The httpServer is needed for potential WebSocket connections later
  const httpServer = createServer(app);

  return httpServer;
}
