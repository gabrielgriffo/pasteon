// src/services/ai/OpenRouterProvider.ts

import { config } from './config';
import { loadComplementaryText } from '@/utils/promptStorage';

export class OpenRouterProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private options: { temperature: number; max_tokens: number };

  constructor() {
    this.apiKey = config.openrouter.apiKey;
    this.model = config.openrouter.model;
    this.baseUrl = config.openrouter.baseUrl;
    this.options = config.openrouter.options;
  }

  /**
   * Gera uma descrição técnica para um campo de API usando OpenRouter
   */
  async generateDescription(campo: string, detalhes: string, tipo: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key do OpenRouter não configurada. Configure VITE_OPENROUTER_API_KEY no arquivo .env');
    }

    const prompt = this.buildPrompt(campo, detalhes, tipo);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'API Documentation Generator',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.options.temperature,
          max_tokens: this.options.max_tokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Tratamento específico para rate limit
        if (response.status === 429) {
          throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
        }

        throw new Error(
          `OpenRouter HTTP Error: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('Resposta vazia do OpenRouter');
      }

      return this.cleanResponse(text);
    } catch (error) {
      throw new Error(
        `Falha ao gerar descrição com OpenRouter: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Verifica se o OpenRouter está disponível (API Key válida)
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'API Documentation Generator',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0.3,
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(5000), // 5 segundos timeout
      });

      // Status 200 (OK) ou 429 (Rate limit) indicam que a API Key é válida
      return response.ok || response.status === 429;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retorna o nome amigável do provider
   */
  getName(): string {
    return `OpenRouter (${this.model})`;
  }

  /**
   * Constrói o prompt otimizado para geração de descrições de campos
   */
  private buildPrompt(campo: string, detalhes: string, tipo: string): string {
    const complementaryText = loadComplementaryText();
    const complementarySection = complementaryText ? `\n\nINSTRUÇÕES ADICIONAIS: ${complementaryText}` : '';

    return `Você é um especialista técnico em documentação de APIs REST.

Analise o seguinte campo de uma resposta de API e gere uma descrição técnica clara e concisa (1-2 frases).

CAMPO: ${campo}
TIPO: ${tipo} (Body/Query Params/Response)
DETALHES: ${detalhes}

A descrição deve:
- Ser em Português do Brasil
- Explicar o que o campo representa
- Mencionar tipo de dado e formato se relevante
- Ser objetiva e técnica
- Não usar markdown, apenas texto plano
- Ter no máximo 2 frases${complementarySection}

Retorne APENAS a descrição, sem introduções ou explicações adicionais.`;
  }

  /**
   * Limpa a resposta da IA removendo formatações indesejadas
   */
  private cleanResponse(response: string): string {
    return response
      .trim()
      .replace(/^["']|["']$/g, '') // Remove aspas no início/fim
      .replace(/\n+/g, ' ') // Remove quebras de linha múltiplas
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }
}
