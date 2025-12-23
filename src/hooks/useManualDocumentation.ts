// src/hooks/useManualDocumentation.ts

import { useState, useCallback } from 'react';
import {
  applyDictionaryDescriptions,
  type ManualDocsResult,
} from '@/services/manualDocsService';
import { aiService } from '@/services/ai/AIService';
import {
  getFieldsWithDescription,
  updateFieldDescription,
  getUntranslatedFields,
  markFieldAsTranslated,
} from '@/services/responseFieldsService';
import {
  canMakeRequest,
  incrementRequestCount,
} from '@/services/aiSettingsService';

export interface ProcessLog {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentField: string;
  estimatedTimeMs: number;
}

export function useManualDocumentation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressInfo>({
    current: 0,
    total: 0,
    percentage: 0,
    currentField: '',
    estimatedTimeMs: 0,
  });

  const addLog = useCallback((message: string, type: ProcessLog['type'] = 'info') => {
    setLogs((prev) => {
      const newLog = { timestamp: new Date(), message, type };
      const updatedLogs = [...prev, newLog];

      // Manter apenas os últimos 5 logs
      if (updatedLogs.length > 5) {
        return updatedLogs.slice(-5);
      }

      return updatedLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

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
   * Apply dictionary descriptions to response fields
   */
  const applyDescriptions = useCallback(async (): Promise<ManualDocsResult | null> => {
    setIsProcessing(true);
    setError(null);
    clearLogs();

    try {
      addLog('Iniciando aplicação de descrições do dicionário...', 'info');

      const result = await applyDictionaryDescriptions();

      if (result.success) {
        addLog(
          `✓ ${result.updatedCount} campo(s) atualizado(s) com sucesso`,
          'success'
        );

        if (result.notFoundInDictionaryCount > 0) {
          addLog(
            `ℹ ${result.notFoundInDictionaryCount} campo(s) não encontrado(s) no dicionário`,
            'info'
          );
        }

        if (result.skippedCount > 0) {
          addLog(
            `⚠ ${result.skippedCount} campo(s) com erro ao atualizar`,
            'error'
          );
        }

        addLog('Processo concluído!', 'success');
      } else {
        addLog('Erro ao aplicar descrições', 'error');
        setError('Falha ao aplicar descrições do dicionário');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido';
      addLog(`✗ Erro: ${errorMessage}`, 'error');
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [addLog, clearLogs]);

  /**
   * Translate descriptions from English to Portuguese using AI
   */
  const translateDescriptions = useCallback(async (): Promise<{ success: boolean; translatedCount: number } | null> => {
    setIsProcessing(true);
    setError(null);
    clearLogs();

    try {
      await aiService.waitForInitialization();
      const currentProvider = aiService.getActiveProviderType();
      const providerName = aiService.getActiveProviderName();

      addLog('Buscando campos não traduzidos...', 'info');
      const fields = await getUntranslatedFields();

      if (fields.length === 0) {
        addLog('Nenhum campo pendente de tradução', 'info');
        return { success: true, translatedCount: 0 };
      }

      addLog(`📊 Encontrados ${fields.length} campos para traduzir`, 'info');
      addLog(`Usando provider: ${providerName}`, 'info');

      let translatedCount = 0;
      let failedCount = 0;
      const processingTimes: number[] = [];

      // Process each field sequentially
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const currentFieldName = `${field.campo}`;

        // Calculate average time based on processed fields
        const avgTime = processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 2000; // 2 seconds as initial estimate

        updateProgress(i, fields.length, currentFieldName, avgTime);

        addLog(`Traduzindo: ${currentFieldName} (${i + 1}/${fields.length})`, 'info');

        const startTime = Date.now();

        // Check rate limit before processing
        const rateLimitCheck = await canMakeRequest(currentProvider);

        if (!rateLimitCheck.canMakeRequest) {
          if (rateLimitCheck.reason === 'rpm_limit') {
            const waitSeconds = Math.ceil(rateLimitCheck.waitTimeMs / 1000);
            addLog(`⏳ Rate limit RPM atingido. Aguardando ${waitSeconds}s...`, 'info');
            await new Promise(resolve => setTimeout(resolve, rateLimitCheck.waitTimeMs + 100));
          } else if (rateLimitCheck.reason === 'rpd_limit') {
            addLog('❌ Rate limit diário atingido. Processo interrompido.', 'error');
            break;
          }
        }

        try {
          // Translate description with AI
          const result = await aiService.translateDescription(field.descricao || '');

          if (result.success && result.description) {
            // Update field with translated description
            await updateFieldDescription(field.id, result.description);

            // Mark field as translated
            await markFieldAsTranslated(field.id);

            await incrementRequestCount(currentProvider);
            translatedCount++;

            const elapsedTime = Date.now() - startTime;
            processingTimes.push(elapsedTime);

            addLog(`✓ ${currentFieldName}: traduzido (${result.elapsedTime}ms)`, 'success');
          } else {
            failedCount++;
            addLog(`✗ ${currentFieldName}: ${result.error || 'Erro desconhecido'}`, 'error');
          }
        } catch (err: any) {
          failedCount++;
          const errorMsg = err.message || 'Erro desconhecido';
          addLog(`✗ ${currentFieldName}: ${errorMsg}`, 'error');
        }

        // Small delay between requests
        if (i < fields.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update progress to 100%
      updateProgress(fields.length, fields.length, '', 0);

      addLog(`✅ Processo concluído! ${translatedCount} traduzidos, ${failedCount} com erro`, 'success');

      return { success: true, translatedCount };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido';
      addLog(`✗ Erro: ${errorMessage}`, 'error');
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [addLog, clearLogs, updateProgress]);

  /**
   * Export all documented fields to clipboard
   */
  const exportToClipboard = useCallback(async () => {
    try {
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

      addLog('✓ Tabela copiada para área de transferência', 'success');
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao exportar';
      addLog(`✗ Erro ao exportar: ${errorMessage}`, 'error');
      setError(errorMessage);
      return false;
    }
  }, [addLog]);

  return {
    isProcessing,
    logs,
    error,
    progress,
    applyDescriptions,
    translateDescriptions,
    exportToClipboard,
    clearLogs,
  };
}
