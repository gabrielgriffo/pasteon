// src/features/api-tester/GroupManagementModal.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Upload } from 'lucide-react';
import { PostmanImportSection } from './PostmanImportSection';
import { importPostmanCollection } from '@/services/requestGroupsService';
import type { ParsedCollection } from '@/utils/postmanParser';
import { toast } from '@/utils/toast';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
  onImportSuccess?: () => void;
}

export function GroupManagementModal({
  isOpen,
  onClose,
  onConfirm,
  onImportSuccess,
}: GroupManagementModalProps) {
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('manual');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!groupName.trim()) {
      setError('Nome do grupo é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      await onConfirm(groupName.trim());
      setGroupName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (parsedData: ParsedCollection, file: File) => {
    try {
      const result = await importPostmanCollection(
        parsedData.collectionName,
        parsedData.requests
      );

      // Mostrar toast de sucesso com estatísticas
      toast.success(
        'Collection importada!',
        `Grupo "${result.group.name}" criado com ${result.totalRequests} rotas. ` +
          `Endpoints novos: ${result.endpointsCreated}, Reutilizados: ${result.endpointsReused}`
      );

      // Chamar callback de sucesso (para recarregar lista de grupos)
      onImportSuccess?.();

      // Fechar modal
      handleClose();
    } catch (err) {
      throw err; // Deixar o PostmanImportSection lidar com o erro
    }
  };

  const handleClose = () => {
    setGroupName('');
    setError(null);
    setActiveTab('manual');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Grupos</DialogTitle>
          <DialogDescription>
            Crie um novo grupo manualmente ou importe uma collection do Postman
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Criar Manualmente
            </TabsTrigger>
            <TabsTrigger value="import" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Importar Collection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nome do Grupo</Label>
                <Input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ex: Autenticação, Usuários, Produtos..."
                  disabled={isLoading}
                  autoFocus
                  maxLength={100}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !groupName.trim()}
                  className="cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Grupo'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <PostmanImportSection onImport={handleImport} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
