import { useState, useEffect } from 'react';
import { extractFieldDetails, formatDetalhes, extractQueryParams, extractBodyFields } from '../utils/jsonParser';
import { ResponseTable } from './ResponseTable';
import { loadToken } from '../utils/tokenStorage';
import { ConfigModal } from './ConfigModal';
import { getEndpoints, type Endpoint } from '../services/endpointsService';
import { saveResponseFields, type FieldToSave } from '../services/responseFieldsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Settings, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Send, AlertCircle } from 'lucide-react';

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

interface SelectedEndpoint {
  id: number;
  endpointId: number | null;
  method: HttpMethod;
  url: string;
  body: string;
  error: string | null;
  isOpen: boolean;
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
      isOpen: true,
    },
  ]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err) {
      console.error('Erro ao carregar endpoints:', err);
    }
  };

  const isEndpointInUse = (endpointId: number, currentSelectId: number) => {
    return selectedEndpoints.some(
      (ep) => ep.endpointId === endpointId && ep.id !== currentSelectId
    );
  };

  const toggleEndpointOpen = (id: number, isOpen: boolean) => {
    setSelectedEndpoints(
      selectedEndpoints.map((ep) => (ep.id === id ? { ...ep, isOpen } : ep))
    );
  };

  const toggleAllCards = () => {
    const allExpanded = selectedEndpoints.every((ep) => ep.isOpen);
    setSelectedEndpoints(
      selectedEndpoints.map((ep) => ({ ...ep, isOpen: !allExpanded }))
    );
  };

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
        isOpen: true,
      },
    ]);
  };

  const handleRemoveEndpoint = (id: number) => {
    setSelectedEndpoints(selectedEndpoints.filter((ep) => ep.id !== id));
  };

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

  const handleBodyChange = (id: number, body: string) => {
    setSelectedEndpoints(
      selectedEndpoints.map((ep) => (ep.id === id ? { ...ep, body, error: null } : ep))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasEmptyEndpoint = selectedEndpoints.some((ep) => !ep.endpointId);
    if (hasEmptyEndpoint) {
      setSelectedEndpoints(
        selectedEndpoints.map((ep) =>
          !ep.endpointId ? { ...ep, error: 'Selecione um endpoint' } : ep
        )
      );
      return;
    }

    setResponses([]);
    setSelectedEndpoints(selectedEndpoints.map((ep) => ({ ...ep, error: null })));
    setIsLoading(true);
    setTotalRequests(selectedEndpoints.length);
    setCurrentRequestIndex(0);

    const successfulResponses: ApiResponse[] = [];

    for (let i = 0; i < selectedEndpoints.length; i++) {
      const endpoint = selectedEndpoints[i];
      setCurrentRequestIndex(i + 1);

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
          continue;
        }
      }

      try {
        let bodyFieldDetails: any[] = [];

        if (endpoint.method === 'GET') {
          bodyFieldDetails = extractQueryParams(endpoint.url);
        } else if (endpoint.body.trim() && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
          bodyFieldDetails = extractBodyFields(endpoint.body);
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

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

        const bodyFields: BodyField[] = bodyFieldDetails.map((detail) => ({
          campo: detail.path,
          detalhes: formatDetalhes(detail),
        }));

        const fieldsToSave: FieldToSave[] = [];

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

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'POST': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'PUT': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'PATCH': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'DELETE': return 'bg-red-100 text-red-800 hover:bg-red-100';
      default: return '';
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Configuração da Request</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsConfigModalOpen(true)}
                variant="secondary"
                size="default"
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={handleAddEndpoint}
                disabled={isLoading}
                size="default"
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                size="default"
                className="cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {selectedEndpoints.length >= 2 && (
                      <Button
                        type="button"
                        onClick={toggleAllCards}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        {selectedEndpoints.every((ep) => ep.isOpen) ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Colapsar Todos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Expandir Todos
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {endpoints.length === 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    Nenhum endpoint cadastrado. Clique em "Configurações" para adicionar.
                  </div>
                )}

                {selectedEndpoints.map((selectedEndpoint, index) => {
                  const selectedEndpointData = selectedEndpoint.endpointId
                    ? endpoints.find((e) => e.id === selectedEndpoint.endpointId)
                    : null;
                  const cardTitle = selectedEndpointData
                    ? `[${selectedEndpointData.metodo}] ${selectedEndpointData.url}`
                    : 'Selecione um endpoint';

                  return (
                    <Collapsible
                      key={selectedEndpoint.id}
                      open={selectedEndpoint.isOpen}
                      onOpenChange={(isOpen) => toggleEndpointOpen(selectedEndpoint.id, isOpen)}
                    >
                      <Card
                        className={selectedEndpoint.error ? 'border-destructive p-0' : 'p-0'}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Badge variant="outline" className="flex-shrink-0">
                                {index + 1}
                              </Badge>

                              {selectedEndpointData && (
                                <Badge variant="outline" className={getMethodBadgeClass(selectedEndpoint.method)}>
                                  {selectedEndpoint.method}
                                </Badge>
                              )}

                              {selectedEndpoint.error && (
                                <Badge variant="destructive" className="flex-shrink-0">
                                  ERRO
                                </Badge>
                              )}

                              <span
                                className={`flex-1 text-sm truncate ${
                                  selectedEndpointData ? 'font-medium' : 'text-muted-foreground italic'
                                }`}
                                title={cardTitle}
                              >
                                {selectedEndpointData ? selectedEndpointData.url : cardTitle}
                              </span>

                              {selectedEndpoint.isOpen ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>

                            {selectedEndpoints.length > 1 && (
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEndpoint(selectedEndpoint.id);
                                }}
                                disabled={isLoading}
                                variant="destructive"
                                size="icon"
                                className="ml-3 flex-shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t">
                            <div className="pt-3">
                              <Select
                                value={selectedEndpoint.endpointId?.toString() || ''}
                                onValueChange={(value) => handleEndpointChange(selectedEndpoint.id, value)}
                                disabled={isLoading}
                              >
                                <SelectTrigger id={`endpoint-${selectedEndpoint.id}`}>
                                  <SelectValue placeholder="Selecione um endpoint" />
                                </SelectTrigger>
                                <SelectContent>
                                  {endpoints.map((endpoint) => {
                                    const inUse = isEndpointInUse(endpoint.id, selectedEndpoint.id);
                                    return (
                                      <SelectItem key={endpoint.id} value={endpoint.id.toString()}>
                                        [{endpoint.metodo}
                                        {inUse ? '*' : ''}] {endpoint.url}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {(selectedEndpoint.method === 'POST' ||
                              selectedEndpoint.method === 'PUT' ||
                              selectedEndpoint.method === 'PATCH') && (
                              <div>
                                <Label htmlFor={`body-${selectedEndpoint.id}`} className="mb-2">
                                  Body (JSON)
                                </Label>
                                <Textarea
                                  id={`body-${selectedEndpoint.id}`}
                                  rows={6}
                                  placeholder='{\n  "key": "value"\n}'
                                  value={selectedEndpoint.body}
                                  onChange={(e) => handleBodyChange(selectedEndpoint.id, e.target.value)}
                                  disabled={isLoading}
                                  className="font-mono text-sm"
                                />
                              </div>
                            )}

                            {selectedEndpoint.error && (
                              <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{selectedEndpoint.error}</span>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </form>
          </CardContent>
        </Card>

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
