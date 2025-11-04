// src/utils/postmanParser.ts

/**
 * Interface para Postman Collection v2.1.0
 * https://schema.getpostman.com/json/collection/v2.1.0/collection.json
 */

export interface PostmanCollection {
  info: {
    name: string;
    _postman_id?: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
}

export interface PostmanItem {
  name: string;
  request: {
    method: string;
    header?: Array<{ key: string; value: string }>;
    body?: {
      mode: string;
      raw?: string;
      urlencoded?: Array<{ key: string; value: string }>;
    };
    url: {
      raw: string;
      protocol?: string;
      host?: string[];
      path?: string[];
      query?: Array<{ key: string; value: string }>;
    } | string;
  };
  response?: any[];
}

export interface ParsedRequest {
  name: string;
  method: string;
  url: string;
  body?: string;
}

export interface ParsedCollection {
  collectionName: string;
  description?: string;
  requests: ParsedRequest[];
  stats: {
    total: number;
    byMethod: Record<string, number>;
  };
}

/**
 * Extrai requests recursivamente de items que podem conter folders
 * Suporta estruturas aninhadas: item.item[].item[]...
 */
function extractRequestsRecursively(items: any[]): any[] {
  const requests: any[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    // Se o item tem uma request diretamente, adiciona à lista
    if (item.request && item.request.method && item.request.url) {
      requests.push(item);
    }

    // Se o item tem sub-items (é um folder), processa recursivamente
    if (Array.isArray(item.item) && item.item.length > 0) {
      const nestedRequests = extractRequestsRecursively(item.item);
      requests.push(...nestedRequests);
    }
  }

  return requests;
}

/**
 * Valida se o arquivo é uma Postman Collection válida
 */
export function validatePostmanFile(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Arquivo JSON inválido' };
  }

  if (!data.info || typeof data.info !== 'object') {
    return { valid: false, error: 'Arquivo não é uma Postman Collection (falta propriedade "info")' };
  }

  if (!data.info.name || typeof data.info.name !== 'string') {
    return { valid: false, error: 'Collection sem nome (info.name)' };
  }

  if (!Array.isArray(data.item)) {
    return { valid: false, error: 'Collection sem requests (item deve ser um array)' };
  }

  if (data.item.length === 0) {
    return { valid: false, error: 'Collection vazia (nenhuma request encontrada)' };
  }

  // Extrair requests recursivamente (suporta folders aninhados)
  const allRequests = extractRequestsRecursively(data.item);

  if (allRequests.length === 0) {
    return { valid: false, error: 'Nenhuma request válida encontrada na collection' };
  }

  return { valid: true };
}

/**
 * Extrai URL em formato string da estrutura complexa do Postman
 */
function extractUrl(url: PostmanItem['request']['url']): string {
  if (typeof url === 'string') {
    return url;
  }

  if (typeof url === 'object' && url.raw) {
    return url.raw;
  }

  // Tentar construir URL a partir das partes
  if (typeof url === 'object') {
    const protocol = url.protocol || 'https';
    const host = Array.isArray(url.host) ? url.host.join('.') : 'unknown';
    const path = Array.isArray(url.path) ? url.path.join('/') : '';
    return `${protocol}://${host}/${path}`;
  }

  return '';
}

/**
 * Extrai body da request se existir
 */
function extractBody(request: PostmanItem['request']): string | undefined {
  if (!request.body) {
    return undefined;
  }

  if (request.body.mode === 'raw' && request.body.raw) {
    return request.body.raw;
  }

  if (request.body.mode === 'urlencoded' && Array.isArray(request.body.urlencoded)) {
    // Converter urlencoded para JSON
    const bodyObj: Record<string, string> = {};
    request.body.urlencoded.forEach((param) => {
      bodyObj[param.key] = param.value;
    });
    return JSON.stringify(bodyObj, null, 2);
  }

  return undefined;
}

/**
 * Parseia uma Postman Collection e extrai as informações relevantes
 */
export function parsePostmanCollection(data: any): ParsedCollection {
  // Validar primeiro
  const validation = validatePostmanFile(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const collection = data as PostmanCollection;
  const requests: ParsedRequest[] = [];
  const methodCounts: Record<string, number> = {};

  // Extrair todas as requests recursivamente (suporta folders aninhados)
  const allItems = extractRequestsRecursively(collection.item);

  // Processar cada request encontrada
  for (const item of allItems) {
    try {
      const url = extractUrl(item.request.url);

      // Pular se URL for inválida
      if (!url || url === '') {
        console.warn(`Request "${item.name}" sem URL válida, pulando...`);
        continue;
      }

      const method = item.request.method.toUpperCase();
      const body = extractBody(item.request);

      requests.push({
        name: item.name,
        method,
        url,
        body,
      });

      // Contar métodos
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    } catch (err) {
      console.warn(`Erro ao processar request "${item.name}":`, err);
      // Continuar processando outros items
    }
  }

  if (requests.length === 0) {
    throw new Error('Nenhuma request válida foi extraída da collection');
  }

  return {
    collectionName: collection.info.name,
    description: collection.info.description,
    requests,
    stats: {
      total: requests.length,
      byMethod: methodCounts,
    },
  };
}

/**
 * Lê um arquivo e faz o parse como JSON
 */
export function readFileAsJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        resolve(json);
      } catch (err) {
        reject(new Error('Erro ao fazer parse do JSON: arquivo inválido'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsText(file);
  });
}

/**
 * Função helper para validar extensão do arquivo
 */
export function isValidFileType(file: File): boolean {
  const validExtensions = ['.json'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some((ext) => fileName.endsWith(ext));
}

/**
 * Função helper para formatar estatísticas
 */
export function formatMethodStats(stats: Record<string, number>): string {
  return Object.entries(stats)
    .map(([method, count]) => `${method} (${count})`)
    .join(', ');
}
