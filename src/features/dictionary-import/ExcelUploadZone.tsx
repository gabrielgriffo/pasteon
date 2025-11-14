import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import type { DictionaryFieldInsert } from '@/services/dictionaryService';

interface ExcelUploadZoneProps {
  onDataParsed: (data: DictionaryFieldInsert[]) => void;
}

export function ExcelUploadZone({ onDataParsed }: ExcelUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
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
    // Validar extensão
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)');
      return;
    }

    // Validar tamanho (máximo 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Tamanho máximo: 20MB');
      return;
    }

    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Pega a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte para JSON
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        alert('O arquivo Excel está vazio');
        return;
      }

      // Mapear colunas do Excel para o formato do banco
      const mappedData: DictionaryFieldInsert[] = jsonData.map((row) => ({
        business_element_name: row['Business Element Name'] || '',
        description: row['Description'] || null,
        reference_scots_table: row['Reference(SCoTS) Table Number & Name'] || null,
        json_path: row['JSON PATH'] || null,
        element_name: row['Element Name'] || null,
        element_type: row['Element Type'] || null,
        json_data_type: row['JSON Data Type'] || null,
        example: row['Example'] || null,
      }));

      // Filtrar linhas com business_element_name vazio
      const validData = mappedData.filter(
        (item) => item.business_element_name.trim() !== ''
      );

      if (validData.length === 0) {
        alert('Nenhum dado válido encontrado. Verifique se as colunas estão corretas.');
        return;
      }

      onDataParsed(validData);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo Excel. Verifique o formato.');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {fileName ? (
          <>
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Arquivo selecionado com sucesso
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setFileName(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="cursor-pointer"
            >
              Selecionar outro arquivo
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Arraste um arquivo Excel aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos suportados: .xlsx, .xls (máximo 20MB)
              </p>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer">
              Selecionar Arquivo
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
