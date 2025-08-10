import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AmbulancePost } from "@shared/schema";

const ambulancePostSchema = z.object({
  id: z.string().min(1, "ID is verplicht").regex(/^[a-z0-9-]+$/, "ID mag alleen kleine letters, cijfers en streepjes bevatten"),
  name: z.string().min(1, "Naam is verplicht"),
  location: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type AmbulancePostForm = z.infer<typeof ambulancePostSchema>;

export default function AmbulancePosts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<AmbulancePost | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      const response = await fetch('/api/ambulance-posts', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fout bij aanmaken ambulancepost');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Succes",
        description: "Ambulancepost succesvol aangemaakt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async (data: { id: string; post: Partial<AmbulancePostForm> }) => {
      const response = await fetch(`/api/ambulance-posts/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.post),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fout bij bijwerken ambulancepost');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      setIsDialogOpen(false);
      setEditingPost(null);
      form.reset();
      toast({
        title: "Succes",
        description: "Ambulancepost succesvol bijgewerkt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ambulance-posts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fout bij verwijderen ambulancepost');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ambulance-posts'] });
      toast({
        title: "Succes",
        description: "Ambulancepost succesvol verwijderd",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleSubmit = (data: AmbulancePostForm) => {
    if (editingPost) {
      updatePostMutation.mutate({
        id: editingPost.id,
        post: data,
      });
    } else {
      createPostMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Weet je zeker dat je deze ambulancepost wilt verwijderen?')) {
      deletePostMutation.mutate(id);
    }
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    form.reset({
      id: '',
      name: '',
      location: '',
      description: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild data-testid="button-back">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Ambulanceposten Beheer</h1>
        </div>
        <div className="text-center py-8">Laden...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild data-testid="button-back">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Ambulanceposten Beheer</h1>
        <div className="ml-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="button-add-post">
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                        <FormLabel>ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="bijv: post-amsterdam" 
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
                            placeholder="bijv: Post Amsterdam" 
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
                            placeholder="bijv: Amsterdam Noord" 
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
                            data-testid="textarea-post-description"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createPostMutation.isPending || updatePostMutation.isPending}
                      data-testid="button-submit-post"
                    >
                      {editingPost ? 'Bijwerken' : 'Aanmaken'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-post"
                    >
                      Annuleren
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Geen ambulanceposten</h3>
              <p className="text-gray-500 text-center mb-4">
                Er zijn nog geen ambulanceposten geconfigureerd.
              </p>
              <Button onClick={openCreateDialog} data-testid="button-add-first-post">
                <Plus className="h-4 w-4 mr-2" />
                Eerste Post Toevoegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} data-testid={`card-post-${post.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{post.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      post.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                    data-testid={`status-post-${post.id}`}
                  >
                    {post.isActive ? 'Actief' : 'Inactief'}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(post)}
                    data-testid={`button-edit-${post.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletePostMutation.isPending}
                    data-testid={`button-delete-${post.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex text-sm">
                    <span className="font-medium text-gray-600 w-20">ID:</span>
                    <span className="text-gray-900" data-testid={`text-id-${post.id}`}>
                      {post.id}
                    </span>
                  </div>
                  {post.location && (
                    <div className="flex text-sm">
                      <span className="font-medium text-gray-600 w-20">Locatie:</span>
                      <span className="text-gray-900" data-testid={`text-location-${post.id}`}>
                        {post.location}
                      </span>
                    </div>
                  )}
                  {post.description && (
                    <div className="flex text-sm">
                      <span className="font-medium text-gray-600 w-20">Info:</span>
                      <span className="text-gray-900" data-testid={`text-description-${post.id}`}>
                        {post.description}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}