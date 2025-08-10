import { useState, useEffect } from "react";
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
import { insertMedicalItemSchema, type InsertMedicalItem, type Cabinet, type AmbulancePost } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Plus, UserPlus, Camera, X } from "lucide-react";
import AddCabinetDialog from "../components/add-cabinet-dialog";
import { ObjectUploader } from "../components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedPost: string;
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

export default function AddItemDialog({ open, onOpenChange, onSuccess, selectedPost }: AddItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddCabinetOpen, setIsAddCabinetOpen] = useState(false);
  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { data: cabinets = [] } = useQuery<Cabinet[]>({
    queryKey: ["/api/cabinets"],
    queryFn: async () => {
      const response = await fetch("/api/cabinets");
      if (!response.ok) throw new Error("Failed to fetch cabinets");
      return response.json();
    },
  });

  const { data: ambulancePosts = [] } = useQuery<AmbulancePost[]>({
    queryKey: ["/api/ambulance-posts"],
    queryFn: async () => {
      const response = await fetch("/api/ambulance-posts");
      if (!response.ok) throw new Error("Failed to fetch ambulance posts");
      return response.json();
    },
  });



  const form = useForm<InsertMedicalItem & { ambulancePost: string; cabinet: string; drawer: string; isLowStock: boolean; stockStatus: string }>({
    resolver: zodResolver(insertMedicalItemSchema.extend({
      ambulancePost: z.string().min(1, "Ambulancepost is verplicht"),
      cabinet: z.string().min(1, "Kast is verplicht"),
      drawer: z.string().optional(),
      isLowStock: z.boolean().optional(),
      stockStatus: z.string().optional(),
    })),
    defaultValues: {
      name: "",
      description: "",
      category: "Spuiten",
      ambulancePost: selectedPost,
      cabinet: cabinets.length > 0 ? cabinets[0].id : "A",
      drawer: "",
      isLowStock: false,
      stockStatus: "op-voorraad",
      expiryDate: null,
      alertEmail: "spoedhulp@ziekenhuis.nl",
      photoUrl: photoUrl,
    },
  });

  // Update form when photoUrl changes
  useEffect(() => {
    form.setValue("photoUrl", photoUrl);
  }, [photoUrl, form]);

  const handleAddCabinet = (newCabinet: Cabinet) => {
    form.setValue("cabinet", newCabinet.id);
    form.setValue("drawer", ""); // Reset drawer selection
  };

  // Photo upload functions
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", { method: "POST" });
    if (!response.ok) throw new Error("Failed to get upload URL");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log("Photo upload result:", result);
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      console.log("Uploaded file:", uploadedFile);
      
      // Try to get the object path from the upload URL
      let objectPath = uploadedFile.uploadURL as string;
      
      // Convert Google Storage URL to our object path format
      if (objectPath.includes('storage.googleapis.com')) {
        try {
          // Extract the object path and convert to our /objects/ format
          const url = new URL(objectPath);
          const pathParts = url.pathname.split('/');
          if (pathParts.length >= 3) {
            const objectId = pathParts.slice(2).join('/');
            objectPath = `/objects/${objectId}`;
          }
        } catch (e) {
          console.warn("Failed to convert URL, using original:", e);
        }
      }
      
      console.log("Final object path:", objectPath);
      
      // Use the upload URL directly for now, convert it later when saving
      setPhotoUrl(uploadedFile.uploadURL as string);
      
      setIsUploadingPhoto(false);
      
      toast({
        title: "Foto geüpload",
        description: "De foto is succesvol geüpload en wordt toegevoegd aan het item.",
      });
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
  };

  const addItemMutation = useMutation({
    mutationFn: async (data: InsertMedicalItem & { ambulancePost: string; cabinet: string; drawer: string; isLowStock: boolean; stockStatus: string }) => {
      const itemData = { ...data, photoUrl };
      await apiRequest("POST", "/api/medical-items", itemData);
    },
    onSuccess: () => {
      toast({
        title: "Item toegevoegd",
        description: "Het medische item is succesvol toegevoegd aan de inventaris.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      form.reset();
      setPhotoUrl(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding item:", error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is een fout opgetreden bij het toevoegen van het item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertMedicalItem & { ambulancePost: string; cabinet: string; drawer: string; isLowStock: boolean; stockStatus: string }) => {
    console.log("Form submitted with data:", data);
    console.log("Photo URL:", photoUrl);
    console.log("Form errors:", form.formState.errors);
    
    let finalPhotoUrl = photoUrl;
    
    // Convert Google Storage URL to our object path if needed
    if (photoUrl && photoUrl.includes('storage.googleapis.com')) {
      try {
        const response = await fetch("/api/medical-items/convert-photo-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl }),
        });
        
        if (response.ok) {
          const result = await response.json();
          finalPhotoUrl = result.objectPath;
        }
      } catch (error) {
        console.warn("Failed to convert photo URL:", error);
      }
    }
    
    // Include final photo URL in the data
    const submitData = { ...data, photoUrl: finalPhotoUrl };
    console.log("Submitting data:", submitData);
    addItemMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-item">
        <DialogHeader>
          <DialogTitle>Nieuw Medisch Item Toevoegen</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Photo Upload Section - Moved to top */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Foto van het Item (Optioneel)</h4>
                {photoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removePhoto}
                    data-testid="button-remove-photo"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Verwijderen
                  </Button>
                )}
              </div>
              
              {photoUrl ? (
                <div className="border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={photoUrl} 
                      alt="Item foto" 
                      className="w-20 h-20 object-cover rounded-lg border-2 border-blue-300"
                      data-testid="img-uploaded-photo"
                    />
                    <div>
                      <p className="text-sm font-medium text-green-700">✓ Foto succesvol geüpload</p>
                      <p className="text-xs text-green-600">Deze foto wordt toegevoegd aan het medische item</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handlePhotoUploadComplete}
                    buttonClassName="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Camera className="w-5 h-5" />
                      <span className="font-medium">Foto van Item Toevoegen</span>
                    </div>
                  </ObjectUploader>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Ondersteunde formaten: JPG, PNG (max 5MB)
                  </p>
                </div>
              )}
            </div>

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
              name="ambulancePost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ambulancepost</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ambulance-post">
                        <SelectValue placeholder="Selecteer ambulancepost" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ambulancePosts.map(post => (
                        <SelectItem key={post.id} value={post.id}>
                          {post.name}
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

            {/* Lade Invoer */}
            <FormField
              control={form.control}
              name="drawer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lade (optioneel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Bijv. Boven, Onder, Links, Rechts, Midden"
                      data-testid="input-drawer"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stock Status */}
            <FormField
              control={form.control}
              name="stockStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voorraad Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-stock-status">
                        <SelectValue placeholder="Selecteer voorraad status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="op-voorraad">Op voorraad</SelectItem>
                      <SelectItem value="laag">Laag</SelectItem>
                      <SelectItem value="bijna-op">Bijna op</SelectItem>
                      <SelectItem value="op">Op</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Low Stock Toggle */}
            <FormField
              control={form.control}
              name="isLowStock"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Bijna op markering</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Markeer dit item als bijna op voor notificaties
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-low-stock"
                    />
                  </FormControl>
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
