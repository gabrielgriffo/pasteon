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
  title?: string;
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
    title: field.title || null,
    descricao: '', // Empty for now, will be used in the future
  }));

  const { error } = await supabase
    .from('response_fields')
    .upsert(dataToInsert, {
      onConflict: 'metodo,url,endpoint,campo,detalhes',
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
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

/**
 * Atualiza a descrição de um campo específico
 */
export async function updateFieldDescription(
  id: number,
  descricao: string
): Promise<ResponseField> {
  const { data, error } = await supabase
    .from('response_fields')
    .update({ descricao })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar descrição: ${error.message}`);
  }

  return data;
}

/**
 * Busca campos que não possuem descrição
 */
export async function getFieldsWithoutDescription(): Promise<ResponseField[]> {
  const { data, error } = await supabase
    .from('response_fields')
    .select('*')
    .or('descricao.is.null,descricao.eq.')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar campos sem descrição: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca campos que possuem descrição preenchida
 */
export async function getFieldsWithDescription(): Promise<ResponseField[]> {
  const { data, error } = await supabase
    .from('response_fields')
    .select('*')
    .not('descricao', 'is', null)
    .neq('descricao', '')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar campos com descrição: ${error.message}`);
  }

  return data || [];
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
  const { count: total, error: totalError } = await supabase
    .from('response_fields')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    throw new Error(`Erro ao buscar total de campos: ${totalError.message}`);
  }

  const { count: withDescription, error: withDescError } = await supabase
    .from('response_fields')
    .select('*', { count: 'exact', head: true })
    .not('descricao', 'is', null)
    .neq('descricao', '');

  if (withDescError) {
    throw new Error(`Erro ao buscar campos com descrição: ${withDescError.message}`);
  }

  const totalCount = total || 0;
  const withDescCount = withDescription || 0;
  const withoutDescCount = totalCount - withDescCount;
  const percentage = totalCount > 0 ? (withDescCount / totalCount) * 100 : 0;

  return {
    total: totalCount,
    withDescription: withDescCount,
    withoutDescription: withoutDescCount,
    percentageWithDescription: Math.round(percentage * 10) / 10, // 1 casa decimal
  };
}
