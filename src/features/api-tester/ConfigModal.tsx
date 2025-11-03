import { useState, useEffect } from 'react';
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  type Endpoint,
  type HttpMethod,
} from '@/services/endpointsService';
import { saveToken, loadToken, clearToken } from '@/utils/tokenStorage';
import { toast } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Loader2, Check } from 'lucide-react';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndpointsChange: () => void;
}

export function ConfigModal({ isOpen, onClose, onEndpointsChange }: ConfigModalProps) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Token state
  const [token, setToken] = useState('');

  // Form state
  const [formMethod, setFormMethod] = useState<HttpMethod>('GET');
  const [formUrl, setFormUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load endpoints and token
  useEffect(() => {
    if (isOpen) {
      loadEndpoints();
      const savedToken = loadToken();
      if (savedToken) setToken(savedToken);
    }
  }, [isOpen]);

  const loadEndpoints = async () => {
    try {
      setIsLoading(true);
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err) {
      toast.error('Erro ao carregar endpoints', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formUrl.trim()) {
      toast.error('URL é obrigatória');
      return;
    }

    // Check for duplicate (same method + URL)
    const isDuplicate = endpoints.some(
      (ep) => ep.metodo === formMethod && ep.url === formUrl.trim() && ep.id !== editingId
    );

    if (isDuplicate) {
      toast.error('Endpoint duplicado', `Já existe um endpoint [${formMethod}] para esta URL`);
      return;
    }

    try {
      setIsLoading(true);

      if (editingId) {
        await updateEndpoint(editingId, formMethod, formUrl);
        toast.success('Endpoint atualizado com sucesso!');
      } else {
        await createEndpoint(formMethod, formUrl);
        toast.success('Endpoint criado com sucesso!');
      }

      // Reset form
      setFormMethod('GET');
      setFormUrl('');
      setEditingId(null);

      // Reload endpoints
      await loadEndpoints();
      onEndpointsChange();
    } catch (err) {
      toast.error('Erro ao salvar endpoint', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (endpoint: Endpoint) => {
    setEditingId(endpoint.id);
    setFormMethod(endpoint.metodo as HttpMethod);
    setFormUrl(endpoint.url);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormMethod('GET');
    setFormUrl('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este endpoint?')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteEndpoint(id);
      toast.success('Endpoint deletado com sucesso!');
      await loadEndpoints();
      onEndpointsChange();
    } catch (err) {
      toast.error('Erro ao deletar endpoint', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
    saveToken(newToken);
    if (newToken.trim()) {
      toast.success('Token configurado');
    }
  };

  const handleClearToken = () => {
    setToken('');
    clearToken();
    toast.info('Token removido');
  };

  const handleClose = () => {
    setEditingId(null);
    setFormMethod('GET');
    setFormUrl('');
    onClose();
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500';
      case 'POST': return 'bg-green-500';
      case 'PUT': return 'bg-yellow-500';
      case 'PATCH': return 'bg-orange-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configurações de Endpoints</DialogTitle>
          <DialogDescription>
            Configure seu Bearer Token e gerencie seus endpoints salvos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6">
          {/* Card 1: Bearer Token */}
          <Card>
            <CardHeader>
              <CardTitle>Bearer Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="Cole seu token de autenticação aqui"
                  className="flex-1 font-mono text-sm"
                />
                {token && (
                  <Button
                    type="button"
                    onClick={handleClearToken}
                    variant="destructive"
                    size="default"
                    className="cursor-pointer"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              {token && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Token configurado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Adicionar Endpoint */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Endpoint' : 'Adicionar Novo Endpoint'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="method">Método HTTP</Label>
                    <Select
                      value={formMethod}
                      onValueChange={(value) => setFormMethod(value as HttpMethod)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label htmlFor="url">URL da API</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://api.exemplo.com/endpoint"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card 3: Endpoints List */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoints Salvos</CardTitle>
              <CardDescription>{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && endpoints.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : endpoints.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum endpoint cadastrado. Adicione um novo endpoint acima.
                </div>
              ) : (
                <div className="space-y-2">
                  {endpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge className={`${getMethodBadgeClass(endpoint.metodo)} text-white`}>
                          {endpoint.metodo}
                        </Badge>
                        <span className="text-sm truncate" title={endpoint.url}>
                          {endpoint.url}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => handleEdit(endpoint)}
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(endpoint.id)}
                          variant="destructive"
                          size="sm"
                          disabled={isLoading}
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
