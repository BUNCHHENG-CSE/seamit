import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { uploadAssetsCsv } from '../api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await uploadAssetsCsv(file);
      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'CSV upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = "Asset Tag,Serial Number,Model,Category,Status,Assigned Name,Assigned Email,Department,Location,Purchase Date,Warranty Expiry Date,EOL Date,Notes\n" +
      "ASSET-2001,C02G9918KL,MacBook Pro 14 M3,Laptop,in_use,Sarah Connor,sarah.connor@acme.com,Engineering,HQ - Floor 3,2024-01-15,2027-01-15,2028-01-15,Standard engineering laptop\n" +
      "ASSET-2002,89XYZ99,Dell Latitude 5540,Laptop,available,,,IT Operations,IT Closet Shelf A,2023-10-10,2026-10-10,2027-10-10,Spare device ready for deployment\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seamit_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-border bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <FileSpreadsheet className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Import Asset Spreadsheet</CardTitle>
              <CardDescription className="text-xs">Batch ingest hardware endpoints from CSV.</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs font-mono">
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            Upload your existing asset inventory spreadsheet. SeamIT automatically normalizes common column headers (Tag, Serial Number, User, Email, Model, Status, Warranty).
          </p>

          {/* Drag/Drop Box */}
          <div className="border border-dashed border-border rounded-lg p-6 text-center space-y-3 bg-muted/20 hover:bg-muted/30 transition">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Upload className="size-5" />
            </div>

            <div className="text-xs text-muted-foreground">
              {file ? (
                <span className="font-bold text-foreground font-mono block">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="font-sans">Drag & drop your CSV file here, or browse files</span>
              )}
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv_file_input"
            />

            <label
              htmlFor="csv_file_input"
              className="inline-block px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-secondary-foreground cursor-pointer border border-border transition font-mono"
            >
              Select CSV File
            </label>
          </div>

          {/* Sample Template Link */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
            <span className="font-sans">Need the standard template?</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={downloadSampleTemplate}
              className="h-6 gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <Download className="size-3" />
              <span>Download Sample CSV</span>
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="size-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-600 dark:text-emerald-400 text-xs space-y-2 font-mono">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="size-3.5" />
                <span>Import Completed Successfully!</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 h-5">
                  Created: {result.created}
                </Badge>
                <Badge variant="outline" className="text-foreground border-border h-5">
                  Updated: {result.updated}
                </Badge>
                {result.failed > 0 && (
                  <Badge variant="outline" className="text-destructive border-destructive/30 h-5">
                    Failed: {result.failed}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onClose}
            className="h-7 text-xs font-mono"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="gap-1.5 h-7 text-xs font-mono"
          >
            <Upload className="size-3" />
            <span>{isUploading ? 'Importing...' : 'Start Ingest'}</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
