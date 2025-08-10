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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { insertMedicalItemSchema, type InsertMedicalItem, type Cabinet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, UserPlus } from "lucide-react";
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

const emailOptions = [
  { value: "spoedhulp@ziekenhuis.nl", label: "Spoedhulp Afdeling" },
  { value: "apotheek@ziekenhuis.nl", label: "Apotheek" },
  { value: "chirurgie@ziekenhuis.nl", label: "Chirurgie" },
  { value: "monitoring@ziekenhuis.nl", label: "Monitoring & Diagnostiek" },
  { value: "preventie@ziekenhuis.nl", label: "Preventie & PBM" },
  { value: "verpleging@ziekenhuis.nl", label: "Verpleging" },
  { value: "magazijn@ziekenhuis.nl", label: "Magazijn & Inkoop" }
];

export default function AddItemDialog({ open, onOpenChange, onSuccess }: AddItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddCabinetOpen, setIsAddCabinetOpen] = useState(false);
  const [isCustomEmail, setIsCustomEmail] = useState(false);

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
      isLowStock: false,
      expiryDate: null,
      alertEmail: "spoedhulp@ziekenhuis.nl",
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

            <FormField
              control={form.control}
              name="isLowStock"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Voorraad Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Is dit item bijna op/uitgeput?
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-item-low-stock"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alertEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waarschuwing Email</FormLabel>
                  {!isCustomEmail ? (
                    <div className="space-y-2">
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-alert-email">
                            <SelectValue placeholder="Selecteer naar wie de melding moet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {emailOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCustomEmail(true)}
                        className="w-full"
                        data-testid="button-add-custom-email"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Ander email adres toevoegen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="naam@afdeling.nl"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-custom-email"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCustomEmail(false)}
                        className="w-full"
                        data-testid="button-use-preset-email"
                      >
                        Gebruik voorgedefinieerde opties
                      </Button>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Wie moet een email krijgen bij voorraad aanvulling?
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
