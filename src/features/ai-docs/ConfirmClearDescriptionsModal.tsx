// src/features/auto-docs/ConfirmClearDescriptionsModal.tsx

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmClearDescriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  invalidCount: number;
  isLoading?: boolean;
}

export function ConfirmClearDescriptionsModal({
  isOpen,
  onClose,
  onConfirm,
  invalidCount,
  isLoading = false,
}: ConfirmClearDescriptionsModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle>Limpar Descrições Inválidas?</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 pt-4">
            <p>
              Esta ação removerá as descrições de todos os campos que <strong>não terminam com ponto final (.)</strong>
            </p>

            <div className="bg-muted/50 rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Descrições que serão removidas:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Não terminam com ponto final</li>
                <li>Estão incompletas ou cortadas</li>
                <li>Têm apenas uma letra ou palavra</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
              <span className="text-2xl font-bold text-destructive">{invalidCount}</span>
              <span className="text-sm text-muted-foreground">
                {invalidCount === 1 ? 'campo será afetado' : 'campos serão afetados'}
              </span>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
              <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
              <p className="text-sm text-green-700 dark:text-green-300">
                Você poderá gerar novas descrições usando a IA após a limpeza
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            variant="destructive"
            disabled={isLoading || invalidCount === 0}
            className="cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpando...
              </>
            ) : (
              'Limpar Descrições'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
