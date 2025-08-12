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
  ambulancePostId?: string;
  cabinet?: string;
  drawer?: string;
  contactPerson?: string;
  photoUrl?: string;
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
      ['Naam (verplicht)', 'Categorie (verplicht)', 'Beschrijving', 'Zoektermen', 'Ambulancepost ID', 'Kast', 'Lade', 'Contactpersoon', 'Foto URL'],
      ['Bandage', 'Wondverzorging', 'Elastische bandage voor gewrichten', 'verband,elastic,joint', 'hilversum', 'A', '1', 'Test Contactpersoon', ''],
      ['Infuus set', 'IV Therapie', 'Standaard infuus set met naald', 'iv,needle,drip', 'hilversum', 'B', '2', 'Test Contactpersoon', ''],
      ['Medicijn X', 'Medicijnen', 'Pijnstiller tabletten', 'pijn,tablet,analgesic', 'hilversum', 'C', '1', 'Test Contactpersoon', '']
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
      const ambulancePostIndex = headers.findIndex(h => h.includes('ambulancepost') || h.includes('post'));
      const cabinetIndex = headers.findIndex(h => h.includes('kast'));
      const drawerIndex = headers.findIndex(h => h.includes('lade'));
      const contactPersonIndex = headers.findIndex(h => h.includes('contactpersoon'));
      const photoUrlIndex = headers.findIndex(h => h.includes('foto'));

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
        const ambulancePostId = values[ambulancePostIndex] || '';
        const cabinet = values[cabinetIndex] || '';
        const drawer = values[drawerIndex] || '';
        const contactPerson = values[contactPersonIndex] || '';
        const photoUrl = values[photoUrlIndex] || '';

        const errors: string[] = [];
        if (!name) errors.push('Naam is verplicht');
        if (!category) errors.push('Categorie is verplicht');

        previewData.push({
          name,
          category,
          description,
          searchTerms,
          ambulancePostId,
          cabinet,
          drawer,
          contactPerson,
          photoUrl,
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
          // First create the medical item
          const itemResponse = await fetch('/api/medical-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: item.name,
              category: item.category,
              description: item.description || '',
              searchTerms: item.searchTerms || '',
              isLowStock: false,
              photoUrl: item.photoUrl || ''
            })
          });

          if (!itemResponse.ok) {
            throw new Error(`Failed to create item: ${itemResponse.statusText}`);
          }

          const createdItem = await itemResponse.json();

          // If location data is provided, create item location
          if (item.ambulancePostId && item.cabinet) {
            try {
              // Find contact person ID if provided
              let contactPersonId = '';
              if (item.contactPerson) {
                const contactsResponse = await fetch('/api/post-contacts');
                if (contactsResponse.ok) {
                  const contacts = await contactsResponse.json();
                  const contact = contacts.find((c: any) => 
                    c.name.toLowerCase().includes(item.contactPerson!.toLowerCase()) &&
                    c.ambulancePostId === item.ambulancePostId
                  );
                  if (contact) {
                    contactPersonId = contact.id;
                  }
                }
              }

              await fetch('/api/item-locations', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  itemId: createdItem.id,
                  ambulancePostId: item.ambulancePostId,
                  cabinet: item.cabinet,
                  drawer: item.drawer || '1',
                  contactPersonId: contactPersonId || null,
                  stockStatus: 'in_stock'
                })
              });
            } catch (locationError) {
              console.error(`Failed to create location for ${item.name}:`, locationError);
            }
          }

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
                  Download een voorbeeld bestand met alle kolommen: naam, categorie, beschrijving, zoektermen, ambulancepost, kast, lade, contactpersoon en foto URL
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 Tip: Voor foto's kunt u URLs gebruiken naar object storage: /objects/[bestandsnaam]
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
                      <th className="text-left p-2">Post</th>
                      <th className="text-left p-2">Locatie</th>
                      <th className="text-left p-2">Contact</th>
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
                        <td className="p-2 text-gray-600">{item.ambulancePostId}</td>
                        <td className="p-2 text-gray-600">
                          {item.cabinet && `Kast ${item.cabinet}`}
                          {item.drawer && `, Lade ${item.drawer}`}
                        </td>
                        <td className="p-2 text-gray-600">{item.contactPerson}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-gray-500">
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