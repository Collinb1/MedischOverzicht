import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Settings, ChevronDown, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CabinetOverview from "../components/cabinet-overview";
import InventoryTable from "../components/inventory-table";
import AddItemDialog from "../components/add-item-dialog";
import CabinetManagement from "../components/cabinet-management";
import type { MedicalItem } from "@shared/schema";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabinet, setSelectedCabinet] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string>("hilversum");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const { data: items = [], isLoading, refetch } = useQuery<MedicalItem[]>({
    queryKey: ["/api/medical-items", selectedCabinet, selectedCategory, searchTerm, selectedPost],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCabinet && selectedCabinet !== "all") params.append("cabinet", selectedCabinet);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      params.append("ambulancePost", selectedPost);
      
      const response = await fetch(`/api/medical-items?${params}`);
      if (!response.ok) throw new Error("Failed to fetch medical items");
      return response.json();
    },
  });

  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="min-h-screen bg-medical-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-medical-blue rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <Plus className="w-4 h-4 text-medical-blue" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">MedInventory</h1>
                <p className="text-sm text-slate-500">Medische Voorraad Beheer</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600">
                <Select value={selectedPost} onValueChange={setSelectedPost}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hilversum">Post Hilversum</SelectItem>
                    <SelectItem value="blaricum">Post Blaricum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-medical-blue hover:bg-blue-700"
                data-testid="button-add-item"
              >
                <Plus className="w-4 h-4 mr-2" />
                Item Toevoegen
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid="button-settings"
                    className="px-2"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/voorraad-overzicht" data-testid="menu-stock-overview">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Voorraad Overzicht
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowSettingsDialog(true)}
                    data-testid="menu-cabinet-management"
                  >
                    Kasten Beheren
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Zoek medische voorraad..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedCabinet} onValueChange={setSelectedCabinet}>
                    <SelectTrigger className="w-40" data-testid="select-cabinet">
                      <SelectValue placeholder="Alle Kasten" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kasten</SelectItem>
                      <SelectItem value="A">Kast A</SelectItem>
                      <SelectItem value="B">Kast B</SelectItem>
                      <SelectItem value="C">Kast C</SelectItem>
                      <SelectItem value="D">Kast D</SelectItem>
                      <SelectItem value="E">Kast E</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40" data-testid="select-category">
                      <SelectValue placeholder="Alle Categorieën" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Categorieën</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cabinet Overview */}
        <CabinetOverview onCabinetSelect={setSelectedCabinet} />

        {/* Detailed Inventory */}
        <InventoryTable 
          items={items} 
          isLoading={isLoading} 
          onRefetch={refetch}
        />

        {/* Add Item Dialog */}
        <AddItemDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onSuccess={refetch}
          selectedPost={selectedPost}
        />

        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Instellingen</DialogTitle>
            </DialogHeader>
            <CabinetManagement />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
