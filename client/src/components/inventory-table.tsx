import { useState } from "react";
import { Edit, Trash2, Mail, Download, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import EditItemDialog from "../components/edit-item-dialog";
import type { MedicalItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface InventoryTableProps {
  items: MedicalItem[];
  isLoading: boolean;
  onRefetch: () => void;
}

const cabinetColors = {
  A: "bg-cabinet-a bg-opacity-30 text-cabinet-a border-2 border-cabinet-a",
  B: "bg-cabinet-b bg-opacity-30 text-cabinet-b border-2 border-cabinet-b", 
  C: "bg-cabinet-c bg-opacity-30 text-cabinet-c border-2 border-cabinet-c",
  D: "bg-cabinet-d bg-opacity-30 text-cabinet-d border-2 border-cabinet-d",
  E: "bg-cabinet-e bg-opacity-30 text-cabinet-e border-2 border-cabinet-e"
};

const getCategoryIcon = (category: string) => {
  const icons = {
    "Spuiten": "💉",
    "Medicijnen": "💊", 
    "Instrumenten": "✂️",
    "Monitoring": "🌡️",
    "PBM": "😷",
    "Verbandmiddelen": "🩹"
  };
  return icons[category as keyof typeof icons] || "📦";
};

const getStockStatus = (item: MedicalItem) => {
  if (item.isLowStock) {
    return { label: "Bijna Op", className: "bg-orange-100 text-orange-800" };
  }
  return { label: "Voldoende", className: "bg-medical-green bg-opacity-20 text-medical-green" };
};

export default function InventoryTable({ items, isLoading, onRefetch }: InventoryTableProps) {
  const [editingItem, setEditingItem] = useState<MedicalItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/medical-items/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "Item verwijderd",
        description: "Het medische item is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      onRefetch();
    },
    onError: () => {
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van het item.",
        variant: "destructive",
      });
    },
  });

  const emailNotificationMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("POST", "/api/notifications/email", {
        itemId,
        recipientEmail: "pharmacy@hospital.nl"
      });
    },
    onSuccess: () => {
      toast({
        title: "E-mail verzonden",
        description: "Aanvulverzoek is verzonden naar de apotheek.",
      });
    },
    onError: () => {
      toast({
        title: "E-mail fout",
        description: "Er is een fout opgetreden bij het verzenden van de e-mail.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (item: MedicalItem) => {
    if (window.confirm(`Weet je zeker dat je "${item.name}" wilt verwijderen?`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  const handleEmailNotification = (item: MedicalItem) => {
    emailNotificationMutation.mutate(item.id);
  };

  const sendWarningEmailMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest("POST", `/api/send-warning-email/${itemId}`, {});
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Waarschuwing verzonden",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verzenden",
        description: error.message || "Er is een fout opgetreden bij het verzenden van de waarschuwing.",
        variant: "destructive",
      });
    },
  });

  const handleSendWarningEmail = (item: MedicalItem) => {
    sendWarningEmailMutation.mutate(item.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue mx-auto"></div>
            <p className="mt-2 text-slate-600">Laden...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-slate-900">Gedetailleerde Inventaris</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Exporteren
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Item</TableHead>
                <TableHead></TableHead>
                <TableHead>Kast</TableHead>
                <TableHead>Lade</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Voorraad Status</TableHead>
                <TableHead>Vervaldatum</TableHead>
                <TableHead>Alert Email</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Geen items gevonden
                  </TableCell>
                </TableRow>
              ) : (
                // Sort items: first items with photos, then items without photos
                [...items].sort((a, b) => {
                  // Items with photos come first
                  if (a.photoUrl && !b.photoUrl) return -1;
                  if (!a.photoUrl && b.photoUrl) return 1;
                  return 0;
                }).map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50" data-testid={`row-item-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center">
                          {item.photoUrl ? (
                            <img 
                              src={item.photoUrl} 
                              alt={`Foto van ${item.name}`} 
                              className="w-14 h-14 object-cover rounded-lg mr-3 border-2 border-medical-blue"
                              data-testid={`img-item-photo-${item.id}`}
                            />
                          ) : (
                            <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-lg">{getCategoryIcon(item.category)}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900" data-testid={`text-item-name-${item.id}`}>
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-sm text-slate-500" data-testid={`text-item-description-${item.id}`}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Dit wordt nu leeg gelaten omdat de foto bij de item naam staat */}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold text-2xl ${cabinetColors[item.cabinet as keyof typeof cabinetColors] || "bg-slate-200 bg-opacity-30 text-slate-700 border-2 border-slate-400"}`} data-testid={`badge-cabinet-${item.id}`}>
                          {item.cabinet.substring(0, 3)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700" data-testid={`text-drawer-${item.id}`}>
                        {item.drawer || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-900" data-testid={`text-category-${item.id}`}>
                        {item.category}
                      </TableCell>
                      <TableCell>
                        <Badge className={stockStatus.className} data-testid={`badge-stock-status-${item.id}`}>
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-900" data-testid={`text-expiry-${item.id}`}>
                        {item.expiryDate || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600" data-testid={`text-alert-email-${item.id}`}>
                        {item.alertEmail || "Niet ingesteld"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {item.isLowStock && item.alertEmail && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendWarningEmail(item)}
                              disabled={sendWarningEmailMutation.isPending}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              data-testid={`button-warning-${item.id}`}
                              title={`Stuur waarschuwing naar ${item.alertEmail}`}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEmailNotification(item)}
                            disabled={emailNotificationMutation.isPending}
                            data-testid={`button-email-${item.id}`}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item)}
                            disabled={deleteItemMutation.isPending}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">
                {items.length} resultaten weergegeven
              </p>
            </div>
          </div>
        )}
      </Card>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            onRefetch();
          }}
        />
      )}
    </>
  );
}
