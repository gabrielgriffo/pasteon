// src/hooks/useAIDocumentation.ts

import { useState, useCallback, useEffect } from 'react';
import { aiService } from '@/services/ai/AIService';
import type { AIProvider } from '@/services/ai/config';
import {
  getFieldsWithoutDescription,
  getFieldsWithDescription,
  updateFieldDescription,
  countInvalidDescriptions,
  clearInvalidDescriptions as clearInvalidDescriptionsService,
  type ResponseField,
} from '@/services/responseFieldsService';
import {
  loadProviderSettings,
  saveProviderSettings,
  canMakeRequest,
  incrementRequestCount,
  getRemainingRequests,
  type RateLimitConfig,
} from '@/services/aiSettingsService';

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentField: string;
  estimatedTimeMs: number;
}

export interface ProcessLog {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

export function useAIDocumentation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo>({
    current: 0,
    total: 0,
    percentage: 0,
    currentField: '',
    estimatedTimeMs: 0,
  });
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig | null>(null);
  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini'); // Estado reativo para o provider

  // Carrega provider ativo e configurações do banco ao montar
  useEffect(() => {
    const loadSettings = async () => {
      // Aguarda o AI Service carregar o provider do banco
      await aiService.waitForInitialization();

      // Carrega configurações do provider ativo
      const provider = aiService.getActiveProviderType();
      setActiveProvider(provider); // Atualiza estado
      const config = await loadProviderSettings(provider);
      setRateLimitConfig(config);
    };
    loadSettings();
  }, []);

  /**
   * Adiciona um log à lista
   */
  const addLog = useCallback((message: string, type: ProcessLog['type'] = 'info') => {
    setLogs((prev) => [
      {
        timestamp: new Date(),
        message,
        type,
      },
      ...prev.slice(0, 4), // Mantém apenas as últimas 5 mensagens
    ]);
  }, []);

  /**
   * Atualiza a configuração de rate limit do provider ativo
   */
  const updateRateLimitConfig = useCallback(async (config: RateLimitConfig) => {
    const currentProvider = aiService.getActiveProviderType();
    setRateLimitConfig(config);
    await saveProviderSettings(currentProvider, config);

    const rpmStatus = config.rpmEnabled ? `RPM: ${config.rpmLimit}/min` : 'RPM: sem limite';
    const rpdStatus = config.rpdEnabled ? `RPD: ${config.rpdLimit}/dia` : 'RPD: sem limite';
    addLog(`Rate limit configurado - ${rpmStatus}, ${rpdStatus}`, 'info');
  }, [addLog]);

  /**
   * Atualiza o progresso
   */
  const updateProgress = useCallback((
    current: number,
    total: number,
    currentField: string,
    avgTimePerField: number
  ) => {
    const remaining = total - current;
    const estimatedTimeMs = remaining * avgTimePerField;
    const percentage = total > 0 ? (current / total) * 100 : 0;

    setProgress({
      current,
      total,
      percentage,
      currentField,
      estimatedTimeMs,
    });
  }, []);

  /**
   * Cancela o processamento em andamento
   */
  const cancelProcessing = useCallback(() => {
    setCancelRequested(true);
    addLog('🛑 Cancelamento solicitado pelo usuário...', 'info');
  }, [addLog]);

  /**
   * Inicia o processamento automático de descrições para campos sem descrição
   */
  const startAutoDescription = useCallback(async (retryUntilSuccess = false) => {
    setIsProcessing(true);
    setCancelRequested(false);
    setError(null);
    setLogs([]);

    let iteration = 0;

    try {
      const currentProvider = aiService.getActiveProviderType();
      const providerName = aiService.getActiveProviderName();

      // Loop externo: continua até não haver mais campos ou cancelamento
      while (!cancelRequested) {
        iteration++;

        // Busca campos sem descrição
        if (iteration === 1) {
          addLog('Buscando campos sem descrição...', 'info');
        } else {
          addLog(`🔄 Iteração ${iteration}: Buscando campos que falharam...`, 'info');
        }

        const fields = await getFieldsWithoutDescription();

        if (fields.length === 0) {
          addLog('✅ Nenhum campo sem descrição encontrado', 'success');
          break;
        }

        if (iteration === 1) {
          addLog(`📊 Encontrados ${fields.length} campos para processar`, 'info');
          addLog(`Usando provider: ${providerName}`, 'info');
        } else {
          addLog(`🔄 ${fields.length} campos ainda precisam ser processados`, 'info');
        }

        // Mostra configurações de rate limit (apenas na primeira iteração)
        if (iteration === 1) {
          const remaining = await getRemainingRequests(currentProvider);
          if (remaining.rpm.remaining !== Infinity) {
            addLog(`📊 Limite RPM: ${remaining.rpm.current}/${remaining.rpm.limit}`, 'info');
          }
          if (remaining.rpd.remaining !== Infinity) {
            addLog(`📊 Limite RPD: ${remaining.rpd.current}/${remaining.rpd.limit}`, 'info');
          }
        }

        // Array para calcular tempo médio
        const processingTimes: number[] = [];
        let failedCount = 0;

        // Processa cada campo sequencialmente
        for (let i = 0; i < fields.length; i++) {
          // Verifica se foi solicitado cancelamento
          if (cancelRequested) {
            addLog('🛑 Processamento cancelado pelo usuário', 'info');
            break;
          }

          const field = fields[i];
          const currentFieldName = `${field.campo} (${field.tipo})`;

          // Calcula tempo médio baseado nos campos já processados
          const avgTime = processingTimes.length > 0
            ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
            : 3000; // 3 segundos como estimativa inicial

          updateProgress(i, fields.length, currentFieldName, avgTime);

        // VERIFICA RATE LIMIT ANTES DE PROCESSAR
        const rateLimitCheck = await canMakeRequest(currentProvider);

        // Se atingiu RPD, cancela tudo
        if (rateLimitCheck.reason === 'rpd_limit') {
          const config = await loadProviderSettings(currentProvider);
          setError(`Limite diário (RPD) atingido: ${config.rpdLimit} requisições/dia`);
          addLog(`🚫 Limite diário (RPD) atingido. Processamento cancelado.`, 'error');
          addLog(`Campos processados: ${i}/${fields.length}`, 'info');
          break; // Cancela o loop
        }

        // Se atingiu RPM, aguarda até próximo minuto
        if (rateLimitCheck.reason === 'rpm_limit') {
          const waitSeconds = Math.ceil(rateLimitCheck.waitTimeMs / 1000);
          addLog(`⏳ Limite de RPM atingido. Aguardando ${waitSeconds}s para reset...`, 'info');
          await new Promise((resolve) => setTimeout(resolve, rateLimitCheck.waitTimeMs + 100)); // +100ms de margem
        }

        addLog(`Processando: ${currentFieldName}`, 'info');

        const startTime = Date.now();

        try {
          // Gera descrição usando IA
          const result = await aiService.generateFieldDescription(
            field.campo,
            field.detalhes,
            field.tipo
          );

          if (!result.success || !result.description) {
            throw new Error(result.error || 'Falha ao gerar descrição');
          }

          // Incrementa contador de requisições APÓS sucesso
          await incrementRequestCount(currentProvider);

          // Salva no banco de dados
          await updateFieldDescription(field.id, result.description);

          const elapsed = Date.now() - startTime;
          processingTimes.push(elapsed);

          // Mostra requisições restantes
          const remainingAfter = await getRemainingRequests(currentProvider);
          let remainingInfo = '';
          if (remainingAfter.rpm.remaining !== Infinity || remainingAfter.rpd.remaining !== Infinity) {
            const parts = [];
            if (remainingAfter.rpm.remaining !== Infinity) {
              parts.push(`${remainingAfter.rpm.remaining} RPM`);
            }
            if (remainingAfter.rpd.remaining !== Infinity) {
              parts.push(`${remainingAfter.rpd.remaining} RPD`);
            }
            remainingInfo = ` | Restante: ${parts.join(', ')}`;
          }

          addLog(`✓ ${currentFieldName}: ${(elapsed / 1000).toFixed(1)}s${remainingInfo}`, 'success');
        } catch (err) {
          failedCount++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          addLog(`✗ ${currentFieldName}: ${errorMsg}`, 'error');

          // Se for erro de rate limit da API, aguarda
          if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            addLog('⏱️ Aguardando 5 segundos devido ao rate limit da API...', 'info');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      } // Fecha o loop for

        // Verifica se foi cancelado
        if (cancelRequested) {
          break;
        }

        // Verifica se deve fazer retry
        if (!retryUntilSuccess) {
          // Modo normal: processa apenas uma vez
          updateProgress(fields.length, fields.length, 'Concluído', 0);
          addLog(`✅ Processamento concluído! ${fields.length - failedCount} campos processados com sucesso.`, 'success');
          if (failedCount > 0) {
            addLog(`⚠️ ${failedCount} campos falharam. Ative "Retry automático" para tentar novamente.`, 'info');
          }
          break;
        }

        // Modo retry: verifica se ainda há campos que falharam
        if (failedCount === 0) {
          // Todos processados com sucesso!
          updateProgress(fields.length, fields.length, 'Concluído', 0);
          addLog(`✅ Todos os campos foram processados com sucesso após ${iteration} iteração(ões)!`, 'success');
          break;
        }

        // Ainda há falhas, aguarda 5 segundos antes de retry
        addLog(`🔄 ${failedCount} campos falharam. Aguardando 5 segundos para retry...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Verifica se foi cancelado
      if (cancelRequested) {
        addLog('🛑 Processamento cancelado pelo usuário', 'info');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addLog(`❌ Erro: ${errorMsg}`, 'error');
    } finally {
      setIsProcessing(false);
      setCancelRequested(false);
    }
  }, [addLog, updateProgress, cancelRequested]);

  /**
   * Copia todos os campos com descrição para o clipboard em formato tabela
   */
  const copyAllWithDescription = useCallback(async () => {
    try {
      addLog('Buscando campos com descrição...', 'info');
      const fields = await getFieldsWithDescription();

      if (fields.length === 0) {
        addLog('Nenhum campo com descrição encontrado', 'info');
        return;
      }

      // Formata em TSV (Tab-Separated Values) para colar no Excel
      const header = 'TÍTULO\tMÉTODO\tURL\tENDPOINT\tTIPO\tCAMPO\tELEMENTO\tDETALHES\tDESCRIÇÃO';

      const rows = fields.map((field) => {
        const titulo = field.title || '';
        const metodo = field.metodo;
        const url = field.url;
        const endpoint = field.endpoint;
        const tipo = field.tipo; // Body, Query Params, ou Response
        const campo = field.campo;
        const elemento = field.elemento || '';
        const detalhes = field.detalhes;
        const descricao = field.descricao?.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim() || '';

        // Separar colunas por TAB (\t) para Excel reconhecer automaticamente
        return `${titulo}\t${metodo}\t${url}\t${endpoint}\t${tipo}\t${campo}\t${elemento}\t${detalhes}\t${descricao}`;
      });

      const table = [header, ...rows].join('\n');

      // Copia para clipboard
      await navigator.clipboard.writeText(table);

      addLog(`✓ ${fields.length} campos copiados para o clipboard`, 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao copiar';
      addLog(`✗ ${errorMsg}`, 'error');
      setError(errorMsg);
    }
  }, [addLog]);

  /**
   * Altera o provider de IA e carrega suas configurações de rate limit
   */
  const changeProvider = useCallback(async (provider: AIProvider) => {
    aiService.setProvider(provider);
    setActiveProvider(provider); // Atualiza estado para disparar re-render
    const newRateLimits = await loadProviderSettings(provider);
    setRateLimitConfig(newRateLimits);
    addLog(`Provider alterado para: ${aiService.getActiveProviderName()}`, 'info');
  }, [addLog]);

  /**
   * Retorna o provider ativo
   */
  const getActiveProvider = useCallback(() => {
    return activeProvider;
  }, [activeProvider]);

  /**
   * Retorna o nome do provider ativo
   */
  const getActiveProviderName = useCallback(() => {
    return aiService.getActiveProviderName();
  }, []);

  /**
   * Lista todos os providers disponíveis
   */
  const listProviders = useCallback(() => {
    return aiService.listProviders();
  }, []);

  /**
   * Verifica status de todos os providers
   */
  const checkProviders = useCallback(async () => {
    return await aiService.checkProviders();
  }, []);

  /**
   * Retorna quantidade de descrições inválidas (que não terminam com ponto final)
   */
  const getInvalidDescriptionsCount = useCallback(async () => {
    try {
      return await countInvalidDescriptions();
    } catch (error) {
      console.error('Erro ao contar descrições inválidas:', error);
      return 0;
    }
  }, []);

  /**
   * Remove descrições inválidas (que não terminam com ponto final)
   */
  const clearInvalidDescriptions = useCallback(async () => {
    try {
      addLog('🗑️ Buscando descrições inválidas...', 'info');
      const count = await clearInvalidDescriptionsService();

      if (count === 0) {
        addLog('✓ Nenhuma descrição inválida encontrada', 'info');
      } else {
        addLog(`✓ ${count} descrição(ões) inválida(s) removida(s)`, 'success');
      }

      return count;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao limpar descrições';
      addLog(`✗ ${errorMsg}`, 'error');
      throw error;
    }
  }, [addLog]);

  return {
    // Estados
    isProcessing,
    progress,
    logs,
    error,
    rateLimitConfig,

    // Métodos
    startAutoDescription,
    cancelProcessing,
    copyAllWithDescription,
    clearInvalidDescriptions,
    getInvalidDescriptionsCount,
    changeProvider,
    getActiveProvider,
    getActiveProviderName,
    listProviders,
    checkProviders,
    updateRateLimitConfig,
  };
}

export type { RateLimitConfig };
