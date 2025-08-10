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
  color: z.string().min(1, "Kleur is verplicht"),
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
      color: "bg-slate-500",
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
        color: cabinet.color || "bg-slate-500",
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

          <div className="space-y-2">
            <Label>Kastkleur *</Label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { name: "Rood", value: "bg-red-500", preview: "bg-red-500" },
                { name: "Blauw", value: "bg-blue-500", preview: "bg-blue-500" },
                { name: "Groen", value: "bg-green-500", preview: "bg-green-500" },
                { name: "Geel", value: "bg-yellow-500", preview: "bg-yellow-500" },
                { name: "Paars", value: "bg-purple-500", preview: "bg-purple-500" },
                { name: "Oranje", value: "bg-orange-500", preview: "bg-orange-500" },
                { name: "Roze", value: "bg-pink-500", preview: "bg-pink-500" },
                { name: "Indigo", value: "bg-indigo-500", preview: "bg-indigo-500" },
                { name: "Turkoois", value: "bg-teal-500", preview: "bg-teal-500" },
                { name: "Lime", value: "bg-lime-500", preview: "bg-lime-500" },
                { name: "Grijs", value: "bg-slate-500", preview: "bg-slate-500" },
                { name: "Donkergrijs", value: "bg-gray-700", preview: "bg-gray-700" },
              ].map((color) => {
                const selectedColor = form.watch("color");
                const isSelected = selectedColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => form.setValue("color", color.value)}
                    className={`w-10 h-10 rounded-lg ${color.preview} border-2 transition-all ${
                      isSelected ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-300 hover:border-slate-400"
                    }`}
                    title={color.name}
                    data-testid={`button-color-${color.value}`}
                  >
                    {isSelected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.color && (
              <p className="text-sm text-red-600">{form.formState.errors.color.message}</p>
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