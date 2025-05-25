import { storage } from './storage';
import { SystemLogger } from './logger';

interface MondaySyncResult {
  itemsProcessed: number;
  documentsCreated: number;
  documentsPreExisting: number;
  documentsSkipped: number;
}

export async function executeMonadayMappingSync(mappingId: string): Promise<MondaySyncResult> {
  console.log(`🚀 INICIANDO SINCRONIZAÇÃO para mapeamento ${mappingId}`);

  // Buscar o mapeamento
  const mapping = await storage.getMondayMapping(mappingId);
  if (!mapping) {
    throw new Error('Mapeamento não encontrado');
  }

  // Buscar conexão do Monday (compatibilidade com estrutura antiga)
  let mondayToken: string | null = null;
  
  try {
    // Tentar buscar da nova estrutura
    const mondayConnection = await storage.getServiceConnection('monday');
    if (mondayConnection?.token) {
      mondayToken = mondayConnection.token;
    }
  } catch (error) {
    console.log('Estrutura nova não encontrada, tentando estrutura antiga...');
  }
  
  // Se não encontrou na nova estrutura, tentar na antiga
  if (!mondayToken) {
    mondayToken = await storage.getMondayApiKey();
  }
  
  if (!mondayToken) {
    throw new Error('Token Monday.com não configurado');
  }

  console.log(`📋 MAPEAMENTO: ${mapping.name}`);
  console.log(`🎯 QUADRO ID: ${mapping.boardId}`);

  // Função para buscar dados do Monday.com
  async function fetchMondayData(query: string, variables?: any) {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': mondayToken
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Monday: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`Erro GraphQL: ${JSON.stringify(data.errors)}`);
    }

    return data;
  }

  // Consulta GraphQL para buscar itens do quadro
  const query = `
    query GetBoardItems($boardId: ID!, $limit: Int!, $page: Int!) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit, page: $page) {
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

  let allItems: any[] = [];
  let page = 1;
  const limit = 500;
  let hasMoreItems = true;

  // Buscar todos os itens paginados
  console.log(`📥 BUSCANDO ITENS do quadro ${mapping.boardId}...`);
  
  while (hasMoreItems) {
    const data = await fetchMondayData(query, {
      boardId: mapping.boardId,
      limit,
      page
    });

    const board = data.data?.boards?.[0];
    if (!board) {
      throw new Error('Quadro não encontrado');
    }

    const items = board.items_page?.items || [];
    allItems.push(...items);

    console.log(`📄 PÁGINA ${page}: ${items.length} itens encontrados`);
    
    // Verificar se há mais páginas
    hasMoreItems = items.length === limit;
    page++;
  }

  console.log(`📊 TOTAL DE ITENS: ${allItems.length}`);

  // Buscar colunas mapeadas
  const columnMappings = await storage.getMappingColumns(mappingId);
  console.log(`🗂️ COLUNAS MAPEADAS: ${columnMappings.length}`);

  // Contadores para estatísticas
  let itemsProcessed = 0;
  let documentsCreated = 0;
  let documentsPreExisting = 0;
  let documentsSkipped = 0;

  // Processar cada item
  for (const item of allItems) {
    itemsProcessed++;

    console.log(`🔍 VERIFICANDO FILTRO para item ${item.id}:`);
    console.log(`- mappingFilter existe? ${!!mapping.mappingFilter}`);
    console.log(`- mappingFilter não está vazio? ${mapping.mappingFilter}`);

    // Aplicar filtro se existir
    if (mapping.mappingFilter && mapping.mappingFilter.trim()) {
      console.log(`✅ APLICANDO FILTRO para item ${item.id}`);
      console.log(`📋 FILTRO JAVASCRIPT: ${mapping.mappingFilter}`);
      
      try {
        // Criar função do filtro
        const filterFunction = new Function('item', mapping.mappingFilter);
        const passesFilter = filterFunction(item);
        
        console.log(`🎯 RESULTADO DO FILTRO para item ${item.id}: ${passesFilter}`);
        
        if (!passesFilter) {
          console.log(`❌ Item ${item.id} foi FILTRADO (excluído) - não atende às condições`);
          documentsSkipped++;
          
          // Log de progresso a cada 100 itens
          if (itemsProcessed % 100 === 0) {
            console.log(`📊 PROGRESSO: ${itemsProcessed}/${allItems.length} itens processados | Criados: ${documentsCreated} | Filtrados: ${documentsSkipped}`);
          }
          
          continue;
        }
        
        console.log(`✅ Item ${item.id} PASSOU no filtro - será processado`);
      } catch (error) {
        console.error(`❌ ERRO NO FILTRO para item ${item.id}:`, error);
        documentsSkipped++;
        continue;
      }
    } else {
      console.log(`⏭️ NENHUM FILTRO aplicado para item ${item.id} - processando automaticamente`);
    }

    // Verificar se já existe documento com este id_origem
    const existingDoc = await storage.getDocumentoByIdOrigem(BigInt(item.id));
    if (existingDoc) {
      console.log(`⚠️ DOCUMENTO JÁ EXISTE para item ${item.id} - pulando`);
      documentsPreExisting++;
      continue;
    }

    // Mapear dados das colunas
    const documentData: any = {
      id_origem: BigInt(item.id),
      objeto: item.name || 'Sem título',
      origem: 'Monday.com',
      generalColumns: {}
    };

    // Aplicar valores padrão
    if (mapping.defaultValues) {
      try {
        const defaults = typeof mapping.defaultValues === 'string' 
          ? JSON.parse(mapping.defaultValues) 
          : mapping.defaultValues;
        
        for (const [field, value] of Object.entries(defaults)) {
          if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            documentData[field] = value.slice(1, -1);
          } else {
            documentData[field] = value;
          }
        }
      } catch (error) {
        console.error('Erro ao processar valores padrão:', error);
      }
    }

    // Mapear colunas
    for (const mapping of columnMappings) {
      const column = item.column_values.find((col: any) => col.id === mapping.mondayColumnId);
      if (column) {
        let value = column.text || column.value || '';
        
        // Aplicar transformação se existir
        if (mapping.transformFunction && mapping.transformFunction.trim()) {
          try {
            const transformFunc = new Function('value', 'item', mapping.transformFunction);
            value = transformFunc(value, item);
          } catch (error) {
            console.error(`Erro ao executar transformação: ${error}`);
          }
        }

        // Mapear para campo correspondente
        if (mapping.cpxField.startsWith('general_columns')) {
          const match = mapping.cpxField.match(/general_columns\[(\d+)\]/);
          const index = match ? match[1] : '1';
          documentData.generalColumns[`${mapping.mondayColumnTitle}[${index}]`] = value;
        } else {
          documentData[mapping.cpxField] = value;
        }
      }
    }

    // Criar documento
    try {
      await storage.createDocumento(documentData);
      documentsCreated++;
      console.log(`✅ DOCUMENTO CRIADO para item ${item.id}: ${item.name}`);
    } catch (error) {
      console.error(`❌ ERRO ao criar documento para item ${item.id}:`, error);
      documentsSkipped++;
    }

    // Log de progresso a cada 100 itens
    if (itemsProcessed % 100 === 0) {
      console.log(`📊 PROGRESSO: ${itemsProcessed}/${allItems.length} itens processados | Criados: ${documentsCreated} | Pré-existentes: ${documentsPreExisting} | Pulados: ${documentsSkipped}`);
    }
  }

  const result = {
    itemsProcessed,
    documentsCreated,
    documentsPreExisting,
    documentsSkipped
  };

  console.log(`🎉 SINCRONIZAÇÃO CONCLUÍDA:`);
  console.log(`📊 Itens processados: ${result.itemsProcessed}`);
  console.log(`✅ Documentos criados: ${result.documentsCreated}`);
  console.log(`⚠️ Documentos pré-existentes: ${result.documentsPreExisting}`);
  console.log(`⏭️ Documentos pulados: ${result.documentsSkipped}`);

  return result;
}