// src/features/manual-docs/ManualDocs.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Copy, BarChart3, Languages } from 'lucide-react';
import { StatsCard } from '../ai-docs/StatsCard';
import { ProgressPanel } from '../ai-docs/ProgressPanel';
import { useManualDocumentation } from '@/hooks/useManualDocumentation';
import { aiService } from '@/services/ai/AIService';
import { getFieldStatistics, type FieldStatistics } from '@/services/responseFieldsService';
import { toast } from '@/utils/toast';

export function ManualDocs() {
  const [statistics, setStatistics] = useState<FieldStatistics>({
    total: 0,
    withDescription: 0,
    withoutDescription: 0,
    percentageWithDescription: 0,
    translated: 0,
    percentageTranslated: 0,
  });

  const {
    isProcessing,
    logs,
    error,
    progress,
    applyDescriptions,
    translateDescriptions,
    exportToClipboard,
    clearLogs,
  } = useManualDocumentation();

  const getActiveProviderName = () => {
    return aiService.getActiveProviderName();
  };

  // Load statistics on mount and after processing
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await getFieldStatistics();
      setStatistics(stats);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const handleApplyDescriptions = async () => {
    const result = await applyDescriptions();

    if (result && result.success) {
      toast.success(`${result.updatedCount} campo(s) atualizado(s) com sucesso!`);
      await loadStatistics(); // Reload statistics after update
    } else {
      toast.error('Erro ao aplicar descrições do dicionário');
    }
  };

  const handleTranslate = async () => {
    const result = await translateDescriptions();

    if (result && result.success) {
      toast.success(`${result.translatedCount} descrição(ões) traduzida(s) com sucesso!`);
      await loadStatistics(); // Reload statistics after translation
    } else {
      toast.error('Erro ao traduzir descrições');
    }
  };

  const handleExport = async () => {
    const success = await exportToClipboard();
    if (success) {
      toast.success('Tabela copiada para área de transferência!');
    } else {
      toast.error('Erro ao exportar dados');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Docs</h1>
          <p className="text-muted-foreground mt-1">
            Aplica descrições do dicionário importado aos campos da API
          </p>
        </div>
        <FileSpreadsheet className="h-10 w-10 text-primary" />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total de Campos"
          value={statistics.total}
          icon={BarChart3}
          description="Campos extraídos das APIs"
        />
        <StatsCard
          title="Com Descrição"
          value={statistics.withDescription}
          percentage={statistics.percentageWithDescription}
          icon={FileSpreadsheet}
          description="Campos já documentados"
          trend="up"
        />
        <StatsCard
          title="Traduzidos (IA)"
          value={statistics.translated}
          percentage={statistics.percentageTranslated}
          icon={Languages}
          description="Descrições traduzidas por IA"
          trend="up"
        />
        <StatsCard
          title="Sem Descrição"
          value={statistics.withoutDescription}
          percentage={statistics.total > 0 ? ((statistics.withoutDescription / statistics.total) * 100) : 0}
          icon={FileSpreadsheet}
          description="Campos aguardando documentação"
          trend="down"
        />
      </div>

      {/* Main Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações</CardTitle>
          <CardDescription>
            Aplica descrições do dicionário aos campos que não possuem descrição
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleApplyDescriptions}
              disabled={isProcessing || statistics.withoutDescription === 0}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isProcessing ? 'Aplicando...' : 'Aplicar Descrições do Dicionário'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleTranslate}
              disabled={isProcessing || (statistics.withDescription - statistics.translated) === 0}
              className="cursor-pointer"
            >
              <Languages className="mr-2 h-4 w-4" />
              {isProcessing ? 'Traduzindo...' : `Traduzir Descrições (PT-BR) ${statistics.withDescription - statistics.translated > 0 ? `(${statistics.withDescription - statistics.translated})` : ''}`}
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={statistics.withDescription === 0}
              className="cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" />
              Exportar Documentados
            </Button>

            <Button
              variant="outline"
              onClick={loadStatistics}
              disabled={isProcessing}
              className="cursor-pointer"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Atualizar Estatísticas
            </Button>
          </div>

          {statistics.withoutDescription === 0 && statistics.total > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Todos os campos já possuem descrição!
              </p>
            </div>
          )}

          {statistics.total === 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ℹ Nenhum campo encontrado. Execute requests na aba "Request Builder" para gerar campos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Progresso (só aparece durante processamento ou se houver logs) */}
      {(isProcessing && logs.length > 0) && (
        <div className="mb-6">
          <ProgressPanel
            progress={progress}
            logs={logs}
            providerName={getActiveProviderName()}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-destructive">
              <FileSpreadsheet className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold">Erro no processamento</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Esta ferramenta busca descrições no <strong>dicionário importado</strong> (field_dictionary)
          </p>
          <p>
            • Faz a correspondência entre <code>json_path</code> (dicionário) e <code>campo</code> (response_fields)
          </p>
          <p>
            • Aplica as descrições apenas em campos que <strong>não possuem descrição</strong>
          </p>
          <p>
            • Campos com descrição existente <strong>não são substituídos</strong>
          </p>
          <p>
            • Ideal para documentação em massa de campos conhecidos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
