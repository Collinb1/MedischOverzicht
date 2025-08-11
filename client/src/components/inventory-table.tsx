import { useState, useEffect } from "react";
import { Edit, Trash2, Mail, Download, Plus, AlertTriangle, Send, CheckCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { EditItemDialog } from "../components/edit-item-dialog";
import { LocationStockStatus } from "../components/location-stock-status";
import type { MedicalItem, EmailNotification, ItemLocation, PostContact, AmbulancePost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface InventoryTableProps {
  items: MedicalItem[];
  isLoading: boolean;
  onRefetch: () => void;
  selectedPost?: string;
}

interface ItemLocationWithDetails extends ItemLocation {
  item: MedicalItem;
  contactPerson?: PostContact;
  ambulancePostName?: string;
}

// Helper function to get cabinet color from cabinet data
const getCabinetColor = (cabinetId: string, cabinets: any[]): string => {
  const cabinet = cabinets.find((c: any) => c.id === cabinetId);
  if (cabinet?.color) {
    return `${cabinet.color} text-white border-2 border-current`;
  }
  return "bg-slate-200 text-slate-700 border-2 border-slate-400";
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

// Removed getStockStatusColor as we now handle this per location

// Component voor Aanvulverzoek knop/status
const SupplyRequestButton = ({ item, onStockStatusChange }: { 
  item: MedicalItem; 
  onStockStatusChange: (item: MedicalItem, status: string) => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: notification, isLoading } = useQuery<EmailNotification | null>({
    queryKey: ['/api/medical-items', item.id, 'last-email'],
    queryFn: async ({ queryKey }) => {
      try {
        const [, itemId] = queryKey;
        const response = await fetch(`/api/medical-items/${itemId}/last-email`);
        if (!response.ok) return null;
        const result = await response.json();
        return result as EmailNotification | null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!item.id,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      return apiRequest('/api/send-email', 'POST', emailData);
    },
    onSuccess: () => {
      toast({
        title: "Email verzonden",
        description: "Aanvulverzoek is succesvol verzonden",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items', item.id, 'last-email'] });
    },
    onError: (error) => {
      console.error('Email send error:', error);
      toast({
        title: "Error",
        description: "Er is een fout opgetreden bij het verzenden van de email",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    const emailData = {
      itemId: item.id,
      itemName: item.name,
      cabinetId: item.cabinet,
      drawer: item.drawer,
      stockStatus: item.stockStatus,
      department: "Magazijn", // Default department
      ambulancePost: item.ambulancePost
    };
    
    sendEmailMutation.mutate(emailData);
  };

  // Toon knop alleen als status "bijna-op" of "niet-meer-aanwezig" is
  const showButton = item.stockStatus === 'bijna-op' || item.stockStatus === 'niet-meer-aanwezig';
  
  if (isLoading) {
    return null;
  }

  if (!showButton && !notification) {
    return null; // Toon niets als geen knop nodig en geen email verzonden
  }

  if (notification) {
    // Toon verstuurd icon met datum en reset knop
    return (
      <div className="flex items-center space-x-2 text-xs">
        <CheckCircle className="w-3 h-3 text-green-500" />
        <div className="flex-1">
          <div className="text-slate-900 font-medium">Verstuurd</div>
          <div className="text-slate-500">
            {new Date(notification.sentAt).toLocaleDateString('nl-NL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log("Reset knop geklikt voor item:", item.id, "van", item.stockStatus, "naar op-voorraad");
            onStockStatusChange(item, 'op-voorraad');
          }}
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
          title="Aangevuld - zet terug naar Op voorraad"
          data-testid={`button-reset-${item.id}`}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // Toon verstuur knop
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendEmail}
      disabled={sendEmailMutation.isPending}
      className="text-xs h-7 px-2"
      data-testid={`button-send-request-${item.id}`}
    >
      <Send className="w-3 h-3 mr-1" />
      Verstuur
    </Button>
  );
};

export default function InventoryTable({ items, isLoading, onRefetch, selectedPost }: InventoryTableProps) {
  const [editingItem, setEditingItem] = useState<MedicalItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get cabinet data to access abbreviations
  const { data: cabinets = [] } = useQuery<any[]>({
    queryKey: ["/api/cabinets"],
  });

  // Helper function to get cabinet abbreviation
  const getCabinetAbbreviation = (cabinetId: string): string => {
    const cabinet = cabinets.find((c: any) => c.id === cabinetId);
    return cabinet?.abbreviation || cabinetId.substring(0, 3);
  };





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

  // New mutations for "OP" and "Bijna op" functionality
  const markOutOfStockMutation = useMutation({
    mutationFn: async (item: MedicalItem) => {
      const response = await apiRequest("POST", `/api/items/${item.id}/mark-out-of-stock`, {});
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email verzonden",
        description: `Item "${data.itemName}" gemarkeerd als OP. Email verzonden naar ${data.recipient}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      onRefetch();
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verzenden",
        description: error.message || "Er is een fout opgetreden bij het versturen van de email.",
        variant: "destructive",
      });
    },
  });

  const markLowStockMutation = useMutation({
    mutationFn: async (item: MedicalItem) => {
      const response = await apiRequest("POST", `/api/items/${item.id}/mark-low-stock`, {});
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email verzonden",
        description: `Item "${data.itemName}" gemarkeerd als Bijna op. Email verzonden naar ${data.recipient}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      onRefetch();
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verzenden",
        description: error.message || "Er is een fout opgetreden bij het versturen van de email.",
        variant: "destructive",
      });
    },
  });

  const handleMarkOutOfStock = (item: MedicalItem) => {
    if (!item.alertEmail) {
      toast({
        title: "Geen email ingesteld",
        description: "Dit item heeft geen alert email adres ingesteld.",
        variant: "destructive",
      });
      return;
    }
    markOutOfStockMutation.mutate(item);
  };

  const handleMarkLowStock = (item: MedicalItem) => {
    if (!item.alertEmail) {
      toast({
        title: "Geen email ingesteld",
        description: "Dit item heeft geen alert email adres ingesteld.",
        variant: "destructive",
      });
      return;
    }
    markLowStockMutation.mutate(item);
  };

  // New mutation for updating stock status
  const updateStockStatusMutation = useMutation({
    mutationFn: async ({ itemId, newStatus }: { itemId: string, newStatus: string }) => {
      const response = await apiRequest("PATCH", `/api/medical-items/${itemId}`, {
        stockStatus: newStatus
      });
      return response;
    },
    onSuccess: (data: any, variables) => {
      const statusLabels = {
        "op-voorraad": "Op voorraad",
        "bijna-op": "Bijna op",
        "niet-meer-aanwezig": "Niet meer aanwezig"
      };
      toast({
        title: "Status bijgewerkt",
        description: `Voorraad status gewijzigd naar: ${statusLabels[variables.newStatus as keyof typeof statusLabels]}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      onRefetch();
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de status.",
        variant: "destructive",
      });
    },
  });

  const handleStockStatusChange = (item: MedicalItem, newStatus: string) => {
    updateStockStatusMutation.mutate({ itemId: item.id, newStatus });
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
                <TableHead>Locaties & Status</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
                  // Removed stockStatusColor as we now handle status per location
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
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-xl">{getCategoryIcon(item.category)}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-medium text-slate-900" data-testid={`text-item-name-${item.id}`}>
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-xs text-slate-500" data-testid={`text-item-description-${item.id}`}>
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
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold text-xl ${getCabinetColor(item.cabinet, cabinets)}`} data-testid={`badge-cabinet-${item.id}`}>
                          {getCabinetAbbreviation(item.cabinet)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700" data-testid={`text-drawer-${item.id}`}>
                        {item.drawer || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-900" data-testid={`text-category-${item.id}`}>
                        {item.category}
                      </TableCell>
                      <TableCell data-testid={`location-status-${item.id}`}>
                        <LocationStockStatus item={item} selectedPost={selectedPost} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
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
                            onClick={() => handleDelete(item)}
                            disabled={deleteItemMutation.isPending}
                            data-testid={`button-delete-${item.id}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          onOpenChange={(open: boolean) => !open && setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            onRefetch();
          }}
        />
      )}
    </>
  );
}
