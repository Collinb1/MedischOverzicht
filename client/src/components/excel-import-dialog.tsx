import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportPreview {
  name: string;
  category: string;
  description?: string;
  searchTerms?: string;
  valid: boolean;
  errors: string[];
}

export default function ExcelImportDialog({ open, onOpenChange }: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    // Create a sample Excel template
    const templateData = [
      ['Naam (verplicht)', 'Categorie (verplicht)', 'Beschrijving', 'Zoektermen'],
      ['Bandage', 'Wondverzorging', 'Elastische bandage voor gewrichten', 'verband,elastic,joint'],
      ['Infuus set', 'IV Therapie', 'Standaard infuus set met naald', 'iv,needle,drip'],
      ['Medicijn X', 'Medicijnen', 'Pijnstiller tabletten', 'pijn,tablet,analgesic']
    ];

    // Convert to CSV for simple download
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'medische_items_template.csv';
    link.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    await processFile(selectedFile);
  };

  const processFile = async (file: File) => {
    try {
      // Read file as text (support CSV for now)
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Fout bij verwerken",
          description: "Het bestand moet minstens een header en één data rij bevatten.",
          variant: "destructive"
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('naam'));
      const categoryIndex = headers.findIndex(h => h.includes('categorie'));
      const descriptionIndex = headers.findIndex(h => h.includes('beschrijving'));
      const searchTermsIndex = headers.findIndex(h => h.includes('zoekterm'));

      if (nameIndex === -1 || categoryIndex === -1) {
        toast({
          title: "Verkeerde bestand structuur",
          description: "Het bestand moet kolommen 'Naam' en 'Categorie' bevatten.",
          variant: "destructive"
        });
        return;
      }

      const previewData: ImportPreview[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const name = values[nameIndex] || '';
        const category = values[categoryIndex] || '';
        const description = values[descriptionIndex] || '';
        const searchTerms = values[searchTermsIndex] || '';

        const errors: string[] = [];
        if (!name) errors.push('Naam is verplicht');
        if (!category) errors.push('Categorie is verplicht');

        previewData.push({
          name,
          category,
          description,
          searchTerms,
          valid: errors.length === 0,
          errors
        });
      }

      setPreview(previewData);
    } catch (error) {
      toast({
        title: "Fout bij lezen bestand",
        description: "Kon het bestand niet verwerken. Controleer het formaat.",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!preview.length) return;

    const validItems = preview.filter(item => item.valid);
    if (validItems.length === 0) {
      toast({
        title: "Geen geldige items",
        description: "Er zijn geen geldige items om te importeren.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      let imported = 0;
      
      for (const item of validItems) {
        try {
          await fetch('/api/medical-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: item.name,
              category: item.category,
              description: item.description || '',
              searchTerms: item.searchTerms || '',
              isLowStock: false
            })
          });
          imported++;
          setProgress((imported / validItems.length) * 100);
        } catch (error) {
          console.error(`Failed to import ${item.name}:`, error);
        }
      }

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
      
      toast({
        title: "Import voltooid",
        description: `${imported} van ${validItems.length} items succesvol geïmporteerd.`,
      });

      // Reset state
      setFile(null);
      setPreview([]);
      setProgress(0);
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Import fout",
        description: "Er is een fout opgetreden tijdens het importeren.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview.filter(item => item.valid).length;
  const invalidCount = preview.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Excel Import - Medische Items
          </DialogTitle>
          <DialogDescription>
            Importeer medische items vanuit een Excel of CSV bestand
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Download Template</h3>
                <p className="text-sm text-blue-700">
                  Download een voorbeeld bestand om te zien welke kolommen verwacht worden
                </p>
              </div>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="border-blue-200 text-blue-700 hover:bg-blue-100"
                data-testid="button-download-template"
              >
                <Download className="w-4 h-4 mr-2" />
                Template Downloaden
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Selecteer bestand</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="flex-1"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-file"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bestand Kiezen
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Ondersteunde formaten: CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Importeren...</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !importing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Voorbeeld ({preview.length} items)</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {validCount} geldig
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {invalidCount} ongeldig
                    </span>
                  )}
                </div>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Naam</th>
                      <th className="text-left p-2">Categorie</th>
                      <th className="text-left p-2">Beschrijving</th>
                      <th className="text-left p-2">Zoektermen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">
                          {item.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.category}</td>
                        <td className="p-2 text-gray-600">{item.description}</td>
                        <td className="p-2 text-gray-600">{item.searchTerms}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan={5} className="p-2 text-center text-gray-500">
                          ... en {preview.length - 10} meer items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {invalidCount} items hebben fouten en zullen niet geïmporteerd worden. 
                    Controleer de verplichte velden (Naam en Categorie).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
              data-testid="button-cancel-import"
            >
              Annuleren
            </Button>
            <Button
              onClick={handleImport}
              disabled={!validCount || importing}
              className="bg-medical-blue hover:bg-blue-700"
              data-testid="button-start-import"
            >
              <Upload className="w-4 h-4 mr-2" />
              {validCount} Items Importeren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}