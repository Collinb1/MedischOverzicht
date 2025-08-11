import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Cabinet } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(50, "Naam mag maximaal 50 tekens lang zijn"),
  abbreviation: z.string().min(1, "Afkorting is verplicht").max(3, "Afkorting mag maximaal 3 tekens lang zijn").toUpperCase(),
  description: z.string().optional(),
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
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [specificLocations, setSpecificLocations] = useState<Record<string, string>>({});

  // Get ambulance posts
  const { data: ambulancePosts = [] } = useQuery({
    queryKey: ["/api/ambulance-posts"],
    queryFn: async () => {
      const response = await fetch("/api/ambulance-posts");
      return response.json();
    },
  });

  // Get current cabinet locations when cabinet changes
  const { data: cabinetLocations = [] } = useQuery({
    queryKey: ["/api/cabinets", cabinet?.id, "locations"],
    queryFn: async () => {
      if (!cabinet?.id) return [];
      const response = await fetch(`/api/cabinets/${cabinet.id}/locations`);
      return response.json();
    },
    enabled: !!cabinet?.id && open,
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      description: "",
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
        color: cabinet.color || "bg-slate-500",
      });
    }
  }, [cabinet?.id, cabinet?.name, cabinet?.abbreviation, cabinet?.description, cabinet?.color, form.reset]);

  // Load current cabinet locations
  useEffect(() => {
    if (open && cabinet?.id) {
      if (cabinetLocations.length > 0) {
        const postIds = cabinetLocations.map((loc: any) => loc.ambulancePostId);
        const locations = cabinetLocations.reduce((acc: Record<string, string>, loc: any) => {
          if (loc.specificLocation) {
            acc[loc.ambulancePostId] = loc.specificLocation;
          }
          return acc;
        }, {});
        
        setSelectedPosts(postIds);
        setSpecificLocations(locations);
      } else {
        setSelectedPosts([]);
        setSpecificLocations({});
      }
    }
  }, [cabinetLocations, open, cabinet?.id]);

  const updateCabinetMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!cabinet) throw new Error("No cabinet to update");
      
      // Update cabinet data
      const updatedCabinet = await apiRequest("PATCH", `/api/cabinets/${cabinet.id}`, data);
      
      // Get current cabinet locations to compare
      const currentLocations = cabinetLocations.map((loc: any) => loc.ambulancePostId);
      
      // Remove locations that are no longer selected
      for (const currentPostId of currentLocations) {
        if (!selectedPosts.includes(currentPostId)) {
          // Find and remove this location
          const locationToRemove = cabinetLocations.find((loc: any) => 
            loc.ambulancePostId === currentPostId
          );
          if (locationToRemove) {
            await apiRequest("DELETE", `/api/cabinet-locations/${locationToRemove.id}`);
          }
        }
      }
      
      // Add new locations or update existing ones
      for (const postId of selectedPosts) {
        const existingLocation = cabinetLocations.find((loc: any) => 
          loc.ambulancePostId === postId
        );
        
        if (existingLocation) {
          // Update if specific location changed
          if (existingLocation.specificLocation !== (specificLocations[postId] || null)) {
            await apiRequest("PATCH", `/api/cabinet-locations/${existingLocation.id}`, {
              specificLocation: specificLocations[postId] || null
            });
          }
        } else {
          // Create new location
          await apiRequest("POST", "/api/cabinet-locations", {
            cabinetId: cabinet.id,
            ambulancePostId: postId,
            specificLocation: specificLocations[postId] || null
          });
        }
      }
      
      return updatedCabinet;
    },
    onSuccess: () => {
      toast({
        title: "Kast bijgewerkt",
        description: "De kast is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinet-locations"] });
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

  const handlePostToggle = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(id => id !== postId));
      setSpecificLocations(prev => {
        const newLocations = { ...prev };
        delete newLocations[postId];
        return newLocations;
      });
    }
  };

  const handleSpecificLocationChange = (postId: string, location: string) => {
    setSpecificLocations(prev => ({
      ...prev,
      [postId]: location
    }));
  };

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Ambulancepost Selectie */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Ambulanceposten waar deze kast aanwezig is</Label>
            <div className="space-y-3 border rounded-md p-3">
              {ambulancePosts.length > 0 ? (
                ambulancePosts.map((post: any) => (
                  <div key={post.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`post-${post.id}`}
                        checked={selectedPosts.includes(post.id)}
                        onCheckedChange={(checked) => handlePostToggle(post.id, checked as boolean)}
                        data-testid={`checkbox-post-${post.id}`}
                      />
                      <label htmlFor={`post-${post.id}`} className="font-medium cursor-pointer">
                        {post.name}
                      </label>
                    </div>
                    {selectedPosts.includes(post.id) && (
                      <div className="ml-6 space-y-1">
                        <label className="text-sm text-gray-600">Specifieke locatie in ambulancepost (optioneel):</label>
                        <Input
                          placeholder="Bijv. Voor in de ambulancepost, Achterin bij brancard..."
                          value={specificLocations[post.id] || ""}
                          onChange={(e) => handleSpecificLocationChange(post.id, e.target.value)}
                          data-testid={`input-location-${post.id}`}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  Geen ambulanceposten beschikbaar
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Selecteer op welke ambulancepost(en) deze kast fysiek aanwezig is.
            </p>
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