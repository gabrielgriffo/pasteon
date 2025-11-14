import { useState } from 'react';
import { Trash2, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { DictionaryField } from '@/services/dictionaryService';

interface DictionaryTableProps {
  fields: DictionaryField[];
  onDelete: (id: number) => void;
}

export function DictionaryTable({ fields, onDelete }: DictionaryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar campos baseado no termo de busca
  const filteredFields = fields.filter((field) => {
    const term = searchTerm.toLowerCase();
    return (
      field.business_element_name.toLowerCase().includes(term) ||
      field.json_path?.toLowerCase().includes(term) ||
      field.element_name?.toLowerCase().includes(term) ||
      field.description?.toLowerCase().includes(term)
    );
  });

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg">
        <p className="text-muted-foreground">
          Nenhum campo importado ainda. Faça upload de um arquivo Excel para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome, JSON path, element name ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredFields.length} de {fields.length} campos
        </Badge>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[200px]">Business Element Name</TableHead>
                <TableHead className="w-[150px]">JSON Path</TableHead>
                <TableHead className="w-[120px]">Element Name</TableHead>
                <TableHead className="w-[100px]">Element Type</TableHead>
                <TableHead className="w-[100px]">Data Type</TableHead>
                <TableHead className="w-[150px]">Reference</TableHead>
                <TableHead className="w-[200px]">Description</TableHead>
                <TableHead className="w-[120px]">Example</TableHead>
                <TableHead className="w-[80px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum campo encontrado com "{searchTerm}"
                  </TableCell>
                </TableRow>
              ) : (
                filteredFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">
                      {field.business_element_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {field.json_path || '-'}
                    </TableCell>
                    <TableCell>{field.element_name || '-'}</TableCell>
                    <TableCell>
                      {field.element_type ? (
                        <Badge variant="outline">{field.element_type}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {field.json_data_type ? (
                        <Badge variant="secondary">{field.json_data_type}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {field.reference_scots_table || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {field.description || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">
                      {field.example || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(field.id)}
                        className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
