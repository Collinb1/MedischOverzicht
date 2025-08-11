import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { EditItemDialog } from "../components/edit-item-dialog";
import { LocationStockStatus } from "../components/location-stock-status";
import type { MedicalItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface InventoryTableProps {
  items: MedicalItem[];
  isLoading: boolean;
  onRefetch: () => void;
  selectedPost?: string;
}

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

// Component to show overall status indicator for an item
const ItemStatusIndicator = ({ item, selectedPost }: { item: MedicalItem; selectedPost?: string }) => {
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  // Filter locations for selected post if specified
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  if (relevantLocations.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        <span className="text-xs text-gray-500">Geen locaties</span>
      </div>
    );
  }

  // Determine overall status based on worst status in relevant locations
  const hasUnavailable = relevantLocations.some((loc: any) => loc.stockStatus === 'niet-meer-aanwezig');
  const hasLowStock = relevantLocations.some((loc: any) => loc.stockStatus === 'bijna-op');
  const allInStock = relevantLocations.every((loc: any) => loc.stockStatus === 'op-voorraad');

  if (hasUnavailable) {
    return (
      <div className="flex items-center space-x-2" data-testid={`status-unavailable-${item.id}`}>
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span className="text-xs text-red-700 font-medium">Niet beschikbaar</span>
      </div>
    );
  }

  if (hasLowStock) {
    return (
      <div className="flex items-center space-x-2" data-testid={`status-low-${item.id}`}>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <span className="text-xs text-yellow-700 font-medium">Bijna op</span>
      </div>
    );
  }

  if (allInStock) {
    return (
      <div className="flex items-center space-x-2" data-testid={`status-available-${item.id}`}>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="text-xs text-green-700 font-medium">Op voorraad</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
      <span className="text-xs text-gray-500">Onbekend</span>
    </div>
  );
};

export default function InventoryTable({ items, isLoading, onRefetch, selectedPost }: InventoryTableProps) {
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

  const handleDelete = (item: MedicalItem) => {
    if (confirm(`Weet je zeker dat je "${item.name}" wilt verwijderen?`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Inventaris Overzicht</h2>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Item</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Locaties & Status</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Geen items gevonden
                  </TableCell>
                </TableRow>
              ) : (
                // Sort items: first items with photos, then items without photos
                [...items].sort((a, b) => {
                  if (a.photoUrl && !b.photoUrl) return -1;
                  if (!a.photoUrl && b.photoUrl) return 1;
                  return 0;
                }).map((item) => (
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
                          <div className="text-sm font-medium text-slate-900" data-testid={`text-item-name-${item.id}`}>
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600" data-testid={`text-category-${item.id}`}>
                      <div className="flex items-center space-x-2">
                        <span>{getCategoryIcon(item.category)}</span>
                        <span>{item.category}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`status-column-${item.id}`}>
                      <ItemStatusIndicator item={item} selectedPost={selectedPost} />
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            onRefetch();
          }}
        />
      )}
    </div>
  );
}