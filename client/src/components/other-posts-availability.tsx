import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Package, CheckCircle2, AlertCircle, XCircle, ChevronRight } from "lucide-react";
import type { MedicalItem } from "@shared/schema";

interface OtherPostsAvailabilityProps {
  item: MedicalItem;
  currentPost: string;
  inline?: boolean; // For direct display without dialog
}

interface ItemLocation {
  id: string;
  itemId: string;
  ambulancePostId: string;
  cabinet: string;
  drawer: string | null;
  stockStatus: string;
  isLowStock: boolean;
  contactPersonId: string | null;
}

interface AmbulancePost {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
}

export function OtherPostsAvailability({ item, currentPost, inline = false }: OtherPostsAvailabilityProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Get all locations for this item
  const { data: allLocations = [], isLoading: locationsLoading } = useQuery<ItemLocation[]>({
    queryKey: ['/api/item-locations', item.id],
    queryFn: async () => {
      const response = await fetch(`/api/item-locations/${item.id}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  // Get all ambulance posts
  const { data: ambulancePosts = [], isLoading: postsLoading } = useQuery<AmbulancePost[]>({
    queryKey: ['/api/ambulance-posts'],
  });

  if (locationsLoading || postsLoading) {
    return <div className="text-xs text-gray-400">...</div>;
  }

  // Filter locations to exclude current post
  const otherPostsLocations = allLocations.filter(loc => loc.ambulancePostId !== currentPost);
  
  // Group by post and check availability
  const postAvailability = otherPostsLocations.reduce((acc, location) => {
    const post = ambulancePosts.find(p => p.id === location.ambulancePostId);
    if (!post) return acc;
    
    if (!acc[location.ambulancePostId]) {
      acc[location.ambulancePostId] = {
        post,
        locations: [],
        hasStock: false
      };
    }
    
    acc[location.ambulancePostId].locations.push(location);
    
    // Check if this location has stock
    if (location.stockStatus === 'op-voorraad' && !location.isLowStock) {
      acc[location.ambulancePostId].hasStock = true;
    }
    
    return acc;
  }, {} as Record<string, { post: AmbulancePost; locations: ItemLocation[]; hasStock: boolean }>);

  const availablePosts = Object.values(postAvailability).filter(item => item.hasStock);
  const unavailablePosts = Object.values(postAvailability).filter(item => !item.hasStock);

  // If no other posts have this item, show message
  if (otherPostsLocations.length === 0) {
    if (inline) {
      return (
        <div className="text-center py-6 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Dit item is niet aanwezig op andere posten</p>
        </div>
      );
    }
    return null;
  }

  const getStatusIcon = (stockStatus: string, isLowStock: boolean) => {
    if (stockStatus === 'op-voorraad' && !isLowStock) {
      return <CheckCircle2 className="w-3 h-3 text-green-600" />;
    } else if (stockStatus === 'bijna-op' || isLowStock) {
      return <AlertCircle className="w-3 h-3 text-orange-500" />;
    } else {
      return <XCircle className="w-3 h-3 text-red-500" />;
    }
  };

  const getStatusText = (stockStatus: string, isLowStock: boolean) => {
    if (stockStatus === 'op-voorraad' && !isLowStock) {
      return "Op voorraad";
    } else if (stockStatus === 'bijna-op' || isLowStock) {
      return "Bijna op";
    } else {
      return "Niet op voorraad";
    }
  };

  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(false);

  // Render content for inline display (within detail popup)
  const renderContent = () => (
    <div className="space-y-4">
      {/* Available at other posts */}
      {availablePosts.length > 0 && (
        <div>
          <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Beschikbaar op andere posten ({availablePosts.length})
          </h4>
          <div className="space-y-3">
            {availablePosts.map(({ post, locations }) => (
              <div key={post.id} className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">{post.name}</span>
                    {post.location && (
                      <span className="text-xs text-green-600">({post.location})</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Kast {location.cabinet}</span>
                        {location.drawer && (
                          <span className="text-gray-500">- {location.drawer}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(location.stockStatus, location.isLowStock)}
                        <span className={
                          location.stockStatus === 'op-voorraad' && !location.isLowStock 
                            ? "text-green-700" 
                            : location.stockStatus === 'bijna-op' || location.isLowStock
                            ? "text-orange-600"
                            : "text-red-600"
                        }>
                          {getStatusText(location.stockStatus, location.isLowStock)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not available at other posts */}
      {unavailablePosts.length > 0 && (
        <div>
          <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Niet op voorraad op andere posten ({unavailablePosts.length})
          </h4>
          <div className="space-y-3">
            {unavailablePosts.map(({ post, locations }) => (
              <div key={post.id} className="border rounded-lg p-4 bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-800">{post.name}</span>
                    {post.location && (
                      <span className="text-xs text-orange-600">({post.location})</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Kast {location.cabinet}</span>
                        {location.drawer && (
                          <span className="text-gray-500">- {location.drawer}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(location.stockStatus, location.isLowStock)}
                        <span className={
                          location.stockStatus === 'op-voorraad' && !location.isLowStock 
                            ? "text-green-700" 
                            : location.stockStatus === 'bijna-op' || location.isLowStock
                            ? "text-orange-600"
                            : "text-red-600"
                        }>
                          {getStatusText(location.stockStatus, location.isLowStock)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {availablePosts.length === 0 && unavailablePosts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Dit item is niet aanwezig op andere posten</p>
        </div>
      )}
    </div>
  );

  // If inline mode, show collapsible content
  if (inline) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="button-toggle-other-posts"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-900">
              Beschikbaarheid andere posten
            </span>
            {availablePosts.length > 0 && (
              <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                {availablePosts.length} beschikbaar
              </span>
            )}
          </div>
          <ChevronRight 
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
        
        {isExpanded && (
          <div className="pl-4">
            {renderContent()}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 text-xs"
          data-testid={`button-other-posts-${item.id}`}
        >
          {availablePosts.length > 0 ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span className="text-green-700">
                {availablePosts.length} post{availablePosts.length !== 1 ? 'en' : ''}
              </span>
            </div>
          ) : unavailablePosts.length > 0 ? (
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-600">Niet elders</span>
            </div>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item.name} - Beschikbaarheid andere posten
          </DialogTitle>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}