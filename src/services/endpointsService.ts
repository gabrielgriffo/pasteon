import type { Endpoint, EndpointInsert, EndpointUpdate } from '../lib/database.types';

export type { Endpoint, EndpointInsert, EndpointUpdate };
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

/**
 * Busca todos os endpoints cadastrados
 * Ordenados por data de criação (mais recentes primeiro)
 */
export async function getEndpoints(): Promise<Endpoint[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/endpoints`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const endpoints = await response.json();
    return endpoints;
  } catch (error: any) {
    throw new Error(`Erro ao buscar endpoints: ${error.message}`);
  }
}

/**
 * Cria um novo endpoint
 */
export async function createEndpoint(
  metodo: HttpMethod,
  url: string
): Promise<Endpoint> {
  try {
    const response = await fetch(`${API_BASE_URL}/endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metodo, url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const endpoint = await response.json();
    return endpoint;
  } catch (error: any) {
    throw new Error(`Erro ao criar endpoint: ${error.message}`);
  }
}

/**
 * Atualiza um endpoint existente
 */
export async function updateEndpoint(
  id: number,
  metodo: HttpMethod,
  url: string
): Promise<Endpoint> {
  try {
    const response = await fetch(`${API_BASE_URL}/endpoints/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metodo, url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const endpoint = await response.json();
    return endpoint;
  } catch (error: any) {
    throw new Error(`Erro ao atualizar endpoint: ${error.message}`);
  }
}

/**
 * Deleta um endpoint
 */
export async function deleteEndpoint(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/endpoints/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    throw new Error(`Erro ao deletar endpoint: ${error.message}`);
  }
}
