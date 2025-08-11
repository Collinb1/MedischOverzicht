import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Save, TestTube, Eye, EyeOff, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const { data: emailConfig, isLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/email-config'],
    queryFn: async () => {
      const response = await fetch('/api/email-config');
      if (!response.ok) {
        if (response.status === 404) {
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
    if (emailConfig) {
      form.reset(emailConfig);
    }
  }, [emailConfig, form]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfig) => {
      const response = await fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save email config');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "E-mail instellingen opgeslagen",
        description: "De SMTP configuratie is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message || "Er is een fout opgetreden bij het opslaan van de e-mail instellingen.",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const response = await fetch('/api/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'E-mail test mislukt');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test e-mail verzonden",
        description: `Een test e-mail is verzonden naar ${testEmailAddress}`,
      });
      setIsTestingEmail(false);
      setTestEmailAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "E-mail test mislukt",
        description: error.message || "Er is een fout opgetreden bij het verzenden van de test e-mail.",
        variant: "destructive",
      });
      setIsTestingEmail(false);
    },
  });

  const handleSave = (data: EmailConfig) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: "E-mail adres vereist",
        description: "Voer een geldig e-mail adres in voor de test.",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingEmail(true);
    testEmailMutation.mutate(testEmailAddress);
  };

  const isConfigured = emailConfig && emailConfig.smtpHost && emailConfig.smtpUser;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-slate-500">
          E-mail instellingen laden...
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
            E-mail Configuratie
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configureer SMTP instellingen voor automatische e-mail notificaties
          </p>
        </div>
        <Badge
          variant={isConfigured ? "default" : "secondary"}
          className={isConfigured ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}
        >
          {isConfigured ? (
            <><CheckCircle className="w-3 h-3 mr-1" /> Geconfigureerd</>
          ) : (
            <><AlertCircle className="w-3 h-3 mr-1" /> Configuratie vereist</>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              SMTP Instellingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Server</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="mail.voorbeeld.nl"
                          {...field}
                          data-testid="input-smtp-host"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="smtpPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poort</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="587"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                            data-testid="input-smtp-port"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtpSecure"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>TLS/SSL</FormLabel>
                          <FormDescription className="text-xs">
                            Gebruik beveiligde verbinding
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-smtp-secure"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="smtpUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gebruikersnaam</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="gebruiker@voorbeeld.nl"
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
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Afzender E-mail</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="noreply@voorbeeld.nl"
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

                <Button
                  type="submit"
                  disabled={saveConfigMutation.isPending}
                  className="w-full"
                  data-testid="button-save-email-config"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveConfigMutation.isPending ? 'Opslaan...' : 'Configuratie Opslaan'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TestTube className="w-5 h-5 mr-2" />
              E-mail Testen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test je e-mail configuratie door een test bericht te verzenden.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="test-email">Test E-mail Adres</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@voorbeeld.nl"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  data-testid="input-test-email"
                />
              </div>

              <Button
                onClick={handleTestEmail}
                disabled={!isConfigured || testEmailMutation.isPending || isTestingEmail}
                className="w-full"
                variant="outline"
                data-testid="button-test-email"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isTestingEmail ? 'Test E-mail Verzenden...' : 'Test E-mail Verzenden'}
              </Button>

              {!isConfigured && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Sla eerst de SMTP configuratie op voordat je kunt testen.
                </p>
              )}
            </div>

            {/* Email Templates Preview */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                E-mail Sjablonen
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Voorraad Waarschuwing</span>
                  <Badge variant="secondary">Actief</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Aanvul Verzoek</span>
                  <Badge variant="secondary">Actief</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vervaldatum Waarschuwing</span>
                  <Badge variant="secondary">Binnenkort</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common SMTP Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Veel Gebruikte SMTP Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium mb-2">Gmail</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Host: smtp.gmail.com</div>
                <div>Poort: 587 (TLS)</div>
                <div>Vereist: App-wachtwoord</div>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium mb-2">Outlook</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Host: smtp-mail.outlook.com</div>
                <div>Poort: 587 (TLS)</div>
                <div>Vereist: Account wachtwoord</div>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium mb-2">SendGrid</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>Host: smtp.sendgrid.net</div>
                <div>Poort: 587 (TLS)</div>
                <div>Vereist: API sleutel</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}