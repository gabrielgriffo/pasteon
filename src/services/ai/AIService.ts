// src/services/ai/AIService.ts

import { OllamaProvider } from './OllamaProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { config, AI_PROVIDERS, type AIProvider } from './config';

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
 * Permite trocar entre Ollama (local), Gemini (cloud) e Groq (cloud ultra-rápido) de forma transparente
 */
class AIService {
  private providers: Record<AIProvider, OllamaProvider | GeminiProvider | GroqProvider>;
  private currentProvider: AIProvider;

  constructor() {
    this.providers = {
      [AI_PROVIDERS.OLLAMA]: new OllamaProvider(),
      [AI_PROVIDERS.GEMINI]: new GeminiProvider(),
      [AI_PROVIDERS.GROQ]: new GroqProvider(),
    };

    this.currentProvider = config.activeProvider;
  }

  /**
   * Retorna o provider ativo atual
   */
  getActiveProvider(): OllamaProvider | GeminiProvider | GroqProvider {
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
   * Altera o provider ativo
   */
  setProvider(providerName: AIProvider): void {
    if (!this.providers[providerName]) {
      throw new Error(`Provider "${providerName}" não existe`);
    }

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

    for (const [name, provider] of Object.entries(this.providers) as [AIProvider, OllamaProvider | GeminiProvider | GroqProvider][]) {
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
    return (Object.entries(this.providers) as [AIProvider, OllamaProvider | GeminiProvider | GroqProvider][]).map(
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
