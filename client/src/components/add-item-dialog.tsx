import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertMedicalItemSchema, type InsertMedicalItem, type Cabinet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import AddCabinetDialog from "../components/add-cabinet-dialog";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const categories = [
  "Spuiten",
  "Medicijnen", 
  "Instrumenten",
  "Monitoring",
  "PBM",
  "Verbandmiddelen"
];

export default function AddItemDialog({ open, onOpenChange, onSuccess }: AddItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddCabinetOpen, setIsAddCabinetOpen] = useState(false);

  const { data: cabinets = [] } = useQuery<Cabinet[]>({
    queryKey: ["/api/cabinets"],
    queryFn: async () => {
      const response = await fetch("/api/cabinets");
      if (!response.ok) throw new Error("Failed to fetch cabinets");
      return response.json();
    },
  });

  const form = useForm<InsertMedicalItem>({
    resolver: zodResolver(insertMedicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "Spuiten",
      cabinet: cabinets.length > 0 ? cabinets[0].id : "A",
      quantity: 0,
      minimumStock: 5,
      expiryDate: null,
    },
  });

  const handleAddCabinet = (newCabinet: Cabinet) => {
    form.setValue("cabinet", newCabinet.id);
  };

  const addItemMutation = useMutation({
    mutationFn: async (data: InsertMedicalItem) => {
      await apiRequest("POST", "/api/medical-items", data);
    },
    onSuccess: () => {
      toast({
        title: "Item toegevoegd",
        description: "Het medische item is succesvol toegevoegd aan de inventaris.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van het item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMedicalItem) => {
    addItemMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-item">
        <DialogHeader>
          <DialogTitle>Nieuw Medisch Item Toevoegen</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Naam</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Voer item naam in" 
                      {...field} 
                      data-testid="input-item-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-item-category">
                        <SelectValue placeholder="Selecteer categorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cabinet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kast</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-cabinet" className="flex-1">
                          <SelectValue placeholder="Selecteer kast" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cabinets.map(cabinet => (
                          <SelectItem key={cabinet.id} value={cabinet.id}>
                            Kast {cabinet.id} - {cabinet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddCabinetOpen(true)}
                      className="px-3"
                      data-testid="button-add-cabinet"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hoeveelheid</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-item-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Voorraad</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="5" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-minimum-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vervaldatum (Optioneel)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-expiry-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving (Optioneel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Aanvullende details over het item" 
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={addItemMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700"
                data-testid="button-submit"
              >
                {addItemMutation.isPending ? "Bezig..." : "Item Toevoegen"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Add Cabinet Dialog */}
        <AddCabinetDialog 
          open={isAddCabinetOpen}
          onOpenChange={setIsAddCabinetOpen}
          onSuccess={handleAddCabinet}
        />
      </DialogContent>
    </Dialog>
  );
}
