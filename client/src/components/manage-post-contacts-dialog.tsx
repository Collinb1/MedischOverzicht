import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPostContactSchema } from "@shared/schema";
import type { InsertPostContact, PostContact } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, Settings } from "lucide-react";
import * as z from "zod";

interface ManagePostContactsDialogProps {
  postId: string;
  postName: string;
  children?: React.ReactNode;
}

export default function ManagePostContactsDialog({
  postId,
  postName,
  children,
}: ManagePostContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PostContact | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['/api/post-contacts', postId],
    enabled: open, // Only fetch when dialog is open
  });

  const addContactForm = useForm<InsertPostContact>({
    resolver: zodResolver(insertPostContactSchema.extend({
      ambulancePostId: z.string().default(postId),
    })),
    defaultValues: {
      ambulancePostId: postId,
      name: "",
      email: "",
      department: "",
      isActive: true,
    },
  });

  const editContactForm = useForm<InsertPostContact>({
    resolver: zodResolver(insertPostContactSchema.extend({
      ambulancePostId: z.string().default(postId),
    })),
    defaultValues: {
      ambulancePostId: postId,
      name: "",
      email: "",
      department: "",
      isActive: true,
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertPostContact) => 
      await apiRequest("/api/post-contacts", { method: "POST", body: data }),
    onSuccess: () => {
      toast({
        title: "Contactpersoon toegevoegd",
        description: "De contactpersoon is succesvol toegevoegd aan deze post.",
      });
      addContactForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het toevoegen van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPostContact> }) =>
      await apiRequest(`/api/post-contacts/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      toast({
        title: "Contactpersoon bijgewerkt",
        description: "De contactpersoon is succesvol bijgewerkt.",
      });
      setEditingContact(null);
      editContactForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) =>
      await apiRequest(`/api/post-contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: "Contactpersoon verwijderd",
        description: "De contactpersoon is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/post-contacts'] });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Er is een fout opgetreden bij het verwijderen van de contactpersoon.",
        variant: "destructive",
      });
    },
  });

  const onSubmitAdd = (data: InsertPostContact) => {
    createContactMutation.mutate(data);
  };

  const onSubmitEdit = (data: InsertPostContact) => {
    if (editingContact) {
      updateContactMutation.mutate({
        id: editingContact.id,
        data,
      });
    }
  };

  const startEditing = (contact: PostContact) => {
    setEditingContact(contact);
    editContactForm.reset({
      ambulancePostId: contact.ambulancePostId,
      name: contact.name,
      email: contact.email,
      department: contact.department || "",
      isActive: contact.isActive,
    });
  };

  const cancelEditing = () => {
    setEditingContact(null);
    editContactForm.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" data-testid="button-manage-contacts">
            <Users className="h-4 w-4 mr-2" />
            Contactpersonen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contactpersonen beheer - {postName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Add New Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nieuwe contactpersoon</CardTitle>
              <CardDescription>
                Voeg een nieuwe contactpersoon toe voor aanvulverzoeken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...addContactForm}>
                <form onSubmit={addContactForm.handleSubmit(onSubmitAdd)} className="space-y-4">
                  <FormField
                    control={addContactForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Naam contactpersoon" 
                            {...field} 
                            data-testid="input-contact-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addContactForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@voorbeeld.nl" 
                            {...field} 
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addContactForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Afdeling (optioneel)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Bijv. Logistiek, Voorraad" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-contact-department"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createContactMutation.isPending}
                    data-testid="button-add-contact"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Contactpersoon toevoegen
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Existing Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bestaande contactpersonen</CardTitle>
              <CardDescription>
                Beheer de contactpersonen voor deze ambulancepost
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Laden...</div>
                </div>
              ) : (contacts as PostContact[]).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="text-sm text-muted-foreground">
                    Nog geen contactpersonen toegevoegd
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(contacts as PostContact[]).map((contact: PostContact) => (
                    <div key={contact.id} className="border rounded-lg p-3">
                      {editingContact?.id === contact.id ? (
                        <Form {...editContactForm}>
                          <form onSubmit={editContactForm.handleSubmit(onSubmitEdit)} className="space-y-3">
                            <FormField
                              control={editContactForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      placeholder="Naam contactpersoon" 
                                      {...field} 
                                      data-testid={`input-edit-name-${contact.id}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editContactForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="email" 
                                      placeholder="email@voorbeeld.nl" 
                                      {...field} 
                                      data-testid={`input-edit-email-${contact.id}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={editContactForm.control}
                              name="department"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      placeholder="Afdeling" 
                                      {...field} 
                                      value={field.value || ""}
                                      data-testid={`input-edit-department-${contact.id}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={updateContactMutation.isPending}
                                data-testid={`button-save-contact-${contact.id}`}
                              >
                                Opslaan
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                data-testid={`button-cancel-edit-${contact.id}`}
                              >
                                Annuleren
                              </Button>
                            </div>
                          </form>
                        </Form>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium" data-testid={`text-contact-name-${contact.id}`}>
                                {contact.name}
                              </div>
                              <div className="text-sm text-muted-foreground" data-testid={`text-contact-email-${contact.id}`}>
                                {contact.email}
                              </div>
                              {contact.department && (
                                <div className="text-xs text-muted-foreground" data-testid={`text-contact-department-${contact.id}`}>
                                  {contact.department}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(contact)}
                                data-testid={`button-edit-contact-${contact.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContactMutation.mutate(contact.id)}
                                disabled={deleteContactMutation.isPending}
                                data-testid={`button-delete-contact-${contact.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}