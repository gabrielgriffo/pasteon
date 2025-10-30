interface FieldDetail {
  path: string;
  value: any;
  type: string;
}

export function extractFieldDetails(obj: any, prefix = ''): FieldDetail[] {
  if (obj === null || obj === undefined) {
    return [];
  }

  const details: FieldDetail[] = [];

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const firstItem = obj[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const subDetails = extractFieldDetails(firstItem, prefix);
        details.push(...subDetails);
      } else {
        details.push({
          path: prefix || 'array',
          value: firstItem,
          type: typeof firstItem
        });
      }
    } else {
      details.push({
        path: prefix || 'array',
        value: '[]',
        type: 'array'
      });
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        details.push({
          path: currentPath,
          value: value,
          type: Array.isArray(value) ? 'array' : typeof value
        });

        if (typeof value === 'object' && value !== null) {
          const subDetails = extractFieldDetails(value, currentPath);
          details.push(...subDetails.filter(detail => detail.path !== currentPath));
        }
      }
    }
  } else {
    if (prefix) {
      details.push({
        path: prefix,
        value: obj,
        type: typeof obj
      });
    }
  }

  return details.filter((detail, index, self) =>
    index === self.findIndex(d => d.path === detail.path)
  ).sort((a, b) => a.path.localeCompare(b.path));
}

export function formatDetalhes(detail: FieldDetail): string {
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'boolean') return val.toString();
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      return String(JSON.stringify(val[0])); // Show only the first item
    }
    if (typeof val === 'object') return '[object]';
    return String(val);
  };

  const formattedValue = formatValue(detail.value);
  return `[${detail.type}] e.g.: ${formattedValue}`;
}

// Keep old function for backward compatibility
export function extractFieldPaths(obj: any, prefix = ''): string[] {
  const details = extractFieldDetails(obj, prefix);
  return details.map(detail => detail.path);
}

/**
 * Extrai query params de uma URL e retorna como FieldDetail[]
 * Ex: /api/users?id=123&name=João -> [{path: 'id', value: '123', type: 'string'}, ...]
 */
export function extractQueryParams(url: string): FieldDetail[] {
  try {
    const urlObj = new URL(url);
    const params: FieldDetail[] = [];

    urlObj.searchParams.forEach((value, key) => {
      params.push({
        path: key,
        value: value,
        type: 'string'
      });
    });

    return params.sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    console.warn('Invalid URL for query param extraction:', url);
    return [];
  }
}

/**
 * Extrai campos do body JSON (para POST/PUT/PATCH)
 * Usa a mesma lógica de extractFieldDetails
 */
export function extractBodyFields(bodyJson: string): FieldDetail[] {
  if (!bodyJson || bodyJson.trim() === '') {
    return [];
  }

  try {
    const bodyObj = JSON.parse(bodyJson);
    return extractFieldDetails(bodyObj);
  } catch (error) {
    console.warn('Invalid JSON for body extraction:', error);
    return [];
  }
}