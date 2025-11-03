// src/services/ai/GeminiProvider.ts

import { config } from './config';

export class GeminiProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private options: typeof config.gemini.options;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
    this.baseUrl = config.gemini.baseUrl;
    this.options = config.gemini.options;
  }

  /**
   * Gera uma descrição técnica para um campo de API usando Google Gemini
   */
  async generateDescription(campo: string, detalhes: string, tipo: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key do Gemini não configurada. Configure VITE_GEMINI_API_KEY no arquivo .env');
    }

    const prompt = this.buildPrompt(campo, detalhes, tipo);

    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: this.options.temperature,
            maxOutputTokens: this.options.maxOutputTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Tratamento específico para rate limit
        if (response.status === 429) {
          throw new Error('Rate limit atingido. Aguarde alguns segundos e tente novamente.');
        }

        throw new Error(
          `Gemini HTTP Error: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Resposta vazia do Gemini');
      }

      return this.cleanResponse(text);
    } catch (error) {
      throw new Error(
        `Falha ao gerar descrição com Gemini: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Verifica se o Gemini está disponível (API Key válida)
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }],
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
    return `Google Gemini (${this.model})`;
  }

  /**
   * Constrói o prompt otimizado para geração de descrições de campos
   */
  private buildPrompt(campo: string, detalhes: string, tipo: string): string {
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
- Ter no máximo 2 frases

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
