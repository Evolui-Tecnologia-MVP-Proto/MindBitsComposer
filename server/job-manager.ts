import * as cron from 'node-cron';
import { storage } from './storage';
import { SystemLogger } from './logger';

interface ActiveJob {
  id: string;
  mappingId: string;
  task: cron.ScheduledTask;
  frequency: string;
  time: string;
  createdAt: Date;
}

class JobManager {
  private activeJobs: Map<string, ActiveJob> = new Map();

  // Converte frequência em expressão cron
  private frequencyToCron(frequency: string, time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    
    switch (frequency) {
      case '15min':
        // A cada 15 minutos a partir do minuto especificado
        const minutes15 = [];
        for (let i = minute; i < 60; i += 15) {
          minutes15.push(i);
        }
        return `${minutes15.join(',')} * * * *`;
      case '30min':
        // A cada 30 minutos a partir do minuto especificado
        const minutes30 = [];
        for (let i = minute; i < 60; i += 30) {
          minutes30.push(i);
        }
        return `${minutes30.join(',')} * * * *`;
      case '1hour':
        // A cada hora no minuto especificado
        return `${minute} * * * *`;
      case '6hours':
        // A cada 6 horas no horário especificado
        const hours6 = [];
        for (let i = hour; i < 24; i += 6) {
          hours6.push(i);
        }
        return `${minute} ${hours6.join(',')} * * *`;
      case 'daily':
        return `${minute} ${hour} * * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  // Calcula a próxima execução baseada na frequência e horário
  private calculateNextExecution(frequency: string, time: string, currentTime: Date): Date {
    const [hour, minute] = time.split(':').map(Number);
    const nextExecution = new Date(currentTime);
    
    switch (frequency) {
      case '15min':
        // Próximo múltiplo de 15 minutos a partir do minuto base
        const currentMinute = nextExecution.getMinutes();
        const nextMinute15 = Math.ceil((currentMinute - minute) / 15) * 15 + minute;
        if (nextMinute15 >= 60) {
          nextExecution.setHours(nextExecution.getHours() + 1);
          nextExecution.setMinutes(nextMinute15 - 60);
        } else {
          nextExecution.setMinutes(nextMinute15);
        }
        nextExecution.setSeconds(0);
        break;
        
      case '30min':
        // Próximo múltiplo de 30 minutos a partir do minuto base
        const currentMinute30 = nextExecution.getMinutes();
        const nextMinute30 = Math.ceil((currentMinute30 - minute) / 30) * 30 + minute;
        if (nextMinute30 >= 60) {
          nextExecution.setHours(nextExecution.getHours() + 1);
          nextExecution.setMinutes(nextMinute30 - 60);
        } else {
          nextExecution.setMinutes(nextMinute30);
        }
        nextExecution.setSeconds(0);
        break;
        
      case '1hour':
        // Próxima hora no minuto especificado
        nextExecution.setHours(nextExecution.getHours() + 1);
        nextExecution.setMinutes(minute);
        nextExecution.setSeconds(0);
        break;
        
      case '6hours':
        // Próximo múltiplo de 6 horas no horário especificado
        const currentHour6 = nextExecution.getHours();
        const nextHour6 = Math.ceil((currentHour6 - hour) / 6) * 6 + hour;
        if (nextHour6 >= 24) {
          nextExecution.setDate(nextExecution.getDate() + 1);
          nextExecution.setHours(nextHour6 - 24);
        } else {
          nextExecution.setHours(nextHour6);
        }
        nextExecution.setMinutes(minute);
        nextExecution.setSeconds(0);
        break;
        
      case 'daily':
        // Próximo dia no horário especificado
        nextExecution.setDate(nextExecution.getDate() + 1);
        nextExecution.setHours(hour);
        nextExecution.setMinutes(minute);
        nextExecution.setSeconds(0);
        break;
    }
    
    return nextExecution;
  }

  // Função dedicada para executar integração real do Monday (apenas para jobs automáticos)
  async executeRealMondayIntegration(mappingId: string): Promise<{
    itemsProcessed: number;
    documentsCreated: number;
    documentsPreExisting: number;
    documentsSkipped: number;
  }> {
    const { storage } = await import('./storage');
    
    // Buscar o mapeamento
    const existingMapping = await storage.getMondayMapping(mappingId);
    if (!existingMapping) {
      throw new Error(`Mapeamento ${mappingId} não encontrado`);
    }

    // Obter a chave da API
    const apiConnection = await storage.getServiceConnection("monday");
    if (!apiConnection) {
      throw new Error("Conexão com Monday.com não configurada");
    }
    const apiKey = apiConnection.token;

    // Obter as colunas do mapeamento
    const mappingColumns = await storage.getMappingColumns(mappingId);

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
      throw new Error(`API do Monday retornou HTML em vez de JSON`);
    }
    
    if (mondayData.errors) {
      throw new Error(`Erro na consulta GraphQL: ${JSON.stringify(mondayData.errors)}`);
    }

    const items = mondayData.data?.boards?.[0]?.items_page?.items || [];
    let documentsCreated = 0;
    let documentsSkipped = 0;
    let documentsPreExisting = 0;
    let filteredCount = 0;

    // Identificar campos marcados como chave para verificação de duplicatas
    const keyFields = mappingColumns.filter(col => col.isKey).map(col => col.cpxField);
    
    // Processar cada item
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      
      try {
        // Aplicar filtro se existir
        if (existingMapping.mappingFilter && existingMapping.mappingFilter.trim()) {
          try {
            const filterFunction = new Function('item', existingMapping.mappingFilter);
            const shouldProcess = filterFunction(item);
            if (!shouldProcess) {
              filteredCount++;
              continue;
            }
          } catch (filterError) {
            console.error(`Erro no filtro para item ${item.id}:`, filterError);
            filteredCount++;
            continue;
          }
        }

        // Criar objeto para o documento
        const documentData: any = {
          origem: "Monday.com",
          objeto: item.name || `Item ${item.id}`,
          cliente: "",
          responsavel: "",
          sistema: "",
          modulo: "",
          descricao: "",
          status: "Rascunho",
          idOrigem: BigInt(item.id),
          generalColumns: {}
        };

        // Aplicar valores padrão
        if (existingMapping.defaultValues) {
          try {
            const defaults = JSON.parse(existingMapping.defaultValues);
            Object.keys(defaults).forEach(key => {
              if (defaults[key]) {
                try {
                  documentData[key] = JSON.parse(defaults[key]);
                } catch {
                  documentData[key] = defaults[key];
                }
              }
            });
          } catch (error) {
            console.error("Erro ao aplicar valores padrão:", error);
          }
        }

        // Mapear colunas
        for (const mapping of mappingColumns) {
          const mondayColumn = item.column_values?.find((col: any) => col.id === mapping.mondayColumnId);
          let value = mondayColumn?.text || "";

          // Aplicar transformação se existir
          if (mapping.transformFunction && mapping.transformFunction.trim()) {
            try {
              const transformFunction = new Function('value', 'item', mapping.transformFunction);
              value = transformFunction(value, item);
            } catch (error) {
              console.error(`Erro na transformação para campo ${mapping.cpxField}:`, error);
            }
          }

          // Atribuir valor ao campo correspondente
          if (mapping.cpxField.startsWith('general_columns')) {
            const match = mapping.cpxField.match(/general_columns(?:\[(\d+)\])?/);
            const suffix = match?.[1] ? `[${match[1]}]` : '';
            const fieldName = `${mapping.mondayColumnTitle}${suffix}`;
            documentData.generalColumns[fieldName] = value;
          } else {
            documentData[mapping.cpxField] = value;
          }
        }

        // Verificar duplicatas usando a mesma lógica do processo manual
        let shouldCreateDocument = true;
        
        if (keyFields.length > 0) {
          try {
            const existingDocs = await storage.getDocumentosByKeyFields(keyFields, documentData);
            if (existingDocs && existingDocs.length > 0) {
              console.log(`🔍 [JOB] Documento duplicado encontrado para item ${item.id}`);
              documentsPreExisting++;
              shouldCreateDocument = false;
            }
          } catch (error) {
            console.error(`[JOB] Erro na verificação de duplicatas para item ${item.id}:`, error);
            shouldCreateDocument = false;
          }
        }

        // Só criar se não for duplicata
        if (shouldCreateDocument) {
          await storage.createDocumento(documentData);
          documentsCreated++;
        }
        
      } catch (itemError) {
        console.error(`❌ [JOB] Erro ao processar item ${item.id}:`, itemError);
        documentsSkipped++;
      }
    }

    // Ajustar as estatísticas para corresponder ao processo manual
    const finalDocumentsSkipped = filteredCount + documentsSkipped;

    const processedItems = items.length - filteredCount;
    console.log(`[DEBUG] Estatísticas finais - API retornou: ${items.length} itens, Processados após filtros: ${processedItems}`);
    
    return {
      itemsProcessed: processedItems,
      documentsCreated,
      documentsPreExisting,
      documentsSkipped: finalDocumentsSkipped
    };
  }

  // Executa a sincronização do Monday para um mapeamento
  private async executeMondaySync(mappingId: string): Promise<void> {
    try {
      console.log(`[JOB] Iniciando sincronização automática para mapeamento ${mappingId}`);

      const mapping = await storage.getMondayMapping(mappingId);
      if (!mapping) {
        throw new Error(`Mapeamento ${mappingId} não encontrado`);
      }

      // Registrar início no sistema de logs
      const { SystemLogger } = await import('./logger');
      await SystemLogger.logMondaySync(0, mappingId, 'started', {
        mappingName: mapping.name,
        executionType: 'automatic'
      });

      // Executar a sincronização real do Monday
      console.log(`[JOB] Executando sincronização para ${mapping.name}`);
      
      // Chamar a função de integração real
      const stats = await this.executeRealMondayIntegration(mappingId);
      
      // Atualizar lastSync
      await storage.updateMondayMapping(mappingId, { lastSync: new Date() });

      // Calcular próxima execução
      const now = new Date();
      const currentJob = this.getActiveJob(mappingId);
      let proximaExecucao = 'Não agendado';
      
      if (currentJob) {
        const nextExecution = this.calculateNextExecution(currentJob.frequency, currentJob.time, now);
        proximaExecucao = nextExecution.toLocaleString('pt-BR');
      }

      // Registrar conclusão no sistema de logs com detalhes
      await SystemLogger.log({
        eventType: 'MONDAY_SYNC_COMPLETED' as any,
        message: `Sincronização Monday.com automática concluída para ${mapping.name}`,
        parameters: {
          mappingId,
          mappingName: mapping.name,
          executionType: 'automatic',
          itemsProcessed: stats.itemsProcessed,
          documentsCreated: stats.documentsCreated,
          documentsPreExisting: stats.documentsPreExisting,
          documentsSkipped: stats.documentsSkipped,
          proximaExecucao: proximaExecucao
        },
        userId: 0
      });

      console.log(`[JOB] Sincronização concluída para mapeamento ${mappingId}`);

    } catch (error) {
      console.error(`[JOB] Erro na sincronização automática:`, error);
      
      // Registrar erro no sistema de logs
      const { SystemLogger } = await import('./logger');
      await SystemLogger.logMondaySync(0, mappingId, 'error', {
        error: error.message,
        executionType: 'automatic'
      });
    }
  }

  // Criar um novo job
  async createJob(mappingId: string, frequency: string, time: string): Promise<string> {
    // Cancelar job existente se houver
    await this.cancelJob(mappingId);

    const cronExpression = this.frequencyToCron(frequency, time);
    const jobId = `job_${mappingId}_${Date.now()}`;

    console.log(`[JOB] Criando job com expressão cron: ${cronExpression} para frequência ${frequency} às ${time}`);

    const task = cron.schedule(cronExpression, () => {
      const now = new Date();
      console.log(`[JOB] Executando job às ${now.toLocaleString('pt-BR')} (horário local)`);
      this.executeMondaySync(mappingId);
    }, {
      scheduled: true
    });

    const activeJob: ActiveJob = {
      id: jobId,
      mappingId,
      task,
      frequency,
      time,
      createdAt: new Date()
    };

    this.activeJobs.set(mappingId, activeJob);

    console.log(`[JOB] Job criado: ${jobId} para mapeamento ${mappingId} com frequência ${frequency} às ${time}`);
    
    // Registrar log do sistema
    try {
      const mapping = await storage.getMondayMapping(mappingId);
      await SystemLogger.log({
        eventType: 'JOB_ACTIVATED',
        message: `Job ativado para mapeamento "${mapping?.name || mappingId}"`,
        parameters: {
          mappingId,
          jobId,
          frequency,
          time,
          cronExpression
        }
      });
      console.log(`[LOG] Job ativado registrado no banco - Mapeamento: ${mappingId}`);
    } catch (error) {
      console.error('[JOB] Erro ao registrar log de ativação:', error);
    }

    return jobId;
  }

  // Cancelar um job
  async cancelJob(mappingId: string): Promise<boolean> {
    const activeJob = this.activeJobs.get(mappingId);
    if (activeJob) {
      activeJob.task.stop();
      activeJob.task.destroy();
      this.activeJobs.delete(mappingId);
      console.log(`[JOB] Job cancelado para mapeamento ${mappingId}`);
      
      // Registrar log do sistema
      try {
        const mapping = await storage.getMondayMapping(mappingId);
        await SystemLogger.log({
          eventType: 'JOB_CANCELLED',
          message: `Job cancelado para mapeamento "${mapping?.name || mappingId}"`,
          parameters: {
            mappingId,
            jobId: activeJob.id,
            frequency: activeJob.frequency,
            time: activeJob.time
          }
        });
        console.log(`[LOG] Job cancelado registrado no banco - Mapeamento: ${mappingId}`);
      } catch (error) {
        console.error('[JOB] Erro ao registrar log de cancelamento:', error);
      }
      
      return true;
    }
    return false;
  }

  // Verificar se há job ativo para um mapeamento
  hasActiveJob(mappingId: string): boolean {
    return this.activeJobs.has(mappingId);
  }

  // Obter informações do job ativo
  getActiveJob(mappingId: string): ActiveJob | null {
    return this.activeJobs.get(mappingId) || null;
  }

  // Listar todos os jobs ativos
  getActiveJobs(): ActiveJob[] {
    return Array.from(this.activeJobs.values());
  }

  // Parar todos os jobs (para shutdown)
  stopAllJobs(): void {
    for (const activeJob of this.activeJobs.values()) {
      activeJob.task.stop();
      activeJob.task.destroy();
    }
    this.activeJobs.clear();
    console.log('[JOB] Todos os jobs foram parados');
  }
}

export const jobManager = new JobManager();