import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Building2, MapPin, Users, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { AmbulancePost } from "@shared/schema";
import ManagePostContactsDialog from "./manage-post-contacts-dialog";

const ambulancePostSchema = z.object({
  id: z.string().min(1, "ID is verplicht").regex(/^[a-z0-9-]+$/, "ID mag alleen kleine letters, cijfers en streepjes bevatten"),
  name: z.string().min(1, "Naam is verplicht"),
  location: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AmbulancePostForm = z.infer<typeof ambulancePostSchema>;

export default function PostManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<AmbulancePost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managingContactsFor, setManagingContactsFor] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<AmbulancePost[]>({
    queryKey: ['/api/ambulance-posts'],
  });

  const form = useForm<AmbulancePostForm>({
    resolver: zodResolver(ambulancePostSchema),
    defaultValues: {
      id: '',
      name: '',
      location: '',
      description: '',
      isActive: true,
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: AmbulancePostForm) => {
      await apiRequest("POST", "/api/ambulance-posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Ambulancepost toegevoegd",
        description: "De nieuwe ambulancepost is succesvol aangemaakt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de ambulancepost.",
        variant: "destructive",
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async (data: AmbulancePostForm) => {
      await apiRequest("PATCH", `/api/ambulance-posts/${editingPost?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Ambulancepost bijgewerkt",
        description: "De ambulancepost is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      form.reset();
      setEditingPost(null);
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de ambulancepost.",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/ambulance-posts/${postId}`);
    },
    onSuccess: () => {
      toast({
        title: "Ambulancepost verwijderd",
        description: "De ambulancepost is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van de ambulancepost.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AmbulancePostForm) => {
    if (editingPost) {
      updatePostMutation.mutate(data);
    } else {
      createPostMutation.mutate(data);
    }
  };

  const handleEdit = (post: AmbulancePost) => {
    setEditingPost(post);
    form.reset({
      id: post.id,
      name: post.name,
      location: post.location || '',
      description: post.description || '',
      isActive: post.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (post: AmbulancePost) => {
    if (confirm(`Weet je zeker dat je ambulancepost "${post.name}" wilt verwijderen?`)) {
      deletePostMutation.mutate(post.id);
    }
  };

  const handleAddNew = () => {
    setEditingPost(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-slate-500">
          Ambulanceposten laden...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ambulanceposten Beheren
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Beheer alle ambulanceposten en hun configuratie
          </p>
        </div>
        <Button 
          onClick={handleAddNew}
          data-testid="button-add-post"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Post
        </Button>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Geen ambulanceposten gevonden
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Voeg je eerste ambulancepost toe om te beginnen
          </p>
          <Button onClick={handleAddNew} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Eerste Post Toevoegen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="relative group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {post.name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {post.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge
                      variant={post.isActive ? "default" : "secondary"}
                      className={post.isActive ? "bg-green-100 text-green-700 border-green-200" : ""}
                    >
                      {post.isActive ? (
                        <><Eye className="w-3 h-3 mr-1" /> Actief</>
                      ) : (
                        <><EyeOff className="w-3 h-3 mr-1" /> Inactief</>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {post.location && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{post.location}</span>
                  </div>
                )}
                
                {post.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {post.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManagingContactsFor(post.id)}
                    data-testid={`button-manage-contacts-${post.id}`}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Contacten
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(post)}
                      data-testid={`button-edit-post-${post.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Ambulancepost Bewerken' : 'Nieuwe Ambulancepost'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="bijv. hilversum"
                        {...field}
                        disabled={!!editingPost}
                        data-testid="input-post-id"
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
                    <FormLabel>Naam</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Post Hilversum"
                        {...field}
                        data-testid="input-post-name"
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
                    <FormLabel>Locatie (optioneel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Hilversum, Nederland"
                        {...field}
                        data-testid="input-post-location"
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
                    <FormLabel>Beschrijving (optioneel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Beschrijving van de ambulancepost"
                        {...field}
                        data-testid="input-post-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Actief</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-post-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={createPostMutation.isPending || updatePostMutation.isPending}
                  data-testid="button-save-post"
                >
                  {editingPost ? 'Bijwerken' : 'Aanmaken'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Contacts Dialog */}
      {managingContactsFor && (
        <ManagePostContactsDialog
          postId={managingContactsFor}
          open={!!managingContactsFor}
          onOpenChange={() => setManagingContactsFor(null)}
        />
      )}
    </div>
  );
}