// src/services/manualDocsService.ts

const API_BASE_URL = '/api';

export interface ManualDocsResult {
  success: boolean;
  updatedCount: number;
  skippedCount: number;
  notFoundInDictionaryCount: number;
  totalFields: number;
  fieldsWithDescription: number;
  errors?: Array<{ fieldId: number; error: string }>;
}

export interface PreviewMatch {
  id: number;
  campo: string;
  current_description: string | null;
  dictionary_description: string;
}

export interface PreviewResult {
  preview: PreviewMatch[];
  totalMatches: number;
}

/**
 * Apply dictionary descriptions to response_fields
 * Only updates fields where descricao is NULL or empty
 */
export async function applyDictionaryDescriptions(): Promise<ManualDocsResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/manual-docs/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    throw new Error(`Erro ao aplicar descrições do dicionário: ${error.message}`);
  }
}

/**
 * Preview which fields would be updated (without making changes)
 */
export async function previewDictionaryMatches(): Promise<PreviewResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/manual-docs/preview`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    throw new Error(`Erro ao buscar preview: ${error.message}`);
  }
}
