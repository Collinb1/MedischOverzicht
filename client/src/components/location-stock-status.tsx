import { useState } from "react";
import { Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MedicalItem, ItemLocation, PostContact, AmbulancePost } from "@shared/schema";

interface LocationStockStatusProps {
  item: MedicalItem;
}

interface ItemLocationWithDetails extends ItemLocation {
  contactPerson?: PostContact;
  ambulancePostName?: string;
}

export function LocationStockStatus({ item }: LocationStockStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get item locations for this specific item
  const { data: allLocations = [], isLoading } = useQuery<ItemLocation[]>({
    queryKey: ['/api/item-locations'],
    queryFn: async () => {
      const response = await fetch('/api/item-locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Filter locations for this specific item
  const locations = allLocations.filter(loc => loc.itemId === item.id);

  // Query to get ambulance posts
  const { data: ambulancePosts = [] } = useQuery<AmbulancePost[]>({
    queryKey: ['/api/ambulance-posts'],
    queryFn: async () => {
      const response = await fetch('/api/ambulance-posts');
      if (!response.ok) throw new Error('Failed to fetch ambulance posts');
      return response.json();
    }
  });

  // Query to get post contacts
  const { data: postContacts = [] } = useQuery<PostContact[]>({
    queryKey: ['/api/post-contacts'],
    queryFn: async () => {
      const response = await fetch('/api/post-contacts');
      if (!response.ok) throw new Error('Failed to fetch post contacts');
      return response.json();
    }
  });

  // Mutation to update location stock status
  const updateLocationStatusMutation = useMutation({
    mutationFn: async ({ locationId, stockStatus }: { locationId: string, stockStatus: string }) => {
      return apiRequest("PATCH", `/api/item-locations/${locationId}/status`, { stockStatus });
    },
    onSuccess: () => {
      toast({
        title: "Status bijgewerkt",
        description: "Voorraad status succesvol bijgewerkt",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/item-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden",
        variant: "destructive",
      });
    },
  });

  // Mutation to send supply request
  const sendSupplyRequestMutation = useMutation({
    mutationFn: async (locationId: string) => {
      return apiRequest("POST", `/api/supply-request/${locationId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Aanvulverzoek verzonden",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verzenden",
        description: error.message || "Er is een fout opgetreden bij het verzenden van het aanvulverzoek",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (locationId: string, newStatus: string) => {
    updateLocationStatusMutation.mutate({ locationId, stockStatus: newStatus });
  };

  const handleSendSupplyRequest = (locationId: string) => {
    sendSupplyRequestMutation.mutate(locationId);
  };

  const getLocationDetails = (location: ItemLocation): ItemLocationWithDetails => {
    const contactPerson = postContacts.find(c => c.id === location.contactPersonId);
    const ambulancePost = ambulancePosts.find(p => p.id === location.ambulancePostId);
    
    return {
      ...location,
      contactPerson,
      ambulancePostName: ambulancePost?.name || location.ambulancePostId
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'op-voorraad':
        return 'text-green-600';
      case 'bijna-op':
        return 'text-orange-600';
      case 'niet-meer-aanwezig':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'op-voorraad':
        return 'Op voorraad';
      case 'bijna-op':
        return 'Bijna op';
      case 'niet-meer-aanwezig':
        return 'Niet meer aanwezig';
      default:
        return status;
    }
  };

  if (isLoading) {
    return <div className="text-xs text-slate-500">Laden...</div>;
  }

  if (locations.length === 0) {
    return <div className="text-xs text-slate-500">Geen locaties</div>;
  }

  return (
    <div className="space-y-2">
      {locations.map((location) => {
        const locationDetails = getLocationDetails(location);
        const canSendRequest = location.stockStatus === 'bijna-op' || location.stockStatus === 'niet-meer-aanwezig';
        const hasContactPerson = !!locationDetails.contactPerson;

        return (
          <div key={location.id} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate">
                {locationDetails.ambulancePostName}
              </div>
              <div className="text-xs text-slate-500">
                Kast {location.cabinet}{location.drawer ? ` - Lade ${location.drawer}` : ''}
              </div>
              {locationDetails.contactPerson && (
                <div className="text-xs text-slate-400">
                  Contact: {locationDetails.contactPerson.name}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Select
                value={location.stockStatus || "op-voorraad"}
                onValueChange={(value) => handleStatusChange(location.id, value)}
                disabled={updateLocationStatusMutation.isPending}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="op-voorraad" className="text-xs">Op voorraad</SelectItem>
                  <SelectItem value="bijna-op" className="text-xs">Bijna op</SelectItem>
                  <SelectItem value="niet-meer-aanwezig" className="text-xs">Niet meer aanwezig</SelectItem>
                </SelectContent>
              </Select>
              
              {canSendRequest && hasContactPerson && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleSendSupplyRequest(location.id)}
                  disabled={sendSupplyRequestMutation.isPending}
                  title={`Aanvulverzoek verzenden naar ${locationDetails.contactPerson?.name}`}
                >
                  <Send className="w-3 h-3" />
                </Button>
              )}
              
              {canSendRequest && !hasContactPerson && (
                <div className="text-xs text-red-500" title="Geen contactpersoon ingesteld voor deze locatie">
                  <Mail className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}