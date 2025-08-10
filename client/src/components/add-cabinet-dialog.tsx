import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertCabinetSchema, type InsertCabinet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface AddCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (cabinet: any) => void;
}

export default function AddCabinetDialog({ open, onOpenChange, onSuccess }: AddCabinetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCabinet>({
    resolver: zodResolver(insertCabinetSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      location: "",
    },
  });

  const addCabinetMutation = useMutation({
    mutationFn: async (data: InsertCabinet) => {
      const response = await apiRequest("POST", "/api/cabinets", data);
      return response;
    },
    onSuccess: (cabinet) => {
      toast({
        title: "Kast toegevoegd",
        description: "De nieuwe kast is succesvol aangemaakt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      form.reset();
      onSuccess(cabinet);
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fout bij aanmaken",
        description: "Er is een fout opgetreden bij het aanmaken van de kast.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCabinet) => {
    addCabinetMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-cabinet">
        <DialogHeader>
          <DialogTitle>Nieuwe Kast/Locatie Toevoegen</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kast ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bijv. F, G, K1, etc." 
                      {...field} 
                      data-testid="input-cabinet-id"
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kast Naam</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Voer kastnaam in" 
                      {...field} 
                      data-testid="input-cabinet-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locatie (Optioneel)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bijv. Gang 1 - Links" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-cabinet-location"
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
                      placeholder="Beschrijf wat er in deze kast wordt bewaard" 
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-cabinet-description"
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
                data-testid="button-cancel-cabinet"
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={addCabinetMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700"
                data-testid="button-submit-cabinet"
              >
                {addCabinetMutation.isPending ? "Bezig..." : "Kast Aanmaken"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}