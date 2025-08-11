import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Database, HardDrive, Shield, Clock, RotateCcw, Download, Upload, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function SystemSettings() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Mock system stats - in real app this would come from API
  const systemStats = {
    totalItems: 127,
    totalLocations: 45,
    totalPosts: 3,
    totalCabinets: 8,
    lastBackup: "2025-08-11T09:30:00Z",
    diskUsage: 65,
    memoryUsage: 72,
    uptime: "3 dagen, 14 uur"
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setBackupProgress(0);
    
    try {
      // Simulate progress
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // In real app, this would make API call to export data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Data geëxporteerd",
        description: "Alle systeem data is succesvol geëxporteerd.",
      });
    } catch (error) {
      toast({
        title: "Export mislukt",
        description: "Er is een fout opgetreden bij het exporteren van data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setBackupProgress(0);
    }
  };

  const handleImportData = async () => {
    setIsImporting(true);
    
    try {
      // In real app, this would handle file upload and import
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Data geïmporteerd",
        description: "De backup data is succesvol geïmporteerd.",
      });
    } catch (error) {
      toast({
        title: "Import mislukt",
        description: "Er is een fout opgetreden bij het importeren van data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearCache = () => {
    toast({
      title: "Cache geleegd",
      description: "Alle cache data is succesvol verwijderd.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Systeem Configuratie
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Beheer algemene systeem instellingen en onderhoud
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Systeem Overzicht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {systemStats.totalItems}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Medische Items
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {systemStats.totalLocations}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Locaties
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {systemStats.totalPosts}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Ambulanceposten
                </div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {systemStats.totalCabinets}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Kasten
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Schijfgebruik</span>
                <Badge variant="secondary">{systemStats.diskUsage}%</Badge>
              </div>
              <Progress value={systemStats.diskUsage} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Geheugengebruik</span>
                <Badge variant="secondary">{systemStats.memoryUsage}%</Badge>
              </div>
              <Progress value={systemStats.memoryUsage} className="h-2" />
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
                <span className="text-sm font-medium">{systemStats.uptime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Applicatie Instellingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Automatische Backups</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Dagelijkse automatische data backup
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">E-mail Notificaties</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatische waarschuwingen versturen
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Debug Logging</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uitgebreide systeem logs bijhouden
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Sessie Timeout</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minuten</SelectItem>
                    <SelectItem value="30">30 minuten</SelectItem>
                    <SelectItem value="60">1 uur</SelectItem>
                    <SelectItem value="120">2 uur</SelectItem>
                    <SelectItem value="never">Nooit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Taal Interface</Label>
                <Select defaultValue="nl">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="w-5 h-5 mr-2" />
              Data Beheer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Exporteer of importeer systeem data voor backup doeleinden.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Laatste Backup</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(systemStats.lastBackup).toLocaleString('nl-NL')}
                  </div>
                </div>
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  3 uur geleden
                </Badge>
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Data exporteren...</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="h-2" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleExportData}
                  disabled={isExporting}
                  variant="outline"
                  data-testid="button-export-data"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exporteren...' : 'Data Exporteren'}
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isImporting}
                      data-testid="button-import-data"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Data Importeren
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Data Importeren</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Selecteer een backup bestand om te importeren. Dit zal alle huidige data overschrijven.
                      </p>
                      <Input type="file" accept=".json,.csv" />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Annuleren</Button>
                        <Button onClick={handleImportData} disabled={isImporting}>
                          {isImporting ? 'Importeren...' : 'Importeren'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Onderhoud
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Voer onderhoudstaken uit om systeem prestaties te optimaliseren.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Cache Legen</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Verwijder tijdelijke bestanden en cache
                  </div>
                </div>
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  size="sm"
                  data-testid="button-clear-cache"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Legen
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Database Optimaliseren</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Comprimeer en optimaliseer database tabellen
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid="button-optimize-db">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Optimaliseren
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <div className="text-sm font-medium text-red-800 dark:text-red-200">
                    Systeem Herstarten
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Herstart de applicatie server (downtime)
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" data-testid="button-restart-system">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Herstarten
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Systeem Herstarten</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Weet je zeker dat je het systeem wilt herstarten? Dit zorgt voor een korte downtime.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Annuleren</Button>
                        <Button variant="destructive">Ja, Herstarten</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Version Information */}
      <Card>
        <CardHeader>
          <CardTitle>Versie Informatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Applicatie Versie</div>
              <div className="text-lg font-semibold">v1.0.0</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Database Versie</div>
              <div className="text-lg font-semibold">PostgreSQL 15.3</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Laatste Update</div>
              <div className="text-lg font-semibold">11 augustus 2025</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}