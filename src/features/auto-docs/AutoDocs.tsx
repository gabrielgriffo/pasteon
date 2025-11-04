// src/features/auto-docs/AutoDocs.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Settings, Sparkles, Copy, BarChart3, X, Trash2 } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ProgressPanel } from './ProgressPanel';
import { AIConfigModal } from './AIConfigModal';
import { ConfirmClearDescriptionsModal } from './ConfirmClearDescriptionsModal';
import { useAIDocumentation } from '@/hooks/useAIDocumentation';
import { getFieldStatistics, type FieldStatistics } from '@/services/responseFieldsService';
import { toast } from '@/utils/toast';

export function AutoDocs() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isClearingDescriptions, setIsClearingDescriptions] = useState(false);
  const [retryUntilSuccess, setRetryUntilSuccess] = useState(() => {
    // Carrega preferência do localStorage
    const saved = localStorage.getItem('ai-retry-until-success');
    return saved === 'true';
  });
  const [statistics, setStatistics] = useState<FieldStatistics>({
    total: 0,
    withDescription: 0,
    withoutDescription: 0,
    percentageWithDescription: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const {
    isProcessing,
    progress,
    logs,
    error,
    rateLimitConfig,
    startAutoDescription,
    cancelProcessing,
    copyAllWithDescription,
    clearInvalidDescriptions,
    getInvalidDescriptionsCount,
    changeProvider,
    getActiveProvider,
    getActiveProviderName,
    checkProviders,
    updateRateLimitConfig,
  } = useAIDocumentation();

  // Carrega estatísticas ao montar o componente
  useEffect(() => {
    loadStatistics();
  }, []);

  // Recarrega estatísticas após processamento
  useEffect(() => {
    if (!isProcessing && progress.current > 0) {
      loadStatistics();
    }
  }, [isProcessing, progress.current]);

  // Helper para obter nome amigável do provider
  const getProviderDisplayName = (provider: string): string => {
    const providerMap: Record<string, string> = {
      'ollama': 'Ollama',
      'gemini': 'Gemini',
      'groq': 'Groq',
      'openrouter': 'OpenRouter',
    };
    return providerMap[provider] || provider;
  };

  const loadStatistics = async () => {
    try {
      setIsLoadingStats(true);
      const stats = await getFieldStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handler para mudar preferência de retry
  const handleRetryChange = (checked: boolean) => {
    setRetryUntilSuccess(checked);
    localStorage.setItem('ai-retry-until-success', checked.toString());
  };

  // Handler para iniciar processamento com opção de retry
  const handleStartProcessing = () => {
    startAutoDescription(retryUntilSuccess);
  };

  // Handler para abrir modal de limpeza
  const handleOpenClearModal = async () => {
    const count = await getInvalidDescriptionsCount();
    setInvalidCount(count);
    setIsClearModalOpen(true);
  };

  // Handler para confirmar limpeza
  const handleConfirmClear = async () => {
    try {
      setIsClearingDescriptions(true);
      const count = await clearInvalidDescriptions();

      // Recarrega estatísticas
      await loadStatistics();

      // Toast de sucesso
      if (count > 0) {
        toast.success(
          'Descrições removidas!',
          `${count} descrição(ões) inválida(s) foram removidas com sucesso`
        );
      } else {
        toast.info('Nenhuma descrição inválida encontrada');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao limpar descrições';
      toast.error('Erro ao limpar descrições', errorMsg);
    } finally {
      setIsClearingDescriptions(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-8 max-w-[85vw]">
        {/* Ações Principais */}
        <Card className='mb-6'>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Documentação Automática</CardTitle>
                </div>
              </div>
              <Button
                variant="secondary"
                size="default"
                onClick={() => setIsConfigModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar IA
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Botão Adicionar Descrições */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Processar com IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adiciona descrições automáticas nos campos que ainda não possuem usando {getActiveProviderName()}
                  </p>

                  {/* Checkbox de retry automático */}
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="retry-until-success"
                      checked={retryUntilSuccess}
                      onCheckedChange={handleRetryChange}
                      disabled={isProcessing}
                    />
                    <Label
                      htmlFor="retry-until-success"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Retry automático até sucesso
                    </Label>
                  </div>

                  {/* Botão de processar ou cancelar */}
                  <Button
                    onClick={isProcessing ? cancelProcessing : handleStartProcessing}
                    disabled={!isProcessing && statistics.withoutDescription === 0}
                    className="w-full"
                    variant={isProcessing ? 'destructive' : 'default'}
                  >
                    {isProcessing ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {statistics.withoutDescription === 0
                          ? 'Nenhum campo pendente'
                          : `Adicionar Descrições (${statistics.withoutDescription})`}
                      </>
                    )}
                  </Button>

                  {statistics.withoutDescription === 0 && statistics.total > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                      ✓ Todos os campos já possuem descrição
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Botão Copiar Documentação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Exportar Documentação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Copia todos os campos com descrição em formato de tabela para a área de transferência
                  </p>
                  <Button
                    onClick={copyAllWithDescription}
                    disabled={statistics.withDescription === 0}
                    variant="outline"
                    className="w-full mb-3"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {statistics.withDescription === 0
                      ? 'Nenhum campo documentado'
                      : `Copiar Tudo (${statistics.withDescription})`}
                  </Button>

                  {/* Botão Limpar Descrições Inválidas */}
                  <Button
                    onClick={handleOpenClearModal}
                    disabled={statistics.withDescription === 0}
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Inválidas
                  </Button>

                  {statistics.withDescription > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Formato: Título | Método | URL | Endpoint | Tipo | Campo | Detalhes | Descrição
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard de Estatísticas */}
        <div className="grid gap-2 md:grid-cols-4 mb-3">
          <StatsCard
            title="Total de Campos"
            value={isLoadingStats ? '...' : statistics.total}
            description="Campos salvos no banco"
            icon={BarChart3}
            variant="info"
          />
          <StatsCard
            title="Com Descrição"
            value={isLoadingStats ? '...' : statistics.withDescription}
            description={`${statistics.percentageWithDescription}% do total`}
            icon={FileText}
            variant="success"
          />
          <StatsCard
            title="Sem Descrição"
            value={isLoadingStats ? '...' : statistics.withoutDescription}
            description="Aguardando processamento"
            icon={Sparkles}
            variant="warning"
          />
          <StatsCard
            title="Provider Ativo"
            value={getProviderDisplayName(getActiveProvider())}
            description={getActiveProviderName()}
            icon={Settings}
            variant="default"
          />
        </div>

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
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-2 text-destructive">
                <Sparkles className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro no processamento</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Configuração */}
        <AIConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          currentProvider={getActiveProvider()}
          onChangeProvider={changeProvider}
          onCheckProviders={checkProviders}
          currentRateLimitConfig={rateLimitConfig}
          onUpdateRateLimitConfig={updateRateLimitConfig}
        />

        {/* Modal de Confirmação de Limpeza */}
        <ConfirmClearDescriptionsModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={handleConfirmClear}
          invalidCount={invalidCount}
          isLoading={isClearingDescriptions}
        />
      </div>
    </div>
  );
}
