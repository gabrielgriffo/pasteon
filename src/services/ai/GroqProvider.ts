// src/services/ai/GroqProvider.ts

import { config } from './config';
import { loadComplementaryText } from '@/utils/promptStorage';

export class GroqProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private options: { temperature: number; max_tokens: number };

  constructor() {
    this.apiKey = config.groq.apiKey;
    this.model = config.groq.model;
    this.baseUrl = config.groq.baseUrl;
    this.options = config.groq.options;
  }

  /**
   * Gera uma descrição técnica para um campo de API usando Groq
   */
  async generateDescription(campo: string, detalhes: string, tipo: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key do Groq não configurada. Configure VITE_GROQ_API_KEY no arquivo .env');
    }

    const prompt = this.buildPrompt(campo, detalhes, tipo);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
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
          `Groq HTTP Error: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('Resposta vazia do Groq');
      }

      return this.cleanResponse(text);
    } catch (error) {
      throw new Error(
        `Falha ao gerar descrição com Groq: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Traduz uma descrição de inglês para Português do Brasil
   */
  async translateDescription(description: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key do Groq não configurada. Configure VITE_GROQ_API_KEY no arquivo .env');
    }

    const prompt = this.buildTranslationPrompt(description);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
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

        if (response.status === 429) {
          throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
        }

        throw new Error(
          `Groq HTTP Error: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('Resposta vazia do Groq');
      }

      return this.cleanResponse(text);
    } catch (error) {
      throw new Error(
        `Falha ao traduzir com Groq: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Verifica se o Groq está disponível (API Key válida)
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
    return `Groq (${this.model})`;
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
- Explicar o que o campo representa
- Mencionar tipo de dado e formato se relevante
- Ser objetiva e técnica
- Não usar markdown, apenas texto plano
- Ter no máximo 2 frases${complementarySection}

Retorne APENAS a descrição, sem introduções ou explicações adicionais.`;
  }

  /**
   * Constrói o prompt para tradução de descrições
   */
  private buildTranslationPrompt(description: string): string {
    return `Você é um tradutor técnico especializado em documentação de APIs.

Traduza a seguinte descrição técnica de API de inglês para Português do Brasil.

DESCRIÇÃO EM INGLÊS:
${description}

REGRAS:
- Mantenha termos técnicos apropriados (ex: "token", "endpoint", "array", "boolean")
- Mantenha a formatação e pontuação
- Seja preciso e natural em Português do Brasil
- Não adicione explicações, apenas traduza

Retorne APENAS a tradução em Português do Brasil.`;
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
