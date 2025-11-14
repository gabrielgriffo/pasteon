import { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ExcelUploadZone } from './ExcelUploadZone';
import { DictionaryTable } from './DictionaryTable';
import {
  getAllDictionaryFields,
  importDictionaryFromExcel,
  deleteDictionaryField,
  clearAllDictionaryFields,
  getDictionaryStatistics,
  type DictionaryField,
  type DictionaryFieldInsert,
} from '@/services/dictionaryService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DictionaryImport() {
  const [fields, setFields] = useState<DictionaryField[]>([]);
  const [previewData, setPreviewData] = useState<DictionaryFieldInsert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState({ total: 0 });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });

  // Carregar campos ao montar o componente
  useEffect(() => {
    loadFields();
    loadStatistics();
  }, []);

  const loadFields = async () => {
    try {
      const data = await getAllDictionaryFields();
      setFields(data);
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
      toast.error('Erro ao carregar campos do dicionário');
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getDictionaryStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleDataParsed = (data: DictionaryFieldInsert[]) => {
    setPreviewData(data);
    setShowPreviewDialog(true);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setIsLoading(true);
    setImportProgress({ processed: 0, total: previewData.length });

    try {
      await importDictionaryFromExcel(previewData, (processed, total) => {
        setImportProgress({ processed, total });
      });

      toast.success(`${previewData.length} campos importados com sucesso!`);
      setPreviewData([]);
      setShowPreviewDialog(false);
      setImportProgress({ processed: 0, total: 0 });
      await loadFields();
      await loadStatistics();
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar dados. Verifique o console para detalhes.');
      setImportProgress({ processed: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDictionaryField(id);
      toast.success('Campo deletado com sucesso');
      await loadFields();
      await loadStatistics();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar campo');
    }
  };

  const handleClearAll = async () => {
    setIsLoading(true);
    try {
      await clearAllDictionaryFields();
      toast.success('Todos os campos foram removidos');
      setShowClearDialog(false);
      await loadFields();
      await loadStatistics();
    } catch (error) {
      console.error('Erro ao limpar:', error);
      toast.error('Erro ao limpar dicionário');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Dicionário</h1>
          <p className="text-muted-foreground mt-1">
            Importe campos de API a partir de arquivos Excel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadFields}
            className="cursor-pointer"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {fields.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              className="cursor-pointer"
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Campos</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Campos importados no dicionário
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Upload de Arquivo</h2>
        <ExcelUploadZone onDataParsed={handleDataParsed} />
        <p className="text-xs text-muted-foreground">
          O arquivo Excel deve conter as colunas: Business Element Name, Description,
          Reference(SCoTS) Table Number & Name, JSON PATH, Element Name, Element Type, JSON
          Data Type, Example
        </p>
      </div>

      <Separator />

      {/* Tabela de campos importados */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Campos Importados</h2>
        <DictionaryTable fields={fields} onDelete={handleDelete} />
      </div>

      {/* Dialog de Preview */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview dos Dados</DialogTitle>
            <DialogDescription>
              {previewData.length} campos serão importados. Revise os dados antes de
              confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
            <div className="space-y-3">
              {previewData.slice(0, 10).map((item, index) => (
                <div key={index} className="border-b pb-2 last:border-b-0">
                  <div className="font-medium">{item.business_element_name}</div>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {item.json_path && (
                      <div>
                        <span className="font-medium">JSON Path:</span> {item.json_path}
                      </div>
                    )}
                    {item.element_name && (
                      <div>
                        <span className="font-medium">Element Name:</span>{' '}
                        {item.element_name}
                      </div>
                    )}
                    {item.description && (
                      <div>
                        <span className="font-medium">Description:</span>{' '}
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {previewData.length > 10 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  ... e mais {previewData.length - 10} campos
                </div>
              )}
            </div>
          </div>

          {/* Barra de progresso durante importação */}
          {isLoading && importProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importando em lotes...</span>
                <span className="font-medium">
                  {importProgress.processed} / {importProgress.total}
                </span>
              </div>
              <Progress
                value={(importProgress.processed / importProgress.total) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                {Math.round((importProgress.processed / importProgress.total) * 100)}% concluído
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              className="cursor-pointer"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading}
              className="cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Importando...' : `Importar ${previewData.length} Campos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação para Limpar Tudo */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Limpar Todos os Campos?</DialogTitle>
            <DialogDescription>
              Esta ação irá remover permanentemente todos os {statistics.total} campos do
              dicionário. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={isLoading}
              className="cursor-pointer"
            >
              {isLoading ? 'Removendo...' : 'Sim, Limpar Tudo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
