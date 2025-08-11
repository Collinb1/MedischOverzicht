import { useState } from "react";
import { Edit, Trash2, Send, CheckCircle, RotateCcw } from "lucide-react";
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
      <div className="flex justify-center" title="Geen locaties">
        <div className="w-4 h-4 rounded-full bg-gray-300"></div>
      </div>
    );
  }

  // Determine overall status based on worst status in relevant locations
  const hasUnavailable = relevantLocations.some((loc: any) => loc.stockStatus === 'niet-meer-aanwezig');
  const hasLowStock = relevantLocations.some((loc: any) => loc.stockStatus === 'bijna-op');
  const allInStock = relevantLocations.every((loc: any) => loc.stockStatus === 'op-voorraad');

  if (hasUnavailable) {
    return (
      <div className="flex justify-center" data-testid={`status-unavailable-${item.id}`} title="Niet beschikbaar">
        <div className="w-4 h-4 rounded-full bg-red-500"></div>
      </div>
    );
  }

  if (hasLowStock) {
    return (
      <div className="flex justify-center" data-testid={`status-low-${item.id}`} title="Bijna op">
        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
      </div>
    );
  }

  if (allInStock) {
    return (
      <div className="flex justify-center" data-testid={`status-available-${item.id}`} title="Op voorraad">
        <div className="w-4 h-4 rounded-full bg-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center" title="Onbekend">
      <div className="w-4 h-4 rounded-full bg-gray-300"></div>
    </div>
  );
};

// Component for supply request functionality only
const SupplyRequestColumn = ({ item, selectedPost }: { item: MedicalItem; selectedPost?: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  // Filter locations for selected post
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  // Check if any location needs supply request (bijna-op or niet-meer-aanwezig)
  const needsSupply = relevantLocations.some((loc: any) => 
    loc.stockStatus === 'bijna-op' || loc.stockStatus === 'niet-meer-aanwezig'
  );

  // Check if any location has been requested recently
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/supply-requests', item.id, selectedPost],
    queryFn: async () => {
      const response = await fetch(`/api/supply-requests?itemId=${item.id}&ambulancePost=${selectedPost}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPost,
  });

  // Get contact info for display
  const { data: postContacts = [] } = useQuery({
    queryKey: ['/api/post-contacts'],
    queryFn: async () => {
      const response = await fetch('/api/post-contacts');
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const hasRecentRequest = notifications.length > 0;

  const sendSupplyRequestMutation = useMutation({
    mutationFn: async () => {
      // Find a location that needs supply
      const locationNeedingSupply = relevantLocations.find((loc: any) => 
        loc.stockStatus === 'bijna-op' || loc.stockStatus === 'niet-meer-aanwezig'
      );
      
      if (!locationNeedingSupply) throw new Error("No location needs supply");
      
      return apiRequest('POST', `/api/supply-request/${locationNeedingSupply.id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Aanvulverzoek verzonden",
        description: "Het aanvulverzoek is succesvol verzonden naar de contactpersoon",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supply-requests'] });
    },
    onError: (error) => {
      console.error('Supply request error:', error);
      toast({
        title: "Fout bij verzenden",
        description: "Er is een fout opgetreden bij het verzenden van het aanvulverzoek",
        variant: "destructive",
      });
    },
  });

  if (!needsSupply && !hasRecentRequest) {
    return (
      <div className="text-xs text-gray-500">
        Geen aanvulling nodig
      </div>
    );
  }

  if (hasRecentRequest) {
    const latestRequest = notifications[0];
    
    // Find the contact person who received the email
    const location = relevantLocations.find((loc: any) => 
      loc.stockStatus === 'bijna-op' || loc.stockStatus === 'niet-meer-aanwezig'
    );
    const contactPerson = location ? postContacts.find((c: any) => c.id === location.contactPersonId) : null;
    
    return (
      <div className="flex items-center space-x-2 text-xs bg-green-50 p-2 rounded-lg border border-green-200">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <div className="flex-1">
          <div className="text-green-800 font-medium">Email verzonden</div>
          <div className="text-green-600">
            {new Date(latestRequest.sentAt).toLocaleDateString('nl-NL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </div>
          {contactPerson && (
            <div className="text-green-600 text-xs">
              Naar: {contactPerson.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (needsSupply) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendSupplyRequestMutation.mutate()}
        disabled={sendSupplyRequestMutation.isPending}
        className="text-xs h-7 px-2"
        data-testid={`button-supply-request-${item.id}`}
      >
        <Send className="w-3 h-3 mr-1" />
        Aanvragen
      </Button>
    );
  }

  return null;
};

// Actions column with status dropdowns (contact info runs in background)
const ActionsColumn = ({ item, selectedPost, onEdit }: { 
  item: MedicalItem; 
  selectedPost?: string;
  onEdit: () => void;
}) => {
  return (
    <div className="flex items-center space-x-1">
      {/* Status dropdowns for each location */}
      <LocationStockStatus item={item} selectedPost={selectedPost} />
      
      {/* Action buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        data-testid={`button-edit-${item.id}`}
        className="ml-2"
      >
        <Edit className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default function InventoryTable({ items, isLoading, onRefetch, selectedPost }: InventoryTableProps) {
  const [editingItem, setEditingItem] = useState<MedicalItem | null>(null);

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
                <TableHead>Aanvulverzoek</TableHead>
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
                    <TableCell data-testid={`supply-request-${item.id}`}>
                      <SupplyRequestColumn item={item} selectedPost={selectedPost} />
                    </TableCell>
                    <TableCell>
                      <ActionsColumn item={item} selectedPost={selectedPost} onEdit={() => setEditingItem(item)} />
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