import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

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
  selectedPost: string;
}

const getCabinetColor = (cabinetId: string) => {
  const colors = {
    A: "bg-cabinet-a",
    B: "bg-cabinet-b", 
    C: "bg-cabinet-c",
    D: "bg-cabinet-d",
    E: "bg-cabinet-e"
  };
  return colors[cabinetId as keyof typeof colors] || "bg-slate-500";
};

export default function CabinetOverview({ onCabinetSelect, selectedPost }: CabinetOverviewProps) {
  const { data: cabinets = [] } = useQuery<CabinetSummary[]>({
    queryKey: ["/api/cabinets/summary", selectedPost],
    queryFn: async () => {
      if (!selectedPost) return [];
      
      const params = new URLSearchParams();
      params.append("ambulancePost", selectedPost);
      
      const response = await fetch(`/api/cabinets/summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch cabinet summary");
      return response.json();
    },
    enabled: !!selectedPost,
  });

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">Kast Overzicht</h2>
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
                <div className={`w-12 h-12 ${getCabinetColor(cabinet.id)} rounded-lg flex items-center justify-center`}>
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
    </div>
  );
}
