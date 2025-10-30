import { useState, useEffect } from 'react';
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  type Endpoint,
  type HttpMethod,
} from '../services/endpointsService';
import { saveToken, loadToken, clearToken } from '../utils/tokenStorage';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndpointsChange: () => void;
}

export function ConfigModal({ isOpen, onClose, onEndpointsChange }: ConfigModalProps) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setError(null);
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar endpoints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formUrl.trim()) {
      setError('URL é obrigatória');
      return;
    }

    // Check for duplicate (same method + URL)
    const isDuplicate = endpoints.some(
      (ep) => ep.metodo === formMethod && ep.url === formUrl.trim() && ep.id !== editingId
    );

    if (isDuplicate) {
      setError(`Já existe um endpoint [${formMethod}] para esta URL`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (editingId) {
        await updateEndpoint(editingId, formMethod, formUrl);
        setSuccessMessage('Endpoint atualizado com sucesso!');
      } else {
        await createEndpoint(formMethod, formUrl);
        setSuccessMessage('Endpoint criado com sucesso!');
      }

      // Reset form
      setFormMethod('GET');
      setFormUrl('');
      setEditingId(null);

      // Reload endpoints
      await loadEndpoints();
      onEndpointsChange();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (endpoint: Endpoint) => {
    setEditingId(endpoint.id);
    setFormMethod(endpoint.metodo as HttpMethod);
    setFormUrl(endpoint.url);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormMethod('GET');
    setFormUrl('');
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este endpoint?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await deleteEndpoint(id);
      setSuccessMessage('Endpoint deletado com sucesso!');
      await loadEndpoints();
      onEndpointsChange();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
    saveToken(newToken);
  };

  const handleClearToken = () => {
    setToken('');
    clearToken();
  };

  const handleClose = () => {
    setEditingId(null);
    setFormMethod('GET');
    setFormUrl('');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Configurações de Endpoints</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Card 1: Bearer Token */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bearer Token</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="Cole seu token de autenticação aqui"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                {token && (
                  <button
                    type="button"
                    onClick={handleClearToken}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
              {token && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Token configurado
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Adicionar Endpoint */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Endpoint' : 'Adicionar Novo Endpoint'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método HTTP
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as HttpMethod)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL da API
                  </label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://api.exemplo.com/endpoint"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Card 3: Endpoints List */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Endpoints Salvos ({endpoints.length})
            </h3>
            {isLoading && endpoints.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : endpoints.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum endpoint cadastrado. Adicione um novo endpoint acima.
              </div>
            ) : (
              <div className="space-y-2">
                {endpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold text-white flex-shrink-0 ${
                          endpoint.metodo === 'GET'
                            ? 'bg-blue-500'
                            : endpoint.metodo === 'POST'
                            ? 'bg-green-500'
                            : endpoint.metodo === 'PUT'
                            ? 'bg-yellow-500'
                            : endpoint.metodo === 'PATCH'
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {endpoint.metodo}
                      </span>
                      <span className="text-gray-700 truncate" title={endpoint.url}>
                        {endpoint.url}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(endpoint)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        disabled={isLoading}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(endpoint.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        disabled={isLoading}
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
