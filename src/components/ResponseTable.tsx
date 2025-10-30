import { useState } from 'react';

interface BodyField {
  campo: string;
  detalhes: string;
}

interface ApiResponse {
  url: string;
  method: string;
  endpoint: string;
  bodyFields: BodyField[];
  campoRetorno: string[];
  detalhes: string[];
}

interface ResponseTableProps {
  responses: ApiResponse[];
}

export function ResponseTable({ responses }: ResponseTableProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyTableData = async () => {
    try {
      // Create tab-separated values for Excel without headers, including all responses
      const rows: string[] = [];

      responses.forEach((response) => {
        // First, add body fields
        response.bodyFields.forEach((bodyField) => {
          const tipo = response.method === 'GET' ? 'Query Params' : 'Body';
          rows.push([
            response.method,
            response.url,
            response.endpoint,
            tipo,
            bodyField.campo,
            bodyField.detalhes
          ].join('\t')); // Tab-separated for Excel
        });

        // Then, add response fields
        response.campoRetorno.forEach((campo, index) => {
          rows.push([
            response.method,
            response.url,
            response.endpoint,
            'Response',
            campo,
            response.detalhes[index] || ''
          ].join('\t')); // Tab-separated for Excel
        });
      });

      const tableData = rows.join('\n');
      await navigator.clipboard.writeText(tableData);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy data:', error);
    }
  };

  const totalFields = responses.reduce((sum, r) => sum + r.bodyFields.length + r.campoRetorno.length, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Campos da Requisição</h2>
          <p className="text-xs text-gray-500 mt-1">
            {responses.length} {responses.length === 1 ? 'requisição' : 'requisições'} • {totalFields} {totalFields === 1 ? 'campo' : 'campos'}
          </p>
        </div>
        {totalFields > 0 && (
          <button
            onClick={copyTableData}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600'
            }`}
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar para Excel
              </>
            )}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {responses.map((response, responseIndex) => {
              const isFirstRow = responseIndex > 0;

              return (
                <>
                  {/* Render body fields first */}
                  {response.bodyFields.map((bodyField, bodyFieldIndex) => {
                    const tipo = response.method === 'GET' ? 'Query Params' : 'Body';
                    return (
                      <tr
                        key={`${responseIndex}-body-${bodyFieldIndex}`}
                        className={`hover:bg-gray-50 ${
                          bodyFieldIndex === 0 && isFirstRow ? 'border-t-2 border-blue-200' : 'border-t border-gray-200'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            response.method === 'GET' ? 'bg-green-100 text-green-800' :
                            response.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            response.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            response.method === 'PATCH' ? 'bg-orange-100 text-orange-800' :
                            response.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {response.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">
                          {response.url}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">
                          {response.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                          {bodyField.campo}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                          {bodyField.detalhes}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Then render response fields */}
                  {response.campoRetorno.map((campo, fieldIndex) => (
                    <tr
                      key={`${responseIndex}-response-${fieldIndex}`}
                      className={`hover:bg-gray-50 ${
                        fieldIndex === 0 && response.bodyFields.length === 0 && isFirstRow ? 'border-t-2 border-blue-200' : 'border-t border-gray-200'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          response.method === 'GET' ? 'bg-green-100 text-green-800' :
                          response.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          response.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          response.method === 'PATCH' ? 'bg-orange-100 text-orange-800' :
                          response.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {response.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">
                        {response.url}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono break-all">
                        {response.endpoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">
                          Response
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                        {campo}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                        {response.detalhes[fieldIndex]}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalFields === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          Nenhum campo encontrado nos responses
        </div>
      )}

      {totalFields > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Dica:</strong> Use "Copiar para Excel" para copiar os dados sem cabeçalhos,
              prontos para colar diretamente no Excel com Ctrl+V. Linhas azuis separam diferentes requisições.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}