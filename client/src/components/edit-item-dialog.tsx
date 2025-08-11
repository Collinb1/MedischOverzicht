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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import AddCabinetDialog from "@/components/add-cabinet-dialog";
import AddPostDialog from "@/components/add-post-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Package2, MapPin, Calendar, Mail, AlertTriangle, Camera, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MedicalItem, AmbulancePost, Cabinet, ItemLocation, PostContact } from "@shared/schema";
import { CategorySelector } from "./category-selector";

const editItemSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
  category: z.string().min(1, "Categorie is verplicht"),
  expiryDate: z.string().nullable(),
  alertEmail: z.string().email("Ongeldig email adres").optional(),
  photoUrl: z.string().nullable(),
  isLowStock: z.boolean().default(false),
  stockStatus: z.enum(["op-voorraad", "bijna-op", "niet-op-voorraad"]).default("op-voorraad"),
  isDiscontinued: z.boolean().default(false),
  replacementItemId: z.string().nullable().optional(),
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
  stockStatus?: string;
  isLowStock?: boolean;
}

export function EditItemDialog({ item, open, onOpenChange, onSuccess }: EditItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
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

  // Get all medical items for replacement selection
  const { data: allMedicalItems = [] } = useQuery<MedicalItem[]>({
    queryKey: ['/api/medical-items'],
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
      isDiscontinued: (item as any).isDiscontinued || false,
      replacementItemId: (item as any).replacementItemId || null,
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
        contactPersonId: loc.contactPersonId || "",
        stockStatus: loc.stockStatus || "op-voorraad",
        isLowStock: loc.isLowStock || false
      })));
      console.log("Loaded existing locations with contact persons:", existingLocations);
    } else if (item?.id) {
      // If no existing locations, start with one empty location
      setItemLocations([{ ambulancePostId: "", cabinet: "", drawer: "", contactPersonId: "", stockStatus: "op-voorraad", isLowStock: false }]);
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

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/medical-items/${item.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Item verwijderd",
        description: "Het medische item is succesvol verwijderd voor alle posten.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cabinets/summary"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van het item.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setShowDeleteConfirmation(false);
    deleteItemMutation.mutate();
  };

  const addLocation = () => {
    setItemLocations([...itemLocations, { ambulancePostId: "", cabinet: "", drawer: "", contactPersonId: "", stockStatus: "op-voorraad", isLowStock: false }]);
  };

  const removeLocation = (index: number) => {
    if (itemLocations.length > 1) {
      setItemLocations(itemLocations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index: number, field: keyof LocationRow, value: string | boolean) => {
    const newLocations = [...itemLocations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    
    // Auto-update isLowStock based on stockStatus
    if (field === 'stockStatus') {
      newLocations[index].isLowStock = value === 'bijna-op' || value === 'niet-meer-aanwezig';
    }
    
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
      drawer: loc.drawer && loc.drawer.trim() !== "" ? loc.drawer.trim() : null,
      contactPersonId: loc.contactPersonId || null,
      stockStatus: loc.stockStatus || "op-voorraad",
      isLowStock: loc.stockStatus === 'bijna-op' || loc.stockStatus === 'niet-meer-aanwezig'
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Medisch Item Bewerken</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Bijwerken van {item.name} in het medische inventaris
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Photo Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Foto Upload
                </CardTitle>
                <CardDescription>
                  Upload een foto van het medische item voor gemakkelijke herkenning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {form.watch('photoUrl') ? (
                    <div className="relative">
                      <img 
                        src={form.watch('photoUrl')?.includes('storage.googleapis.com') 
                          ? `/objects/uploads/${form.watch('photoUrl')?.split('/').pop()}` 
                          : form.watch('photoUrl') || ''
                        }
                        alt="Item foto" 
                        className="w-32 h-32 object-cover rounded-lg border-2 border-blue-200 shadow-md"
                        onError={(e) => {
                          // Fallback to original URL if objects route fails
                          const target = e.currentTarget;
                          const originalUrl = form.watch('photoUrl');
                          if (originalUrl && !target.src.includes('storage.googleapis.com')) {
                            target.src = originalUrl;
                          } else {
                            // Both failed, show placeholder
                            target.style.display = 'none';
                            const parentDiv = target.parentElement;
                            if (parentDiv && !parentDiv.querySelector('.photo-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'photo-placeholder w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center';
                              placeholder.innerHTML = '<span class="text-xs text-gray-500">Foto fout</span>';
                              parentDiv.appendChild(placeholder);
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => form.setValue('photoUrl', null as any)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-xs text-gray-500">Geen foto</span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>Foto Uploaden</span>
                      </div>
                    </ObjectUploader>
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximaal 10MB, ondersteunt JPG, PNG en HEIC formaten
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  Basis Informatie
                </CardTitle>
                <CardDescription>
                  Naam, categorie en beschrijving van het medische item
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Naam *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Naam van het medische item" 
                            {...field} 
                            data-testid="input-name"
                            className="focus:ring-2 focus:ring-blue-500" 
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
                        <FormLabel className="text-sm font-medium">Categorie *</FormLabel>
                        <FormControl>
                          <CategorySelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Selecteer categorie"
                          />
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
                      <FormLabel className="text-sm font-medium">Beschrijving</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Beschrijving van het item (optioneel)"
                          className="min-h-[80px] focus:ring-2 focus:ring-blue-500"
                          {...field} 
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Vervaldatum & Notificaties
                </CardTitle>
                <CardDescription>
                  Vervaldatum en email instellingen voor automatische waarschuwingen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Calendar className="h-4 w-4" />
                          Vervaldatum
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            data-testid="input-expiry-date"
                            className="focus:ring-2 focus:ring-blue-500"
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
                        <FormLabel className="flex items-center gap-2 text-sm font-medium">
                          <Mail className="h-4 w-4" />
                          Alert Email
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@voorbeeld.nl"
                            {...field} 
                            data-testid="input-alert-email"
                            className="focus:ring-2 focus:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Email adres voor automatische vervaldatum waarschuwingen
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status & Availability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Status & Beschikbaarheid
                </CardTitle>
                <CardDescription>
                  Voorraadstatus en beschikbaarheid van het medische item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="stockStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Voorraad Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-stock-status">
                          <FormControl>
                            <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                              <SelectValue placeholder="Selecteer status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="op-voorraad">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Op voorraad
                              </div>
                            </SelectItem>
                            <SelectItem value="bijna-op">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                Bijna op
                              </div>
                            </SelectItem>
                            <SelectItem value="niet-op-voorraad">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Niet op voorraad
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isDiscontinued"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3">
                          <FormLabel className="text-sm font-medium">Product Status</FormLabel>
                          <div className="flex flex-row items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-medium">Niet meer leverbaar</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Item wordt niet meer geproduceerd
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-discontinued"
                              />
                            </FormControl>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Replacement Item Selection - only show if discontinued */}
            {form.watch('isDiscontinued') && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Package2 className="h-5 w-5" />
                    Vervangingsproduct
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Selecteer een alternatief product om dit vervangen item te vervangen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="replacementItemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Vervangingsproduct</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-replacement-item">
                          <FormControl>
                            <SelectTrigger className="focus:ring-2 focus:ring-orange-500">
                              <SelectValue placeholder="Selecteer vervangingsproduct (optioneel)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Geen vervangingsproduct</SelectItem>
                            {allMedicalItems
                              .filter(replacementItem => replacementItem.id !== item.id && !(replacementItem as any).isDiscontinued)
                              .map((replacementItem) => (
                                <SelectItem key={replacementItem.id} value={replacementItem.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {replacementItem.category}
                                    </Badge>
                                    <span>{replacementItem.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-orange-700 mt-1">
                          Kies een product dat dit item kan vervangen voor een soepele overgang
                        </p>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Location Management Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Locatie Item per post
                    </CardTitle>
                    <CardDescription>
                      Beheer waar dit item wordt opgeslagen in verschillende ambulanceposten
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLocation}
                    data-testid="button-add-location"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Locatie Toevoegen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>

                <div className="border rounded-lg bg-white shadow-sm">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[180px] font-semibold">Ambulancepost</TableHead>
                      <TableHead className="w-[160px] font-semibold">Kast</TableHead>
                      <TableHead className="w-[120px] font-semibold">Lade</TableHead>
                      <TableHead className="w-[160px] font-semibold">Contactpersoon</TableHead>
                      <TableHead className="w-[140px] font-semibold">Voorraad Status</TableHead>
                      <TableHead className="w-[80px] font-semibold text-center">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemLocations.map((location, index) => (
                      <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={location.ambulancePostId}
                              onValueChange={(value) => updateLocation(index, 'ambulancePostId', value)}
                            >
                              <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500" data-testid={`select-post-${index}`}>
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
                              <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500" data-testid={`select-cabinet-${index}`}>
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
                            className="focus:ring-2 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={location.contactPersonId || "none"}
                            onValueChange={(value) => updateLocation(index, 'contactPersonId', value === "none" ? "" : value)}
                          >
                            <SelectTrigger data-testid={`select-contact-person-${index}`} className="w-full focus:ring-2 focus:ring-blue-500">
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
                          <Select
                            value={location.stockStatus || "op-voorraad"}
                            onValueChange={(value) => updateLocation(index, 'stockStatus', value)}
                          >
                            <SelectTrigger data-testid={`select-stock-status-${index}`} className="w-full focus:ring-2 focus:ring-blue-500">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="op-voorraad">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  Op voorraad
                                </div>
                              </SelectItem>
                              <SelectItem value="bijna-op">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  Bijna op
                                </div>
                              </SelectItem>
                              <SelectItem value="niet-meer-aanwezig">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  Niet meer aanwezig
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocation(index)}
                            disabled={itemLocations.length === 1}
                            data-testid={`button-remove-location-${index}`}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-gray-50 border-t-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  {/* Delete button section */}
                  <div>
                    {!showDeleteConfirmation ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowDeleteConfirmation(true)}
                        data-testid="button-delete"
                        className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Verwijderen
                      </Button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <span className="text-red-600 text-sm font-medium">
                            Weet je zeker dat je het item voor alle posten wilt verwijderen?
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={deleteItemMutation.isPending}
                          data-testid="button-confirm-delete"
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deleteItemMutation.isPending ? "Bezig..." : "Ja, verwijderen"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirmation(false)}
                          data-testid="button-cancel-delete"
                        >
                          Annuleren
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      data-testid="button-cancel"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Sluiten
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateItemMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      data-testid="button-submit"
                    >
                      <Save className="w-4 h-4" />
                      {updateItemMutation.isPending ? "Bezig..." : "Item Bijwerken"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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