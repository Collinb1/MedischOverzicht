import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { insertCabinetSchema, type InsertCabinet } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface AddCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (cabinet: any) => void;
}

// Extended form data for cabinet with locations
interface ExtendedCabinetForm extends InsertCabinet {
  ambulancePosts: string[];
  specificLocations: Record<string, string>;
}

export default function AddCabinetDialog({ open, onOpenChange, onSuccess }: AddCabinetDialogProps) {
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

  const form = useForm<InsertCabinet>({
    resolver: zodResolver(insertCabinetSchema),
    defaultValues: {
      id: "",
      name: "",
      abbreviation: "",
      description: "",
      location: "",
      color: "bg-slate-500",
    },
  });

  const addCabinetMutation = useMutation({
    mutationFn: async (data: InsertCabinet) => {
      // First create the cabinet
      const cabinet = await apiRequest("POST", "/api/cabinets", data);
      
      // Then create cabinet locations for selected posts
      for (const postId of selectedPosts) {
        await apiRequest("POST", "/api/cabinet-locations", {
          cabinetId: cabinet.id,
          ambulancePostId: postId,
          specificLocation: specificLocations[postId] || null
        });
      }
      
      return cabinet;
    },
    onSuccess: (cabinet) => {
      toast({
        title: "Kast toegevoegd",
        description: `De nieuwe kast "${cabinet.name}" is succesvol aangemaakt${selectedPosts.length > 0 ? ` voor ${selectedPosts.length} ambulancepost(en).` : '.'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinet-locations"] });
      form.reset();
      setSelectedPosts([]);
      setSpecificLocations({});
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

  const onSubmit = (data: InsertCabinet) => {
    addCabinetMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-cabinet">
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
              name="abbreviation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Afkorting (Max 3 letters)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bijv. SPO, MED, CHI" 
                      {...field} 
                      data-testid="input-cabinet-abbreviation"
                      maxLength={3}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kastkleur</FormLabel>
                  <FormControl>
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
                        const isSelected = field.value === color.value;
                        return (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ambulancepost Selectie */}
            <div className="space-y-3">
              <FormLabel className="text-base font-medium">Ambulanceposten waar deze kast aanwezig is</FormLabel>
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
                          <label className="text-sm text-gray-600">Specifieke locatie in ambulance (optioneel):</label>
                          <Input
                            placeholder="Bijv. Voor in de ambulance, Achterin bij brancard..."
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