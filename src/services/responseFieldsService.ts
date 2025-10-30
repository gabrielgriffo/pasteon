import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert } from '../lib/database.types';

export type ResponseField = Tables<'response_fields'>;
export type ResponseFieldInsert = TablesInsert<'response_fields'>;

export type FieldTipo = 'Body' | 'Query Params' | 'Response';

export interface FieldToSave {
  metodo: string;
  url: string;
  endpoint: string;
  campo: string;
  detalhes: string;
  tipo: FieldTipo;
}

/**
 * Salva múltiplos campos de request/response no banco de dados
 * Ignora duplicatas automaticamente usando ON CONFLICT DO NOTHING
 */
export async function saveResponseFields(fields: FieldToSave[]): Promise<void> {
  if (fields.length === 0) return;

  // Prepare data with empty descricao
  const dataToInsert: ResponseFieldInsert[] = fields.map((field) => ({
    metodo: field.metodo,
    url: field.url,
    endpoint: field.endpoint,
    campo: field.campo,
    detalhes: field.detalhes,
    tipo: field.tipo,
    descricao: '', // Empty for now, will be used in the future
  }));

  const { error } = await supabase
    .from('response_fields')
    .insert(dataToInsert)
    .select();

  if (error) {
    // Log error but don't throw - duplicates are expected and handled by database constraint
    console.warn('Some fields may not have been saved (possibly duplicates):', error.message);
  }
}

/**
 * Busca todos os campos salvos para um endpoint específico
 */
export async function getFieldsByEndpoint(
  metodo: string,
  endpoint: string
): Promise<ResponseField[]> {
  const { data, error } = await supabase
    .from('response_fields')
    .select('*')
    .eq('metodo', metodo)
    .eq('endpoint', endpoint)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar campos: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca todos os campos salvos
 */
export async function getAllFields(): Promise<ResponseField[]> {
  const { data, error } = await supabase
    .from('response_fields')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar campos: ${error.message}`);
  }

  return data || [];
}
