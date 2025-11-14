// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

export interface DictionaryField {
  id: number;
  business_element_name: string;
  description: string | null;
  reference_scots_table: string | null;
  json_path: string | null;
  element_name: string | null;
  element_type: string | null;
  json_data_type: string | null;
  example: string | null;
  created_at: string;
}

export interface DictionaryFieldInsert {
  business_element_name: string;
  description?: string | null;
  reference_scots_table?: string | null;
  json_path?: string | null;
  element_name?: string | null;
  element_type?: string | null;
  json_data_type?: string | null;
  example?: string | null;
}

/**
 * Importa múltiplos campos de dicionário do Excel
 */
export async function importDictionaryFromExcel(
  fields: DictionaryFieldInsert[],
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  if (fields.length === 0) return;

  try {
    const response = await fetch(`${API_BASE_URL}/dictionary/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entries: fields }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (onProgress) {
      onProgress(fields.length, fields.length);
    }
  } catch (error: any) {
    throw new Error(`Erro ao importar dicionário: ${error.message}`);
  }
}

export interface DictionaryPaginationResponse {
  entries: DictionaryField[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Busca campos do dicionário com paginação
 */
export async function getDictionaryFields(
  limit: number = 100,
  offset: number = 0
): Promise<DictionaryPaginationResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/dictionary?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos do dicionário: ${error.message}`);
  }
}

/**
 * Busca todos os campos do dicionário (para compatibilidade)
 * Agora retorna apenas os primeiros 100 por padrão
 */
export async function getAllDictionaryFields(): Promise<DictionaryField[]> {
  try {
    const result = await getDictionaryFields(100, 0);
    return result.entries;
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos do dicionário: ${error.message}`);
  }
}

/**
 * Busca campos do dicionário com filtro de busca
 */
export async function searchDictionaryFields(
  searchTerm: string
): Promise<DictionaryField[]> {
  try {
    const allFields = await getAllDictionaryFields();
    const searchLower = searchTerm.toLowerCase();

    return allFields.filter(field =>
      field.business_element_name?.toLowerCase().includes(searchLower) ||
      field.json_path?.toLowerCase().includes(searchLower) ||
      field.element_name?.toLowerCase().includes(searchLower)
    ).slice(0, 1000);
  } catch (error: any) {
    throw new Error(`Erro ao buscar campos: ${error.message}`);
  }
}

/**
 * Deleta um campo específico do dicionário
 */
export async function deleteDictionaryField(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/dictionary/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    throw new Error(`Erro ao deletar campo: ${error.message}`);
  }
}

/**
 * Limpa todos os campos do dicionário
 */
export async function clearAllDictionaryFields(): Promise<void> {
  try {
    const allFields = await getAllDictionaryFields();
    await Promise.all(allFields.map(field => deleteDictionaryField(field.id)));
  } catch (error: any) {
    throw new Error(`Erro ao limpar dicionário: ${error.message}`);
  }
}

/**
 * Busca estatísticas do dicionário
 */
export interface DictionaryStatistics {
  total: number;
}

export async function getDictionaryStatistics(): Promise<DictionaryStatistics> {
  try {
    const fields = await getAllDictionaryFields();
    return {
      total: fields.length,
    };
  } catch (error: any) {
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
  }
}
