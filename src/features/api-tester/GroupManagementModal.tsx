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
import { PostmanImportSection, type ParsedFile } from './PostmanImportSection';
import { importPostmanCollection } from '@/services/requestGroupsService';
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

  const handleImport = async (parsedFiles: ParsedFile[]) => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Processar cada collection sequencialmente
    for (const { file, data } of parsedFiles) {
      try {
        const result = await importPostmanCollection(
          data.collectionName,
          data.requests
        );

        // Toast de sucesso individual
        toast.success(
          `✓ ${data.collectionName} importada!`,
          `${result.totalRequests} rotas. Endpoints novos: ${result.endpointsCreated}, Reutilizados: ${result.endpointsReused}`
        );

        successCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error(`✗ Erro ao importar ${file.name}`, errorMsg);
        errors.push(`${file.name}: ${errorMsg}`);
        failCount++;
      }
    }

    // Toast de resumo
    if (successCount > 0 && failCount === 0) {
      toast.success(
        'Importação concluída!',
        `${successCount} collection(s) importada(s) com sucesso`
      );
    } else if (successCount > 0 && failCount > 0) {
      toast.info(
        'Importação parcial',
        `${successCount} sucesso(s), ${failCount} falha(s)`
      );
    }

    // Chamar callback de sucesso se houver pelo menos uma importação bem-sucedida
    if (successCount > 0) {
      onImportSuccess?.();
    }

    // Fechar modal apenas se todas foram bem-sucedidas
    if (failCount === 0) {
      handleClose();
    }

    // Se houver erros, lançar exceção para o PostmanImportSection mostrar
    if (failCount > 0 && successCount === 0) {
      throw new Error(errors.join('\n'));
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
