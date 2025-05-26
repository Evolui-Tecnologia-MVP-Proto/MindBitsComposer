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
      case '1min':
        // A cada minuto (apenas para testes)
        return '* * * * *';
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


  // Criar um novo job
  async createJob(mappingId: string, frequency: string, time: string): Promise<string> {
    // Cancelar job existente se houver
    await this.cancelJob(mappingId);

    const cronExpression = this.frequencyToCron(frequency, time);
    const jobId = `job_${mappingId}_${Date.now()}`;

    console.log(`[JOB] Criando job com expressão cron: ${cronExpression} para frequência ${frequency} às ${time}`);

    const task = cron.schedule(cronExpression, async () => {
      const now = new Date();
      console.log(`[JOB] Executando job às ${now.toLocaleString('pt-BR')} (horário local)`);
      await this.executeMondayMappingHeadless(mappingId);
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

  // Executar sincronização Monday em modo headless (para jobs automáticos)
  async executeMondayMappingHeadless(mappingId: string): Promise<void> {
    try {
      console.log(`[JOB] Iniciando execução automática para mapeamento: ${mappingId}`);
      
      // Buscar o mapeamento
      const mapping = await storage.getMondayMapping(mappingId);
      if (!mapping) {
        console.error(`[JOB] Mapeamento não encontrado: ${mappingId}`);
        return;
      }

      // Fazer uma requisição para o endpoint de execução (simulando o que o botão laranja faz)
      const response = await fetch(`http://localhost:5000/api/monday/mappings/execute-headless`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mappingId: mappingId
        })
      });

      console.log(`[JOB] Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`[JOB] Headers da resposta:`, Object.fromEntries(response.headers));
      
      const responseText = await response.text();
      console.log(`[JOB] Conteúdo da resposta (primeiros 500 chars):`, responseText.substring(0, 500));
      
      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log(`[JOB] Execução automática concluída - ${result.documentsCreated || 0} documentos criados`);
          
          // Registrar sucesso no log do sistema
          try {
            console.log(`[DEBUG] 🔧 EXECUTANDO NOVA LÓGICA DE LOG - ID: ${mappingId}`);
            const mapping = await storage.getMondayMapping(mappingId);
            
            // SEMPRE gerar log específico para Triagem de requisições de clientes
            if (mappingId === 'd08420f2-219c-495f-816d-5e4ebe68c7e6') {
              console.log(`[LOG] 🎯 GERANDO LOG ESPECÍFICO PARA TRIAGEM DE REQUISIÇÕES!`);
              
              // Buscar dados do job ativo para obter configurações reais
              const activeJob = this.getActiveJob(mappingId);
              const frequency = activeJob?.frequency || '1min';
              const time = activeJob?.time || '00:00';
              
              // Calcular próxima execução baseada na configuração real
              const nextExecution = this.calculateNextExecution(frequency, time, new Date());
              const proximaExecucao = nextExecution.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              await SystemLogger.log({
                eventType: 'MONDAY_SYNC_TRIAGEM_DE_REQUISIÇÕES_DE_CLIENTES',
                message: `Agendamento automático executado - Triagem de requisições de clientes: ${result.itemsProcessed || 0} itens processados, ${result.documentsCreated || 0} criados, ${result.documentsFiltered || 0} filtrados`,
                parameters: {
                  mappingId,
                  mappingName: 'Triagem de requisições de clientes',
                  executionType: 'scheduled',
                  itemsProcessed: result.itemsProcessed || 0,
                  documentsCreated: result.documentsCreated || 0,
                  documentsFiltered: result.documentsFiltered || 0,
                  executedBy: 'scheduler',
                  agendamento: 'ativo',
                  boardId: '4197389343',
                  proximaExecucao: proximaExecucao,
                  intervalo: frequency,
                  horarioConfiguracao: time,
                  timestamp: new Date().toISOString()
                }
              });
            } else {
              // Log padrão para outros mapeamentos
              await SystemLogger.log({
                eventType: 'MONDAY_SYNC_COMPLETED',
                message: `Execução automática concluída para mapeamento "${mapping?.name || mappingId}"`,
                parameters: {
                  mappingId,
                  executionType: 'automatic',
                  documentsCreated: result.documentsCreated || 0,
                  documentsFiltered: result.documentsFiltered || 0,
                  itemsProcessed: result.itemsProcessed || 0,
                  executedBy: 'scheduler'
                }
              });
            }
            console.log(`[LOG] Execução automática registrada no banco - Mapeamento: ${mappingId}`);
          } catch (logError) {
            console.error('[JOB] Erro ao registrar log de sucesso:', logError);
          }
        } catch (parseError) {
          console.error(`[JOB] Erro ao parsear JSON da resposta:`, parseError);
          console.log(`[JOB] Resposta completa:`, responseText);
        }
      } else {
        console.error(`[JOB] Erro na execução automática: ${response.status} ${response.statusText}`);
        console.log(`[JOB] Resposta de erro:`, responseText);
      }
    } catch (error) {
      console.error(`[JOB] Erro fatal na execução automática:`, error);
      
      // Registrar erro no log do sistema
      try {
        await SystemLogger.log({
          eventType: 'MONDAY_SYNC_SCHEDULED',
          message: `Erro na execução automática do mapeamento ${mappingId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          parameters: {
            mappingId,
            executionType: 'automatic',
            errorType: 'job_execution_failure',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            failedBy: 'scheduler'
          }
        });
      } catch (logError) {
        console.error('[JOB] Erro ao registrar log de erro:', logError);
      }
    }
  }
}

export const jobManager = new JobManager();