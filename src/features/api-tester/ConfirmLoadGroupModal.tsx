// src/features/api-tester/ConfirmLoadGroupModal.tsx

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

interface ConfirmLoadGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  groupName: string;
}

export function ConfirmLoadGroupModal({
  isOpen,
  onClose,
  onConfirm,
  groupName,
}: ConfirmLoadGroupModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Confirmar Carregamento
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja carregar o grupo <strong>{groupName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Atenção:</strong> Isso vai apagar a lista atual de requests e substituí-la pelas requests do grupo selecionado.
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
            variant="default"
            className="cursor-pointer"
          >
            Sim, Carregar Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
