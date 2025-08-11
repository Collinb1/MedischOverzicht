import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { CabinetOrderDialog } from "./cabinet-order-dialog";

interface CabinetSummary {
  id: string;
  name: string;
  abbreviation: string;
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  categories: Record<string, number>;
}

interface CabinetOverviewProps {
  onCabinetSelect: (cabinet: string) => void;
  selectedAmbulancePost?: string;
  ambulancePostName?: string;
}

// Convert Tailwind CSS color classes to hex colors
const tailwindToHex = (tailwindClass: string): string => {
  const colorMap: { [key: string]: string } = {
    'bg-red-500': '#EF4444',
    'bg-orange-500': '#F97316', 
    'bg-yellow-500': '#EAB308',
    'bg-green-500': '#22C55E',
    'bg-blue-500': '#3B82F6',
    'bg-purple-500': '#A855F7',
    'bg-pink-500': '#EC4899',
    'bg-indigo-500': '#6366F1',
    'bg-teal-500': '#14B8A6',
    'bg-lime-500': '#84CC16',
    'bg-slate-500': '#64748B',
    'bg-gray-700': '#374151',
    'bg-slate-200': '#E2E8F0'
  };
  
  return colorMap[tailwindClass] || '#6B7280'; // Default gray
};

// Get cabinet color styling
const getCabinetColor = (cabinetId: string, cabinets: any[]): string => {
  const cabinet = cabinets.find((c: any) => c.id === cabinetId);
  if (cabinet?.color) {
    return `${cabinet.color} text-white border-2 border-current`;
  }
  return "bg-slate-200 text-slate-700 border-2 border-slate-400";
};

export default function CabinetOverview({ 
  onCabinetSelect, 
  selectedAmbulancePost,
  ambulancePostName 
}: CabinetOverviewProps) {
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // Get cabinet summary data
  const { data: summaryData = [] } = useQuery<CabinetSummary[]>({
    queryKey: ["/api/cabinets/summary", selectedAmbulancePost],
    queryFn: async () => {
      const url = selectedAmbulancePost 
        ? `/api/cabinets/summary?ambulancePost=${selectedAmbulancePost}`
        : "/api/cabinets/summary";
      const response = await fetch(url);
      return response.json();
    }
  });

  // Get ordered cabinets for the selected post
  const { data: orderedCabinets = [] } = useQuery<any[]>({
    queryKey: ["/api/ambulance-posts", selectedAmbulancePost, "cabinets", "ordered"],
    queryFn: async () => {
      if (!selectedAmbulancePost) return [];
      const response = await fetch(`/api/ambulance-posts/${selectedAmbulancePost}/cabinets/ordered`);
      return response.json();
    },
    enabled: !!selectedAmbulancePost,
  });

  // Get full cabinet data 
  const { data: allCabinets = [] } = useQuery({
    queryKey: ["/api/cabinets"],
    queryFn: async () => {
      const response = await fetch("/api/cabinets");
      return response.json();
    },
  });

  // Combine ordered cabinets with their summary data and full cabinet info
  const cabinets = selectedAmbulancePost && orderedCabinets.length > 0
    ? orderedCabinets.map((cabinet: any) => {
        // Find the summary data and full cabinet data for this cabinet
        const summary = summaryData.find((s: CabinetSummary) => s.id === cabinet.id);
        const fullCabinet = allCabinets.find((c: any) => c.id === cabinet.id);
        if (summary) {
          // Use the summary data with the cabinet info from ordered list
          return {
            ...summary,
            name: cabinet.name,
            abbreviation: cabinet.abbreviation,
            color: fullCabinet?.color || 'bg-slate-200'
          };
        } else {
          // Cabinet exists in order but has no items
          return {
            id: cabinet.id,
            name: cabinet.name,
            abbreviation: cabinet.abbreviation,
            color: fullCabinet?.color || 'bg-slate-200',
            totalItems: 0,
            totalQuantity: 0,
            lowStockItems: 0,
            categories: {}
          };
        }
      })
    : summaryData.map((summary) => {
        const fullCabinet = allCabinets.find((c: any) => c.id === summary.id);
        return {
          ...summary,
          color: fullCabinet?.color || 'bg-slate-200'
        };
      });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">Kast Overzicht</h2>
        {selectedAmbulancePost && ambulancePostName && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOrderDialog(true)}
            className="flex items-center space-x-2"
            data-testid="cabinet-order-settings"
          >
            <Settings className="w-4 h-4" />
            <span>Volgorde</span>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cabinets.map((cabinet) => (
          <Card 
            key={cabinet.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onCabinetSelect(cabinet.id)}
            data-testid={`cabinet-card-${cabinet.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: tailwindToHex(cabinet.color || 'bg-slate-200') }}
                >
                  <span className="text-white font-bold text-xl">{cabinet.abbreviation}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900" data-testid={`text-cabinet-count-${cabinet.id}`}>
                    {cabinet.totalItems}
                  </p>
                  <p className="text-sm text-slate-500">Items</p>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2" data-testid={`text-cabinet-name-${cabinet.id}`}>
                {cabinet.name}
              </h3>
              <div className="space-y-1 text-sm text-slate-600">
                {Object.entries(cabinet.categories).slice(0, 3).map(([category, count]) => (
                  <div key={category} className="flex justify-between">
                    <span>{category}</span>
                    <span data-testid={`text-category-count-${cabinet.id}-${category}`}>{count}</span>
                  </div>
                ))}
                {cabinet.lowStockItems > 0 && (
                  <div className="text-orange-600 text-xs font-medium mt-2">
                    {cabinet.lowStockItems} items bijna op
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cabinet Order Dialog */}
      {selectedAmbulancePost && ambulancePostName && (
        <CabinetOrderDialog
          open={showOrderDialog}
          onOpenChange={setShowOrderDialog}
          ambulancePostId={selectedAmbulancePost}
          ambulancePostName={ambulancePostName}
        />
      )}
    </div>
  );
}
