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

export interface ParsedFile {
  file: File;
  data: ParsedCollection;
}

interface PostmanImportSectionProps {
  onImport: (parsedFiles: ParsedFile[]) => Promise<void>;
}

export function PostmanImportSection({ onImport }: PostmanImportSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setError(null);
    setParsedFiles([]);
    setIsProcessing(true);

    const successfullyParsed: ParsedFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validar tipo de arquivo
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Arquivo inválido (deve ser .json)`);
        continue;
      }

      try {
        // Ler arquivo
        const jsonData = await readFileAsJSON(file);

        // Parsear collection
        const parsed = parsePostmanCollection(jsonData);

        successfullyParsed.push({ file, data: parsed });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        errors.push(`${file.name}: ${errorMsg}`);
      }
    }

    setParsedFiles(successfullyParsed);

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    setIsProcessing(false);
  };

  const handleImportClick = async () => {
    if (parsedFiles.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(parsedFiles);

      // Reset após sucesso
      setParsedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar collections');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedFiles([]);
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
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dropzone Area */}
      {parsedFiles.length === 0 && (
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
                <p className="text-sm text-muted-foreground">Processando arquivos...</p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Arraste arquivo(s) .json aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Suporta múltiplos arquivos - Postman Collection v2.1.0
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
                  Selecionar Arquivo(s)
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

      {/* Preview Cards */}
      {parsedFiles.length > 0 && (
        <div className="space-y-4">
          {/* Header with Reset Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <Label className="text-sm font-medium">
                {parsedFiles.length} Collection{parsedFiles.length > 1 ? 's' : ''} Detectada{parsedFiles.length > 1 ? 's' : ''}
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="cursor-pointer"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>

          {/* List of Collections */}
          <div className="space-y-2">
            {parsedFiles.map((parsedFile, index) => (
              <Card key={index} className="border-primary/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-md shrink-0">
                      <FileJson className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium">{parsedFile.data.collectionName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{parsedFile.file.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          {parsedFile.data.stats.total} rotas
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(parsedFile.data.stats.byMethod).map(([method, count]) => (
                            <Badge key={method} variant="secondary" className="text-xs">
                              {method} ({count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Cada collection será importada para um grupo separado. Os endpoints serão criados automaticamente se não existirem.
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
                Importando Collections...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar {parsedFiles.length} Collection{parsedFiles.length > 1 ? 's' : ''} (
                {parsedFiles.reduce((acc, pf) => acc + pf.data.stats.total, 0)} rotas no total)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
