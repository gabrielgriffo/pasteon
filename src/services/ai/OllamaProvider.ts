// src/services/ai/OllamaProvider.ts

import { config } from './config';
import { loadComplementaryText } from '@/utils/promptStorage';

export class OllamaProvider {
  private baseUrl: string;
  private model: string;
  private options: typeof config.ollama.options;

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.options = config.ollama.options;
  }

  /**
   * Gera uma descrição técnica para um campo de API usando Ollama local
   */
  async generateDescription(campo: string, detalhes: string, tipo: string): Promise<string> {
    const prompt = this.buildPrompt(campo, detalhes, tipo);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: this.options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      return this.cleanResponse(data.response);
    } catch (error) {
      throw new Error(
        `Falha ao gerar descrição com Ollama: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Verifica se o Ollama está disponível e rodando
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000), // 3 segundos timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retorna o nome amigável do provider
   */
  getName(): string {
    return `Ollama (Local - ${this.model})`;
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
