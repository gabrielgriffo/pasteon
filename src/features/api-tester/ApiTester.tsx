import { useState, useEffect } from 'react';
import { extractFieldDetails, formatDetalhes, extractQueryParams, extractBodyFields } from '@/utils/jsonParser';
import { ResponseTable } from './ResponseTable';
import { loadToken } from '@/utils/tokenStorage';
import { ConfigModal } from './ConfigModal';
import { GroupManagementModal } from './GroupManagementModal';
import { ConfirmLoadGroupModal } from './ConfirmLoadGroupModal';
import { ConfirmDeleteGroupModal } from './ConfirmDeleteGroupModal';
import { getEndpoints, type Endpoint } from '@/services/endpointsService';
import { saveResponseFields, type FieldToSave } from '@/services/responseFieldsService';
import {
  getGroups,
  createGroup,
  deleteGroup,
  getGroupRequests,
  saveGroupRequests,
  type RequestGroup,
  type RequestToSave,
} from '@/services/requestGroupsService';
import { toast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Settings, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Send, AlertCircle, Wrench, Save, FolderPlus, List } from 'lucide-react';

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
  title: string;
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
      title: '',
      error: null,
      isOpen: true,
    },
  ]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  // Group management states
  const [groups, setGroups] = useState<RequestGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isConfirmLoadOpen, setIsConfirmLoadOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<number | null>(null);

  useEffect(() => {
    loadEndpoints();
    loadGroups();
  }, []);

  const loadEndpoints = async () => {
    try {
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err) {
      console.error('Erro ao carregar endpoints:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await getGroups();
      // Ordenar grupos por ID (crescente)
      const sortedGroups = data.sort((a, b) => a.id - b.id);
      setGroups(sortedGroups);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  };

  // Group management handlers
  const handleGroupChange = (groupId: string) => {
    const numericGroupId = parseInt(groupId) || null;

    // Se não tem requests ou se a lista está vazia, carrega diretamente
    if (selectedEndpoints.length === 0 || selectedEndpoints.every(ep => !ep.endpointId)) {
      loadGroupDirectly(numericGroupId);
      return;
    }

    // Se tem requests na lista, mostra modal de confirmação
    setPendingGroupId(numericGroupId);
    setIsConfirmLoadOpen(true);
  };

  const loadGroupDirectly = async (groupId: number | null) => {
    if (!groupId) {
      setSelectedGroupId(null);
      return;
    }

    try {
      const groupRequests = await getGroupRequests(groupId);

      // Se grupo está vazio, apenas seleciona e não apaga a lista
      if (groupRequests.length === 0) {
        setSelectedGroupId(groupId);
        toast.info('Grupo selecionado', 'Este grupo está vazio');
        return;
      }

      // Converte as requests do grupo para o formato da UI
      const newSelectedEndpoints: SelectedEndpoint[] = groupRequests.map((req, index) => ({
        id: Date.now() + index,
        endpointId: req.endpoint_id,
        method: req.endpoint.metodo as HttpMethod,
        url: req.endpoint.url,
        body: req.body || '',
        title: req.title || '',
        error: null,
        isOpen: index === 0, // Apenas o primeiro aberto
      }));

      setSelectedEndpoints(newSelectedEndpoints);
      setSelectedGroupId(groupId);
      toast.success('Grupo carregado com sucesso!');
    } catch (err) {
      toast.error('Erro ao carregar grupo', err instanceof Error ? err.message : undefined);
    }
  };

  const confirmLoadGroup = () => {
    if (pendingGroupId) {
      loadGroupDirectly(pendingGroupId);
    }
    setPendingGroupId(null);
  };

  const handleSaveGroup = async () => {
    // Se tem grupo selecionado, sobrescreve
    if (selectedGroupId) {
      await saveCurrentGroup(selectedGroupId);
      return;
    }

    // Se não tem grupo selecionado, abre modal para criar novo
    setIsGroupModalOpen(true);
  };

  const saveCurrentGroup = async (groupId: number) => {
    try {
      // Filtra apenas endpoints válidos (que têm endpointId)
      const validEndpoints = selectedEndpoints.filter(ep => ep.endpointId !== null);

      if (validEndpoints.length === 0) {
        toast.error('Nenhuma request válida para salvar');
        return;
      }

      const requestsToSave: RequestToSave[] = validEndpoints.map((ep, index) => ({
        endpointId: ep.endpointId!,
        body: ep.body,
        title: ep.title,
        orderIndex: index,
      }));

      await saveGroupRequests(groupId, requestsToSave);
      toast.success('Grupo salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar grupo', err instanceof Error ? err.message : undefined);
    }
  };

  const handleNewGroup = async (name: string) => {
    try {
      const newGroup = await createGroup(name);
      await loadGroups();
      setSelectedGroupId(newGroup.id);
      toast.success('Grupo criado com sucesso!');
    } catch (err) {
      throw err; // Re-throw para o modal tratar
    }
  };

  const handleDeleteGroup = () => {
    if (!selectedGroupId) return;
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (!selectedGroupId) return;

    try {
      await deleteGroup(selectedGroupId);
      await loadGroups();
      setSelectedGroupId(null);
      toast.success('Grupo deletado com sucesso!');
    } catch (err) {
      toast.error('Erro ao deletar grupo', err instanceof Error ? err.message : undefined);
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
        title: '',
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

  const handleTitleChange = (id: number, title: string) => {
    setSelectedEndpoints(
      selectedEndpoints.map((ep) => (ep.id === id ? { ...ep, title } : ep))
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
            title: endpoint.title || undefined,
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
            title: endpoint.title || undefined,
          });
        });

        if (fieldsToSave.length > 0) {
          await saveResponseFields(fieldsToSave);
          console.log(`✓ Salvos ${fieldsToSave.length} campos da request: ${endpoint.title || endpoint.url}`);
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

    // Feedback final
    if (successfulResponses.length === selectedEndpoints.length) {
      toast.success('Todas as requests foram executadas e salvas com sucesso!');
    } else if (successfulResponses.length > 0) {
      toast.info(
        `${successfulResponses.length} de ${selectedEndpoints.length} requests executadas com sucesso`,
        'Verifique os erros nos cards destacados em vermelho'
      );
    } else {
      toast.error('Nenhuma request foi executada com sucesso', 'Verifique os erros nos cards');
    }
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

  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;

  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-8 max-w-[85vw]">
        {/* Card 1: Gerenciar Grupos e Requests */}
        <Card className="mb-8">
          <CardHeader>
            <div className='flex items-center'>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>

                <CardTitle className="text-lg">Gerenciar Grupos</CardTitle>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Select de grupo */}
                <Label htmlFor="group-select">Grupo</Label>

                  <Select
                    value={selectedGroupId?.toString() || ''}
                    onValueChange={handleGroupChange}
                    disabled={groups.length === 0 || isLoading}
                  >
                    <SelectTrigger id="group-select">
                      <SelectValue placeholder={groups.length === 0 ? 'Nenhum grupo cadastrado' : 'Selecione um grupo'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.id} - {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                {/* </div> */}
                <Button
                  type="button"
                  onClick={handleSaveGroup}
                  disabled={isLoading}
                  variant="default"
                  className="cursor-pointer flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Requests
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsGroupModalOpen(true)}
                  disabled={isLoading}
                  variant="outline"
                  className="cursor-pointer flex-1"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Novo Grupo
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={!selectedGroupId || isLoading}
                  variant="destructive"
                  className="cursor-pointer flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Card 2: Lista de Requests */}
        <Card className="mb-8">
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <List className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Lista de Requests</CardTitle>
              </div>
              <div className="flex items-center gap-2 ml-auto">
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
            </div>
          </CardHeader>

          <CardContent>
            {selectedEndpoints.length >= 2 && (
              <Button
                type="button"
                onClick={toggleAllCards}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="cursor-pointer mb-4"
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {endpoints.length === 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    Nenhum endpoint cadastrado. Clique em "Configurações" para adicionar.
                  </div>
                )}

                {selectedEndpoints.map((selectedEndpoint, index) => {
                  const selectedEndpointData = selectedEndpoint.endpointId
                    ? endpoints.find((e) => e.id === selectedEndpoint.endpointId)
                    : null;
                  const cardTitle = selectedEndpoint.title
                    ? selectedEndpoint.title
                    : selectedEndpointData
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
                                {cardTitle}
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
                            <div className="pt-3 space-y-3">
                              <div>
                                <Label htmlFor={`title-${selectedEndpoint.id}`}>
                                  Título (Opcional)
                                </Label>
                                <Input
                                  id={`title-${selectedEndpoint.id}`}
                                  type="text"
                                  placeholder="Ex: Criar usuário, Buscar produtos..."
                                  value={selectedEndpoint.title}
                                  onChange={(e) => handleTitleChange(selectedEndpoint.id, e.target.value)}
                                  disabled={isLoading}
                                  maxLength={100}
                                  className="mt-2"
                                />
                              </div>

                              <div>
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

      <GroupManagementModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onConfirm={handleNewGroup}
        onImportSuccess={loadGroups}
      />

      <ConfirmLoadGroupModal
        isOpen={isConfirmLoadOpen}
        onClose={() => {
          setIsConfirmLoadOpen(false);
          setPendingGroupId(null);
        }}
        onConfirm={confirmLoadGroup}
        groupName={pendingGroupId ? (groups.find(g => g.id === pendingGroupId)?.name || '') : ''}
      />

      <ConfirmDeleteGroupModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDeleteGroup}
        groupName={selectedGroupId ? (groups.find(g => g.id === selectedGroupId)?.name || '') : ''}
      />
    </div>
  );
}
