import type { ResponseField, ResponseFieldInsert } from '../lib/database.types';

export type { ResponseField, ResponseFieldInsert };
export type FieldTipo = 'Body' | 'Query Params' | 'Response';

// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

export interface FieldToSave {
  metodo: string;
  url: string;
  endpoint: string;
  campo: string;
  detalhes: string;
  tipo: FieldTipo;
  title?: string;
}

/**
 * Salva múltiplos campos de request/response no banco de dados
 * Ignora duplicatas automaticamente
 */
export async function saveResponseFields(fields: FieldToSave[]): Promise<void> {
  if (fields.length === 0) return;

  try {
    // Save fields one by one (API handles INSERT IGNORE)
    const promises = fields.map(field =>
      fetch(`${API_BASE_URL}/response-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metodo: field.metodo,
          url: field.url,
          endpoint: field.endpoint,
          tipo: field.tipo,
          campo: field.campo,
          detalhes: field.detalhes,
          descricao: '',
        }),
      })
    );

    await Promise.all(promises);
  } catch (error: any) {
    throw new Error(`Erro ao salvar campos: ${error.message}`);
  }
}

/**
 * Busca todos os campos salvos para um endpoint específico
 */
export async function getFieldsByEndpoint(
  metodo: string,
  endpoint: string
): Promise<ResponseField[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/response-fields?metodo=${encodeURIComponent(metodo)}&endpoint=${encodeURIComponent(endpoint)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fields = await response.json();
    return fields;
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos: ${error.message}`);
  }
}

/**
 * Busca todos os campos salvos
 */
export async function getAllFields(): Promise<ResponseField[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/response-fields`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fields = await response.json();
    return fields;
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos: ${error.message}`);
  }
}

/**
 * Atualiza a descrição de um campo específico
 */
export async function updateFieldDescription(
  id: number,
  descricao: string
): Promise<ResponseField> {
  try {
    const response = await fetch(`${API_BASE_URL}/response-fields/${id}/description`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ descricao }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const field = await response.json();
    return field;
  } catch (error: any) {
    throw new Error(`Erro ao atualizar descrição: ${error.message}`);
  }
}

/**
 * Busca campos que não possuem descrição
 */
export async function getFieldsWithoutDescription(): Promise<ResponseField[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/response-fields/without-description`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fields = await response.json();
    return fields;
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos sem descrição: ${error.message}`);
  }
}

/**
 * Busca campos que possuem descrição preenchida
 */
export async function getFieldsWithDescription(): Promise<ResponseField[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/response-fields/with-description`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fields = await response.json();
    return fields;
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos com descrição: ${error.message}`);
  }
}

/**
 * Conta quantos campos têm descrições inválidas (que não terminam com ponto final)
 */
export async function countInvalidDescriptions(): Promise<number> {
  try {
    // Filter invalid descriptions on the client side
    const fields = await getFieldsWithDescription();
    const invalid = fields.filter(
      field => field.descricao && !field.descricao.trim().endsWith('.')
    );
    return invalid.length;
  } catch (error: any) {
    throw new Error(`Erro ao contar descrições inválidas: ${error.message}`);
  }
}

/**
 * Remove descrições inválidas (que não terminam com ponto final)
 * Seta descricao = '' para que possam ser reprocessadas
 */
export async function clearInvalidDescriptions(): Promise<number> {
  try {
    // Get all fields with descriptions
    const fields = await getFieldsWithDescription();
    const invalidFields = fields.filter(
      field => field.descricao && !field.descricao.trim().endsWith('.')
    );

    if (invalidFields.length === 0) {
      return 0;
    }

    // Clear invalid descriptions
    const promises = invalidFields.map(field =>
      updateFieldDescription(field.id, '')
    );

    await Promise.all(promises);

    return invalidFields.length;
  } catch (error: any) {
    throw new Error(`Erro ao limpar descrições inválidas: ${error.message}`);
  }
}

/**
 * Busca estatísticas dos campos
 */
export interface FieldStatistics {
  total: number;
  withDescription: number;
  withoutDescription: number;
  percentageWithDescription: number;
}

export async function getFieldStatistics(): Promise<FieldStatistics> {
  try {
    const response = await fetch(`${API_BASE_URL}/response-fields/statistics`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const stats = await response.json();
    return {
      total: stats.total,
      withDescription: stats.withDescription,
      withoutDescription: stats.withoutDescription,
      percentageWithDescription: parseFloat(stats.percentageDocumented),
    };
  } catch (error: any) {
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
  }
}
