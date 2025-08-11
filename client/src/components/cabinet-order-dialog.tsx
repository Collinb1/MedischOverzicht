import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cabinet {
  id: string;
  name: string;
  abbreviation: string;
  description: string | null;
  location: string | null;
  color: string | null;
}

interface CabinetOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambulancePostId: string;
  ambulancePostName: string;
}

export function CabinetOrderDialog({ 
  open, 
  onOpenChange, 
  ambulancePostId, 
  ambulancePostName 
}: CabinetOrderDialogProps) {
  const [orderedCabinets, setOrderedCabinets] = useState<Cabinet[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get currently ordered cabinets for this post
  const { data: cabinets, isLoading } = useQuery({
    queryKey: ["/api/ambulance-posts", ambulancePostId, "cabinets", "ordered"],
    queryFn: async () => {
      const response = await fetch(`/api/ambulance-posts/${ambulancePostId}/cabinets/ordered`);
      return response.json();
    },
    enabled: open && !!ambulancePostId,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (cabinets && Array.isArray(cabinets)) {
      setOrderedCabinets(cabinets);
    }
  }, [cabinets]);

  // Save cabinet order
  const saveCabinetOrderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const response = await fetch(`/api/ambulance-posts/${ambulancePostId}/cabinets/order`, {
        method: "POST",
        body: JSON.stringify({ orderedCabinetIds: orderedIds }),
        headers: { "Content-Type": "application/json" },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Kasten volgorde opgeslagen",
        description: `Volgorde voor ${ambulancePostName} is bijgewerkt`,
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulance-posts", ambulancePostId, "cabinets", "ordered"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulance-posts"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error saving cabinet order:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Kon kasten volgorde niet opslaan",
        variant: "destructive",
      });
    },
  });

  const moveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...orderedCabinets];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setOrderedCabinets(newOrder);
    }
  };

  const moveDown = (index: number) => {
    if (index < orderedCabinets.length - 1) {
      const newOrder = [...orderedCabinets];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrderedCabinets(newOrder);
    }
  };

  const handleSave = () => {
    const orderedIds = orderedCabinets.map(cabinet => cabinet.id);
    saveCabinetOrderMutation.mutate(orderedIds);
  };

  const handleReset = async () => {
    // Get default cabinet order (all cabinets in alphabetical order)
    try {
      const response = await fetch("/api/cabinets");
      const allCabinets: Cabinet[] = await response.json();
      const sortedCabinets = [...allCabinets].sort((a, b) => a.id.localeCompare(b.id));
      setOrderedCabinets(sortedCabinets);
    } catch (error) {
      console.error("Error resetting cabinet order:", error);
      toast({
        title: "Fout bij resetten",
        description: "Kon standaard volgorde niet laden",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kasten volgorde beheren</DialogTitle>
            <DialogDescription>Laden...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Kasten volgorde beheren</DialogTitle>
          <DialogDescription>
            Stel de volgorde van kasten in voor {ambulancePostName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {orderedCabinets.map((cabinet, index) => (
            <Card key={cabinet.id} className="p-0">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Badge 
                      variant="outline" 
                      className={`${cabinet.color || "bg-slate-200"} text-black font-semibold min-w-[40px] justify-center`}
                      data-testid={`cabinet-badge-${cabinet.id}`}
                    >
                      {cabinet.abbreviation}
                    </Badge>
                    <div>
                      <div className="font-medium text-base" data-testid={`cabinet-name-${cabinet.id}`}>
                        {cabinet.name}
                      </div>
                      {cabinet.description && (
                        <div className="text-sm text-gray-600">
                          {cabinet.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      data-testid={`move-up-${cabinet.id}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === orderedCabinets.length - 1}
                      data-testid={`move-down-${cabinet.id}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            data-testid="reset-order-button"
          >
            Standaard volgorde
          </Button>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="cancel-order-button"
            >
              Annuleren
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveCabinetOrderMutation.isPending}
              data-testid="save-order-button"
            >
              {saveCabinetOrderMutation.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}