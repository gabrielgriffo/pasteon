// src/services/ai/AIService.ts

import { OllamaProvider } from './OllamaProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { config, AI_PROVIDERS, type AIProvider } from './config';
import { getActiveProvider, setActiveProvider } from '@/services/aiSettingsService';

export interface ProviderStatus {
  name: string;
  available: boolean;
  active: boolean;
}

export interface GenerationResult {
  success: boolean;
  description?: string;
  error?: string;
  provider: AIProvider;
  providerName: string;
  elapsedTime: number;
}

/**
 * Serviço unificado de IA que implementa o Adapter Pattern
 * Permite trocar entre Ollama (local), Gemini (cloud), Groq (cloud ultra-rápido) e OpenRouter (cloud multi-model) de forma transparente
 */
class AIService {
  private providers: Record<AIProvider, OllamaProvider | GeminiProvider | GroqProvider | OpenRouterProvider>;
  private currentProvider: AIProvider;
  private isInitialized: boolean = false;

  constructor() {
    this.providers = {
      [AI_PROVIDERS.OLLAMA]: new OllamaProvider(),
      [AI_PROVIDERS.GEMINI]: new GeminiProvider(),
      [AI_PROVIDERS.GROQ]: new GroqProvider(),
      [AI_PROVIDERS.OPENROUTER]: new OpenRouterProvider(),
    };

    // Inicializa com fallback, será carregado do banco assincronamente
    this.currentProvider = config.activeProvider;
    this.loadActiveProvider();
  }

  /**
   * Carrega o provider ativo do banco de dados
   */
  private async loadActiveProvider(): Promise<void> {
    try {
      this.currentProvider = await getActiveProvider();
      this.isInitialized = true;
      console.log(`✅ Provider carregado do banco: ${this.getActiveProvider().getName()}`);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar provider do banco, usando fallback:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Aguarda a inicialização do serviço (carregamento do provider do banco)
   */
  async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;

    // Aguarda até 5 segundos pela inicialização
    for (let i = 0; i < 50; i++) {
      if (this.isInitialized) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Retorna o provider ativo atual
   */
  getActiveProvider(): OllamaProvider | GeminiProvider | GroqProvider | OpenRouterProvider {
    return this.providers[this.currentProvider];
  }

  /**
   * Retorna o nome do provider ativo
   */
  getActiveProviderName(): string {
    return this.getActiveProvider().getName();
  }

  /**
   * Retorna o tipo do provider ativo (ollama ou gemini)
   */
  getActiveProviderType(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Altera o provider ativo e salva no banco de dados
   */
  async setProvider(providerName: AIProvider): Promise<void> {
    if (!this.providers[providerName]) {
      throw new Error(`Provider "${providerName}" não existe`);
    }

    // Salva no banco de dados
    await setActiveProvider(providerName);

    // Atualiza estado local
    this.currentProvider = providerName;
    console.log(`✅ Provider alterado para: ${this.getActiveProvider().getName()}`);
  }

  /**
   * Gera descrição para um campo usando o provider ativo
   */
  async generateFieldDescription(
    campo: string,
    detalhes: string,
    tipo: string
  ): Promise<GenerationResult> {
    const provider = this.getActiveProvider();
    const startTime = Date.now();

    try {
      const description = await provider.generateDescription(campo, detalhes, tipo);

      return {
        success: true,
        description,
        provider: this.currentProvider,
        providerName: provider.getName(),
        elapsedTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        provider: this.currentProvider,
        providerName: provider.getName(),
        elapsedTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Verifica o status de todos os providers
   */
  async checkProviders(): Promise<Record<AIProvider, ProviderStatus>> {
    const status = {} as Record<AIProvider, ProviderStatus>;

    for (const [name, provider] of Object.entries(this.providers) as [AIProvider, OllamaProvider | GeminiProvider | GroqProvider | OpenRouterProvider][]) {
      const available = await provider.isAvailable();
      status[name] = {
        name: provider.getName(),
        available,
        active: name === this.currentProvider,
      };
    }

    return status;
  }

  /**
   * Lista todos os providers disponíveis
   */
  listProviders(): Array<{ id: AIProvider; name: string; active: boolean }> {
    return (Object.entries(this.providers) as [AIProvider, OllamaProvider | GeminiProvider | GroqProvider | OpenRouterProvider][]).map(
      ([key, provider]) => ({
        id: key,
        name: provider.getName(),
        active: key === this.currentProvider,
      })
    );
  }
}

// Exporta instância singleton do serviço
export const aiService = new AIService();
export { AI_PROVIDERS };
