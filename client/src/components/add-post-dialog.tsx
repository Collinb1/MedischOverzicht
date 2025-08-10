import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { insertAmbulancePostSchema, type InsertAmbulancePost, type AmbulancePost } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface AddPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostAdded?: (post: AmbulancePost) => void;
}

export default function AddPostDialog({ open, onOpenChange, onPostAdded }: AddPostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<AmbulancePost | null>(null);

  const { data: ambulancePosts = [] } = useQuery<AmbulancePost[]>({
    queryKey: ["/api/ambulance-posts"],
    queryFn: async () => {
      const response = await fetch("/api/ambulance-posts");
      if (!response.ok) throw new Error("Failed to fetch ambulance posts");
      return response.json();
    },
  });

  const form = useForm<InsertAmbulancePost>({
    resolver: zodResolver(insertAmbulancePostSchema),
    defaultValues: {
      id: "",
      name: "",
      location: "",
      description: "",
      isActive: true,
    },
  });

  const addPostMutation = useMutation({
    mutationFn: async (data: InsertAmbulancePost) => {
      if (editingPost) {
        return await apiRequest("PATCH", `/api/ambulance-posts/${editingPost.id}`, data);
      } else {
        return await apiRequest("POST", "/api/ambulance-posts", data);
      }
    },
    onSuccess: (newPost) => {
      toast({
        title: editingPost ? "Post bijgewerkt" : "Post toegevoegd",
        description: editingPost 
          ? "De ambulancepost is succesvol bijgewerkt."
          : "De ambulancepost is succesvol toegevoegd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulance-posts"] });
      form.reset();
      setEditingPost(null);
      if (onPostAdded) {
        onPostAdded(newPost);
      }
    },
    onError: (error) => {
      console.error("Error saving post:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Er is een fout opgetreden bij het opslaan van de ambulancepost.",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ambulance-posts/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Post verwijderd",
        description: "De ambulancepost is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ambulance-posts"] });
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de ambulancepost.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAmbulancePost) => {
    addPostMutation.mutate(data);
  };

  const handleEdit = (post: AmbulancePost) => {
    setEditingPost(post);
    form.reset({
      id: post.id,
      name: post.name,
      location: post.location || "",
      description: post.description || "",
      isActive: post.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    form.reset({
      id: "",
      name: "",
      location: "",
      description: "",
      isActive: true,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet u zeker dat u deze ambulancepost wilt verwijderen?")) {
      deletePostMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Ambulanceposten Beheren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="text-lg font-medium mb-4">
              {editingPost ? "Post bewerken" : "Nieuwe post toevoegen"}
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="bijv. hilversum"
                            data-testid="input-post-id"
                            {...field}
                            disabled={!!editingPost}
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
                            placeholder="bijv. Post Hilversum"
                            data-testid="input-post-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locatie</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="bijv. Hilversum centrum"
                          data-testid="input-post-location"
                          {...field}
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
                      <FormLabel>Beschrijving</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optionele beschrijving van de ambulancepost"
                          data-testid="textarea-post-description"
                          {...field}
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Actief</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Is deze ambulancepost actief en beschikbaar?
                        </div>
                      </div>
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

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={addPostMutation.isPending}
                    data-testid="button-save-post"
                  >
                    {addPostMutation.isPending ? "Opslaan..." : (editingPost ? "Bijwerken" : "Toevoegen")}
                  </Button>
                  
                  {editingPost && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      Annuleren
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {/* Posts Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Bestaande Ambulanceposten</h3>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambulancePosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-mono">{post.id}</TableCell>
                      <TableCell>{post.name}</TableCell>
                      <TableCell>{post.location || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          post.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {post.isActive ? "Actief" : "Inactief"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(post)}
                            data-testid={`button-edit-post-${post.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletePostMutation.isPending}
                            data-testid={`button-delete-post-${post.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}