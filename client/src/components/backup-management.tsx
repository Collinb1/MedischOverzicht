import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface BackupData {
  version: string;
  exportedAt: string;
  totalItems: number;
  ambulancePosts: any[];
  medicalItems: any[];
  itemLocations: any[];
  cabinets: any[];
  categories: any[];
  postContacts: any[];
}

export function BackupManagement() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    stats?: {
      itemsImported: number;
      locationsImported: number;
      postsImported: number;
    };
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get all data for backup
  const { data: backupData, isLoading } = useQuery({
    queryKey: ['/api/backup/export'],
    enabled: false, // Only fetch when explicitly requested
  });

  // Export backup mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backup/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      return await response.json() as BackupData;
    },
    onSuccess: (data: BackupData) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medische-inventaris-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Backup geëxporteerd",
        description: `${data.totalItems} items succesvol geëxporteerd naar JSON bestand`,
      });
    },
    onError: (error) => {
      console.error("Export error:", error);
      toast({
        title: "Export mislukt",
        description: "Er is een fout opgetreden bij het exporteren van de backup",
        variant: "destructive",
      });
    },
  });

  // Import backup mutation
  const importMutation = useMutation({
    mutationFn: async (backupData: BackupData) => {
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        body: JSON.stringify(backupData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Import failed');
      }
      return await response.json();
    },
    onSuccess: (result: any) => {
      setImportStatus({
        success: true,
        message: "Backup succesvol geïmporteerd",
        stats: result.stats,
      });
      
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/item-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cabinets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
      
      toast({
        title: "Import geslaagd",
        description: `${result.stats.itemsImported} items geïmporteerd`,
      });
    },
    onError: (error: any) => {
      console.error("Import error:", error);
      setImportStatus({
        success: false,
        message: error.message || "Er is een fout opgetreden bij het importeren",
      });
      
      toast({
        title: "Import mislukt",
        description: "Er is een fout opgetreden bij het importeren van de backup",
        variant: "destructive",
      });
    },
  });

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        
        // Validate backup structure
        if (!backupData.version || !backupData.medicalItems || !Array.isArray(backupData.medicalItems)) {
          throw new Error("Ongeldig backup bestand formaat");
        }

        importMutation.mutate(backupData);
      } catch (error: any) {
        setImportStatus({
          success: false,
          message: `Fout bij lezen bestand: ${error.message}`,
        });
        toast({
          title: "Bestand fout",
          description: "Het geselecteerde bestand is niet een geldige backup",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
        // Reset file input
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Backup Beheer</h3>
        <p className="text-sm text-muted-foreground">
          Exporteer alle medische items naar een backup bestand of importeer een eerder gemaakte backup.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Backup Exporteren
            </CardTitle>
            <CardDescription>
              Download een JSON backup van alle medische items, locaties en instellingen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="w-full"
              data-testid="button-export-backup"
            >
              {exportMutation.isPending ? (
                "Backup wordt gemaakt..."
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Backup Downloaden
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Backup Importeren
            </CardTitle>
            <CardDescription>
              Upload een eerder gemaakte backup om alle gegevens te herstellen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Let op:</strong> Het importeren van een backup zal alle huidige gegevens vervangen.
                  Maak eerst een backup van de huidige staat.
                </AlertDescription>
              </Alert>
              
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                  id="backup-file-input"
                  disabled={isImporting || importMutation.isPending}
                />
                <label htmlFor="backup-file-input">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    disabled={isImporting || importMutation.isPending}
                    data-testid="button-import-backup"
                  >
                    {isImporting || importMutation.isPending ? (
                      "Backup wordt geïmporteerd..."
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Backup Bestand Selecteren
                      </>
                    )}
                  </Button>
                </label>
              </div>

              {/* Import Status */}
              {importStatus && (
                <Alert className={importStatus.success ? "border-green-200 bg-green-50" : ""}>
                  {importStatus.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{importStatus.message}</p>
                      {importStatus.stats && (
                        <div className="text-sm">
                          <p>Items geïmporteerd: {importStatus.stats.itemsImported}</p>
                          <p>Locaties geïmporteerd: {importStatus.stats.locationsImported}</p>
                          <p>Posten geïmporteerd: {importStatus.stats.postsImported}</p>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}