import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface CabinetSummary {
  id: string;
  name: string;
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  categories: Record<string, number>;
}

interface CabinetOverviewProps {
  onCabinetSelect: (cabinet: string) => void;
}

const cabinetColors = {
  A: "bg-cabinet-a",
  B: "bg-cabinet-b", 
  C: "bg-cabinet-c",
  D: "bg-cabinet-d",
  E: "bg-cabinet-e"
};

export default function CabinetOverview({ onCabinetSelect }: CabinetOverviewProps) {
  const { data: cabinets = [] } = useQuery<CabinetSummary[]>({
    queryKey: ["/api/cabinets/summary"],
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
                <div className={`w-12 h-12 ${cabinetColors[cabinet.id as keyof typeof cabinetColors]} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-xl">{cabinet.id}</span>
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
                    {cabinet.lowStockItems} items met lage voorraad
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
