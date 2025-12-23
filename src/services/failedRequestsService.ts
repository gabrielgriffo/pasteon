// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

/**
 * Interface para dados de uma request que falhou com 401
 */
export interface FailedRequest401 {
  id: number;
  endpoint_id: number;
  body: string | null;
  title: string | null;
  bearer_token: string | null;
  error_status: number;
  error_message: string | null;
  error_response_body: string | null;
  created_at: string;
  metodo: string;
  url: string;
}

/**
 * Interface para salvar uma nova request com erro 401
 */
export interface FailedRequest401ToSave {
  endpoint_id: number;
  body?: string;
  title?: string;
  bearer_token?: string;
  error_status: number;
  error_message?: string;
  error_response_body?: string;
}

/**
 * Salva uma request que falhou com erro 401 no banco de dados
 */
export async function saveFailedRequest(data: FailedRequest401ToSave): Promise<FailedRequest401> {
  try {
    const response = await fetch(`${API_BASE_URL}/failed-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint_id: data.endpoint_id,
        body: data.body || null,
        title: data.title || null,
        bearer_token: data.bearer_token || null,
        error_status: data.error_status,
        error_message: data.error_message || null,
        error_response_body: data.error_response_body || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const failedRequest = await response.json();
    return failedRequest;
  } catch (error: any) {
    throw new Error(`Erro ao salvar request com erro 401: ${error.message}`);
  }
}

/**
 * Busca todas as requests que falharam com erro 401
 */
export async function getFailedRequests(): Promise<FailedRequest401[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/failed-requests`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const failedRequests = await response.json();
    return failedRequests;
  } catch (error: any) {
    throw new Error(`Erro ao buscar requests com erro 401: ${error.message}`);
  }
}

/**
 * Busca uma request específica que falhou com erro 401
 */
export async function getFailedRequest(id: number): Promise<FailedRequest401> {
  try {
    const response = await fetch(`${API_BASE_URL}/failed-requests/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const failedRequest = await response.json();
    return failedRequest;
  } catch (error: any) {
    throw new Error(`Erro ao buscar request com erro 401: ${error.message}`);
  }
}

/**
 * Deleta uma request que falhou com erro 401
 */
export async function deleteFailedRequest(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/failed-requests/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    throw new Error(`Erro ao deletar request com erro 401: ${error.message}`);
  }
}
