import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ObjectUploader } from "@/components/ObjectUploader";
import AddCabinetDialog from "@/components/add-cabinet-dialog";
import AddPostDialog from "@/components/add-post-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MedicalItem, AmbulancePost, Cabinet, ItemLocation, PostContact } from "@shared/schema";

const editItemSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
  category: z.string().min(1, "Categorie is verplicht"),
  expiryDate: z.string().nullable(),
  alertEmail: z.string().email("Ongeldig email adres").optional(),
  photoUrl: z.string().nullable(),
  isLowStock: z.boolean().default(false),
  stockStatus: z.enum(["op-voorraad", "bijna-op", "niet-op-voorraad"]).default("op-voorraad"),
});

interface EditItemDialogProps {
  item: MedicalItem & { locations?: ItemLocation[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface LocationRow {
  id?: string;
  ambulancePostId: string;
  cabinet: string;
  drawer: string;
  contactPersonId?: string;
}

export function EditItemDialog({ item, open, onOpenChange, onSuccess }: EditItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddCabinetOpen, setIsAddCabinetOpen] = useState(false);
  const [isAddPostOpen, setIsAddPostOpen] = useState(false);
  const [itemLocations, setItemLocations] = useState<LocationRow[]>([]);

  const { data: ambulancePosts = [] } = useQuery<AmbulancePost[]>({
    queryKey: ['/api/ambulance-posts'],
  });

  const { data: cabinets = [] } = useQuery<Cabinet[]>({
    queryKey: ['/api/cabinets'],
  });

  const { data: postContacts = [] } = useQuery<PostContact[]>({
    queryKey: ["/api/post-contacts"],
    queryFn: async () => {
      const response = await fetch("/api/post-contacts");
      if (!response.ok) throw new Error("Failed to fetch post contacts");
      return response.json();
    },
  });

  // Get contacts for a specific ambulance post
  const getContactsForPost = (ambulancePostId: string) => {
    if (!postContacts || postContacts.length === 0) return [];
    const filtered = postContacts.filter((contact: PostContact) => 
      contact.ambulancePostId === ambulancePostId && contact.isActive
    );
    return filtered;
  };

  // Initialize form with item data
  const form = useForm({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: item.name,
      description: item.description || "",
      category: item.category,
      expiryDate: item.expiryDate || null,
      alertEmail: item.alertEmail || "",
      photoUrl: item.photoUrl || null,
      isLowStock: false,
      stockStatus: "op-voorraad",
    },
  });

  // Load existing locations for the item
  const { data: existingLocations } = useQuery<ItemLocation[]>({
    queryKey: ['/api/item-locations', item.id],
    enabled: !!item.id,
  });

  // Initialize locations when existing locations change
  useEffect(() => {
    if (existingLocations && existingLocations.length > 0) {
      setItemLocations(existingLocations.map(loc => ({
        ambulancePostId: loc.ambulancePostId,
        cabinet: loc.cabinet,
        drawer: loc.drawer || "",
        contactPersonId: loc.contactPersonId || ""
      })));
      console.log("Loaded existing locations with contact persons:", existingLocations);
    } else if (item?.id) {
      // If no existing locations, start with one empty location
      setItemLocations([{ ambulancePostId: "", cabinet: "", drawer: "", contactPersonId: "" }]);
    }
  }, [existingLocations, item?.id]);

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/medical-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cabinets/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/item-locations', item.id] });
      onOpenChange(false);
      onSuccess?.();
      toast({
        title: "Succes",
        description: "Medisch item succesvol bijgewerkt",
      });
    },
    onError: (error) => {
      console.error("Error updating medical item:", error);
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van het item",
        variant: "destructive",
      });
    },
  });

  const addLocation = () => {
    setItemLocations([...itemLocations, { ambulancePostId: "", cabinet: "", drawer: "", contactPersonId: "" }]);
  };

  const removeLocation = (index: number) => {
    if (itemLocations.length > 1) {
      setItemLocations(itemLocations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index: number, field: keyof LocationRow, value: string) => {
    const newLocations = [...itemLocations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setItemLocations(newLocations);
  };

  const handleAddCabinet = (cabinet: Cabinet) => {
    setIsAddCabinetOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/cabinets'] });
  };

  const handleAddPost = (post: AmbulancePost) => {
    setIsAddPostOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
  };

  const onSubmit = (data: any) => {
    console.log("Form submitted with data:", data);
    console.log("Item locations:", itemLocations);

    // Filter out empty locations
    const validLocations = itemLocations.filter(loc => 
      loc.ambulancePostId && loc.cabinet
    ).map(loc => ({
      ...loc,
      contactPersonId: loc.contactPersonId || null
    }));

    const submissionData = {
      ...data,
      locations: validLocations,
    };

    console.log("Submitting data:", submissionData);
    updateItemMutation.mutate(submissionData);
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to get upload URL");
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      form.setValue('photoUrl', uploadURL as any);
      toast({
        title: "Succes",
        description: "Foto succesvol geüpload",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medisch Item Bewerken</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Foto</h3>
              <div className="flex items-center gap-4">
                {form.watch('photoUrl') && (
                  <img 
                    src={form.watch('photoUrl') || ''} 
                    alt="Item foto" 
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                )}
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="bg-medical-blue hover:bg-blue-700"
                >
                  <span>📁 Foto Uploaden</span>
                </ObjectUploader>
                {form.watch('photoUrl') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.setValue('photoUrl', null as any)}
                  >
                    Foto Verwijderen
                  </Button>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Naam van het medische item" {...field} data-testid="input-name" />
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
                    <FormLabel>Categorie *</FormLabel>
                    <FormControl>
                      <Input placeholder="bijv. Medicijnen, Verbandmiddelen" {...field} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beschrijving van het item (optioneel)"
                      className="min-h-[80px]"
                      {...field} 
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vervaldatum</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-expiry-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alertEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="email@voorbeeld.nl"
                        {...field} 
                        data-testid="input-alert-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stockStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voorraad Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-stock-status">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="op-voorraad">Op voorraad</SelectItem>
                        <SelectItem value="bijna-op">Bijna op</SelectItem>
                        <SelectItem value="niet-op-voorraad">Niet op voorraad</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location Management Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Locatie Item per post</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLocation}
                  data-testid="button-add-location"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Locatie Toevoegen
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Ambulancepost</TableHead>
                      <TableHead className="min-w-[120px]">Kast</TableHead>
                      <TableHead className="min-w-[100px]">Lade</TableHead>
                      <TableHead className="min-w-[150px]">Contactpersoon</TableHead>
                      <TableHead className="min-w-[80px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemLocations.map((location, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={location.ambulancePostId}
                              onValueChange={(value) => updateLocation(index, 'ambulancePostId', value)}
                            >
                              <SelectTrigger className="w-full" data-testid={`select-post-${index}`}>
                                <SelectValue placeholder="Selecteer post" />
                              </SelectTrigger>
                              <SelectContent>
                                {ambulancePosts.map((post) => (
                                  <SelectItem key={post.id} value={post.id}>
                                    {post.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddPostOpen(true)}
                              data-testid={`button-add-post-${index}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={location.cabinet}
                              onValueChange={(value) => updateLocation(index, 'cabinet', value)}
                            >
                              <SelectTrigger className="w-full" data-testid={`select-cabinet-${index}`}>
                                <SelectValue placeholder="Selecteer kast" />
                              </SelectTrigger>
                              <SelectContent>
                                {cabinets.map((cabinet) => (
                                  <SelectItem key={cabinet.id} value={cabinet.id}>
                                    {cabinet.name} ({cabinet.abbreviation})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddCabinetOpen(true)}
                              data-testid={`button-add-cabinet-${index}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Lade (optioneel)"
                            value={location.drawer}
                            onChange={(e) => updateLocation(index, 'drawer', e.target.value)}
                            data-testid={`input-drawer-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={location.contactPersonId || "none"}
                            onValueChange={(value) => updateLocation(index, 'contactPersonId', value === "none" ? "" : value)}
                          >
                            <SelectTrigger data-testid={`select-contact-person-${index}`} className="w-full">
                              <SelectValue placeholder="Contactpersoon" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Geen contactpersoon</SelectItem>
                              {location.ambulancePostId ? getContactsForPost(location.ambulancePostId).map((contact: PostContact) => (
                                <SelectItem key={contact.id} value={contact.id}>
                                  {contact.name} - {contact.department || contact.email}
                                </SelectItem>
                              )) : (
                                <SelectItem value="select-post" disabled>
                                  Selecteer eerst een ambulancepost
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocation(index)}
                            disabled={itemLocations.length === 1}
                            data-testid={`button-remove-location-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
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
                disabled={updateItemMutation.isPending}
                className="bg-medical-blue hover:bg-blue-700"
                data-testid="button-submit"
              >
                {updateItemMutation.isPending ? "Bezig..." : "Item Bijwerken"}
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

        <AddPostDialog
          open={isAddPostOpen}
          onOpenChange={setIsAddPostOpen}
          onPostAdded={handleAddPost}
        />
      </DialogContent>
    </Dialog>
  );
}