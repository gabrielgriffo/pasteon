// ================================================================
// Database TypeScript Types for MySQL
// Type definitions for all database tables
// ================================================================

/**
 * Table: endpoints
 * Stores API endpoints (method + URL)
 */
export interface Endpoint {
  id: number;
  metodo: string;
  url: string;
  created_at: Date | string;
}

export interface EndpointInsert {
  metodo: string;
  url: string;
}

export interface EndpointUpdate {
  metodo?: string;
  url?: string;
}

/**
 * Table: response_fields
 * Stores extracted fields from API responses
 */
export interface ResponseField {
  id: number;
  metodo: string;
  url: string;
  endpoint: string;
  campo: string;
  detalhes: string;
  tipo: string;
  title: string | null;
  descricao: string | null;
  created_at: Date | string;
}

export interface ResponseFieldInsert {
  metodo: string;
  url: string;
  endpoint: string;
  campo: string;
  detalhes: string;
  tipo: string;
  title?: string | null;
  descricao?: string | null;
}

export interface ResponseFieldUpdate {
  metodo?: string;
  url?: string;
  endpoint?: string;
  campo?: string;
  detalhes?: string;
  tipo?: string;
  title?: string | null;
  descricao?: string | null;
}

/**
 * Table: request_groups
 * Stores groups of API requests (e.g., Postman collections)
 */
export interface RequestGroup {
  id: number;
  name: string;
  created_at: Date | string;
}

export interface RequestGroupInsert {
  name: string;
}

export interface RequestGroupUpdate {
  name?: string;
}

/**
 * Table: group_requests
 * Stores individual requests within groups
 */
export interface GroupRequest {
  id: number;
  group_id: number;
  endpoint_id: number;
  body: string | null;
  title: string | null;
  order_index: number;
  created_at: Date | string;
}

export interface GroupRequestInsert {
  group_id: number;
  endpoint_id: number;
  body?: string | null;
  title?: string | null;
  order_index?: number;
}

export interface GroupRequestUpdate {
  group_id?: number;
  endpoint_id?: number;
  body?: string | null;
  title?: string | null;
  order_index?: number;
}

/**
 * Table: ai_provider_settings
 * Stores AI provider rate limit configurations
 */
export interface AIProviderSettings {
  id: string;
  provider: string;
  is_active: boolean;
  rpm_enabled: boolean;
  rpm_limit: number;
  current_rpm: number;
  last_reset_minute: number;
  rpd_enabled: boolean;
  rpd_limit: number;
  current_rpd: number;
  last_reset_day: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AIProviderSettingsInsert {
  id?: string;
  provider: string;
  is_active?: boolean;
  rpm_enabled?: boolean;
  rpm_limit?: number;
  current_rpm?: number;
  last_reset_minute?: number;
  rpd_enabled?: boolean;
  rpd_limit?: number;
  current_rpd?: number;
  last_reset_day?: string;
}

export interface AIProviderSettingsUpdate {
  provider?: string;
  is_active?: boolean;
  rpm_enabled?: boolean;
  rpm_limit?: number;
  current_rpm?: number;
  last_reset_minute?: number;
  rpd_enabled?: boolean;
  rpd_limit?: number;
  current_rpd?: number;
  last_reset_day?: string;
}

/**
 * Table: field_dictionary
 * Stores field dictionary imported from Excel
 */
export interface FieldDictionary {
  id: number;
  business_element_name: string;
  description: string | null;
  reference_scots_table: string | null;
  json_path: string | null;
  element_name: string | null;
  element_type: string | null;
  json_data_type: string | null;
  example: string | null;
  created_at: Date | string;
}

export interface FieldDictionaryInsert {
  business_element_name: string;
  description?: string | null;
  reference_scots_table?: string | null;
  json_path?: string | null;
  element_name?: string | null;
  element_type?: string | null;
  json_data_type?: string | null;
  example?: string | null;
}

export interface FieldDictionaryUpdate {
  business_element_name?: string;
  description?: string | null;
  reference_scots_table?: string | null;
  json_path?: string | null;
  element_name?: string | null;
  element_type?: string | null;
  json_data_type?: string | null;
  example?: string | null;
}

// Legacy support - kept for backward compatibility
export type Tables<T extends string> =
  T extends 'endpoints' ? Endpoint :
  T extends 'response_fields' ? ResponseField :
  T extends 'request_groups' ? RequestGroup :
  T extends 'group_requests' ? GroupRequest :
  T extends 'ai_provider_settings' ? AIProviderSettings :
  T extends 'field_dictionary' ? FieldDictionary :
  never;

export type TablesInsert<T extends string> =
  T extends 'endpoints' ? EndpointInsert :
  T extends 'response_fields' ? ResponseFieldInsert :
  T extends 'request_groups' ? RequestGroupInsert :
  T extends 'group_requests' ? GroupRequestInsert :
  T extends 'ai_provider_settings' ? AIProviderSettingsInsert :
  T extends 'field_dictionary' ? FieldDictionaryInsert :
  never;

export type TablesUpdate<T extends string> =
  T extends 'endpoints' ? EndpointUpdate :
  T extends 'response_fields' ? ResponseFieldUpdate :
  T extends 'request_groups' ? RequestGroupUpdate :
  T extends 'group_requests' ? GroupRequestUpdate :
  T extends 'ai_provider_settings' ? AIProviderSettingsUpdate :
  T extends 'field_dictionary' ? FieldDictionaryUpdate :
  never;
