// src/features/auto-docs/AIConfigModal.tsx

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle2, Loader2, Bot, Cloud, Clock, Zap, Calendar, ChevronDown } from 'lucide-react';
import { AI_PROVIDERS } from '@/services/ai/AIService';
import type { AIProvider } from '@/services/ai/config';
import type { ProviderStatus } from '@/services/ai/AIService';
import type { RateLimitConfig } from '@/services/aiSettingsService';
import { getDefaultSettings } from '@/services/aiSettingsService';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvider: AIProvider;
  onChangeProvider: (provider: AIProvider) => Promise<void>;
  onCheckProviders: () => Promise<Record<AIProvider, ProviderStatus>>;
  currentRateLimitConfig: RateLimitConfig | null;
  onUpdateRateLimitConfig: (config: RateLimitConfig) => Promise<void>;
}

export function AIConfigModal({
  isOpen,
  onClose,
  currentProvider,
  onChangeProvider,
  onCheckProviders,
  currentRateLimitConfig,
  onUpdateRateLimitConfig,
}: AIConfigModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentProvider);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<AIProvider, ProviderStatus> | null>(null);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);

  // Estados para configuração de rate limit
  const [rpmEnabled, setRpmEnabled] = useState(false);
  const [rpmLimit, setRpmLimit] = useState(60);
  const [rpdEnabled, setRpdEnabled] = useState(false);
  const [rpdLimit, setRpdLimit] = useState(1500);

  useEffect(() => {
    setSelectedProvider(currentProvider);
  }, [currentProvider]);

  // Carrega configuração de rate limit ao abrir modal ou ao trocar provider
  useEffect(() => {
    if (isOpen && currentRateLimitConfig) {
      // Carrega configuração do provider atual
      const defaults = getDefaultSettings(selectedProvider);
      const config = currentRateLimitConfig;

      // Se for a primeira vez ou o provider mudou, carrega os defaults
      setRpmEnabled(config.rpmEnabled ?? defaults.rpmEnabled);
      setRpmLimit(config.rpmLimit ?? defaults.rpmLimit);
      setRpdEnabled(config.rpdEnabled ?? defaults.rpdEnabled);
      setRpdLimit(config.rpdLimit ?? defaults.rpdLimit);
    }
  }, [isOpen, selectedProvider, currentRateLimitConfig]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults(null);

    try {
      const results = await onCheckProviders();
      setTestResults(results);
    } catch (error) {
      console.error('Erro ao testar conexões:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Helper para obter informações do provider (ícone e nome)
  const getProviderInfo = (provider: AIProvider) => {
    const providerMap = {
      [AI_PROVIDERS.OLLAMA]: { icon: Bot, name: 'Ollama (Local)' },
      [AI_PROVIDERS.GEMINI]: { icon: Cloud, name: 'Google Gemini (Cloud)' },
      [AI_PROVIDERS.GROQ]: { icon: Zap, name: 'Groq (Cloud - Ultra Rápido)' },
      [AI_PROVIDERS.OPENROUTER]: { icon: Cloud, name: 'OpenRouter (Cloud - Multi-Model)' },
    };
    return providerMap[provider];
  };

  const handleSave = async () => {
    // Salva provider se alterado
    if (selectedProvider !== currentProvider) {
      await onChangeProvider(selectedProvider);
    }

    // Salva configuração de rate limit
    if (currentRateLimitConfig) {
      await onUpdateRateLimitConfig({
        rpmEnabled,
        rpmLimit: rpmEnabled ? Math.max(1, rpmLimit) : 0,
        currentRpm: currentRateLimitConfig.currentRpm,
        lastResetMinute: currentRateLimitConfig.lastResetMinute,
        rpdEnabled,
        rpdLimit: rpdEnabled ? Math.max(1, rpdLimit) : 0,
        currentRpd: currentRateLimitConfig.currentRpd,
        lastResetDay: currentRateLimitConfig.lastResetDay,
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurações de IA</DialogTitle>
          <DialogDescription>
            Configure o provider de IA para gerar descrições automáticas dos campos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 py-4">
          {/* Seleção de Provider - Collapsible */}
          <Collapsible open={isProviderSelectorOpen} onOpenChange={setIsProviderSelectorOpen}>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Selecione o Provider</Label>

              {/* Trigger - Mostra provider selecionado */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg cursor-pointer hover:bg-accent transition-colors bg-primary/5">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const ProviderIcon = getProviderInfo(selectedProvider).icon;
                      return <ProviderIcon className="h-5 w-5" />;
                    })()}
                    <div className="text-left">
                      <p className="font-semibold">{getProviderInfo(selectedProvider).name}</p>
                      <p className="text-sm text-muted-foreground">Clique para trocar</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isProviderSelectorOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </CollapsibleTrigger>

              {/* Content - Lista de todos os providers */}
              <CollapsibleContent>
                <div className="space-y-3 mt-3">
            {/* Ollama (Local) */}
            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedProvider === AI_PROVIDERS.OLLAMA
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(AI_PROVIDERS.OLLAMA)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={selectedProvider === AI_PROVIDERS.OLLAMA}
                    onChange={() => setSelectedProvider(AI_PROVIDERS.OLLAMA)}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <span className="font-semibold">Ollama (Local)</span>
                    {testResults?.ollama && (
                      <Badge variant={testResults.ollama.available ? 'default' : 'destructive'}>
                        {testResults.ollama.available ? 'Disponível' : 'Offline'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Executa modelos de IA localmente. Requer Ollama instalado e rodando.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p>• URL: {import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'}</p>
                    <p>• Modelo: {import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'}</p>
                    <p>• Vantagens: Privacidade total, sem custos, sem rate limits</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Gemini (Cloud) */}
            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedProvider === AI_PROVIDERS.GEMINI
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(AI_PROVIDERS.GEMINI)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={selectedProvider === AI_PROVIDERS.GEMINI}
                    onChange={() => setSelectedProvider(AI_PROVIDERS.GEMINI)}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    <span className="font-semibold">Google Gemini (Cloud)</span>
                    {testResults?.gemini && (
                      <Badge variant={testResults.gemini.available ? 'default' : 'destructive'}>
                        {testResults.gemini.available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    API do Google com tier gratuito generoso. Requer chave de API.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p>• Modelo: {import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp'}</p>
                    <p>• API Key: {import.meta.env.VITE_GEMINI_API_KEY ? '✓ Configurada' : '✗ Não configurada'}</p>
                    <p>• Vantagens: Não requer instalação, acesso remoto, sempre atualizado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Groq (Cloud - Ultra Fast) */}
            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedProvider === AI_PROVIDERS.GROQ
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(AI_PROVIDERS.GROQ)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={selectedProvider === AI_PROVIDERS.GROQ}
                    onChange={() => setSelectedProvider(AI_PROVIDERS.GROQ)}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <span className="font-semibold">Groq (Cloud - Ultra Rápido)</span>
                    {testResults?.groq && (
                      <Badge variant={testResults.groq.available ? 'default' : 'destructive'}>
                        {testResults.groq.available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    API ultra-rápida com modelos open-source. Requer chave de API gratuita.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p>• Modelo: {import.meta.env.VITE_GROQ_MODEL || 'llama3-8b-8192'}</p>
                    <p>• API Key: {import.meta.env.VITE_GROQ_API_KEY ? '✓ Configurada' : '✗ Não configurada'}</p>
                    <p>• Vantagens: Inferência extremamente rápida, modelos Llama/Mistral/Qwen</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OpenRouter (Cloud - Multi-Model) */}
            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                selectedProvider === AI_PROVIDERS.OPENROUTER
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(AI_PROVIDERS.OPENROUTER)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <input
                    type="radio"
                    checked={selectedProvider === AI_PROVIDERS.OPENROUTER}
                    onChange={() => setSelectedProvider(AI_PROVIDERS.OPENROUTER)}
                    className="cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    <span className="font-semibold">OpenRouter (Cloud - Multi-Model)</span>
                    {testResults?.openrouter && (
                      <Badge variant={testResults.openrouter.available ? 'default' : 'destructive'}>
                        {testResults.openrouter.available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Acesso unificado a múltiplos modelos (OpenAI, Anthropic, Meta, Google). Requer chave de API.
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p>• Modelo: {import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'}</p>
                    <p>• API Key: {import.meta.env.VITE_OPENROUTER_API_KEY ? '✓ Configurada' : '✗ Não configurada'}</p>
                    <p>• Vantagens: Acesso a 100+ modelos, API unificada, tier gratuito disponível</p>
                  </div>
                </div>
              </div>
            </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Separator />

          {/* Configuração de Rate Limit */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-semibold">Controle de Rate Limit</Label>
            </div>

            <div className="space-y-4">
              {/* RPM - Requisições por Minuto */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rpm-enabled"
                    checked={rpmEnabled}
                    onChange={(e) => setRpmEnabled(e.target.checked)}
                    className="cursor-pointer h-4 w-4"
                  />
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="rpm-enabled" className="cursor-pointer font-normal">
                    Limitar requisições por minuto (RPM)
                  </Label>
                </div>

                {rpmEnabled && (
                  <div className="ml-6 space-y-2 rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor="rpm-limit" className="text-sm">Requisições por minuto</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            id="rpm-limit"
                            type="number"
                            min={1}
                            max={1000}
                            step={1}
                            value={rpmLimit}
                            onChange={(e) => setRpmLimit(parseInt(e.target.value) || 60)}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">req/min</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ⏳ Ao atingir o limite, o processamento aguarda até o próximo minuto para continuar.
                    </p>
                  </div>
                )}
              </div>

              {/* RPD - Requisições por Dia */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rpd-enabled"
                    checked={rpdEnabled}
                    onChange={(e) => setRpdEnabled(e.target.checked)}
                    className="cursor-pointer h-4 w-4"
                  />
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="rpd-enabled" className="cursor-pointer font-normal">
                    Limitar requisições por dia (RPD)
                  </Label>
                </div>

                {rpdEnabled && (
                  <div className="ml-6 space-y-2 rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label htmlFor="rpd-limit" className="text-sm">Requisições por dia</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            id="rpd-limit"
                            type="number"
                            min={1}
                            max={50000}
                            step={10}
                            value={rpdLimit}
                            onChange={(e) => setRpdLimit(parseInt(e.target.value) || 1500)}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">req/dia</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      🚫 Ao atingir o limite, o processamento é cancelado. Reset automático à meia-noite.
                    </p>
                  </div>
                )}
              </div>

              {/* Informações dos Providers */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100 font-semibold mb-2">
                  📋 Limites Recomendados:
                </p>
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>Gemini Free Tier:</strong> RPM=10, RPD=50</p>
                  <p><strong>Groq Free Tier:</strong> RPM=30, RPD=14400</p>
                  <p><strong>OpenRouter Free Tier:</strong> RPM=20, RPD=200</p>
                  <p><strong>Ollama Local:</strong> Sem limites (desabilite ambos)</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
        <DialogFooter>
          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar Configurações
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  );
}
