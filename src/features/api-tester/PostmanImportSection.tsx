// src/features/api-tester/PostmanImportSection.tsx

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileJson,
  CheckCircle,
  XCircle,
  Loader2,
  FileUp,
  AlertCircle,
} from 'lucide-react';
import {
  parsePostmanCollection,
  readFileAsJSON,
  isValidFileType,
  formatMethodStats,
  type ParsedCollection,
} from '@/utils/postmanParser';

interface PostmanImportSectionProps {
  onImport: (parsedData: ParsedCollection, file: File) => Promise<void>;
}

export function PostmanImportSection({ onImport }: PostmanImportSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCollection | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    setParsedData(null);
    setSelectedFile(null);

    // Validar tipo de arquivo
    if (!isValidFileType(file)) {
      setError('Arquivo inválido. Por favor, selecione um arquivo .json');
      return;
    }

    setIsProcessing(true);

    try {
      // Ler arquivo
      const jsonData = await readFileAsJSON(file);

      // Parsear collection
      const parsed = parsePostmanCollection(jsonData);

      setParsedData(parsed);
      setSelectedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportClick = async () => {
    if (!parsedData || !selectedFile) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(parsedData, selectedFile);

      // Reset após sucesso
      setParsedData(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar collection');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dropzone Area */}
      {!parsedData && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}
          `}
          onClick={handleClickUpload}
        >
          <div className="flex flex-col items-center gap-3">
            {isProcessing ? (
              <>
                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Processando arquivo...</p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Arraste um arquivo .json aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Apenas arquivos Postman Collection v2.1.0
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClickUpload();
                  }}
                  className="cursor-pointer mt-2"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Selecionar Arquivo
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-destructive">Erro ao processar arquivo</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="cursor-pointer"
              >
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Card */}
      {parsedData && (
        <Card className="border-primary/50">
          <CardContent className="pt-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="bg-primary/10 p-2 rounded-md shrink-0">
                  <FileJson className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Label className="text-sm font-medium">Collection Detectada</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pronto para importar para um novo grupo
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="cursor-pointer shrink-0"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Collection Info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nome do Grupo</Label>
                <p className="text-sm font-medium mt-1">{parsedData.collectionName}</p>
              </div>

              {parsedData.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="text-sm mt-1">{parsedData.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total de Rotas</Label>
                  <p className="text-sm font-medium mt-1">{parsedData.stats.total}</p>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Métodos HTTP</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(parsedData.stats.byMethod).map(([method, count]) => (
                      <Badge key={method} variant="secondary" className="text-xs">
                        {method} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Info Alert */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Os endpoints serão criados automaticamente se não existirem. O grupo será criado com
                o nome da collection.
              </p>
            </div>

            {/* Import Button */}
            <Button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando Collection...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Collection ({parsedData.stats.total} rotas)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
