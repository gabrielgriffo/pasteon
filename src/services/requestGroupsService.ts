// src/services/requestGroupsService.ts

import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

export type RequestGroup = Tables<'request_groups'>;
export type RequestGroupInsert = TablesInsert<'request_groups'>;
export type RequestGroupUpdate = TablesUpdate<'request_groups'>;

export type GroupRequest = Tables<'group_requests'>;
export type GroupRequestInsert = TablesInsert<'group_requests'>;
export type GroupRequestUpdate = TablesUpdate<'group_requests'>;

/**
 * Interface para request completa (com dados do endpoint)
 */
export interface GroupRequestWithEndpoint extends GroupRequest {
  endpoint: {
    id: number;
    metodo: string;
    url: string;
  };
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
 * Ordenados por nome (alfabético)
 */
export async function getGroups(): Promise<RequestGroup[]> {
  const { data, error } = await supabase
    .from('request_groups')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar grupos: ${error.message}`);
  }

  return data || [];
}

/**
 * Cria um novo grupo vazio
 */
export async function createGroup(name: string): Promise<RequestGroup> {
  // Verifica se já existe um grupo com este nome
  const { data: existing } = await supabase
    .from('request_groups')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    throw new Error('Já existe um grupo com este nome');
  }

  const { data, error } = await supabase
    .from('request_groups')
    .insert({ name })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar grupo: ${error.message}`);
  }

  return data;
}

/**
 * Deleta um grupo (cascade deleta as requests do grupo)
 */
export async function deleteGroup(id: number): Promise<void> {
  const { error } = await supabase
    .from('request_groups')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao deletar grupo: ${error.message}`);
  }
}

/**
 * Busca todas as requests de um grupo específico
 * Retorna com dados completos do endpoint e ordenado por order_index
 */
export async function getGroupRequests(groupId: number): Promise<GroupRequestWithEndpoint[]> {
  const { data, error } = await supabase
    .from('group_requests')
    .select(`
      *,
      endpoint:endpoints(id, metodo, url)
    `)
    .eq('group_id', groupId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar requests do grupo: ${error.message}`);
  }

  // Type assertion porque o Supabase não infere corretamente nested selects
  return (data as unknown as GroupRequestWithEndpoint[]) || [];
}

/**
 * Salva/sobrescreve todas as requests de um grupo
 * Deleta as requests antigas e insere as novas
 */
export async function saveGroupRequests(
  groupId: number,
  requests: RequestToSave[]
): Promise<void> {
  // 1. Deleta todas as requests antigas do grupo
  const { error: deleteError } = await supabase
    .from('group_requests')
    .delete()
    .eq('group_id', groupId);

  if (deleteError) {
    throw new Error(`Erro ao limpar requests antigas: ${deleteError.message}`);
  }

  // 2. Se não há requests novas, apenas retorna (grupo vazio)
  if (requests.length === 0) {
    return;
  }

  // 3. Insere as novas requests
  const requestsToInsert: GroupRequestInsert[] = requests.map((req) => ({
    group_id: groupId,
    endpoint_id: req.endpointId,
    body: req.body || null,
    title: req.title || null,
    order_index: req.orderIndex,
  }));

  const { error: insertError } = await supabase
    .from('group_requests')
    .insert(requestsToInsert);

  if (insertError) {
    throw new Error(`Erro ao salvar requests: ${insertError.message}`);
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
 * Cria endpoints se não existirem e associa ao grupo
 */
export async function importPostmanCollection(
  collectionName: string,
  requests: PostmanImportRequest[]
): Promise<PostmanImportResult> {
  // 1. Verificar se já existe grupo com este nome
  const { data: existingGroup } = await supabase
    .from('request_groups')
    .select('id')
    .eq('name', collectionName)
    .maybeSingle();

  if (existingGroup) {
    throw new Error(
      `Já existe um grupo chamado "${collectionName}". Por favor, renomeie a collection ou delete o grupo existente.`
    );
  }

  // 2. Criar novo grupo
  const { data: newGroup, error: groupError } = await supabase
    .from('request_groups')
    .insert({ name: collectionName })
    .select()
    .single();

  if (groupError || !newGroup) {
    throw new Error(`Erro ao criar grupo: ${groupError?.message || 'Grupo não foi criado'}`);
  }

  let endpointsCreated = 0;
  let endpointsReused = 0;

  // 3. Processar cada request
  const requestsToSave: RequestToSave[] = [];

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];

    try {
      // 3.1. Verificar se endpoint já existe (metodo + url)
      const { data: existingEndpoint } = await supabase
        .from('endpoints')
        .select('id, metodo, url')
        .eq('metodo', request.method)
        .eq('url', request.url)
        .maybeSingle();

      let endpointId: number;

      if (existingEndpoint) {
        // Endpoint já existe, reutilizar
        endpointId = existingEndpoint.id;
        endpointsReused++;
      } else {
        // Criar novo endpoint
        const { data: newEndpoint, error: endpointError } = await supabase
          .from('endpoints')
          .insert({
            metodo: request.method,
            url: request.url,
          })
          .select('id')
          .single();

        if (endpointError || !newEndpoint) {
          console.warn(`Erro ao criar endpoint "${request.name}":`, endpointError?.message);
          continue; // Pular esta request e continuar com as outras
        }

        endpointId = newEndpoint.id;
        endpointsCreated++;
      }

      // 3.2. Adicionar à lista de requests do grupo
      requestsToSave.push({
        endpointId,
        body: request.body || '',
        title: request.name,
        orderIndex: i,
      });
    } catch (err) {
      console.warn(`Erro ao processar request "${request.name}":`, err);
      // Continuar com as próximas requests
    }
  }

  // 4. Salvar todas as requests no grupo
  if (requestsToSave.length === 0) {
    // Se nenhuma request foi processada com sucesso, deletar o grupo criado
    await supabase.from('request_groups').delete().eq('id', newGroup.id);
    throw new Error('Nenhuma request foi importada com sucesso');
  }

  await saveGroupRequests(newGroup.id, requestsToSave);

  return {
    group: newGroup,
    endpointsCreated,
    endpointsReused,
    totalRequests: requestsToSave.length,
  };
}
