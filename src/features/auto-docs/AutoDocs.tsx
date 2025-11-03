// src/features/auto-docs/AutoDocs.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Settings, Sparkles, Copy, BarChart3 } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ProgressPanel } from './ProgressPanel';
import { AIConfigModal } from './AIConfigModal';
import { useAIDocumentation } from '@/hooks/useAIDocumentation';
import { getFieldStatistics, type FieldStatistics } from '@/services/responseFieldsService';

export function AutoDocs() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
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
    copyAllWithDescription,
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

  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Documentação Automática</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Geração automática de descrições de campos usando IA
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar IA
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Ações Principais */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className="text-lg">Ações</CardTitle>
            <CardDescription>
              Adicione descrições automaticamente ou exporte a documentação completa
            </CardDescription>
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
                  <Button
                    onClick={startAutoDescription}
                    disabled={isProcessing || statistics.withoutDescription === 0}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isProcessing
                      ? 'Processando...'
                      : statistics.withoutDescription === 0
                      ? 'Nenhum campo pendente'
                      : `Adicionar Descrições (${statistics.withoutDescription})`}
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
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {statistics.withDescription === 0
                      ? 'Nenhum campo documentado'
                      : `Copiar Tudo (${statistics.withDescription})`}
                  </Button>
                  {statistics.withDescription > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Formato: Método | URL | Endpoint | Detalhes | Descrição
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Informações Adicionais */}
            {statistics.total === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-2">Nenhum campo cadastrado</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Vá para o Request Builder e faça requisições para popular o banco de dados com campos para documentar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
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
            value={getActiveProvider() === 'gemini' ? 'Gemini' : 'Ollama'}
            description={getActiveProviderName()}
            icon={Settings}
            variant="default"
          />
        </div>

        {/* Painel de Progresso (só aparece durante processamento ou se houver logs) */}
        {(isProcessing || logs.length > 0) && (
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
      </div>
    </div>
  );
}
