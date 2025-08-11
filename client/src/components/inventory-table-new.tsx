import { useState } from "react";
import { Edit, Trash2, Send, CheckCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Component for cabinet information display
const CabinetColumn = ({ item, selectedPost }: { item: MedicalItem; selectedPost?: string }) => {
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: cabinets = [] } = useQuery({
    queryKey: ['/api/cabinets'],
    queryFn: async () => {
      const response = await fetch('/api/cabinets');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter locations for selected post if specified
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  if (relevantLocations.length === 0) {
    return <div className="text-sm text-slate-400">-</div>;
  }

  // Get unique cabinets for this item
  const uniqueCabinets = Array.from(new Set(relevantLocations.map((loc: any) => loc.cabinet)));

  return (
    <div className="flex flex-wrap gap-1">
      {uniqueCabinets.map((cabinetId: string) => {
        const cabinet = cabinets.find((c: any) => c.id === cabinetId);
        const cabinetColor = cabinet?.abbreviation ? getCabinetColor(cabinet.abbreviation) : '#6B7280';
        
        return (
          <div 
            key={cabinetId}
            className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-bold text-white min-w-[40px]"
            style={{ backgroundColor: cabinetColor }}
            data-testid={`cabinet-${cabinetId}-${item.id}`}
          >
            <span>{cabinet?.abbreviation || cabinetId}</span>
          </div>
        );
      })}
    </div>
  );
};

// Component for drawer information display
const DrawerColumn = ({ item, selectedPost }: { item: MedicalItem; selectedPost?: string }) => {
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter locations for selected post if specified
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  if (relevantLocations.length === 0) {
    return <div className="text-sm text-slate-400">-</div>;
  }

  // Get unique drawers for this item
  const uniqueDrawers = Array.from(new Set(relevantLocations.map((loc: any) => loc.drawer).filter(Boolean)));

  if (uniqueDrawers.length === 0) {
    return <div className="text-sm text-slate-400">-</div>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {uniqueDrawers.map((drawer: string, index: number) => (
        <div 
          key={index}
          className="px-2 py-1 bg-slate-100 rounded-md text-xs text-slate-700"
          data-testid={`drawer-${drawer}-${item.id}`}
        >
          {drawer}
        </div>
      ))}
    </div>
  );
};

// Helper function to get cabinet colors
const getCabinetColor = (abbreviation: string): string => {
  const colors: { [key: string]: string } = {
    'A': '#EF4444',    // Red
    'Ab': '#F97316',   // Orange  
    'B': '#EAB308',    // Yellow
    'C': '#22C55E',    // Green
    'D': '#3B82F6',    // Blue
    'E': '#A855F7',    // Purple
    'F': '#EC4899',    // Pink
    'G': '#06B6D4',    // Cyan
    'H': '#84CC16',    // Lime
    'I': '#F59E0B',    // Amber
  };
  
  return colors[abbreviation] || '#6B7280'; // Default gray
};

// Component for table row with status-based background color
const StatusTableRow = ({ item, selectedPost, children, onDoubleClick }: { 
  item: MedicalItem; 
  selectedPost?: string; 
  children: React.ReactNode;
  onDoubleClick?: () => void;
}) => {
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter locations for selected post if specified
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  const getRowBackgroundClass = () => {
    if (relevantLocations.length === 0) return "hover:bg-slate-50";
    
    const hasUnavailable = relevantLocations.some((loc: any) => loc.stockStatus === "niet-meer-aanwezig");
    const hasLowStock = relevantLocations.some((loc: any) => loc.stockStatus === "bijna-op");

    if (hasUnavailable) {
      return "bg-red-50 hover:bg-red-100";
    }
    if (hasLowStock) {
      return "bg-orange-50 hover:bg-orange-100";
    }
    
    return "bg-green-50 hover:bg-green-100";
  };

  return (
    <TableRow 
      className={`${getRowBackgroundClass()} cursor-pointer`} 
      data-testid={`row-item-${item.id}`}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </TableRow>
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

// Item Detail View Component
const ItemDetailView = ({ item, open, onOpenChange, selectedPost }: {
  item: MedicalItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPost?: string;
}) => {
  const [editingItem, setEditingItem] = useState<MedicalItem | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ['/api/item-locations', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!item?.id,
  });

  const { data: cabinets = [] } = useQuery({
    queryKey: ['/api/cabinets'],
    queryFn: async () => {
      const response = await fetch('/api/cabinets');
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: ambulancePosts = [] } = useQuery({
    queryKey: ['/api/ambulance-posts'],
    queryFn: async () => {
      const response = await fetch('/api/ambulance-posts');
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (!item) return null;

  // Filter locations for selected post if specified
  const relevantLocations = selectedPost 
    ? locations.filter((loc: any) => loc.ambulancePostId === selectedPost)
    : locations;

  // Get overall status for header color
  const getOverallStatus = () => {
    if (relevantLocations.length === 0) return "op-voorraad";
    if (relevantLocations.some((loc: any) => loc.stockStatus === "niet-meer-aanwezig")) return "niet-meer-aanwezig";
    if (relevantLocations.some((loc: any) => loc.stockStatus === "bijna-op")) return "bijna-op";
    return "op-voorraad";
  };

  const status = getOverallStatus();
  const getStatusColor = () => {
    switch (status) {
      case "niet-meer-aanwezig": return "bg-red-500";
      case "bijna-op": return "bg-orange-500";
      case "op-voorraad": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "niet-meer-aanwezig": return "Niet op voorraad";
      case "bijna-op": return "Bijna op";
      case "op-voorraad": return "Op voorraad";
      default: return "Onbekend";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header with status color */}
          <div className={`${getStatusColor()} text-white p-4 flex items-center justify-between`}>
            <div>
              <DialogTitle className="text-white text-xl font-bold">{item.name}</DialogTitle>
              <p className="text-white/90 text-sm">{getStatusText()}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Photo Section */}
            {item.photoUrl && (
              <div className="flex flex-col items-center space-y-2">
                <img 
                  src={`/objects/uploads/${item.photoUrl.split('/').pop()}`}
                  alt={`Foto van ${item.name}`} 
                  className="max-w-xs max-h-64 object-cover rounded-lg border shadow-sm"
                  onError={(e) => {
                    console.error('Photo failed to load via objects route, trying direct URL:', item.photoUrl);
                    // Try direct URL as fallback
                    const target = e.currentTarget;
                    if (!target.src.includes('storage.googleapis.com')) {
                      target.src = item.photoUrl;
                    } else {
                      // Both failed, show placeholder
                      target.style.display = 'none';
                      
                      // Check if placeholder already exists
                      const existingPlaceholder = target.parentNode?.querySelector('.photo-placeholder');
                      if (!existingPlaceholder) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'photo-placeholder w-full max-w-xs h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center';
                        placeholder.innerHTML = `
                          <div class="text-center text-gray-500">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            <p class="text-sm mt-2">Foto kan niet worden geladen</p>
                            <p class="text-xs text-gray-400">${item.photoUrl.split('/').pop()}</p>
                          </div>
                        `;
                        target.parentNode?.appendChild(placeholder);
                      }
                    }
                  }}
                  onLoad={() => console.log('Photo loaded successfully via /objects/ route')}
                />
              </div>
            )}


            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Basisinformatie</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Naam:</span> {item.name}</div>
                  <div><span className="font-medium">Categorie:</span> {getCategoryIcon(item.category)} {item.category}</div>
                  {item.description && <div><span className="font-medium">Beschrijving:</span> {item.description}</div>}
                  {item.expiryDate && <div><span className="font-medium">Vervaldatum:</span> {new Date(item.expiryDate).toLocaleDateString('nl-NL')}</div>}
                  {item.alertEmail && <div><span className="font-medium">Alert Email:</span> {item.alertEmail}</div>}
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Locatie Informatie</h3>
              <div className="space-y-3">
                {relevantLocations.length === 0 ? (
                  <p className="text-slate-500 text-sm">Geen locaties gevonden</p>
                ) : (
                  relevantLocations.map((location: any) => {
                    const post = ambulancePosts.find((p: any) => p.id === location.ambulancePostId);
                    const cabinet = cabinets.find((c: any) => c.id === location.cabinet);
                    const cabinetColor = cabinet?.abbreviation ? getCabinetColor(cabinet.abbreviation) : '#6B7280';
                    
                    return (
                      <div key={location.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{post?.name || location.ambulancePostId}</span>
                            <div 
                              className="px-2 py-1 rounded text-xs font-bold text-white"
                              style={{ backgroundColor: cabinetColor }}
                            >
                              {cabinet?.abbreviation || location.cabinet}
                            </div>
                            {location.drawer && (
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs">{location.drawer}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              location.stockStatus === 'niet-meer-aanwezig' ? 'bg-red-500' :
                              location.stockStatus === 'bijna-op' ? 'bg-orange-500' : 'bg-green-500'
                            }`}></div>
                            <span className="text-sm capitalize">{location.stockStatus.replace('-', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setEditingItem(item)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Bewerken
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Sluiten
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            // Optionally refresh data
          }}
        />
      )}
    </>
  );
};

export default function InventoryTable({ items, isLoading, onRefetch, selectedPost }: InventoryTableProps) {
  const [editingItem, setEditingItem] = useState<MedicalItem | null>(null);
  const [detailViewItem, setDetailViewItem] = useState<MedicalItem | null>(null);

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
                <TableHead>Kast</TableHead>
                <TableHead>Lade</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aanvulverzoek</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
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
                  <StatusTableRow 
                    key={item.id} 
                    item={item} 
                    selectedPost={selectedPost}
                    onDoubleClick={() => setDetailViewItem(item)}
                  >
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
                    <TableCell data-testid={`cabinet-column-${item.id}`}>
                      <CabinetColumn item={item} selectedPost={selectedPost} />
                    </TableCell>
                    <TableCell data-testid={`drawer-column-${item.id}`}>
                      <DrawerColumn item={item} selectedPost={selectedPost} />
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
                  </StatusTableRow>
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

      <ItemDetailView
        item={detailViewItem}
        open={!!detailViewItem}
        onOpenChange={() => setDetailViewItem(null)}
        selectedPost={selectedPost}
      />
    </div>
  );
}