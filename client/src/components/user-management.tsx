import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Mail, Phone, Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { PostContact, AmbulancePost } from "@shared/schema";

const contactSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  email: z.string().email("Ongeldig email adres"),
  phone: z.string().optional(),
  department: z.string().optional(),
  ambulancePostId: z.string().min(1, "Ambulancepost is verplicht"),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingContact, setEditingContact] = useState<PostContact | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string>("all");

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<PostContact[]>({
    queryKey: ['/api/post-contacts'],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<AmbulancePost[]>({
    queryKey: ['/api/ambulance-posts'],
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      department: '',
      ambulancePostId: '',
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      await apiRequest("POST", "/api/post-contacts", data);
    },
    onSuccess: () => {
      toast({
        title: "Contactpersoon toegevoegd",
        description: "De nieuwe contactpersoon is succesvol aangemaakt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      await apiRequest("PATCH", `/api/post-contacts/${editingContact?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Contactpersoon bijgewerkt",
        description: "De contactpersoon is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
      form.reset();
      setEditingContact(null);
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/post-contacts/${contactId}`);
    },
    onSuccess: () => {
      toast({
        title: "Contactpersoon verwijderd",
        description: "De contactpersoon is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ContactForm) => {
    if (editingContact) {
      updateContactMutation.mutate(data);
    } else {
      createContactMutation.mutate(data);
    }
  };

  const handleEdit = (contact: PostContact) => {
    setEditingContact(contact);
    form.reset({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      department: contact.department || '',
      ambulancePostId: contact.ambulancePostId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (contact: PostContact) => {
    if (confirm(`Weet je zeker dat je contactpersoon "${contact.name}" wilt verwijderen?`)) {
      deleteContactMutation.mutate(contact.id);
    }
  };

  const handleAddNew = () => {
    setEditingContact(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const getPostName = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    return post?.name || postId;
  };

  const filteredContacts = selectedPost === "all" 
    ? contacts 
    : contacts.filter(contact => contact.ambulancePostId === selectedPost);

  const contactsByPost = contacts.reduce((acc, contact) => {
    const postName = getPostName(contact.ambulancePostId);
    if (!acc[postName]) {
      acc[postName] = [];
    }
    acc[postName].push(contact);
    return acc;
  }, {} as Record<string, PostContact[]>);

  if (contactsLoading || postsLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-slate-500">
          Contactpersonen laden...
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
            Contactpersonen Beheren
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Beheer contactpersonen per ambulancepost
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPost} onValueChange={setSelectedPost}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter op post" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle posten</SelectItem>
              {posts.map((post) => (
                <SelectItem key={post.id} value={post.id}>
                  {post.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddNew}
            data-testid="button-add-contact"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nieuwe Contactpersoon
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contacts.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Totaal Contactpersonen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Object.keys(contactsByPost).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Posten met Contacten
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contacts.filter(c => c.email).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Met E-mail Adres
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Geen contactpersonen gevonden
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {selectedPost === "all" 
              ? "Voeg je eerste contactpersoon toe"
              : "Geen contactpersonen voor deze post"
            }
          </p>
          <Button onClick={handleAddNew} variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Contactpersoon Toevoegen
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate">
                        {contact.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {getPostName(contact.ambulancePostId)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{contact.email}</span>
                </div>
                
                {contact.phone && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                
                {contact.department && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Afdeling:</span> {contact.department}
                  </div>
                )}

                <div className="flex items-center justify-end space-x-1 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(contact)}
                    data-testid={`button-edit-contact-${contact.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contact)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`button-delete-contact-${contact.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
              {editingContact ? 'Contactpersoon Bewerken' : 'Nieuwe Contactpersoon'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jan de Vries"
                        {...field}
                        data-testid="input-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="jan@ziekenhuis.nl"
                        {...field}
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoon (optioneel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="06-12345678"
                        {...field}
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Afdeling (optioneel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Spoedhulp"
                        {...field}
                        data-testid="input-contact-department"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ambulancePostId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambulancepost</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contact-post">
                          <SelectValue placeholder="Selecteer ambulancepost" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {posts.map((post) => (
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
                  disabled={createContactMutation.isPending || updateContactMutation.isPending}
                  data-testid="button-save-contact"
                >
                  {editingContact ? 'Bijwerken' : 'Aanmaken'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}