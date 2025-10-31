import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';

export function AutoDocs() {
  return (
    <div className="w-full">
      <div className="max-w-8xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Documentação Automática</CardTitle>
                <CardDescription className="text-base mt-1">
                  Geração automática de documentação de APIs
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
              <div className="mx-auto w-fit p-4 bg-muted rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Esta página permitirá adicionar descrições automáticas para os campos das requisições
                salvas no banco de dados.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Buscar Requisições</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Carregar requisições do banco de dados para adicionar descrições
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Adicionar Descrições</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Interface para adicionar descrições em cada campo automaticamente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Exportar Documentação</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Gerar documentação completa da API com todos os campos descritos
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
