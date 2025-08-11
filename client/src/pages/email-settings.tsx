import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Save, TestTube, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is verplicht"),
  smtpPort: z.number().min(1, "SMTP poort moet groter dan 0 zijn").max(65535, "Ongeldige poort"),
  smtpUser: z.string().min(1, "SMTP gebruikersnaam is verplicht"),
  smtpPassword: z.string().min(1, "SMTP wachtwoord is verplicht"),
  smtpSecure: z.boolean().default(true),
  fromEmail: z.string().email("Ongeldig email adres"),
  fromName: z.string().min(1, "Afzender naam is verplicht"),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

export default function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const { data: emailConfig, isLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/email-config'],
    queryFn: async () => {
      const response = await fetch('/api/email-config');
      if (!response.ok) {
        if (response.status === 404) {
          // Return default values if no config exists yet
          return {
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            smtpSecure: true,
            fromEmail: '',
            fromName: 'Medische Inventaris'
          };
        }
        throw new Error('Failed to fetch email config');
      }
      return response.json();
    },
  });

  const form = useForm<EmailConfig>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: true,
      fromEmail: '',
      fromName: 'Medische Inventaris'
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (emailConfig && !isLoading) {
      form.reset(emailConfig);
    }
  }, [emailConfig, isLoading, form]);

  const updateEmailConfigMutation = useMutation({
    mutationFn: async (data: EmailConfig) => {
      const response = await fetch('/api/email-config', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to save email config');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-config'] });
      toast({
        title: "Instellingen opgeslagen",
        description: "Email server configuratie is succesvol bijgewerkt",
      });
    },
    onError: (error) => {
      console.error('Email config update error:', error);
      toast({
        title: "Error",
        description: "Er is een fout opgetreden bij het opslaan van de instellingen",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        body: JSON.stringify({ 
          testEmail,
          config: form.getValues()
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to send test email');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email verzonden",
        description: "Controleer je inbox voor de test email",
      });
      setIsTestingEmail(false);
    },
    onError: (error) => {
      console.error('Test email error:', error);
      toast({
        title: "Test email gefaald",
        description: "Er is een fout opgetreden bij het verzenden van de test email",
        variant: "destructive",
      });
      setIsTestingEmail(false);
    },
  });

  const onSubmit = (data: EmailConfig) => {
    updateEmailConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (!form.formState.isValid) {
      toast({
        title: "Ongeldige configuratie",
        description: "Vul eerst alle velden correct in voordat je een test email verstuurt",
        variant: "destructive",
      });
      return;
    }

    const testEmail = prompt("Voer het email adres in waar de test email naartoe gestuurd moet worden:");
    if (testEmail && testEmail.includes('@')) {
      setIsTestingEmail(true);
      testEmailMutation.mutate(testEmail);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-medical-light">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <Link href="/" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug naar Inventaris
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-slate-900">Email Server Instellingen</h1>
                <p className="text-sm text-slate-500">Configureer SMTP instellingen voor email notificaties</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">Laden...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-light">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/" className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Inventaris
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900">Email Server Instellingen</h1>
              <p className="text-sm text-slate-500">Configureer SMTP instellingen voor email notificaties</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                SMTP Server Configuratie
              </CardTitle>
              <p className="text-sm text-slate-600">
                Configureer de SMTP server instellingen voor het verzenden van email notificaties.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="smtpHost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Host</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="smtp.gmail.com" 
                              {...field} 
                              data-testid="input-smtp-host"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMTP Poort</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="587" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-smtp-port"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="smtpUser"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gebruikersnaam</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="gebruiker@example.com" 
                              {...field} 
                              data-testid="input-smtp-user"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="smtpPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wachtwoord</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                {...field} 
                                data-testid="input-smtp-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Afzender Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="noreply@medische-inventaris.nl" 
                              {...field} 
                              data-testid="input-from-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Afzender Naam</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Medische Inventaris" 
                              {...field} 
                              data-testid="input-from-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={testEmailMutation.isPending || isTestingEmail}
                      data-testid="button-test-email"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {isTestingEmail ? "Test email verzenden..." : "Test Email Versturen"}
                    </Button>

                    <Button
                      type="submit"
                      disabled={updateEmailConfigMutation.isPending}
                      data-testid="button-save-config"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateEmailConfigMutation.isPending ? "Opslaan..." : "Instellingen Opslaan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Veelgebruikte SMTP Instellingen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium">Gmail</h4>
                    <p className="text-slate-600">smtp.gmail.com:587</p>
                    <p className="text-xs text-slate-500">SSL/TLS vereist</p>
                    <p className="text-xs text-amber-600 font-medium">Gebruik App-wachtwoord!</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Outlook/Hotmail</h4>
                    <p className="text-slate-600">smtp-mail.outlook.com:587</p>
                    <p className="text-xs text-slate-500">STARTTLS vereist</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Yahoo</h4>
                    <p className="text-slate-600">smtp.mail.yahoo.com:587</p>
                    <p className="text-xs text-slate-500">SSL/TLS vereist</p>
                  </div>
                </div>
                <div className="pt-4 text-xs text-slate-600 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="font-medium text-amber-800 mb-1">⚠️ Belangrijk voor Gmail gebruikers:</p>
                    <p className="text-amber-700">Gmail vereist een <strong>App-specifiek wachtwoord</strong> voor SMTP. Gebruik niet je gewone Gmail wachtwoord.</p>
                    <p className="text-amber-700 mt-1">Instructies: Google Account → Beveiliging → 2-staps verificatie → App-wachtwoorden</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="font-medium text-blue-800 mb-1">🏢 Bedrijfsmail servers:</p>
                    <p className="text-blue-700">Voor bedrijfsmail (Exchange, eigen servers) werkt het systeem automatisch met zelfondertekende certificaten.</p>
                    <p className="text-blue-700 mt-1">TLS certificaat verificatie is flexibel geconfigureerd voor maximale compatibiliteit.</p>
                  </div>
                  <p>Voor andere providers: controleer of SMTP toegang is ingeschakeld in je account instellingen.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}