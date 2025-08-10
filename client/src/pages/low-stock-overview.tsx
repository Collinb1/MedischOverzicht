import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Send, CheckCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MedicalItem, EmailNotification } from "@shared/schema";

export default function LowStockOverview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<MedicalItem[]>({
    queryKey: ['/api/medical-items'],
    queryFn: () => apiRequest('/api/medical-items'),
  });

  const { data: cabinets = [] } = useQuery<any[]>({
    queryKey: ['/api/cabinets'],
    queryFn: () => apiRequest('/api/cabinets'),
  });

  // Filter items die bijna op zijn of niet meer aanwezig
  const lowStockItems = items.filter(item => 
    item.stockStatus === 'bijna-op' || item.stockStatus === 'niet-meer-aanwezig'
  );

  const updateStockStatusMutation = useMutation({
    mutationFn: async ({ id, stockStatus }: { id: string; stockStatus: string }) => {
      return apiRequest(`/api/medical-items/${id}`, 'PATCH', { stockStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
      toast({
        title: "Status bijgewerkt",
        description: "Voorraad status is succesvol aangepast",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Er is een fout opgetreden bij het bijwerken van de status",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      return apiRequest('/api/send-email', 'POST', emailData);
    },
    onSuccess: () => {
      toast({
        title: "Email verzonden",
        description: "Aanvulverzoek is succesvol verzonden",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-items'] });
    },
    onError: (error) => {
      console.error('Email send error:', error);
      toast({
        title: "Error", 
        description: "Er is een fout opgetreden bij het verzenden van de email",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = (item: MedicalItem) => {
    const emailData = {
      itemId: item.id,
      itemName: item.name,
      cabinetId: item.cabinet,
      drawer: item.drawer,
      stockStatus: item.stockStatus,
      department: "Magazijn",
      ambulancePost: item.ambulancePost
    };
    
    sendEmailMutation.mutate(emailData);
  };

  const handleResetStock = (item: MedicalItem) => {
    updateStockStatusMutation.mutate({
      id: item.id,
      stockStatus: 'op-voorraad'
    });
  };

  const getCabinetColor = (cabinetId: string): string => {
    const cabinet = cabinets.find((c: any) => c.id === cabinetId);
    if (cabinet?.color) {
      return `${cabinet.color} text-white border-2 border-current`;
    }
    return "bg-slate-200 text-slate-700 border-2 border-slate-400";
  };

  const getStockStatusInfo = (status: string) => {
    switch (status) {
      case "bijna-op":
        return { color: "bg-orange-500", text: "Bijna op", icon: AlertTriangle };
      case "niet-meer-aanwezig":
        return { color: "bg-red-500", text: "Niet meer aanwezig", icon: Package };
      default:
        return { color: "bg-green-500", text: "Op voorraad", icon: Package };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Voorraad Overzicht - Items die bijna op zijn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Laden...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-light">
      {/* Header met navigatie terug */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/" className="mr-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Inventaris
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Voorraad Overzicht</h1>
              <p className="text-sm text-slate-500">Items die bijna op zijn of niet meer aanwezig</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Voorraad Overzicht - Items die bijna op zijn
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Overzicht van alle items die bijna op zijn of niet meer aanwezig zijn. 
            Verstuur aanvulverzoeken of markeer items als aangevuld.
          </p>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Alle voorraad op peil!</h3>
              <p className="text-slate-600">Er zijn momenteel geen items die bijna op zijn.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Totaal items: {lowStockItems.length}</span>
                <span>Bijna op: {lowStockItems.filter(i => i.stockStatus === 'bijna-op').length}</span>
                <span>Niet meer aanwezig: {lowStockItems.filter(i => i.stockStatus === 'niet-meer-aanwezig').length}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Kast</TableHead>
                    <TableHead>Lade</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => {
                    const statusInfo = getStockStatusInfo(item.stockStatus);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-slate-600">{item.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`text-xs px-2 py-1 ${getCabinetColor(item.cabinet)}`}
                          >
                            {item.cabinet}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.drawer || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-xs">
                            {item.ambulancePost === 'hilversum' ? 'Hilversum' : 'Blaricum'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className={`w-3 h-3 rounded-full ${statusInfo.color}`}
                              title={statusInfo.text}
                            />
                            <span className="text-sm">{statusInfo.text}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(item)}
                              disabled={sendEmailMutation.isPending}
                              className="text-xs h-7 px-2"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Verstuur
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetStock(item)}
                              disabled={updateStockStatusMutation.isPending}
                              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Markeer als aangevuld"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  );
}