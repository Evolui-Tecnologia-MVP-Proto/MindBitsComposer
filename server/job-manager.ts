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
      
      // Fazer requisição para a API real de execução
      const response = await fetch(`http://localhost:5000/api/monday/mappings/${mappingId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      const stats = {
        itemsProcessed: result.itemsProcessed || 0,
        documentsCreated: result.documentsCreated || 0,
        documentsPreExisting: result.documentsPreExisting || 0,
        documentsSkipped: result.documentsSkipped || 0
      };
      
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

    console.log(`[JOB] Criando job com expressão cron: "${cronExpression}" para frequência ${frequency} às ${time}`);
    console.log(`[JOB] Hora atual: ${new Date().toLocaleTimeString('pt-BR')} - Próxima execução calculada internamente`);

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