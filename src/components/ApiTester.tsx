import { useState, useEffect } from 'react';
import { extractFieldDetails, formatDetalhes, extractQueryParams, extractBodyFields } from '../utils/jsonParser';
import { ResponseTable } from './ResponseTable';
import { loadToken } from '../utils/tokenStorage';
import { ConfigModal } from './ConfigModal';
import { getEndpoints, type Endpoint } from '../services/endpointsService';
import { saveResponseFields, type FieldToSave, type FieldTipo } from '../services/responseFieldsService';

interface BodyField {
  campo: string;
  detalhes: string;
}

interface ApiResponse {
  url: string;
  method: string;
  endpoint: string;
  bodyFields: BodyField[]; // Body or Query Params fields
  campoRetorno: string[];
  detalhes: string[];
}

interface SelectedEndpoint {
  id: number;
  endpointId: number | null;
  method: HttpMethod;
  url: string;
  body: string;
  error: string | null;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

export function ApiTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<ApiResponse[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<SelectedEndpoint[]>([
    {
      id: Date.now(),
      endpointId: null,
      method: 'GET',
      url: '',
      body: '',
      error: null,
    },
  ]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  // Load endpoints on component mount
  useEffect(() => {
    loadEndpoints();
  }, []);

  // Initialize expanded cards when selectedEndpoints change
  useEffect(() => {
    setExpandedCards(selectedEndpoints.map(ep => ep.id));
  }, [selectedEndpoints.length]);

  const loadEndpoints = async () => {
    try {
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err) {
      console.error('Erro ao carregar endpoints:', err);
    }
  };

  // Check if endpoint is already in use by another select
  const isEndpointInUse = (endpointId: number, currentSelectId: number) => {
    return selectedEndpoints.some(
      (ep) => ep.endpointId === endpointId && ep.id !== currentSelectId
    );
  };

  // Toggle card expansion
  const toggleCardExpansion = (cardId: number) => {
    setExpandedCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Toggle all cards expansion
  const toggleAllCards = () => {
    const allExpanded = selectedEndpoints.every((ep) => expandedCards.includes(ep.id));
    if (allExpanded) {
      setExpandedCards([]); // Collapse all
    } else {
      setExpandedCards(selectedEndpoints.map((ep) => ep.id)); // Expand all
    }
  };

  // Add new endpoint selector
  const handleAddEndpoint = () => {
    setSelectedEndpoints([
      ...selectedEndpoints,
      {
        id: Date.now(),
        endpointId: null,
        method: 'GET',
        url: '',
        body: '',
        error: null,
      },
    ]);
  };

  // Remove endpoint selector
  const handleRemoveEndpoint = (id: number) => {
    setSelectedEndpoints(selectedEndpoints.filter((ep) => ep.id !== id));
  };

  // Handle endpoint selection change
  const handleEndpointChange = (id: number, endpointId: string) => {
    const dbEndpointId = parseInt(endpointId) || null;
    const endpoint = dbEndpointId ? endpoints.find((e) => e.id === dbEndpointId) : null;

    setSelectedEndpoints(
      selectedEndpoints.map((ep) =>
        ep.id === id
          ? {
              ...ep,
              endpointId: dbEndpointId,
              method: endpoint ? (endpoint.metodo as HttpMethod) : 'GET',
              url: endpoint ? endpoint.url : '',
              error: null,
            }
          : ep
      )
    );
  };

  // Handle body change for specific endpoint
  const handleBodyChange = (id: number, body: string) => {
    setSelectedEndpoints(
      selectedEndpoints.map((ep) => (ep.id === id ? { ...ep, body, error: null } : ep))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all endpoints
    const hasEmptyEndpoint = selectedEndpoints.some((ep) => !ep.endpointId);
    if (hasEmptyEndpoint) {
      setSelectedEndpoints(
        selectedEndpoints.map((ep) =>
          !ep.endpointId ? { ...ep, error: 'Selecione um endpoint' } : ep
        )
      );
      return;
    }

    // Clear previous responses and errors
    setResponses([]);
    setSelectedEndpoints(selectedEndpoints.map((ep) => ({ ...ep, error: null })));
    setIsLoading(true);
    setTotalRequests(selectedEndpoints.length);
    setCurrentRequestIndex(0);

    const successfulResponses: ApiResponse[] = [];

    // Execute requests sequentially
    for (let i = 0; i < selectedEndpoints.length; i++) {
      const endpoint = selectedEndpoints[i];
      setCurrentRequestIndex(i + 1);

      // Validate JSON body if needed
      if (
        endpoint.body.trim() &&
        (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')
      ) {
        try {
          JSON.parse(endpoint.body);
        } catch {
          setSelectedEndpoints((prev) =>
            prev.map((ep) =>
              ep.id === endpoint.id ? { ...ep, error: 'O body não é um JSON válido' } : ep
            )
          );
          continue; // Skip to next endpoint
        }
      }

      try {
        // Extract body or query params BEFORE making request
        let bodyFieldDetails: any[] = [];

        if (endpoint.method === 'GET') {
          // For GET, extract query params
          bodyFieldDetails = extractQueryParams(endpoint.url);
        } else if (endpoint.body.trim() && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
          // For POST/PUT/PATCH, extract body fields
          bodyFieldDetails = extractBodyFields(endpoint.body);
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Get token from localStorage
        const savedToken = loadToken();
        if (savedToken?.trim()) {
          headers['Authorization'] = `Bearer ${savedToken.trim()}`;
        }

        const options: RequestInit = {
          method: endpoint.method,
          headers,
        };

        if (
          endpoint.body.trim() &&
          (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')
        ) {
          options.body = endpoint.body.trim();
        }

        const res = await fetch(endpoint.url, options);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const extractedUrl = new URL(endpoint.url);
        const endpointPath = extractedUrl.pathname;
        const fieldDetails = extractFieldDetails(data);
        const campoRetorno = fieldDetails.map((detail) => detail.path);
        const detalhes = fieldDetails.map((detail) => formatDetalhes(detail));

        // Prepare body fields for display
        const bodyFields: BodyField[] = bodyFieldDetails.map((detail) => ({
          campo: detail.path,
          detalhes: formatDetalhes(detail),
        }));

        // Prepare all fields to save to database
        const fieldsToSave: FieldToSave[] = [];

        // Add body/query param fields
        const bodyTipo = endpoint.method === 'GET' ? 'Query Params' : 'Body';
        bodyFieldDetails.forEach((detail) => {
          fieldsToSave.push({
            metodo: endpoint.method,
            url: extractedUrl.origin,
            endpoint: endpointPath,
            campo: detail.path,
            detalhes: formatDetalhes(detail),
            tipo: bodyTipo,
          });
        });

        // Add response fields
        fieldDetails.forEach((detail) => {
          fieldsToSave.push({
            metodo: endpoint.method,
            url: extractedUrl.origin,
            endpoint: endpointPath,
            campo: detail.path,
            detalhes: formatDetalhes(detail),
            tipo: 'Response',
          });
        });

        // Save to database (ignores duplicates automatically)
        if (fieldsToSave.length > 0) {
          await saveResponseFields(fieldsToSave);
        }

        successfulResponses.push({
          url: extractedUrl.origin,
          method: endpoint.method,
          endpoint: endpointPath + extractedUrl.search,
          bodyFields,
          campoRetorno,
          detalhes,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao executar request';
        setSelectedEndpoints((prev) =>
          prev.map((ep) => (ep.id === endpoint.id ? { ...ep, error: errorMessage } : ep))
        );
      }
    }

    setResponses(successfulResponses);
    setIsLoading(false);
    setCurrentRequestIndex(0);
    setTotalRequests(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-8xl mx-auto px-4 py-8">

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Configuração da Request</h2>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Endpoints List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Endpoints para Requisição
                </label>
                <div className="flex items-center gap-2">
                  {selectedEndpoints.length >= 2 && (
                    <button
                      type="button"
                      onClick={toggleAllCards}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {selectedEndpoints.every((ep) => expandedCards.includes(ep.id)) ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        )}
                      </svg>
                      {selectedEndpoints.every((ep) => expandedCards.includes(ep.id))
                        ? 'Colapsar Todos'
                        : 'Expandir Todos'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddEndpoint}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>
              </div>

              {endpoints.length === 0 && (
                <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  Nenhum endpoint cadastrado. Clique em "Configurações" para adicionar.
                </p>
              )}

              {selectedEndpoints.map((selectedEndpoint, index) => {
                const isExpanded = expandedCards.includes(selectedEndpoint.id);
                const selectedEndpointData = selectedEndpoint.endpointId
                  ? endpoints.find((e) => e.id === selectedEndpoint.endpointId)
                  : null;
                const cardTitle = selectedEndpointData
                  ? `[${selectedEndpointData.metodo}] ${selectedEndpointData.url}`
                  : 'Selecione um endpoint';

                return (
                  <div
                    key={selectedEndpoint.id}
                    className={`border rounded-lg overflow-hidden bg-white ${
                      selectedEndpoint.error ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    {/* Card Header - Collapsible */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleCardExpansion(selectedEndpoint.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Number Badge */}
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">
                          {index + 1}
                        </span>

                        {/* Method Badge */}
                        {selectedEndpointData && (
                          <span
                            className={`flex-shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded ${
                              selectedEndpoint.method === 'GET'
                                ? 'bg-green-100 text-green-800'
                                : selectedEndpoint.method === 'POST'
                                ? 'bg-blue-100 text-blue-800'
                                : selectedEndpoint.method === 'PUT'
                                ? 'bg-yellow-100 text-yellow-800'
                                : selectedEndpoint.method === 'PATCH'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {selectedEndpoint.method}
                          </span>
                        )}

                        {/* Error Badge */}
                        {selectedEndpoint.error && (
                          <span className="flex-shrink-0 inline-flex px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">
                            ERRO
                          </span>
                        )}

                        {/* URL/Title */}
                        <span
                          className={`flex-1 text-sm truncate ${
                            selectedEndpointData ? 'text-gray-900 font-medium' : 'text-gray-500 italic'
                          }`}
                          title={cardTitle}
                        >
                          {selectedEndpointData ? selectedEndpointData.url : cardTitle}
                        </span>

                        {/* Chevron Icon */}
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>

                      {/* Remove Button */}
                      {selectedEndpoints.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEndpoint(selectedEndpoint.id);
                          }}
                          disabled={isLoading}
                          className="ml-3 flex-shrink-0 px-2 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Remover endpoint"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Card Body - Collapsible Content */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 border-t border-gray-200">
                        {/* Endpoint Selector */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione o Endpoint
                          </label>
                          <select
                            value={selectedEndpoint.endpointId || ''}
                            onChange={(e) => handleEndpointChange(selectedEndpoint.id, e.target.value)}
                            disabled={isLoading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Selecione um endpoint</option>
                            {endpoints.map((endpoint) => {
                              const inUse = isEndpointInUse(endpoint.id, selectedEndpoint.id);
                              return (
                                <option key={endpoint.id} value={endpoint.id}>
                                  [{endpoint.metodo}
                                  {inUse ? '*' : ''}] {endpoint.url}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Body (only for POST, PUT, PATCH) */}
                        {(selectedEndpoint.method === 'POST' ||
                          selectedEndpoint.method === 'PUT' ||
                          selectedEndpoint.method === 'PATCH') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Body (JSON)
                            </label>
                            <textarea
                              rows={6}
                              placeholder='{\n  "key": "value"\n}'
                              value={selectedEndpoint.body}
                              onChange={(e) => handleBodyChange(selectedEndpoint.id, e.target.value)}
                              disabled={isLoading}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        )}

                        {/* Error Message */}
                        {selectedEndpoint.error && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm text-red-700">{selectedEndpoint.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Executando {currentRequestIndex} de {totalRequests} requisições...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar {selectedEndpoints.length > 1 ? `${selectedEndpoints.length} Requests` : 'Request'}
                </>
              )}
            </button>
          </form>
        </div>

        {responses.length > 0 && <ResponseTable responses={responses} />}
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onEndpointsChange={loadEndpoints}
      />
    </div>
  );
}