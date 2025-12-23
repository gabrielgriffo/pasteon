// src/features/auto-docs/ProgressPanel.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import type { ProgressInfo, ProcessLog } from '@/hooks/useAIDocumentation';

interface ProgressPanelProps {
  progress: ProgressInfo;
  logs: ProcessLog[];
  providerName: string;
  isProcessing: boolean;
}

export function ProgressPanel({ progress, logs, providerName, isProcessing }: ProgressPanelProps) {
  const formatTime = (ms: number): string => {
    if (ms < 1000) return '< 1s';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}min ${seconds}s`;
  };

  const getLogIcon = (type: ProcessLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getLogTextColor = (type: ProcessLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'error':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Progresso do Processamento</CardTitle>
          {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {progress.current} de {progress.total} campos processados
            </span>
            <span className="text-muted-foreground">
              {progress.percentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {/* Informações Atuais */}
        {isProcessing && progress.currentField && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Campo atual:</span>
              <Badge variant="outline">{providerName}</Badge>
            </div>
            <p className="text-sm text-muted-foreground break-all">{progress.currentField}</p>
            {progress.estimatedTimeMs > 0 && (
              <p className="text-xs text-muted-foreground">
                Tempo estimado restante: ~{formatTime(progress.estimatedTimeMs)}
              </p>
            )}
          </div>
        )}

        {/* Logs de Atividade */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Atividades Recentes</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border p-2">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-xs py-1">
                  {getLogIcon(log.type)}
                  <span className={getLogTextColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
