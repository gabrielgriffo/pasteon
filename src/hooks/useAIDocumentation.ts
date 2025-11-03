// src/hooks/useAIDocumentation.ts

import { useState, useCallback, useEffect } from 'react';
import { aiService, type AIProvider } from '@/services/ai/AIService';
import {
  getFieldsWithoutDescription,
  getFieldsWithDescription,
  updateFieldDescription,
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

  // Carrega configurações do banco ao montar
  useEffect(() => {
    const loadSettings = async () => {
      const config = await loadProviderSettings(aiService.getActiveProviderType());
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
   * Inicia o processamento automático de descrições para campos sem descrição
   */
  const startAutoDescription = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setLogs([]);

    try {
      // Busca campos sem descrição
      addLog('Buscando campos sem descrição...', 'info');
      const fields = await getFieldsWithoutDescription();

      if (fields.length === 0) {
        addLog('Nenhum campo sem descrição encontrado', 'info');
        setIsProcessing(false);
        return;
      }

      addLog(`Encontrados ${fields.length} campos para processar`, 'info');

      const currentProvider = aiService.getActiveProviderType();
      const providerName = aiService.getActiveProviderName();
      addLog(`Usando provider: ${providerName}`, 'info');

      // Mostra configurações de rate limit
      const remaining = getRemainingRequests(currentProvider);
      if (remaining.rpm.remaining !== Infinity) {
        addLog(`📊 Limite RPM: ${remaining.rpm.current}/${remaining.rpm.limit}`, 'info');
      }
      if (remaining.rpd.remaining !== Infinity) {
        addLog(`📊 Limite RPD: ${remaining.rpd.current}/${remaining.rpd.limit}`, 'info');
      }

      // Array para calcular tempo médio
      const processingTimes: number[] = [];

      // Processa cada campo sequencialmente
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const currentFieldName = `${field.campo} (${field.tipo})`;

        // Calcula tempo médio baseado nos campos já processados
        const avgTime = processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 3000; // 3 segundos como estimativa inicial

        updateProgress(i, fields.length, currentFieldName, avgTime);

        // VERIFICA RATE LIMIT ANTES DE PROCESSAR
        const rateLimitCheck = canMakeRequest(currentProvider);

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
          incrementRequestCount(currentProvider);

          // Salva no banco de dados
          await updateFieldDescription(field.id, result.description);

          const elapsed = Date.now() - startTime;
          processingTimes.push(elapsed);

          // Mostra requisições restantes
          const remainingAfter = getRemainingRequests(currentProvider);
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
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          addLog(`✗ ${currentFieldName}: ${errorMsg}`, 'error');

          // Se for erro de rate limit da API, aguarda
          if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            addLog('⏱️ Aguardando 5 segundos devido ao rate limit da API...', 'info');
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }

      // Finaliza
      updateProgress(fields.length, fields.length, 'Concluído', 0);
      addLog(`✅ Processamento concluído! ${fields.length} campos processados.`, 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addLog(`❌ Erro: ${errorMsg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [addLog, updateProgress]);

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

      // Formata em tabela texto plano
      const header = 'MÉTODO | URL | ENDPOINT | DETALHES | DESCRIÇÃO';
      const separator = '-------|-----|----------|----------|------------';

      const rows = fields.map((field) => {
        const metodo = field.metodo.padEnd(7);
        const url = field.url.slice(0, 20).padEnd(20);
        const endpoint = field.endpoint.slice(0, 25).padEnd(25);
        const detalhes = field.detalhes.slice(0, 40).padEnd(40);
        const descricao = field.descricao || '';

        return `${metodo} | ${url} | ${endpoint} | ${detalhes} | ${descricao}`;
      });

      const table = [header, separator, ...rows].join('\n');

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
    const newRateLimits = await loadProviderSettings(provider);
    setRateLimitConfig(newRateLimits);
    addLog(`Provider alterado para: ${aiService.getActiveProviderName()}`, 'info');
  }, [addLog]);

  /**
   * Retorna o provider ativo
   */
  const getActiveProvider = useCallback(() => {
    return aiService.getActiveProviderType();
  }, []);

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

  return {
    // Estados
    isProcessing,
    progress,
    logs,
    error,
    rateLimitConfig,

    // Métodos
    startAutoDescription,
    copyAllWithDescription,
    changeProvider,
    getActiveProvider,
    getActiveProviderName,
    listProviders,
    checkProviders,
    updateRateLimitConfig,
  };
}

export type { RateLimitConfig };
