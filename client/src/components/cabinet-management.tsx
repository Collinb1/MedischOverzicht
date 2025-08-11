import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AddCabinetDialog from "./add-cabinet-dialog";
import EditCabinetDialog from "./edit-cabinet-dialog";
import { BackupManagement } from "./backup-management";
import type { Cabinet } from "@shared/schema";

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

export default function CabinetManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cabinets = [], isLoading } = useQuery<Cabinet[]>({
    queryKey: ["/api/cabinets"],
  });

  const deleteCabinetMutation = useMutation({
    mutationFn: async (cabinetId: string) => {
      await apiRequest("DELETE", `/api/cabinets/${cabinetId}`);
    },
    onSuccess: () => {
      toast({
        title: "Kast verwijderd",
        description: "De kast is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van de kast.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCabinet = (cabinet: Cabinet) => {
    if (confirm(`Weet u zeker dat u de kast "${cabinet.name}" wilt verwijderen voor alle posten die daar gebruik van maken?`)) {
      deleteCabinetMutation.mutate(cabinet.id);
    }
  };

  const handleAddSuccess = () => {
    setShowAddDialog(false);
  };

  const handleEditSuccess = () => {
    setEditingCabinet(null);
  };

  if (isLoading) {
    return <div className="text-center py-8">Kasten laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Kasten Beheren</h2>
        <Button 
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-cabinet"
          className="bg-medical-blue hover:bg-medical-blue/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Kast
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cabinets.map((cabinet) => (
          <Card key={cabinet.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg text-white border-2 border-current flex items-center justify-center font-bold text-xl"
                    style={{ backgroundColor: tailwindToHex(cabinet.color || 'bg-slate-200') }}
                  >
                    {cabinet.abbreviation}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cabinet.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      ID: {cabinet.id}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCabinet(cabinet)}
                    data-testid={`button-edit-cabinet-${cabinet.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCabinet(cabinet)}
                    disabled={deleteCabinetMutation.isPending}
                    data-testid={`button-delete-cabinet-${cabinet.id}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {cabinet.description && (
                <p className="text-sm text-gray-600">{cabinet.description}</p>
              )}
              {cabinet.location && (
                <p className="text-xs text-gray-500">📍 {cabinet.location}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {cabinets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Geen kasten gevonden</p>
          <p className="text-gray-400 text-sm mt-2">Voeg een nieuwe kast toe om te beginnen</p>
        </div>
      )}

      {/* Backup Management Section */}
      <div className="border-t pt-6 mt-8">
        <BackupManagement />
      </div>

      <AddCabinetDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleAddSuccess}
      />

      <EditCabinetDialog
        open={!!editingCabinet}
        onOpenChange={(open) => !open && setEditingCabinet(null)}
        cabinet={editingCabinet}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}