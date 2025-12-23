import type { RequestGroup, GroupRequest } from '../lib/database.types';

export type { RequestGroup, GroupRequest };

// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

/**
 * Interface para request completa (com dados do endpoint)
 */
export interface GroupRequestWithEndpoint extends GroupRequest {
  id: number;
  metodo: string;
  url: string;
}

/**
 * Interface para salvar request no grupo
 */
export interface RequestToSave {
  endpointId: number;
  body: string;
  title: string;
  orderIndex: number;
}

/**
 * Busca todos os grupos cadastrados
 */
export async function getGroups(): Promise<RequestGroup[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/request-groups`);
    console.log(`${API_BASE_URL}/request-groups`);
    console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const groups = await response.json();
    return groups;
  } catch (error: any) {
    throw new Error(`Erro ao buscar grupos: ${error.message}`);
  }
}

/**
 * Cria um novo grupo vazio
 */
export async function createGroup(name: string): Promise<RequestGroup> {
  try {
    const response = await fetch(`${API_BASE_URL}/request-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const group = await response.json();
    return group;
  } catch (error: any) {
    throw new Error(`Erro ao criar grupo: ${error.message}`);
  }
}

/**
 * Deleta um grupo (cascade deleta as requests do grupo)
 */
export async function deleteGroup(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/request-groups/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    throw new Error(`Erro ao deletar grupo: ${error.message}`);
  }
}

/**
 * Busca todas as requests de um grupo específico
 */
export async function getGroupRequests(groupId: number): Promise<GroupRequestWithEndpoint[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/request-groups/${groupId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.requests || [];
  } catch (error: any) {
    throw new Error(`Erro ao buscar requests do grupo: ${error.message}`);
  }
}

/**
 * Salva/sobrescreve todas as requests de um grupo
 */
export async function saveGroupRequests(
  groupId: number,
  requests: RequestToSave[]
): Promise<void> {
  try {
    // Delete all old requests
    const existingRequests = await getGroupRequests(groupId);
    await Promise.all(
      existingRequests.map(req =>
        fetch(`${API_BASE_URL}/request-groups/${groupId}/requests/${req.id}`, {
          method: 'DELETE',
        })
      )
    );

    // Add new requests
    if (requests.length > 0) {
      await Promise.all(
        requests.map(req =>
          fetch(`${API_BASE_URL}/request-groups/${groupId}/requests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              endpoint_id: req.endpointId,
              body: req.body || null,
              title: req.title || null,
              order_index: req.orderIndex,
            }),
          })
        )
      );
    }
  } catch (error: any) {
    throw new Error(`Erro ao salvar requests: ${error.message}`);
  }
}

/**
 * Interface para dados de importação do Postman
 */
export interface PostmanImportRequest {
  name: string;
  method: string;
  url: string;
  body?: string;
}

export interface PostmanImportResult {
  group: RequestGroup;
  endpointsCreated: number;
  endpointsReused: number;
  totalRequests: number;
}

/**
 * Importa uma Postman Collection para um novo grupo
 * (Implementação simplificada - usar endpoint dedicado no futuro)
 */
export async function importPostmanCollection(
  collectionName: string,
  requests: PostmanImportRequest[]
): Promise<PostmanImportResult> {
  try {
    // Create group
    const group = await createGroup(collectionName);

    let endpointsCreated = 0;
    let endpointsReused = 0;

    // Import endpoints and requests
    const requestsToSave: RequestToSave[] = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];

      try {
        // Try to create endpoint (API will return 409 if exists)
        const response = await fetch(`${API_BASE_URL}/endpoints`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metodo: request.method, url: request.url }),
        });

        let endpointId: number;

        if (response.status === 201) {
          const endpoint = await response.json();
          endpointId = endpoint.id;
          endpointsCreated++;
        } else if (response.status === 409) {
          // Endpoint exists, fetch it
          const allEndpoints = await fetch(`${API_BASE_URL}/endpoints`).then(r => r.json());
          const existing = allEndpoints.find(
            (e: any) => e.metodo === request.method && e.url === request.url
          );
          if (existing) {
            endpointId = existing.id;
            endpointsReused++;
          } else {
            continue;
          }
        } else {
          continue;
        }

        requestsToSave.push({
          endpointId,
          body: request.body || '',
          title: request.name,
          orderIndex: i,
        });
      } catch (err) {
        console.warn(`Erro ao processar request "${request.name}":`, err);
      }
    }

    // Save all requests to group
    if (requestsToSave.length === 0) {
      await deleteGroup(group.id);
      throw new Error('Nenhuma request foi importada com sucesso');
    }

    await saveGroupRequests(group.id, requestsToSave);

    return {
      group,
      endpointsCreated,
      endpointsReused,
      totalRequests: requestsToSave.length,
    };
  } catch (error: any) {
    throw new Error(`Erro ao importar Postman collection: ${error.message}`);
  }
}
