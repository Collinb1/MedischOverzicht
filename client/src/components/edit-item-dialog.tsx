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
import { insertMedicalItemSchema, type InsertMedicalItem, type MedicalItem, type Cabinet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface EditItemDialogProps {
  item: MedicalItem;
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

export default function EditItemDialog({ item, open, onOpenChange, onSuccess }: EditItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      name: item.name,
      description: item.description || "",
      category: item.category,
      cabinet: item.cabinet,
      isLowStock: item.isLowStock,
      expiryDate: item.expiryDate,
      alertEmail: item.alertEmail || "spoedhulp@ziekenhuis.nl",
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: InsertMedicalItem) => {
      await apiRequest("PATCH", `/api/medical-items/${item.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Item bijgewerkt",
        description: "Het medische item is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van het item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMedicalItem) => {
    updateItemMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-edit-item">
        <DialogHeader>
          <DialogTitle>Medisch Item Bewerken</DialogTitle>
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
                      data-testid="input-edit-name"
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
                      <SelectTrigger data-testid="select-edit-category">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-cabinet">
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
                      data-testid="switch-edit-low-stock"
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-alert-email">
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
                      data-testid="input-edit-expiry-date"
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
                      data-testid="textarea-edit-description"
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
                data-testid="button-edit-cancel"
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={updateItemMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700"
                data-testid="button-edit-submit"
              >
                {updateItemMutation.isPending ? "Bezig..." : "Bijwerken"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
