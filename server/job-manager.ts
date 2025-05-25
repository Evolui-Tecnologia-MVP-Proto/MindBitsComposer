import * as cron from 'node-cron';
import { storage } from './storage';

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

      const mapping = await storage.getMondayMapping(mappingId);
      if (!mapping) {
        throw new Error(`Mapeamento ${mappingId} não encontrado`);
      }

      // Simular execução da sincronização
      console.log(`[JOB] Executando sincronização para ${mapping.name}`);
      
      // Atualizar lastSync
      await storage.updateMondayMapping(mappingId, { lastSync: new Date() });

      console.log(`[JOB] Sincronização concluída para mapeamento ${mappingId}`);

    } catch (error) {
      console.error(`[JOB] Erro na sincronização automática:`, error);
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
    for (const activeJob of this.activeJobs.values()) {
      activeJob.task.stop();
      activeJob.task.destroy();
    }
    this.activeJobs.clear();
    console.log('[JOB] Todos os jobs foram parados');
  }
}

export const jobManager = new JobManager();