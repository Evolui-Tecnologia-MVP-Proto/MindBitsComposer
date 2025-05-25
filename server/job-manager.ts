import cron from 'node-cron';
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
    const [hour, minute] = time.split(':');
    
    switch (frequency) {
      case '15min':
        return '*/15 * * * *';
      case '30min':
        return '*/30 * * * *';
      case '1hour':
        return '0 * * * *';
      case '6hours':
        return '0 */6 * * *';
      case 'daily':
        return `${minute} ${hour} * * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  }

  // Executa a sincronização do Monday para um mapeamento
  private async executeMondaySync(mappingId: string): Promise<void> {
    try {
      console.log(`[JOB] Iniciando sincronização automática para mapeamento ${mappingId}`);
      
      // Log de início
      await SystemLogger.logMondaySync(1, mappingId, 'started', {
        source: 'automatic_job',
        timestamp: new Date().toISOString()
      });

      const mapping = await storage.getMondayMapping(mappingId);
      if (!mapping) {
        throw new Error(`Mapeamento ${mappingId} não encontrado`);
      }

      // Buscar token do Monday
      const connections = await storage.getServiceConnections();
      const mondayConnection = connections.find(conn => conn.serviceName === 'Monday.com');
      if (!mondayConnection) {
        throw new Error('Conexão Monday.com não configurada');
      }

      // Buscar colunas do mapeamento
      const mappingColumns = await storage.getMappingColumns();
      
      // Executar query no Monday
      const query = `
        query {
          boards(ids: [${mapping.boardId}]) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mondayConnection.token,
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Erro na API Monday: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.data?.boards?.[0]?.items || [];

      let processedCount = 0;
      let createdCount = 0;
      let duplicateCount = 0;

      for (const item of items) {
        try {
          // Aplicar filtro se configurado
          if (mapping.mappingFilter && mapping.mappingFilter.trim()) {
            try {
              const filterFunction = new Function('item', mapping.mappingFilter);
              if (!filterFunction(item)) {
                continue;
              }
            } catch (filterError) {
              console.warn(`Erro no filtro para item ${item.id}:`, filterError);
              continue;
            }
          }

          // Verificar duplicata
          const existingDoc = await storage.getDocumentoByOrigemId(BigInt(item.id));
          if (existingDoc) {
            duplicateCount++;
            continue;
          }

          // Criar objeto documento
          const documentData: any = {
            origem: 'Monday.com',
            objeto: item.name || 'Sem título',
            cliente: '',
            responsavel: '',
            sistema: '',
            modulo: '',
            descricao: '',
            status: 'Ativo',
            statusOrigem: '',
            tipo: '',
            solicitante: '',
            aprovador: '',
            agente: '',
            idOrigem: BigInt(item.id),
            generalColumns: {}
          };

          // Mapear colunas
          for (const mappingCol of mappingColumns) {
            const mondayColumn = item.column_values.find((col: any) => col.id === mappingCol.mondayColumnId);
            let value = mondayColumn?.text || '';

            // Aplicar transformação se configurada
            if (mappingCol.transformFunction && mappingCol.transformFunction.trim()) {
              try {
                const transformFunction = new Function('value', mappingCol.transformFunction);
                value = transformFunction(value) || value;
              } catch (transformError) {
                console.warn(`Erro na transformação para coluna ${mappingCol.cpxField}:`, transformError);
              }
            }

            // Mapear para campo do documento
            if (mappingCol.cpxField === 'general_columns') {
              if (!documentData.generalColumns) documentData.generalColumns = {};
              const columnKey = mappingCol.mondayColumnTitle || mappingCol.mondayColumnId;
              documentData.generalColumns[columnKey] = value;
            } else {
              documentData[mappingCol.cpxField] = value;
            }
          }

          // Aplicar valores padrão
          if (mapping.defaultValues) {
            Object.entries(mapping.defaultValues).forEach(([field, defaultValue]) => {
              if (!documentData[field] || documentData[field] === '') {
                documentData[field] = defaultValue;
              }
            });
          }

          // Criar documento
          await storage.createDocumento(documentData);
          createdCount++;

        } catch (itemError) {
          console.error(`Erro ao processar item ${item.id}:`, itemError);
        }
        
        processedCount++;
      }

      // Atualizar lastSync
      await storage.updateMondayMapping(mappingId, { lastSync: new Date() });

      // Log de sucesso
      await SystemLogger.logMondaySync(1, mappingId, 'completed', {
        source: 'automatic_job',
        processed: processedCount,
        created: createdCount,
        duplicates: duplicateCount,
        timestamp: new Date().toISOString()
      });

      console.log(`[JOB] Sincronização concluída - Processados: ${processedCount}, Criados: ${createdCount}, Duplicatas: ${duplicateCount}`);

    } catch (error) {
      console.error(`[JOB] Erro na sincronização automática:`, error);
      
      // Log de erro
      await SystemLogger.logMondaySync(1, mappingId, 'error', {
        source: 'automatic_job',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Criar um novo job
  createJob(mappingId: string, frequency: string, time: string): string {
    // Cancelar job existente se houver
    this.cancelJob(mappingId);

    const cronExpression = this.frequencyToCron(frequency, time);
    const jobId = `job_${mappingId}_${Date.now()}`;

    const task = cron.schedule(cronExpression, () => {
      this.executeMondaySync(mappingId);
    }, {
      scheduled: false // Não iniciar automaticamente
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
    task.start(); // Iniciar o job

    console.log(`[JOB] Job criado: ${jobId} para mapeamento ${mappingId} com frequência ${frequency} às ${time}`);
    return jobId;
  }

  // Cancelar um job
  cancelJob(mappingId: string): boolean {
    const activeJob = this.activeJobs.get(mappingId);
    if (activeJob) {
      activeJob.task.stop();
      activeJob.task.destroy();
      this.activeJobs.delete(mappingId);
      console.log(`[JOB] Job cancelado para mapeamento ${mappingId}`);
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
    for (const [mappingId, job] of this.activeJobs) {
      job.task.stop();
      job.task.destroy();
    }
    this.activeJobs.clear();
    console.log('[JOB] Todos os jobs foram parados');
  }
}

export const jobManager = new JobManager();