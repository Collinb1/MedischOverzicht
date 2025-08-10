import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Cabinet } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(50, "Naam mag maximaal 50 tekens lang zijn"),
  abbreviation: z.string().min(1, "Afkorting is verplicht").max(3, "Afkorting mag maximaal 3 tekens lang zijn").toUpperCase(),
  description: z.string().optional(),
  location: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinet: Cabinet | null;
  onSuccess?: () => void;
}

export default function EditCabinetDialog({ open, onOpenChange, cabinet, onSuccess }: EditCabinetDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      description: "",
      location: "",
    },
  });

  // Reset form when cabinet changes
  useEffect(() => {
    if (cabinet) {
      form.reset({
        name: cabinet.name,
        abbreviation: cabinet.abbreviation,
        description: cabinet.description || "",
        location: cabinet.location || "",
      });
    }
  }, [cabinet, form]);

  const updateCabinetMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!cabinet) throw new Error("No cabinet to update");
      return await apiRequest("PATCH", `/api/cabinets/${cabinet.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Kast bijgewerkt",
        description: "De kast is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de kast.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormData) => {
    updateCabinetMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!cabinet) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kast Bewerken</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="bijv. Medicatie Kast"
              data-testid="input-cabinet-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="abbreviation">Afkorting (max 3 letters) *</Label>
            <Input
              id="abbreviation"
              {...form.register("abbreviation")}
              placeholder="bijv. MED"
              maxLength={3}
              className="uppercase"
              data-testid="input-cabinet-abbreviation"
              onChange={(e) => {
                const upperValue = e.target.value.toUpperCase();
                e.target.value = upperValue;
                form.setValue("abbreviation", upperValue);
              }}
            />
            {form.formState.errors.abbreviation && (
              <p className="text-sm text-red-600">{form.formState.errors.abbreviation.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving (optioneel)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Korte beschrijving van de kast..."
              rows={3}
              data-testid="textarea-cabinet-description"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Locatie (optioneel)</Label>
            <Input
              id="location"
              {...form.register("location")}
              placeholder="bijv. Behandelkamer 1"
              data-testid="input-cabinet-location"
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-600">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateCabinetMutation.isPending}
              data-testid="button-cancel"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={updateCabinetMutation.isPending}
              className="bg-medical-blue hover:bg-medical-blue/90"
              data-testid="button-update-cabinet"
            >
              {updateCabinetMutation.isPending ? "Bijwerken..." : "Bijwerken"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}