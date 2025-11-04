// src/features/api-tester/ConfirmDeleteGroupModal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  groupName: string;
}

export function ConfirmDeleteGroupModal({
  isOpen,
  onClose,
  onConfirm,
  groupName,
}: ConfirmDeleteGroupModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja deletar o grupo <strong>{groupName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ <strong>Atenção:</strong> Esta ação não pode ser desfeita. Todas as requests salvas neste grupo serão permanentemente deletadas.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            variant="destructive"
            className="cursor-pointer"
          >
            Sim, Deletar Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
