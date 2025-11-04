// src/utils/promptStorage.ts

const STORAGE_KEY = 'ai_complementary_text';

/**
 * Salva o texto complementar no localStorage
 */
export function saveComplementaryText(text: string): void {
  localStorage.setItem(STORAGE_KEY, text);
}

/**
 * Carrega o texto complementar do localStorage
 * @returns O texto salvo ou string vazia se não existir
 */
export function loadComplementaryText(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

/**
 * Remove o texto complementar do localStorage
 */
export function clearComplementaryText(): void {
  localStorage.removeItem(STORAGE_KEY);
}
