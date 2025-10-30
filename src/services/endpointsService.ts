import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../lib/database.types';

export type Endpoint = Tables<'endpoints'>;
export type EndpointInsert = TablesInsert<'endpoints'>;
export type EndpointUpdate = TablesUpdate<'endpoints'>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Busca todos os endpoints cadastrados
 * Ordenados por data de criação (mais recentes primeiro)
 */
export async function getEndpoints(): Promise<Endpoint[]> {
  const { data, error } = await supabase
    .from('endpoints')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar endpoints: ${error.message}`);
  }

  return data || [];
}

/**
 * Cria um novo endpoint
 */
export async function createEndpoint(
  metodo: HttpMethod,
  url: string
): Promise<Endpoint> {
  const { data, error } = await supabase
    .from('endpoints')
    .insert({ metodo, url })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar endpoint: ${error.message}`);
  }

  return data;
}

/**
 * Atualiza um endpoint existente
 */
export async function updateEndpoint(
  id: number,
  metodo: HttpMethod,
  url: string
): Promise<Endpoint> {
  const { data, error } = await supabase
    .from('endpoints')
    .update({ metodo, url })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar endpoint: ${error.message}`);
  }

  return data;
}

/**
 * Deleta um endpoint
 */
export async function deleteEndpoint(id: number): Promise<void> {
  const { error } = await supabase
    .from('endpoints')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao deletar endpoint: ${error.message}`);
  }
}
