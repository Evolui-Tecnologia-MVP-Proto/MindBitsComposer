import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PluginStatus, PluginType, documentos, documentsFlows, documentFlowExecutions, flowTypes, users, documentEditions, templates, lexicalDocuments, insertLexicalDocumentSchema, specialties, insertSpecialtySchema, systemParams, insertSystemParamSchema } from "@shared/schema";
import { TemplateType, insertTemplateSchema, insertMondayMappingSchema, insertMondayColumnSchema, insertServiceConnectionSchema } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc, and, gte, lte, isNull, or, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { systemLogs } from "@shared/schema";
import { ZodError } from "zod";
import fetch from "node-fetch";
import { jobManager } from "./job-manager";
import { SystemLogger, EventTypes } from "./logger";
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
    console.log(`=== BOARD ID DEBUG: ${boardId} ===`);
    
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
      console.log(`⚠️ Erro na verificação de duplicata:`, error);
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
      console.log(`🔍 Debug monday_item_values para item ${item.id}:`);
      console.log(`📋 assetsMappings existe:`, !!existingMapping.assetsMappings);
    }
    
    if (existingMapping.assetsMappings) {
      const assetsMappings = typeof existingMapping.assetsMappings === 'string'
        ? JSON.parse(existingMapping.assetsMappings)
        : existingMapping.assetsMappings;
      
      if (index < 3) {
        console.log(`📋 assetsMappings processado:`, assetsMappings);
      }
      
      // Filtrar apenas colunas de assets (exceto documents_item)
      const assetsColumnIds = assetsMappings
        .filter((asset: any) => asset.columnId && asset.columnId !== "documents_item")
        .map((asset: any) => asset.columnId);
      
      if (index < 3) {
        console.log(`📋 assetsColumnIds filtrados:`, assetsColumnIds);
      }
      
      // Para cada coluna de assets, buscar o valor no item
      for (const columnId of assetsColumnIds) {
        const columnValue = item.column_values.find((cv: any) => cv.id === columnId);
        
        // Log detalhado para diagnosticar extração de valores
        if (index < 3) {
          console.log(`🔍 EXTRAÇÃO DE VALOR - Item ${item.id}, Coluna ${columnId}:`);
          console.log(`  ├─ Coluna encontrada:`, columnValue ? 'SIM' : 'NÃO');
          
          if (columnValue) {
            console.log(`  ├─ Tipo da coluna:`, columnValue.type || 'N/A');
            console.log(`  ├─ Texto da coluna:`, columnValue.text || 'VAZIO');
            console.log(`  ├─ Valor JSON (primeiros 200 chars):`, 
              columnValue.value ? 
                (columnValue.value.length > 200 ? 
                  columnValue.value.substring(0, 200) + '...' : 
                  columnValue.value) : 
                'NULL'
            );
            
            // Tentar fazer parse do JSON para ver a estrutura
            if (columnValue.value) {
              try {
                const parsedValue = JSON.parse(columnValue.value);
                console.log(`  ├─ JSON parseado:`, typeof parsedValue, Object.keys(parsedValue || {}));
                if (parsedValue && typeof parsedValue === 'object') {
                  console.log(`  └─ Estrutura JSON:`, JSON.stringify(parsedValue, null, 2).substring(0, 300));
                }
              } catch (e) {
                console.log(`  └─ ERRO ao parsear JSON:`, e.message);
              }
            }
          }
        }
        
        if (columnValue?.value) {
            mondayItemValues.push({
            columnid: columnId,
            value: columnValue.value // Manter como string serializada, não fazer parse
          });
          
          // Log quando valor é adicionado
          await SystemLogger.log({
            eventType: 'MONDAY_SYNC_MANUAL',
            message: `VALOR EXTRAÍDO E ADICIONADO - Coluna ${columnId}, Item ${item.id}`,
            parameters: { 
              mappingId,
              itemId: item.id,
              columnId: columnId,
              columnType: columnValue.type,
              valueLength: columnValue.value ? columnValue.value.length : 0,
              hasValue: !!columnValue.value
            },
            userId: userId
          });
          
          if (index < 3) {
            console.log(`✅ VALOR ADICIONADO ao monday_item_values - ${columnId}`);
          }
        } else {
          // Log quando valor não é encontrado
          if (index < 3) {
            console.log(`❌ VALOR NÃO ADICIONADO - ${columnId} (sem valor válido)`);
          }
        }
      }
    }
    
    if (index < 3) {
      console.log(`📋 monday_item_values final:`, mondayItemValues);
      console.log(`🔍 RAW API VALUE SAMPLE:`, mondayItemValues.length > 0 ? mondayItemValues[0].value : 'NENHUM VALOR');
    }
    
    // Log EXATO do que está sendo passado para o banco
    console.log(`🎯 DADOS MONDAY_ITEM_VALUES PARA BANCO - Item ${item.id}:`, JSON.stringify(mondayItemValues, null, 2));
    
    documentData.mondayItemValues = mondayItemValues;

    // Valores padrão PRIMEIRO (mas salvar o general_columns para não sobrescrever)
    let preserveGeneralColumns = null;
    if (existingMapping.defaultValues) {
      try {
        const defaults = typeof existingMapping.defaultValues === 'string'
          ? JSON.parse(existingMapping.defaultValues)
          : existingMapping.defaultValues;
        
        // Salvar general_columns se existir nos padrões, mas filtrar apenas dados válidos
        if (defaults.generalColumns) {
          const rawPreserve = defaults.generalColumns;
          
          // Filtrar apenas valores que não são colunas Monday.com não mapeadas
          preserveGeneralColumns = {};
          
          // Manter apenas valores que não começam com "coluna_" (que são colunas Monday.com não mapeadas)
          Object.keys(rawPreserve).forEach(key => {
            if (!key.startsWith('coluna_') && !key.startsWith('monday_item_')) {
              preserveGeneralColumns[key] = rawPreserve[key];
            }
          });
          
          console.log(`🧹 Filtro de preserveGeneralColumns: ${Object.keys(rawPreserve).length} → ${Object.keys(preserveGeneralColumns).length} colunas`);
        }
        
        // Filtrar defaults antes de aplicar ao documentData
        const cleanedDefaults = { ...defaults };
        if (cleanedDefaults.generalColumns) {
          const filteredGeneralColumns = {};
          Object.keys(cleanedDefaults.generalColumns).forEach(key => {
            if (!key.startsWith('coluna_') || key === 'monday_item_id' || key === 'monday_item_name') {
              filteredGeneralColumns[key] = cleanedDefaults.generalColumns[key];
            }
          });
          cleanedDefaults.generalColumns = filteredGeneralColumns;
        }
        
        Object.assign(documentData, cleanedDefaults);
      } catch (e) {
        console.warn("Erro ao parsear valores padrão:", e);
      }
    }

    // Mapear colunas configuradas
    const mappedColumnIds = new Set(mappingColumns.map(col => col.mondayColumnId));
    
    // Objeto para acumular colunas mapeadas para generalColumns
    const generalColumnsFromMapping: Record<string, string> = {};
    
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
        
        // Se for generalColumns, acumular em objeto
        if (mapping.cpxField === 'generalColumns') {
          const columnTitle = mapping.mondayColumnTitle || `coluna_${mapping.mondayColumnId}`;
          generalColumnsFromMapping[columnTitle] = value;
          
          // Log direto no sistema para debug
          await SystemLogger.log({
            eventType: 'MONDAY_SYNC_MANUAL',
            message: `COLUNA MAPEADA PARA GENERAL_COLUMNS: ${columnTitle} = "${value}"`,
            parameters: { 
              mappingId: mapping.mappingId,
              columnTitle,
              value,
              columnId: mapping.mondayColumnId
            },
            userId: userId
          });
        } else {
          // Para outros campos, comportamento normal
          documentData[mapping.cpxField] = value;
        }
      }
    }

    // Capturar apenas metadados básicos do item (não mais todas as colunas não mapeadas)
    const basicMetadata: Record<string, any> = {};
    
    // Adicionar apenas dados básicos do item
    basicMetadata.monday_item_id = item.id;
    basicMetadata.monday_item_name = item.name;
    
    // Log do objeto generalColumnsFromMapping para debug
    if (index < 3) {
      await SystemLogger.log({
        eventType: 'MONDAY_SYNC_MANUAL',
        message: `DEBUG GENERAL_COLUMNS_FROM_MAPPING: ${JSON.stringify(generalColumnsFromMapping)}`,
        parameters: { 
          mappingId,
          itemId: item.id,
          generalColumnsFromMapping,
          objectKeysCount: Object.keys(generalColumnsFromMapping).length
        },
        userId: userId
      });
    }
    
    // Construir general_columns final combinando valores padrão + colunas mapeadas + metadados básicos
    const finalGeneralColumns = {
      ...(preserveGeneralColumns || {}),
      ...generalColumnsFromMapping,
      ...basicMetadata
    };
    
  
    // Filtrar colunas não mapeadas do general_columns final
    const cleanedGeneralColumns = {};
    Object.keys(finalGeneralColumns).forEach(key => {
      if (!key.startsWith('coluna_') || key === 'monday_item_id' || key === 'monday_item_name') {
        cleanedGeneralColumns[key] = finalGeneralColumns[key];
      }
    });
    
    console.log(`🎯 GENERAL_COLUMNS SENDO DEFINIDO - Item ${item.id}:`, Object.keys(cleanedGeneralColumns));
    documentData.generalColumns = cleanedGeneralColumns;
    
    // Log para debug (apenas primeiros 3 itens)
    if (index < 3) {
      console.log(`🔍 GENERAL_COLUMNS FINAL para item ${item.id}:`, {
        preserveGeneralColumns,
        basicMetadataCount: Object.keys(basicMetadata).length,
        finalGeneralColumns: JSON.stringify(finalGeneralColumns, null, 2).substring(0, 500)
      });
    }

    try {
      const createdDocument = await storage.createDocumento(documentData);
      documentsCreated++;

      // Os valores de assets já foram capturados na seção anterior e 
      // armazenados em documentData.mondayItemValues
      // Não é necessário processar anexos separadamente
    } catch (docError) {
      console.error(`❌ Erro ao criar documento para item ${item.id}:`, docError);
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

  // Specialty routes
  // Get all specialties
  app.get("/api/specialties", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("🔍 [API] Buscando todas as especialidades via DB direto...");
      
      // Tentar buscar diretamente do banco
      const specialtiesFromDb = await db.select().from(specialties);
      console.log("✅ [API] Especialidades encontradas no DB:", specialtiesFromDb.length);
      console.log("📋 [API] Dados:", specialtiesFromDb);
      
      res.json(specialtiesFromDb);
    } catch (error) {
      console.error("❌ [API] Erro ao buscar especialidades:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get specialty by ID
  app.get("/api/specialties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      const specialty = await storage.getSpecialty(id);
      if (!specialty) {
        return res.status(404).send("Especialidade não encontrada");
      }
      res.json(specialty);
    } catch (error) {
      console.error("Erro ao buscar especialidade:", error);
      res.status(500).send("Erro ao buscar especialidade");
    }
  });
  
  // Create specialty
  app.post("/api/specialties", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("🔍 [API] Criando nova especialidade:", req.body);
      const specialtyData = insertSpecialtySchema.parse(req.body);
      
      // Verificar se já existe especialidade com o mesmo código
      const existingSpecialty = await storage.getSpecialtyByCode(specialtyData.code);
      if (existingSpecialty) {
        return res.status(400).send("Já existe uma especialidade com este código");
      }
      
      const newSpecialty = await storage.createSpecialty(specialtyData);
      console.log("✅ [API] Especialidade criada:", newSpecialty);
      res.status(201).json(newSpecialty);
    } catch (error: any) {
      if (error instanceof ZodError) {
        console.error("❌ [API] Erro de validação:", error.errors);
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("❌ [API] Erro ao criar especialidade:", error);
      res.status(500).send("Erro ao criar especialidade");
    }
  });
  
  // Update specialty
  app.patch("/api/specialties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se a especialidade existe
      const existingSpecialty = await storage.getSpecialty(id);
      if (!existingSpecialty) {
        return res.status(404).send("Especialidade não encontrada");
      }
      
      // Se o código estiver sendo alterado, verificar duplicidade
      if (req.body.code && req.body.code !== existingSpecialty.code) {
        const specialtyWithCode = await storage.getSpecialtyByCode(req.body.code);
        if (specialtyWithCode && specialtyWithCode.id !== id) {
          return res.status(400).send("Já existe uma especialidade com este código");
        }
      }
      
      const updatedSpecialty = await storage.updateSpecialty(id, req.body);
      res.json(updatedSpecialty);
    } catch (error) {
      console.error("Erro ao atualizar especialidade:", error);
      res.status(500).send("Erro ao atualizar especialidade");
    }
  });
  
  // Delete specialty
  app.delete("/api/specialties/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      // Verificar se a especialidade existe
      const existingSpecialty = await storage.getSpecialty(id);
      if (!existingSpecialty) {
        return res.status(404).send("Especialidade não encontrada");
      }
      
      await storage.deleteSpecialty(id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir especialidade:", error);
      res.status(500).send("Erro ao excluir especialidade");
    }
  });

  // Specialty-User association endpoints
  
  // Get users associated with a specialty
  app.get("/api/specialties/:id/users", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      const specialtyUsers = await storage.getSpecialtyUsers(id);
      console.log("✅ [API] Especialistas encontrados:", specialtyUsers.length);
      res.json(specialtyUsers);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar especialistas:", error);
      res.status(500).send("Erro ao buscar especialistas");
    }
  });

  // Add user to specialty
  app.post("/api/specialties/:id/users", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    const { userId } = req.body;
    
    try {
      // Verificar se a especialidade existe
      const existingSpecialty = await storage.getSpecialty(id);
      if (!existingSpecialty) {
        return res.status(404).send("Especialidade não encontrada");
      }
      
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).send("Usuário não encontrado");
      }
      
      const association = await storage.addUserToSpecialty(id, userId);
      console.log("✅ [API] Usuário adicionado à especialidade:", association);
      res.status(201).json(association);
    } catch (error: any) {
      // Verificar se é erro de violação de constraint unique
      if (error.message?.includes('unique') || error.code === '23505') {
        return res.status(409).send("Usuário já está associado a esta especialidade");
      }
      console.error("❌ [API] Erro ao adicionar usuário à especialidade:", error);
      res.status(500).send("Erro ao adicionar usuário à especialidade");
    }
  });

  // Remove user from specialty
  app.delete("/api/specialties/:id/users/:userId", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id, userId } = req.params;
    
    try {
      await storage.removeUserFromSpecialty(id, parseInt(userId));
      console.log("✅ [API] Usuário removido da especialidade:", { specialtyId: id, userId });
      res.status(204).send();
    } catch (error: any) {
      console.error("❌ [API] Erro ao remover usuário da especialidade:", error);
      res.status(500).send("Erro ao remover usuário da especialidade");
    }
  });

  // Get specialties for a user
  app.get("/api/users/:id/specialties", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { id } = req.params;
    
    try {
      const userSpecialties = await storage.getUserSpecialties(parseInt(id));
      console.log("✅ [API] Especialidades do usuário encontradas:", userSpecialties.length);
      res.json(userSpecialties);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar especialidades do usuário:", error);
      res.status(500).send("Erro ao buscar especialidades do usuário");
    }
  });

  // Get documents for review by responsible person
  app.get("/api/documentos/review", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { responsavel } = req.query;
    
    if (!responsavel) {
      return res.status(400).send("Parâmetro 'responsavel' é obrigatório");
    }
    
    try {
      console.log("🔍 [API] Buscando documentos para revisão:", { responsavel });
      
      // Buscar documentos filtrados por responsável, origem e status
      const documents = await db
        .select()
        .from(documentos)
        .where(and(
          eq(documentos.responsavel, responsavel as string),
          eq(documentos.origem, "MindBits_CT"),
          eq(documentos.status, "Integrado")
        ))
        .orderBy(asc(documentos.createdAt)); // Do mais antigo para o mais novo
      
      console.log("✅ [API] Documentos encontrados para revisão:", documents.length);
      res.json(documents);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar documentos para revisão:", error);
      res.status(500).send("Erro ao buscar documentos para revisão");
    }
  });

  // System Parameters routes
  // Get all system parameters
  app.get("/api/system-params", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("🔍 [API] Buscando todos os parâmetros do sistema...");
      const systemParams = await storage.getAllSystemParams();
      console.log("✅ [API] Parâmetros encontrados:", systemParams.length);
      res.json(systemParams);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar parâmetros do sistema:", error);
      res.status(500).send("Erro ao buscar parâmetros do sistema");
    }
  });

  // Get system parameter by name
  app.get("/api/system-params/:paramName", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { paramName } = req.params;
    
    try {
      const systemParam = await storage.getSystemParam(paramName);
      if (!systemParam) {
        return res.status(404).send("Parâmetro do sistema não encontrado");
      }
      res.json(systemParam);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar parâmetro do sistema:", error);
      res.status(500).send("Erro ao buscar parâmetro do sistema");
    }
  });

  // Create system parameter
  app.post("/api/system-params", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("🔍 [API] Criando novo parâmetro do sistema:", req.body);
      const paramData = insertSystemParamSchema.parse(req.body);
      
      // Verificar se já existe parâmetro com o mesmo nome
      const existingParam = await storage.getSystemParam(paramData.paramName);
      if (existingParam) {
        return res.status(400).send("Já existe um parâmetro com este nome");
      }
      
      const newParam = await storage.createSystemParam(paramData);
      console.log("✅ [API] Parâmetro criado:", newParam);
      res.status(201).json(newParam);
    } catch (error: any) {
      if (error instanceof ZodError) {
        console.error("❌ [API] Erro de validação:", error.errors);
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("❌ [API] Erro ao criar parâmetro do sistema:", error);
      res.status(500).send("Erro ao criar parâmetro do sistema");
    }
  });

  // Update system parameter
  app.patch("/api/system-params/:paramName", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { paramName } = req.params;
    
    try {
      // Verificar se o parâmetro existe
      const existingParam = await storage.getSystemParam(paramName);
      if (!existingParam) {
        return res.status(404).send("Parâmetro não encontrado");
      }
      
      const updatedParam = await storage.updateSystemParam(paramName, req.body);
      console.log("✅ [API] Parâmetro atualizado:", updatedParam);
      res.json(updatedParam);
    } catch (error: any) {
      console.error("❌ [API] Erro ao atualizar parâmetro:", error);
      res.status(500).send("Erro ao atualizar parâmetro");
    }
  });

  // Delete system parameter
  app.delete("/api/system-params/:paramName", async (req, res) => {
    // if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    const { paramName } = req.params;
    
    try {
      // Verificar se o parâmetro existe
      const existingParam = await storage.getSystemParam(paramName);
      if (!existingParam) {
        return res.status(404).send("Parâmetro não encontrado");
      }
      
      await storage.deleteSystemParam(paramName);
      console.log("✅ [API] Parâmetro excluído:", paramName);
      res.status(204).send();
    } catch (error: any) {
      console.error("❌ [API] Erro ao excluir parâmetro:", error);
      res.status(500).send("Erro ao excluir parâmetro");
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

  // Buscar anexos de um item do Monday.com
  app.get("/api/monday/attachments/:itemId", async (req, res) => {
    console.log("🔥 ROTA GET sendo executada para:", req.params.itemId);
    console.log("🔥 Método da requisição:", req.method);
    
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
          console.error(`Erro ao baixar anexo ${asset.name}:`, downloadError);
          // Continua com os outros anexos mesmo se um falhar
        }
      }
      
      console.log("🔥 FINALIZANDO rota GET - retornando:", attachments.length, "anexos");
      res.json(attachments);
    } catch (error) {
      console.error("Erro ao buscar anexos do Monday:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar anexos do Monday"
      });
    }
  });

  // Buscar anexos de colunas específicas baseado no Assets Map
  app.post("/api/monday/assets-map/:itemId", async (req, res) => {
    console.log("🚀 INÍCIO endpoint Monday assets-map");
    console.log("📋 Dados recebidos:", { 
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
      
      console.log("📤 Query GraphQL para Monday.com:", query);
      
      console.log("🚀 INICIANDO REQUEST para Monday.com...");
      
      const mondayResponse = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey
        },
        body: JSON.stringify({ query })
      });
      
      console.log("📥 Status da resposta Monday:", mondayResponse.status, mondayResponse.statusText);
      console.log("🎯 REQUEST CONCLUÍDO, obtendo texto...");
      
      const responseText = await mondayResponse.text();
      console.log("🔥 TESTE: responseText obtido, tamanho:", responseText.length);
      
      // SEMPRE salvar JSON - método mais simples
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `monday-api-response-${itemId}-${timestamp}.json`;
        const filepath = `./uploads/${filename}`;
        
        console.log(`🔧 Salvando em: ${filepath}`);
        
        // Usar writeFileSync síncrono para garantir que funcione
        require('fs').writeFileSync(filepath, responseText);
        
        console.log(`✅ ARQUIVO SALVO: ${filename}`);
      } catch (saveError) {
        console.error("❌ Erro ao salvar:", saveError.message);
      }

      if (!mondayResponse.ok) {
        console.error("❌ Erro na API Monday:", responseText);
        return res.status(500).json({
          success: false,
          message: `Erro na API do Monday: ${mondayResponse.status}`,
          details: responseText
        });
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("🔍 Resposta do Monday.com parseada:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("❌ Erro ao fazer parse da resposta Monday:", parseError);
        console.error("📄 Conteúdo que causou o erro:", responseText);
        return res.status(500).json({
          success: false,
          message: "Erro ao processar resposta do Monday.com",
          details: responseText
        });
      }
      
      if (data.errors) {
        console.error("❌ Erros GraphQL da API Monday:", JSON.stringify(data.errors, null, 2));
        console.error("📤 Query que causou erro:", query);
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

      console.log("📄 Item encontrado:", item.name);
      console.log("🔍 Total de colunas no item:", item.column_values?.length);
      
      const attachments = [];
      
      // Processar cada coluna especificada no Assets Map
      for (const targetColumnId of columnIds) {
        console.log(`\n🔍 Procurando coluna: ${targetColumnId}`);
        
        // Encontrar a coluna correspondente nos dados retornados
        const column = item.column_values?.find((col: any) => col.id === targetColumnId);
        
        if (column) {
          console.log("✅ Coluna encontrada:", {
            id: column.id,
            type: column.type,
            hasValue: !!column.value,
            valueLength: column.value ? column.value.length : 0
          });
          
          // Se a coluna tem valor e é do tipo file
          if (column.value && column.type === 'file') {
            try {
              const fileData = JSON.parse(column.value);
              console.log("📁 Estrutura do arquivo na coluna:", Object.keys(fileData));
              
              // Monday.com retorna arrays de arquivos para colunas do tipo file
              if (fileData.files && Array.isArray(fileData.files)) {
                console.log(`📁 Encontrados ${fileData.files.length} arquivo(s) na coluna ${column.id}`);
                
                for (const file of fileData.files) {
                  // A URL do arquivo está no campo 'text' da coluna, não no objeto file
                  const fileUrl = column.text || file.url;
                  
                  console.log("📎 Processando arquivo:", {
                    name: file.name,
                    assetId: file.assetId,
                    url: fileUrl,
                    columnText: column.text
                  });
                  
                  if (!fileUrl) {
                    console.log(`❌ URL não encontrada para arquivo ${file.name}`);
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
                  
                  console.log("📋 Arquivo encontrado:", file.name, "na coluna", column.id);
                }
              } else {
                console.log(`ℹ️ Coluna ${targetColumnId} não possui array 'files' ou está vazio`);
              }
            } catch (parseError) {
              console.error(`❌ Erro ao processar JSON da coluna ${targetColumnId}:`, parseError);
              console.log("❌ Valor bruto da coluna:", column.value);
            }
          } else {
            console.log(`ℹ️ Coluna ${targetColumnId} não contém arquivos (tipo: ${column.type}, valor: ${!!column.value})`);
          }
        } else {
          console.log(`❌ Coluna ${targetColumnId} não encontrada no item`);
        }
      }
      
      console.log(`\n📊 Total de anexos encontrados: ${attachments.length}`);
      
      return res.json({
        success: true,
        attachments: attachments,
        itemName: item.name,
        message: `${attachments.length} anexo(s) encontrado(s) nas colunas do Assets Map`
      });
    } catch (error) {
      console.error("Erro ao buscar anexos do Monday:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao buscar anexos do Monday"
      });
    }
  });

  // Endpoint para salvar JSON do fluxo
  app.post("/api/documents-flows/:id/export-json", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const flowId = req.params.id;
      
      // Buscar o fluxo no banco de dados
      const flow = await db
        .select()
        .from(documentsFlows)
        .where(eq(documentsFlows.id, flowId))
        .limit(1);
        
      if (!flow || flow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      const flowData = flow[0];
      
      // Extrair apenas o flow_data (conteúdo JSON do fluxo)
      const jsonContent = flowData.flowData || flowData.flow_data;
      
      if (!jsonContent) {
        return res.status(400).json({ error: "Fluxo não possui dados para exportar" });
      }
      
      // Criar nome do arquivo com timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milissegundos e substitui : por -
      const fileName = `${flowId}_${timestamp}.json`;
      
      // Criar diretório se não existir
      const saveDir = path.join(process.cwd(), 'local_files', 'saved_fluxes');
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      
      // Caminho completo do arquivo
      const filePath = path.join(saveDir, fileName);
      
      // Salvar o arquivo JSON
      fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), 'utf-8');
      
      // Log da ação
      await SystemLogger.logUserAction(
        req.user?.id || 0,
        'FLOW_EXPORT_JSON',
        {
          flowId: flowId,
          flowName: flowData.name,
          flowCode: flowData.code,
          fileName: fileName,
          filePath: filePath
        }
      );
      
      res.json({
        success: true,
        fileName: fileName,
        filePath: `local_files/saved_fluxes/${fileName}`,
        message: "JSON do fluxo salvo com sucesso"
      });
      
    } catch (error) {
      console.error("Erro ao salvar JSON do fluxo:", error);
      res.status(500).json({ error: "Erro ao salvar JSON do fluxo" });
    }
  });

  // Endpoint para listar fluxos salvos em JSON
  app.get("/api/documents-flows/saved-json-files", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { flowId } = req.query;
      const saveDir = path.join(process.cwd(), 'local_files', 'saved_fluxes');
      
      if (!fs.existsSync(saveDir)) {
        return res.json({ files: [] });
      }
      
      let files = fs.readdirSync(saveDir)
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => {
          const filepath = path.join(saveDir, file);
          const stats = fs.statSync(filepath);
          
          // Extrair flowId do nome do arquivo
          const fileFlowId = file.split('_')[0];
          
          return {
            name: file,
            flowId: fileFlowId,
            size: stats.size,
            created: stats.mtime,
            path: filepath
          };
        });

      // Filtrar por flowId se fornecido
      if (flowId) {
        files = files.filter((file: any) => file.flowId === flowId);
      }

      // Ordenar por data de criação (mais recente primeiro)
      files = files.sort((a: any, b: any) => b.created - a.created);
      
      res.json({ files });
    } catch (error) {
      console.error("Erro ao listar arquivos JSON dos fluxos:", error);
      res.status(500).json({ error: "Erro ao listar arquivos" });
    }
  });

  // Endpoint para importar JSON de fluxo
  app.post("/api/documents-flows/:id/import-json", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const flowId = req.params.id;
      const { jsonFileName } = req.body;
      
      if (!jsonFileName) {
        return res.status(400).json({ error: "Nome do arquivo JSON é obrigatório" });
      }
      
      // Verificar se o fluxo existe
      const existingFlow = await db
        .select()
        .from(documentsFlows)
        .where(eq(documentsFlows.id, flowId))
        .limit(1);
        
      if (!existingFlow || existingFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      // Ler o arquivo JSON
      const saveDir = path.join(process.cwd(), 'local_files', 'saved_fluxes');
      const filePath = path.join(saveDir, jsonFileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Arquivo JSON não encontrado" });
      }
      
      const jsonContent = fs.readFileSync(filePath, 'utf-8');
      const flowData = JSON.parse(jsonContent);
      
      // Atualizar o flow_data do fluxo
      await db
        .update(documentsFlows)
        .set({ 
          flowData: flowData,
          updatedAt: new Date()
        })
        .where(eq(documentsFlows.id, flowId));
      
      // Log da ação
      await SystemLogger.logUserAction(
        req.user?.id || 0,
        'FLOW_IMPORT_JSON',
        {
          flowId: flowId,
          flowName: existingFlow[0].name,
          flowCode: existingFlow[0].code,
          importedFileName: jsonFileName,
          filePath: filePath
        }
      );
      
      res.json({
        success: true,
        message: "JSON importado com sucesso para o fluxo",
        flowId: flowId,
        importedFile: jsonFileName
      });
      
    } catch (error) {
      console.error("Erro ao importar JSON do fluxo:", error);
      res.status(500).json({ error: "Erro ao importar JSON do fluxo" });
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
      console.error("Erro ao listar arquivos JSON:", error);
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
      console.error("Erro ao buscar documentos do Monday:", error);
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
      const result = await executeMondayMapping(id, req.user?.id, false);
      res.json({
        success: true,
        message: "Sincronização executada com sucesso",
        ...result
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
      
      // Converter BigInt para string antes de enviar como JSON
      const documentoResponse = {
        ...documento,
        idOrigem: documento.idOrigem ? documento.idOrigem.toString() : null
      };
      
      return res.status(200).json({
        success: true,
        data: documentoResponse,
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

  // Rota para iniciar documentação
  app.post("/api/documentos/start-documentation", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("=== INÍCIO ROTA START DOCUMENTATION ===");
      console.log("Body recebido:", req.body);
      console.log("Usuário:", req.user?.name);
      
      const { documentId, flowId } = req.body;

      if (!documentId || !flowId) {
        console.log("Erro: parâmetros obrigatórios ausentes");
        return res.status(400).json({ 
          error: "documentId e flowId são obrigatórios" 
        });
      }

      console.log("Verificando documento:", documentId);
      // Verificar se o documento existe
      const documento = await storage.getDocumento(documentId);
      if (!documento) {
        console.log("Erro: documento não encontrado");
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      console.log("Documento encontrado:", documento.objeto);

      console.log("Verificando fluxo:", flowId);
      // Verificar se o fluxo existe
      const flow = await db.select()
        .from(documentsFlows)
        .where(eq(documentsFlows.id, flowId))
        .limit(1);
      
      if (flow.length === 0) {
        console.log("Erro: fluxo não encontrado");
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      console.log("Fluxo encontrado:", flow[0].name);

      console.log("Processando flow_tasks para atualizar nós de execução");
      // Processar o flowData para atualizar os nós iniciais
      let updatedFlowTasks = { 
        nodes: flow[0].flowData?.nodes || [],
        edges: flow[0].flowData?.edges || [],
        viewport: flow[0].flowData?.viewport || { x: 0, y: 0, zoom: 1 }
      };
      
      console.log('🔗 Template original tem:', {
        nodes: updatedFlowTasks.nodes.length,
        edges: updatedFlowTasks.edges.length,
        viewport: updatedFlowTasks.viewport ? 'sim' : 'não'
      });
      
      if (updatedFlowTasks.nodes && Array.isArray(updatedFlowTasks.nodes)) {
        // 1. Encontrar o startNode e marcar como executado
        const startNodeIndex = updatedFlowTasks.nodes.findIndex((node: any) => node.type === 'startNode');
        if (startNodeIndex !== -1) {
          console.log("StartNode encontrado, marcando como executado");
          updatedFlowTasks.nodes[startNodeIndex].data.isExecuted = 'TRUE';
          
          // 2. Verificar se existe integrationNode conectado diretamente ao startNode
          const startNodeId = updatedFlowTasks.nodes[startNodeIndex].id;
          
          // Procurar por uma edge que conecta o startNode a um integrationNode
          if (updatedFlowTasks.edges && Array.isArray(updatedFlowTasks.edges)) {
            const connectedEdge = updatedFlowTasks.edges.find((edge: any) => 
              edge.source === startNodeId
            );
            
            if (connectedEdge) {
              const targetNodeIndex = updatedFlowTasks.nodes.findIndex((node: any) => 
                node.id === connectedEdge.target && node.type === 'integrationNode'
              );
              
              if (targetNodeIndex !== -1) {
                console.log("IntegrationNode conectado encontrado, marcando como executado");
                updatedFlowTasks.nodes[targetNodeIndex].data.isExecuted = 'TRUE';
              }
            }
          }
        }
      }

      console.log("Criando registro de execução de fluxo");
      // Criar registro de execução de fluxo
      const flowExecution = await db.insert(documentFlowExecutions)
        .values({
          documentId,
          flowId,
          status: "initiated",
          startedBy: req.user.id,
          executionData: {
            flowName: flow[0].name,
            documentTitle: documento.objeto,
            initiatedAt: new Date().toISOString()
          },
          flowTasks: updatedFlowTasks
        })
        .returning();

      console.log("Atualizando status do documento para 'Em Processo' e associando ao usuário");
      // Atualizar status do documento para "Em Processo" e associar ao usuário logado
      const updatedDocument = await storage.updateDocumento(documentId, { 
        status: "Em Processo",
        userId: req.user.id
      });
      console.log("Documento atualizado com sucesso - Status: Em Processo, Usuário:", req.user?.name);

      // Log da ação
      console.log(`Documentação iniciada para documento ${documentId} com fluxo ${flowId} pelo usuário ${req.user?.name}`);
      
      res.json({ 
        success: true, 
        message: "Documentação iniciada com sucesso",
        documentId,
        flowId,
        executionId: flowExecution[0].id,
        documentStatus: updatedDocument.status
      });

    } catch (error: any) {
      console.error("ERRO DETALHADO ao iniciar documentação:");
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
      console.error("Nome:", error.name);
      console.error("=== FIM ERRO ===");
      res.status(500).json({ 
        error: "Erro interno do servidor ao iniciar documentação" 
      });
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
      console.log("Dados recebidos para criação de artefato:", {
        documentoId: req.params.documentoId,
        bodyKeys: Object.keys(req.body),
        name: req.body.name,
        fileDataLength: req.body.fileData?.length
      });
      
      const artifactData = {
        ...req.body,
        documentoId: req.params.documentoId
      };
      
      const artifact = await storage.createDocumentArtifact(artifactData);
      console.log("Artefato criado com sucesso:", artifact.id);
      res.status(201).json(artifact);
    } catch (error: any) {
      console.error("Erro detalhado ao criar artefato:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ error: `Erro ao criar artefato: ${error.message}` });
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

  // Rota de teste simples
  app.post("/api/test-route", async (req, res) => {
    console.log("🔥 ROTA DE TESTE ACESSADA");
    res.json({ success: true, message: "Rota de teste funcionando" });
  });

  // Função auxiliar para buscar URL do asset no Monday.com
  async function getMondayAssetUrl(assetId: string, apiKey: string): Promise<string | null> {
    try {
      console.log(`🔍 [DEPRECATED] Fazendo consulta GraphQL para asset ${assetId}...`);
      
      const query = `
        query {
          assets(ids: [${assetId}]) {
            id
            name
            url
            public_url
          }
        }
      `;

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      console.log(`📄 Resposta GraphQL para asset ${assetId}:`, JSON.stringify(result, null, 2));
      
      if (result.data?.assets?.[0]) {
        const asset = result.data.assets[0];
        
        // Usar apenas URL pública do S3
        if (asset.public_url) {
          console.log(`✅ URL pública encontrada para asset ${assetId}: ${asset.public_url}`);
          return asset.public_url;
        } else if (asset.url) {
          console.log(`⚠️ Apenas URL protegida disponível para asset ${assetId}: ${asset.url}`);
          return asset.url;
        }
      }
      
      console.error(`❌ Erro ao buscar asset ${assetId} no Monday:`, result.errors || "Asset não encontrado");
      return null;
    } catch (error) {
      console.error(`❌ Erro na requisição GraphQL para asset ${assetId}:`, error);
      return null;
    }
  }

  // Função auxiliar para baixar arquivo e converter para base64
  async function downloadFileAsBase64(url: string, apiKey: string): Promise<{ fileData: string; fileSize: number; mimeType: string } | null> {
    try {
      console.log(`📥 Tentando baixar arquivo de: ${url}`);
      
      // URLs do S3 (public_url) não precisam de Authorization
      const isS3Url = url.includes('s3.amazonaws.com') || url.includes('files-monday-com');
      const headers: Record<string, string> = {
        'User-Agent': 'curl/8.0.0'
      };
      
      if (!isS3Url) {
        headers['Authorization'] = apiKey;
      }
      
      console.log(`🔗 Tipo de URL: ${isS3Url ? 'S3 (sem auth)' : 'Protected (com auth)'}`);
      
      // Usar fetch simples sem configurações extras que podem causar problemas
      const response = await fetch(url);

      console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`❌ Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`📄 ERRO DETALHADO:`, errorText);
        return null;
      }

      // Converter diretamente para buffer sem arrayBuffer
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Data = buffer.toString('base64');
      
      console.log(`✅ Arquivo baixado com sucesso: ${buffer.length} bytes`);
      
      return {
        fileData: base64Data,
        fileSize: buffer.length,
        mimeType: response.headers.get('content-type') || 'application/octet-stream'
      };
    } catch (error) {
      console.error("❌ Erro ao baixar e converter arquivo:", error);
      return null;
    }
  }

  // Integrar anexos do Monday.com
  app.post("/api/documentos/:documentoId/integrate-attachments", async (req, res) => {
    console.log("🔥 ROTA INTEGRATE-ATTACHMENTS CHAMADA");
    
    try {
      if (!req.isAuthenticated()) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ error: "Não autorizado" });
      }
      
      const { documentoId } = req.params;
      console.log("📄 Processando documento:", documentoId);
      
      // Buscar a chave de API do Monday.com
      console.log("🔍 Buscando conexões do Monday.com...");
      const mondayConnection = await storage.getServiceConnection("monday");
      console.log("🔌 Conexão Monday encontrada:", mondayConnection ? "SIM" : "NÃO");
      
      if (!mondayConnection) {
        console.log("❌ Nenhuma conexão com Monday.com encontrada");
        return res.status(400).json({ error: "Conexão com Monday.com não configurada" });
      }
      
      const mondayApiKey = mondayConnection.token;
      console.log("🗝️ API Key encontrada:", mondayApiKey ? "SIM" : "NÃO");
      
      if (!mondayApiKey) {
        console.log("❌ Token de API não encontrado");
        return res.status(400).json({ error: "Token de API do Monday.com não encontrado" });
      }
      
      // Buscar o documento
      const documento = await storage.getDocumento(documentoId);
      if (!documento) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      
      if (!documento.mondayItemValues || documento.mondayItemValues.length === 0) {
        return res.status(400).json({ 
          message: "Nenhum anexo do Monday.com encontrado para integrar",
          attachmentsCount: 0
        });
      }
      
      let createdArtifacts = 0;
      let downloadedFiles = 0;
      const errors = [];
      
      // Processar cada entrada em monday_item_values
      for (const itemValue of documento.mondayItemValues) {
        try {
          const value = itemValue.value ? JSON.parse(itemValue.value) : {};
          const files = value.files || [];
          
          if (Array.isArray(files) && files.length > 0) {
            for (const file of files) {
              console.log(`📎 Processando arquivo: ${file.name} (Asset ID: ${file.assetId})`);
              
              // Dados básicos do artifact
              const artifactData = {
                documentoId: documentoId,
                name: file.name || 'Anexo sem nome',
                fileData: '',
                fileName: file.name || 'arquivo',
                fileSize: null,
                mimeType: file.fileType && file.fileType !== 'ASSET' ? file.fileType : null,
                type: file.fileType && file.fileType !== 'ASSET' ? file.fileType.split('/')[1] : null,
                originAssetId: file.assetId?.toString(),
                isImage: file.isImage?.toString() || 'false',
                mondayColumn: itemValue.columnid
              };
              
              // Tentar baixar o arquivo se tiver assetId
              if (file.assetId) {
                console.log(`🌐 Obtendo asset ${file.assetId} para download`);
                
                // Fazer GraphQL query para obter URL
                const assetUrl = await getMondayAssetUrl(file.assetId.toString(), mondayApiKey);
                
                if (assetUrl) {
                  console.log(`📥 Baixando de: ${assetUrl}`);
                  const downloadResult = await downloadFileAsBase64(assetUrl, mondayApiKey);
                  
                  if (downloadResult) {
                    artifactData.fileData = downloadResult.fileData;
                    artifactData.fileSize = downloadResult.fileSize.toString();
                    artifactData.mimeType = downloadResult.mimeType;
                    
                    if (downloadResult.mimeType.includes('/')) {
                      artifactData.type = downloadResult.mimeType.split('/')[1];
                    }
                    
                    downloadedFiles++;
                    console.log(`✅ Arquivo baixado: ${downloadResult.fileSize} bytes`);
                  } else {
                    errors.push(`Erro ao baixar arquivo: ${file.name}`);
                  }
                } else {
                  errors.push(`Erro ao obter URL: ${file.name}`);
                }
              }
              
              await storage.createDocumentArtifact(artifactData);
              createdArtifacts++;
            }
          }
        } catch (parseError) {
          console.error("Erro ao processar item:", parseError);
          errors.push(`Erro ao processar item: ${parseError.message}`);
        }
      }
      
      // Marcar documento como sincronizado se pelo menos um anexo foi criado
      if (createdArtifacts > 0) {
        try {
          await storage.updateDocumento(documentoId, { assetsSynced: true });
          console.log(`✅ Documento ${documentoId} marcado como assets_synced = true`);
        } catch (updateError) {
          console.error(`❌ Erro ao atualizar assets_synced para documento ${documentoId}:`, updateError);
        }
      }

      res.json({
        success: true,
        message: `Integração concluída. ${createdArtifacts} anexos integrados, ${downloadedFiles} arquivos baixados.`,
        attachmentsCreated: createdArtifacts,
        filesDownloaded: downloadedFiles,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error: any) {
      console.error("Erro na integração:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao integrar anexos",
        error: error.message
      });
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

  // PATCH: Sync all repo structures (set all is_sync to true)
  app.patch("/api/repo-structure/sync-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const allStructures = await storage.getAllRepoStructures();
      let updatedCount = 0;
      
      for (const structure of allStructures) {
        if (!structure.isSync) {
          await storage.updateRepoStructureSync(structure.uid, true);
          updatedCount++;
        }
      }
      
      res.json({
        success: true,
        message: `Sync Ref concluído. ${updatedCount} estrutura(s) marcada(s) como sincronizada(s).`,
        updatedCount,
        totalStructures: allStructures.length
      });
    } catch (error: any) {
      console.error("Erro ao sincronizar todas as estruturas:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao sincronizar estruturas",
        error: error.message
      });
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
        console.error('GitHub retornou resposta não-JSON:', responseText.substring(0, 200));
        console.error('Content-Type recebido:', contentType);
        return res.status(400).json({ 
          error: "GitHub retornou resposta inválida",
          details: "Verifique as credenciais do GitHub e se o repositório existe",
          contentType: contentType,
          responsePreview: responseText.substring(0, 100)
        });
      }

      let githubContent;
      try {
        githubContent = await githubResponse.json();
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta do GitHub:', parseError);
        
        return res.status(500).json({ 
          error: "Erro ao processar resposta do GitHub",
          details: "Verifique se o token GitHub está válido e se o repositório está acessível",
          parseError: parseError.message
        });
      }
      console.log('✅ GitHub API resposta válida recebida');
      const githubFolders = githubContent.filter((item: any) => item.type === 'dir');
      console.log(`📁 Pastas raiz encontradas no GitHub: ${githubFolders.map((f: any) => f.name).join(', ')}`);

      // Buscar todas as pastas recursivamente no GitHub
      const getAllGitHubFolders = async (path = '', level = 0): Promise<string[]> => {
        if (level > 3) {
          console.log(`⚠️ Limite de profundidade atingido para: ${path}`);
          return [];
        }
        
        const url = path ? `${githubUrl}/${path}` : githubUrl;
        console.log(`🔍 Buscando pastas no caminho: "${path || 'raiz'}" (nível ${level})`);
        
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'EVO-MindBits-Composer',
            },
          });
          
          if (!response.ok) {
            console.log(`❌ Falha na busca de ${path}: ${response.status}`);
            return [];
          }
          
          const content: any = await response.json();
          const folders = content.filter((item: any) => item.type === 'dir');
          console.log(`📂 Encontradas ${folders.length} pastas em "${path || 'raiz'}"`);
          
          let allFolders: string[] = [];
          
          // Adicionar pastas do nível atual
          for (const folder of folders) {
            const folderName = folder.name;
            allFolders.push(folderName);
            console.log(`📁 Pasta encontrada: ${folderName} (caminho completo: ${path ? path + '/' + folderName : folderName})`);
            
            // Buscar subpastas recursivamente
            console.log(`🔄 Iniciando busca recursiva em: ${folderName}`);
            const subFolders = await getAllGitHubFolders(path ? `${path}/${folderName}` : folderName, level + 1);
            allFolders = allFolders.concat(subFolders);
            console.log(`✅ Busca recursiva completa para ${folderName}, encontradas ${subFolders.length} subpastas`);
          }
          
          console.log(`📊 Total de pastas em "${path || 'raiz'}": ${allFolders.length}`);
          return allFolders;
        } catch (error) {
          console.error(`❌ Erro ao buscar pastas em ${path}:`, error);
          return [];
        }
      };
      
      console.log(`🚀 Iniciando busca recursiva de todas as pastas do GitHub...`);
      // Buscar todas as pastas do GitHub (incluindo subpastas)
      const githubFolderNames = await getAllGitHubFolders();
      console.log(`📁 TODAS as pastas encontradas no GitHub: ${githubFolderNames.join(', ')}`);

      // Buscar estruturas existentes no banco
      const existingStructures = await storage.getAllRepoStructures();
      const existingFolderNames = existingStructures.map((s: any) => s.folderName);
      
      console.log(`💾 Pastas existentes no banco: ${existingFolderNames.join(', ')}`);
      console.log(`🔄 Iniciando sincronização entre GitHub e banco local`);

      let importedCount = 0;
      let updatedCount = 0;

      // Importar pastas que existem no GitHub mas não no banco
      for (const folderName of githubFolderNames) {
        if (!existingFolderNames.includes(folderName)) {
          await storage.createRepoStructure({
            folderName: folderName,
            linkedTo: null, // Pastas raiz por padrão
            isSync: true, // Já existem no GitHub, então estão sincronizadas
          } as any);
          importedCount++;
          console.log(`Pasta importada do GitHub: ${folderName}`);
        }
      }

      // Atualizar status de pastas que existem no banco mas foram deletadas do GitHub
      for (const structure of existingStructures) {
        console.log(`🔍 Verificando pasta: ${structure.folderName} (isSync: ${structure.isSync})`);
        
        if (!githubFolderNames.includes(structure.folderName)) {
          // Pasta existe no banco mas não no GitHub (foi deletada)
          console.log(`❌ Pasta ${structure.folderName} não encontrada no GitHub - marcando como não sincronizada`);
          await storage.updateRepoStructureSync(structure.uid, false);
          updatedCount++;
          console.log(`✅ Status atualizado - pasta deletada do GitHub: ${structure.folderName}`);
        } else {
          // Pasta existe em ambos - garantir que está marcada como sincronizada
          console.log(`✅ Pasta ${structure.folderName} encontrada em ambos (GitHub + banco)`);
          if (!structure.isSync) {
            console.log(`🔄 Marcando ${structure.folderName} como sincronizada (estava FALSE)`);
            await storage.updateRepoStructureSync(structure.uid, true);
            updatedCount++;
            console.log(`✅ Status atualizado - pasta re-sincronizada: ${structure.folderName}`);
          } else {
            console.log(`ℹ️ Pasta ${structure.folderName} já estava marcada como sincronizada`);
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

  // Rota para servir arquivos dos artifacts
  app.get("/api/artifacts/:artifactId/file", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Não autorizado" });
      }

      const { artifactId } = req.params;
      
      // Buscar o artifact no banco
      const artifact = await storage.getDocumentArtifact(artifactId);
      
      if (!artifact) {
        return res.status(404).json({ error: "Arquivo não encontrado" });
      }

      if (!artifact.fileData) {
        return res.status(404).json({ error: "Dados do arquivo não encontrados" });
      }

      // Decodificar base64
      const fileBuffer = Buffer.from(artifact.fileData, 'base64');
      
      // Definir headers apropriados
      res.set({
        'Content-Type': artifact.mimeType || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${artifact.fileName || 'arquivo'}"`,
        'Cache-Control': 'public, max-age=3600'
      });

      res.send(fileBuffer);
    } catch (error) {
      console.error("Erro ao servir arquivo do artifact:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Rota pública para servir imagens dos artifacts e global assets (sem autenticação)
  app.get("/api/public/images/:artifactId", async (req: Request, res: Response) => {
    try {
      const { artifactId } = req.params;
      console.log(`Buscando imagem com ID: ${artifactId}`);
      
      // First try to get as global asset
      const globalAsset = await storage.getGlobalAsset(artifactId);
      console.log(`Global asset encontrado:`, globalAsset ? 'SIM' : 'NÃO');
      
      if (globalAsset && globalAsset.isImage === 'true') {
        console.log(`Servindo global asset: ${globalAsset.name}`);
        const fileBuffer = Buffer.from(globalAsset.fileData, 'base64');
        res.set({
          'Content-Type': globalAsset.mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
          'Access-Control-Allow-Origin': '*', // Permitir CORS para uso externo
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.send(fileBuffer);
      }
      
      // If not found as global asset, try as document artifact
      console.log(`Tentando buscar como artifact de documento...`);
      const artifact = await storage.getDocumentArtifact(artifactId);
      console.log(`Artifact encontrado:`, artifact ? 'SIM' : 'NÃO');
      
      if (!artifact) {
        console.log(`Imagem não encontrada para ID: ${artifactId}`);
        return res.status(404).json({ error: "Imagem não encontrada" });
      }

      if (!artifact.fileData) {
        return res.status(404).json({ error: "Dados da imagem não encontrados" });
      }

      // Verificar se é realmente uma imagem
      const mimeType = artifact.mimeType || '';
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ error: "Arquivo não é uma imagem" });
      }

      console.log(`Servindo artifact: ${artifact.name}`);
      // Decodificar base64
      const fileBuffer = Buffer.from(artifact.fileData, 'base64');
      
      // Definir headers apropriados para imagens públicas
      res.set({
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
        'Access-Control-Allow-Origin': '*', // Permitir CORS para uso externo
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });

      res.send(fileBuffer);
    } catch (error) {
      console.error("Erro ao servir imagem pública:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
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
      console.error('Erro ao buscar colunas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Flow Types Routes
  
  // Get all flow types
  // Endpoint para obter colunas da tabela documentos dinamicamente
  app.get("/api/schema/documentos/columns", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // Consulta para obter informações das colunas da tabela documentos
      const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      const columns = result.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      }));
      
      res.json(columns);
    } catch (error) {
      console.error("Erro ao obter colunas da tabela documentos:", error);
      res.status(500).json({ message: "Erro ao obter colunas da tabela" });
    }
  });

  app.get("/api/flow-types", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const types = await db.select()
        .from(flowTypes)
        .orderBy(flowTypes.name);
      
      res.json(types);
    } catch (error) {
      console.error("Erro ao buscar tipos de fluxo:", error);
      res.status(500).json({ error: "Erro ao buscar tipos de fluxo" });
    }
  });

  // Documents Flows Routes
  
  // Get all flows
  app.get("/api/documents-flows", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const usersCreated = alias(users, 'usersCreated');
      const usersUpdated = alias(users, 'usersUpdated');
      
      const flows = await db.select({
        id: documentsFlows.id,
        name: documentsFlows.name,
        description: documentsFlows.description,
        code: documentsFlows.code,
        flowTypeId: documentsFlows.flowTypeId,
        flowData: documentsFlows.flowData,
        applicationFilter: documentsFlows.applicationFilter,
        userId: documentsFlows.userId,
        createdBy: documentsFlows.createdBy,
        updatedBy: documentsFlows.updatedBy,
        isLocked: documentsFlows.isLocked,
        isEnabled: documentsFlows.isEnabled,
        createdAt: documentsFlows.createdAt,
        updatedAt: documentsFlows.updatedAt,
        createdByName: usersCreated.name,
        updatedByName: usersUpdated.name
      })
        .from(documentsFlows)
        .leftJoin(usersCreated, eq(documentsFlows.createdBy, usersCreated.id))
        .leftJoin(usersUpdated, eq(documentsFlows.updatedBy, usersUpdated.id))
        .orderBy(desc(documentsFlows.updatedAt));
      
      res.json(flows);
    } catch (error) {
      console.error("Erro ao buscar fluxos:", error);
      res.status(500).json({ error: "Erro ao buscar fluxos" });
    }
  });

  // Get a specific flow
  app.get("/api/documents-flows/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const flow = await db.select()
        .from(documentsFlows)
        .where(eq(documentsFlows.id, req.params.id))
        .limit(1);
      
      if (flow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      res.json(flow[0]);
    } catch (error) {
      console.error("Erro ao buscar fluxo:", error);
      res.status(500).json({ error: "Erro ao buscar fluxo" });
    }
  });

  // Create a new flow
  app.post("/api/documents-flows", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { name, code, description, flowTypeId, flowData } = req.body;
      
      // Generate UUIDs for nodes and edges if they don't have them
      // For new flows created from the modal, flowData might be undefined
      const processedFlowData = flowData ? {
        ...flowData,
        nodes: flowData.nodes?.map((node: any) => ({
          ...node,
          id: node.id || crypto.randomUUID()
        })) || [],
        edges: flowData.edges?.map((edge: any) => ({
          ...edge,
          id: edge.id || crypto.randomUUID()
        })) || []
      } : {
        nodes: [],
        edges: []
      };
      
      const newFlow = await db.insert(documentsFlows)
        .values({
          name,
          code,
          description: description || null,
          flowTypeId: flowTypeId || null,
          flowData: processedFlowData,
          userId: req.user.id,
          createdBy: req.user.id,
          updatedBy: req.user.id
        })
        .returning();
      
      res.status(201).json(newFlow[0]);
    } catch (error: any) {
      console.error("Erro ao criar fluxo:", error);
      
      // Check for duplicate code constraint violation
      if (error.code === '23505' && error.constraint === 'documents_flows_code_unique') {
        const codeMatch = error.detail?.match(/Key \(code\)=\(([^)]+)\)/);
        const duplicateCode = codeMatch ? codeMatch[1] : code;
        return res.status(400).json({ 
          error: `O código "${duplicateCode}" já está em uso. Por favor, escolha um código diferente.`,
          errorType: 'DUPLICATE_CODE'
        });
      }
      
      res.status(500).json({ error: "Erro ao criar fluxo" });
    }
  });

  // Update flow metadata only (name and description)
  app.put("/api/documents-flows/:id/metadata", async (req: Request, res: Response) => {
    console.log("PUT /api/documents-flows/:id/metadata - Recebida requisição para:", req.params.id);
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    
    if (!req.isAuthenticated()) {
      console.log("Usuário não autenticado");
      return res.status(401).send("Não autorizado");
    }
    
    try {
      const { name, description, applicationFilter } = req.body;
      
      const updatedFlow = await db.update(documentsFlows)
        .set({
          name,
          description: description || "",
          applicationFilter: applicationFilter || {},
          updatedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(documentsFlows.id, req.params.id))
        .returning();
      
      if (updatedFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      res.json(updatedFlow[0]);
    } catch (error) {
      console.error("Erro ao atualizar metadados do fluxo:", error);
      res.status(500).json({ error: "Erro ao atualizar metadados do fluxo" });
    }
  });

  // Update a flow (complete flowData)
  app.put("/api/documents-flows/:id", async (req: Request, res: Response) => {
    console.log("PUT /api/documents-flows/:id - Recebida requisição para:", req.params.id);
    console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
    
    if (!req.isAuthenticated()) {
      console.log("Usuário não autenticado");
      return res.status(401).send("Não autorizado");
    }
    
    try {
      const { name, code, description, flowData } = req.body;
      console.log("Processando flowData com", flowData?.nodes?.length || 0, "nodes");
      
      // Only process flowData if it exists
      let processedFlowData = null;
      if (flowData) {
        processedFlowData = {
          ...flowData,
          nodes: flowData.nodes?.map((node: any) => ({
            ...node,
            id: node.id || crypto.randomUUID()
          })) || [],
          edges: flowData.edges?.map((edge: any) => ({
            ...edge,
            id: edge.id || crypto.randomUUID()
          })) || []
        };
      }
      
      const updateData: any = {
        updatedBy: req.user.id,
        updatedAt: new Date()
      };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (processedFlowData) updateData.flowData = processedFlowData;
      
      // Só atualizar o código se ele foi fornecido E é diferente do atual
      if (code !== undefined) {
        // Verificar se o código já existe em outro fluxo
        const existingFlow = await db.select()
          .from(documentsFlows)
          .where(and(
            eq(documentsFlows.code, code),
            ne(documentsFlows.id, req.params.id)
          ));
          
        if (existingFlow.length > 0) {
          return res.status(400).json({ error: `Código '${code}' já está sendo usado por outro fluxo` });
        }
        
        updateData.code = code;
      }
      
      const updatedFlow = await db.update(documentsFlows)
        .set(updateData)
        .where(eq(documentsFlows.id, req.params.id))
        .returning();
      
      if (updatedFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      res.json(updatedFlow[0]);
    } catch (error) {
      console.error("Erro ao atualizar fluxo:", error);
      res.status(500).json({ error: "Erro ao atualizar fluxo" });
    }
  });

  // Toggle flow lock status
  app.patch("/api/documents-flows/:id/toggle-lock", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // First get the current status
      const currentFlow = await db.select({
        isLocked: documentsFlows.isLocked
      })
        .from(documentsFlows)
        .where(eq(documentsFlows.id, req.params.id))
        .limit(1);
      
      if (currentFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      // Toggle the lock status
      const updatedFlow = await db.update(documentsFlows)
        .set({
          isLocked: !currentFlow[0].isLocked,
          updatedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(documentsFlows.id, req.params.id))
        .returning();
      
      res.json(updatedFlow[0]);
    } catch (error) {
      console.error("Erro ao alterar status de bloqueio:", error);
      res.status(500).json({ error: "Erro ao alterar status de bloqueio" });
    }
  });

  // Toggle flow enabled status
  app.patch("/api/documents-flows/:id/toggle-enabled", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      // First get the current status
      const currentFlow = await db.select({
        isEnabled: documentsFlows.isEnabled
      })
        .from(documentsFlows)
        .where(eq(documentsFlows.id, req.params.id))
        .limit(1);
      
      if (currentFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      // Toggle the enabled status
      const updatedFlow = await db.update(documentsFlows)
        .set({
          isEnabled: !currentFlow[0].isEnabled,
          updatedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(documentsFlows.id, req.params.id))
        .returning();
      
      res.json(updatedFlow[0]);
    } catch (error) {
      console.error("Erro ao alterar status de habilitação:", error);
      res.status(500).json({ error: "Erro ao alterar status de habilitação" });
    }
  });

  // Delete a flow
  app.delete("/api/documents-flows/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const deletedFlow = await db.delete(documentsFlows)
        .where(eq(documentsFlows.id, req.params.id))
        .returning();
      
      if (deletedFlow.length === 0) {
        return res.status(404).json({ error: "Fluxo não encontrado" });
      }
      
      res.json({ message: "Fluxo deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar fluxo:", error);
      res.status(500).json({ error: "Erro ao deletar fluxo" });
    }
  });

  // Get GitHub repository contents
  app.get("/api/github/repo/contents", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const githubConnection = await storage.getServiceConnection("github");
      if (!githubConnection) {
        return res.status(400).json({ error: "Conexão GitHub não encontrada" });
      }

      const [owner, repo] = githubConnection.parameters[0].split('/');
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
        headers: {
          Authorization: `token ${githubConnection.token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "EVO-MindBits-Composer",
        },
      });

      if (response.ok) {
        const contents = await response.json();
        res.json(contents);
      } else {
        const errorText = await response.text();
        console.error("Erro na API do GitHub:", response.status, errorText);
        res.status(response.status).json({ error: "Erro ao acessar repositório GitHub" });
      }
    } catch (error) {
      console.error("Erro ao buscar conteúdo do GitHub:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get flow executions for documents (both active and concluded)
  app.get("/api/document-flow-executions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const executions = await db.select({
        documentId: documentFlowExecutions.documentId,
        flowId: documentFlowExecutions.flowId,
        status: documentFlowExecutions.status,
        createdAt: documentFlowExecutions.createdAt,
        updatedAt: documentFlowExecutions.updatedAt,
        completedAt: documentFlowExecutions.completedAt,
        flowName: documentsFlows.name,
        flowCode: documentsFlows.code,
        flowTasks: documentFlowExecutions.flowTasks
      })
        .from(documentFlowExecutions)
        .innerJoin(documentsFlows, eq(documentFlowExecutions.flowId, documentsFlows.id))
        .where(or(
          eq(documentFlowExecutions.status, "initiated"),
          eq(documentFlowExecutions.status, "completed"),
          eq(documentFlowExecutions.status, "concluded"),
          eq(documentFlowExecutions.status, "transfered")
        ));
      
      res.json(executions);
    } catch (error) {
      console.error("Erro ao buscar execuções de fluxo:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get flow executions count by document
  app.get("/api/document-flow-executions/count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const countResults = await db
        .select({
          documentId: documentFlowExecutions.documentId,
          count: sql<number>`count(*)::int`
        })
        .from(documentFlowExecutions)
        .groupBy(documentFlowExecutions.documentId);
      
      // Converter array para objeto com documentId como chave
      const countsMap = countResults.reduce((acc, row) => {
        acc[row.documentId] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      res.json(countsMap);
    } catch (error) {
      console.error("Erro ao buscar contagem de execuções:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Update flow execution tasks
  app.put("/api/document-flow-executions/:documentId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { documentId } = req.params;
      const { flowTasks, status, completedAt } = req.body;
      
      console.log('🔄 Atualizando execução de fluxo para documento:', documentId);
      console.log('🔄 Dados recebidos:', { flowTasks, status, completedAt });
      console.log('🔗 FlowTasks estrutura:', {
        hasNodes: flowTasks?.nodes ? flowTasks.nodes.length : 'undefined',
        hasEdges: flowTasks?.edges ? flowTasks.edges.length : 'undefined',
        hasViewport: flowTasks?.viewport ? 'sim' : 'não',
        keys: flowTasks ? Object.keys(flowTasks) : 'flowTasks é undefined'
      });
      
      // Validate documentId is a valid UUID
      if (!documentId || documentId === 'undefined' || documentId === 'null') {
        console.error('❌ DocumentId inválido:', documentId);
        return res.status(400).json({ error: "DocumentId é obrigatório e deve ser um UUID válido" });
      }
      
      // Additional UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(documentId)) {
        console.error('❌ DocumentId não é um UUID válido:', documentId);
        return res.status(400).json({ error: "DocumentId deve ser um UUID válido" });
      }
      
      // Verificar se existe uma execução ativa para este documento
      const execution = await db.select()
        .from(documentFlowExecutions)
        .innerJoin(documentsFlows, eq(documentFlowExecutions.flowId, documentsFlows.id))
        .where(eq(documentFlowExecutions.documentId, documentId))
        .limit(1);
      
      if (execution.length === 0) {
        return res.status(404).json({ error: "Execução de fluxo não encontrada" });
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        flowTasks,
        updatedAt: new Date()
      };
      
      // Se status for fornecido, incluir na atualização
      if (status) {
        updateData.status = status;
        console.log(`🎯 Atualizando status para: ${status}`);
      }
      
      // Se completedAt for fornecido, incluir na atualização
      if (completedAt) {
        updateData.completedAt = new Date(completedAt);
        console.log(`📅 Marcando como completo em: ${completedAt}`);
      }
      
      // Atualizar as tarefas do fluxo
      const updated = await db.update(documentFlowExecutions)
        .set(updateData)
        .where(eq(documentFlowExecutions.documentId, documentId))
        .returning();
      
      console.log('✅ Execução atualizada com sucesso');
      res.json(updated[0]);
    } catch (error) {
      console.error("Erro ao atualizar execução de fluxo:", error);
      res.status(500).json({ error: "Erro ao atualizar execução" });
    }
  });

  // Transfer flow execution route
  app.post("/api/document-flow-executions/transfer", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { currentDocumentId, targetFlowId, flowTasks } = req.body;
      
      console.log('🔄 Processando transferência de fluxo');
      console.log('🔄 Documento atual:', currentDocumentId);
      console.log('🔄 Fluxo destino:', targetFlowId);
      
      // 1. Marcar execução atual como transferida
      const currentExecution = await db.update(documentFlowExecutions)
        .set({
          status: 'transfered',
          completedAt: new Date(),
          flowTasks,
          updatedAt: new Date()
        })
        .where(eq(documentFlowExecutions.documentId, currentDocumentId))
        .returning();
      
      if (currentExecution.length === 0) {
        return res.status(404).json({ error: "Execução atual não encontrada" });
      }
      
      console.log('✅ Execução atual marcada como transferida');
      
      // 2. Buscar dados do fluxo destino
      const targetFlow = await db.select()
        .from(documentsFlows)
        .where(eq(documentsFlows.id, targetFlowId))
        .limit(1);
      
      if (targetFlow.length === 0) {
        console.log('❌ Fluxo destino não encontrado:', targetFlowId);
        return res.status(404).json({ error: "Fluxo destino não encontrado" });
      }
      
      console.log('✅ Fluxo destino encontrado:', targetFlow[0].name);
      
      // 3. Criar nova execução com o fluxo destino
      const newExecution = await db.insert(documentFlowExecutions)
        .values({
          documentId: currentDocumentId,
          flowId: targetFlowId,
          status: 'initiated',
          flowTasks: targetFlow[0].flowData,
          startedBy: req.user.id,
          executionData: {
            flowName: targetFlow[0].name,
            transferredFrom: currentExecution[0].flowId,
            transferredAt: new Date().toISOString()
          },
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log('✅ Nova execução criada:', newExecution[0].id);
      
      // Log da transferência
      await SystemLogger.log({
        eventType: EventTypes.FLOW_TRANSFER,
        message: `Fluxo transferido do ID ${currentExecution[0].flowId} para ${targetFlowId}`,
        parameters: {
          documentId: currentDocumentId,
          fromFlowId: currentExecution[0].flowId,
          toFlowId: targetFlowId,
          newExecutionId: newExecution[0].id
        },
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        newExecutionId: newExecution[0].id,
        targetFlowName: targetFlow[0].name,
        message: 'Transferência de fluxo concluída com sucesso'
      });
      
    } catch (error) {
      console.error('❌ Erro na transferência de fluxo:', error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Document Editions API routes
  app.get("/api/document-editions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const editions = await storage.getAllDocumentEditions();
      res.json(editions);
    } catch (error) {
      console.error("Erro ao buscar edições de documentos:", error);
      res.status(500).send("Erro ao buscar edições de documentos");
    }
  });

  app.get("/api/document-editions-with-objects", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const editions = await db
        .select({
          id: documentEditions.id,
          documentId: documentEditions.documentId,
          status: documentEditions.status,
          init: documentEditions.init,
          documentObject: documentos.objeto,
          templateCode: templates.code
        })
        .from(documentEditions)
        .leftJoin(documentos, eq(documentEditions.documentId, documentos.id))
        .leftJoin(templates, eq(documentEditions.templateId, templates.id))
        .orderBy(desc(documentEditions.createdAt));
      
      res.json(editions);
    } catch (error) {
      console.error("Erro ao buscar edições de documentos com objetos:", error);
      res.status(500).send("Erro ao buscar edições de documentos com objetos");
    }
  });

  app.get("/api/document-editions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const edition = await storage.getDocumentEdition(req.params.id);
      if (!edition) {
        return res.status(404).send("Edição de documento não encontrada");
      }
      res.json(edition);
    } catch (error) {
      console.error("Erro ao buscar edição de documento:", error);
      res.status(500).send("Erro ao buscar edição de documento");
    }
  });

  app.get("/api/documents/:documentId/editions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const editions = await storage.getDocumentEditionsByDocumentId(req.params.documentId);
      res.json(editions);
    } catch (error) {
      console.error("Erro ao buscar edições do documento:", error);
      res.status(500).send("Erro ao buscar edições do documento");
    }
  });

  app.post("/api/document-editions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      console.log("📋 Dados recebidos para criar document_edition:", JSON.stringify(req.body, null, 2));
      
      // Validar dados obrigatórios
      if (!req.body.documentId) {
        return res.status(400).json({ error: "documentId é obrigatório" });
      }
      if (!req.body.templateId) {
        return res.status(400).json({ error: "templateId é obrigatório" });
      }
      
      // Verificar se já existe registro com status 'ready_to_revise' para este documento
      const existingReadyToRevise = await db
        .select()
        .from(documentEditions)
        .where(and(
          eq(documentEditions.documentId, req.body.documentId),
          eq(documentEditions.status, 'ready_to_revise')
        ));
      
      let edition;
      
      if (existingReadyToRevise.length > 0) {
        // Se existe registro ready_to_revise, atualizar ao invés de criar novo
        const existingRecord = existingReadyToRevise[0];
        
        console.log("📝 Registro ready_to_revise encontrado, atualizando:", existingRecord.id);
        
        const [updatedEdition] = await db
          .update(documentEditions)
          .set({
            status: 'in_progress',
            mdFileOld: existingRecord.mdFile, // Backup do md_file atual para md_file_old
            startedBy: req.user!.id, // Associar usuário atual
            init: new Date(), // Timestamp atual
            updatedAt: new Date()
          })
          .where(eq(documentEditions.id, existingRecord.id))
          .returning();
        
        edition = updatedEdition;
        console.log("✅ Registro ready_to_revise atualizado para in_progress:", edition.id);
        
      } else {
        // Se não existe ready_to_revise, criar novo registro (comportamento original)
        console.log("📝 Nenhum registro ready_to_revise encontrado, criando novo registro");
        
        const insertData = {
          documentId: req.body.documentId,
          templateId: req.body.templateId,
          startedBy: req.user!.id, // ID do usuário logado
          status: req.body.status || "in_progress",
          init: new Date(),
          lexFile: req.body.lexFile || null,
          jsonFile: req.body.jsonFile || {},
          mdFile: req.body.mdFile || null,
          publish: req.body.publish || null
        };
        
        console.log("📋 Dados preparados para inserção:", JSON.stringify(insertData, null, 2));
        
        edition = await storage.createDocumentEdition(insertData);
        console.log("✅ Document edition criada com sucesso:", edition.id);
      }
      
      // Atualizar o task_state do documento para "in_doc" quando uma edição é iniciada
      await storage.updateDocumento(req.body.documentId, { taskState: "in_doc" });
      console.log("✅ Task state do documento atualizado para 'in_doc'");
      
      res.status(201).json(edition);
    } catch (error) {
      console.error("❌ Erro detalhado ao criar edição de documento:", error);
      console.error("❌ Stack trace:", error.stack);
      res.status(500).json({ 
        error: "Erro ao criar edição de documento",
        details: error.message 
      });
    }
  });

  app.put("/api/document-editions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const edition = await storage.updateDocumentEdition(req.params.id, req.body);
      res.json(edition);
    } catch (error) {
      console.error("Erro ao atualizar edição de documento:", error);
      res.status(500).send("Erro ao atualizar edição de documento");
    }
  });

  app.patch("/api/document-editions/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { status } = req.body;
      const edition = await storage.updateDocumentEditionStatus(req.params.id, status);
      res.json(edition);
    } catch (error) {
      console.error("Erro ao atualizar status da edição:", error);
      res.status(500).send("Erro ao atualizar status da edição");
    }
  });

  app.patch("/api/document-editions/:id/publish", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const edition = await storage.publishDocumentEdition(req.params.id);
      res.json(edition);
    } catch (error) {
      console.error("Erro ao publicar edição:", error);
      res.status(500).send("Erro ao publicar edição");
    }
  });

  // Global Assets routes
  app.get("/api/global-assets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const assets = await storage.getAllGlobalAssets();
      res.json(assets);
    } catch (error) {
      console.error("Erro ao buscar assets globais:", error);
      res.status(500).send("Erro ao buscar assets globais");
    }
  });

  app.get("/api/global-assets/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const asset = await storage.getGlobalAsset(req.params.id);
      if (!asset) {
        return res.status(404).send("Asset global não encontrado");
      }
      res.json(asset);
    } catch (error) {
      console.error("Erro ao buscar asset global:", error);
      res.status(500).send("Erro ao buscar asset global");
    }
  });

  app.post("/api/global-assets", upload.single('file'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const file = req.file;
      const { name, description = "", tags = "", fileMetadata = null, editor = null } = req.body;
      
      if (!file) {
        return res.status(400).send("Arquivo é obrigatório");
      }

      // Convert file to base64
      const fileData = file.buffer.toString('base64');
      
      // Determine if it's an image
      const isImage = file.mimetype.startsWith('image/') ? "true" : "false";
      
      // Get file type from mimetype
      const type = file.mimetype.split('/')[1] || 'unknown';

      const assetData = {
        name: name || file.originalname,
        fileData,
        fileName: file.originalname,
        fileSize: file.size.toString(),
        mimeType: file.mimetype,
        type,
        isImage,
        uploadedBy: req.user.id,
        description,
        tags,
        fileMetadata,
        editor
      };

      const asset = await storage.createGlobalAsset(assetData);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Erro ao criar asset global:", error);
      res.status(500).send("Erro ao criar asset global");
    }
  });

  app.put("/api/global-assets/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const asset = await storage.updateGlobalAsset(req.params.id, req.body);
      res.json(asset);
    } catch (error) {
      console.error("Erro ao atualizar asset global:", error);
      res.status(500).send("Erro ao atualizar asset global");
    }
  });

  app.delete("/api/global-assets/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteGlobalAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar asset global:", error);
      res.status(500).send("Erro ao deletar asset global");
    }
  });

  app.get("/api/global-assets/:id/file", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const asset = await storage.getGlobalAsset(req.params.id);
      if (!asset) {
        return res.status(404).send("Asset global não encontrado");
      }

      // Convert base64 back to buffer
      const fileBuffer = Buffer.from(asset.fileData, 'base64');
      
      // Set appropriate headers
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${asset.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error("Erro ao baixar arquivo do asset global:", error);
      res.status(500).send("Erro ao baixar arquivo");
    }
  });



  app.delete("/api/document-editions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      await storage.deleteDocumentEdition(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir edição de documento:", error);
      res.status(500).send("Erro ao excluir edição de documento");
    }
  });

  // Lexical Documents routes
  app.get("/api/lexical-documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documents = await db.select()
        .from(lexicalDocuments)
        .where(eq(lexicalDocuments.userId, req.user.id))
        .orderBy(desc(lexicalDocuments.updatedAt));
      
      res.json(documents);
    } catch (error) {
      console.error("Erro ao buscar documentos Lexical:", error);
      res.status(500).send("Erro ao buscar documentos Lexical");
    }
  });

  app.get("/api/lexical-documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const [document] = await db.select()
        .from(lexicalDocuments)
        .where(and(
          eq(lexicalDocuments.id, req.params.id),
          eq(lexicalDocuments.userId, req.user.id)
        ));
      
      if (!document) {
        return res.status(404).send("Documento não encontrado");
      }
      
      res.json(document);
    } catch (error) {
      console.error("Erro ao buscar documento Lexical:", error);
      res.status(500).send("Erro ao buscar documento Lexical");
    }
  });

  app.post("/api/lexical-documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documentData = insertLexicalDocumentSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const [newDocument] = await db.insert(lexicalDocuments)
        .values(documentData)
        .returning();
      
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Erro ao criar documento Lexical:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).send("Erro ao criar documento Lexical");
    }
  });

  app.put("/api/lexical-documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const documentData = insertLexicalDocumentSchema.parse(req.body);
      
      const [updatedDocument] = await db.update(lexicalDocuments)
        .set({
          ...documentData,
          updatedAt: new Date()
        })
        .where(and(
          eq(lexicalDocuments.id, req.params.id),
          eq(lexicalDocuments.userId, req.user.id)
        ))
        .returning();
      
      if (!updatedDocument) {
        return res.status(404).send("Documento não encontrado");
      }
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Erro ao atualizar documento Lexical:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).send("Erro ao atualizar documento Lexical");
    }
  });

  app.delete("/api/lexical-documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const [deletedDocument] = await db.delete(lexicalDocuments)
        .where(and(
          eq(lexicalDocuments.id, req.params.id),
          eq(lexicalDocuments.userId, req.user.id)
        ))
        .returning();
      
      if (!deletedDocument) {
        return res.status(404).send("Documento não encontrado");
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir documento Lexical:", error);
      res.status(500).send("Erro ao excluir documento Lexical");
    }
  });

  // Document Editions in Progress route
  app.get("/api/document-editions-in-progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const editionsInProgress = await db.select({
        id: documentEditions.id,
        documentId: documentEditions.documentId,
        templateId: documentEditions.templateId,
        status: documentEditions.status,
        createdAt: documentEditions.createdAt,
        updatedAt: documentEditions.updatedAt,
        lexFile: documentEditions.lexFile,
        origem: documentos.origem,
        objeto: documentos.objeto,
        templateCode: templates.code,
        templateStructure: templates.structure
      })
      .from(documentEditions)
      .innerJoin(documentos, eq(documentEditions.documentId, documentos.id))
      .innerJoin(templates, eq(documentEditions.templateId, templates.id))
      .where(eq(documentEditions.status, 'in_progress'))
      .orderBy(desc(documentEditions.updatedAt));
      
      res.json(editionsInProgress);
    } catch (error) {
      console.error("Erro ao buscar document_editions em progresso:", error);
      res.status(500).send("Erro ao buscar document_editions em progresso");
    }
  });

  // Update document edition lex_file
  app.put("/api/document-editions/:id/lex-file", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { lexFile } = req.body;
      const editionId = req.params.id;
      
      const [updatedEdition] = await db.update(documentEditions)
        .set({ 
          lexFile: lexFile,
          updatedAt: new Date()
        })
        .where(eq(documentEditions.id, editionId))
        .returning();
      
      if (!updatedEdition) {
        return res.status(404).send("Document edition não encontrada");
      }
      
      res.json(updatedEdition);
    } catch (error) {
      console.error("Erro ao atualizar lex_file:", error);
      res.status(500).send("Erro ao atualizar lex_file");
    }
  });

  // Update document edition content (lex_file, json_file, md_file)
  app.put("/api/document-editions/:id/content", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { lexFile, jsonFile, mdFile } = req.body;
      const editionId = req.params.id;
      
      console.log('📄 Salvando conteúdo do documento:', { 
        editionId, 
        hasLexFile: !!lexFile, 
        hasJsonFile: !!jsonFile, 
        hasMdFile: !!mdFile 
      });
      
      const [updatedEdition] = await db.update(documentEditions)
        .set({ 
          lexFile: lexFile || null,
          jsonFile: jsonFile || {},
          mdFile: mdFile || null,
          updatedAt: new Date()
        })
        .where(eq(documentEditions.id, editionId))
        .returning();
      
      if (!updatedEdition) {
        return res.status(404).send("Document edition não encontrada");
      }
      
      console.log('✅ Conteúdo salvo com sucesso para edition:', editionId);
      res.json(updatedEdition);
    } catch (error) {
      console.error("Erro ao salvar conteúdo do documento:", error);
      res.status(500).send("Erro ao salvar conteúdo do documento");
    }
  });

  // Rota para buscar artifacts de um documento específico baseado no document_editions
  app.get("/api/document-editions/:editionId/artifacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const edition = await storage.getDocumentEdition(req.params.editionId);
      if (!edition) {
        return res.status(404).send("Edição de documento não encontrada");
      }
      
      const artifacts = await storage.getDocumentArtifactsByDocumento(edition.documentId);
      
      // Buscar títulos das colunas Monday para cada artifact
      const artifactsWithColumnTitles = await Promise.all(
        artifacts.map(async (artifact) => {
          let mondayColumnTitle = artifact.mondayColumn || '';
          
          // Se o artifact tem uma coluna Monday, buscar o título
          if (artifact.mondayColumn) {
            try {
              // Usar storage para buscar todas as colunas Monday e encontrar a correspondente
              const allMappings = await storage.getAllMondayMappings();
              
              for (const mapping of allMappings) {
                const mondayColumns = await storage.getMondayColumns(mapping.id);
                const foundColumn = mondayColumns.find(col => col.columnId === artifact.mondayColumn);
                
                if (foundColumn) {
                  mondayColumnTitle = foundColumn.title;
                  break;
                }
              }
            } catch (columnError) {
              console.warn(`Erro ao buscar título da coluna ${artifact.mondayColumn}:`, columnError);
            }
          }
          
          return {
            ...artifact,
            mondayColumnTitle
          };
        })
      );
      
      res.json(artifactsWithColumnTitles);
    } catch (error: any) {
      console.error("Erro ao buscar artefatos da edição:", error);
      res.status(500).send("Erro ao buscar artefatos");
    }
  });

  // Rota para criar artifacts via document edition
  app.post("/api/document-editions/:editionId/artifacts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const edition = await storage.getDocumentEdition(req.params.editionId);
      if (!edition) {
        return res.status(404).send("Edição de documento não encontrada");
      }
      
      const artifactData = {
        ...req.body,
        documentoId: edition.documentId
      };
      
      const artifact = await storage.createDocumentArtifact(artifactData);
      res.status(201).json(artifact);
    } catch (error: any) {
      console.error("Erro ao criar artefato via edição:", error);
      res.status(500).send("Erro ao criar artefato");
    }
  });

  // Generic tables routes
  app.get("/api/generic-tables/:name", async (req, res) => {
    console.log("🔍 [API] Requisição para generic-tables:", req.params.name);
    console.log("🔍 [API] Usuário autenticado:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) return res.status(401).send("Não autorizado");
    
    try {
      const { name } = req.params;
      console.log("🔍 [API] Buscando tabela:", name);
      
      // Use direct database helper to avoid circular dependency
      const { getGenericTableByNameDirect } = await import("./db-helpers");
      const genericTable = await getGenericTableByNameDirect(name);
      console.log("🔍 [API] Resultado encontrado:", !!genericTable);
      
      if (!genericTable) {
        console.log("❌ [API] Tabela não encontrada:", name);
        return res.status(404).json({ error: "Tabela genérica não encontrada" });
      }
      
      console.log("✅ [API] Retornando dados:", genericTable);
      res.json(genericTable);
    } catch (error: any) {
      console.error("❌ [API] Erro ao buscar tabela genérica:", error);
      res.status(500).send("Erro ao buscar tabela genérica");
    }
  });

  // The httpServer is needed for potential WebSocket connections later
  const httpServer = createServer(app);

  return httpServer;
}
