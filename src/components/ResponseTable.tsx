import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, Copy, Info } from 'lucide-react';

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

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'GET': return 'default';
      case 'POST': return 'default';
      case 'PUT': return 'secondary';
      case 'PATCH': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
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

  const getTipoBadgeClass = (tipo: string) => {
    switch (tipo) {
      case 'Body':
      case 'Query Params':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'Response':
        return 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100';
      default:
        return '';
    }
  };

  const totalFields = responses.reduce((sum, r) => sum + r.bodyFields.length + r.campoRetorno.length, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Campos da Requisição</CardTitle>
          <CardDescription className="text-xs mt-1">
            {responses.length} {responses.length === 1 ? 'requisição' : 'requisições'} • {totalFields} {totalFields === 1 ? 'campo' : 'campos'}
          </CardDescription>
        </div>
        {totalFields > 0 && (
          <Button
            onClick={copyTableData}
            variant={copySuccess ? 'outline' : 'default'}
            size="sm"
            className={`cursor-pointer ${copySuccess ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' : ''}`}
          >
            {copySuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {totalFields === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum campo encontrado nos responses
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Método</TableHead>
                    <TableHead className="font-medium">URL</TableHead>
                    <TableHead className="font-medium">Endpoint</TableHead>
                    <TableHead className="font-medium">Tipo</TableHead>
                    <TableHead className="font-medium">Campo</TableHead>
                    <TableHead className="font-medium">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response, responseIndex) => {
                    const isFirstRow = responseIndex > 0;

                    return (
                      <>
                        {/* Render body fields first */}
                        {response.bodyFields.map((bodyField, bodyFieldIndex) => {
                          const tipo = response.method === 'GET' ? 'Query Params' : 'Body';
                          return (
                            <TableRow
                              key={`${responseIndex}-body-${bodyFieldIndex}`}
                              className={bodyFieldIndex === 0 && isFirstRow ? 'border-t-2 border-blue-200' : ''}
                            >
                              <TableCell>
                                <Badge variant="outline" className={getMethodBadgeClass(response.method)}>
                                  {response.method}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-mono break-all">
                                {response.url}
                              </TableCell>
                              <TableCell className="text-sm font-mono break-all">
                                {response.endpoint}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getTipoBadgeClass(tipo)}>
                                  {tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-mono font-medium">
                                {bodyField.campo}
                              </TableCell>
                              <TableCell className="text-sm font-mono font-medium">
                                {bodyField.detalhes}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                        {/* Then render response fields */}
                        {response.campoRetorno.map((campo, fieldIndex) => (
                          <TableRow
                            key={`${responseIndex}-response-${fieldIndex}`}
                            className={fieldIndex === 0 && response.bodyFields.length === 0 && isFirstRow ? 'border-t-2 border-blue-200' : ''}
                          >
                            <TableCell>
                              <Badge variant="outline" className={getMethodBadgeClass(response.method)}>
                                {response.method}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-mono break-all">
                              {response.url}
                            </TableCell>
                            <TableCell className="text-sm font-mono break-all">
                              {response.endpoint}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getTipoBadgeClass('Response')}>
                                Response
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-mono font-medium">
                              {campo}
                            </TableCell>
                            <TableCell className="text-sm font-mono font-medium">
                              {response.detalhes[fieldIndex]}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Dica:</strong> Use o botão de copiar para copiar os dados sem cabeçalhos,
                prontos para colar diretamente no Excel com Ctrl+V. Linhas azuis separam diferentes requisições.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
