import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Settings, ChevronDown, AlertTriangle, Mail, MapPin, Archive, Activity } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CabinetOverview from "../components/cabinet-overview";
import InventoryTable from "../components/inventory-table-new";
import AddItemDialog from "../components/add-item-dialog";
import CabinetManagement from "../components/cabinet-management";
import { ProfessionalTableSkeleton, ProfessionalSearchSkeleton } from "../components/professional-loading";
import { ProfessionalError } from "../components/professional-error";
import type { MedicalItem, AmbulancePost } from "@shared/schema";
import ravLogo from "@assets/IMG_0009_1754910857700.png";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabinet, setSelectedCabinet] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string>("");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const { data: items = [], isLoading, refetch } = useQuery<MedicalItem[]>({
    queryKey: ["/api/medical-items", selectedCabinet, selectedCategory, searchTerm, selectedPost],
    queryFn: async () => {
      if (!selectedPost) return [];
      
      // Fetch all medical items first
      const response = await fetch('/api/medical-items');
      if (!response.ok) throw new Error("Failed to fetch medical items");
      const allItems = await response.json();
      
      // Filter items that have locations in the selected post
      const locationsResponse = await fetch('/api/item-locations');
      if (!locationsResponse.ok) throw new Error("Failed to fetch locations");
      const allLocations = await locationsResponse.json();
      
      // Get items that have at least one location in the selected post
      const itemsInPost = allItems.filter((item: MedicalItem) => 
        allLocations.some((loc: any) => loc.itemId === item.id && loc.ambulancePostId === selectedPost)
      );
      
      let filteredItems = itemsInPost;
      
      // Apply filters
      if (selectedCabinet && selectedCabinet !== "all") {
        filteredItems = filteredItems.filter((item: MedicalItem) => 
          allLocations.some((loc: any) => 
            loc.itemId === item.id && 
            loc.ambulancePostId === selectedPost && 
            loc.cabinet === selectedCabinet
          )
        );
      }
      
      if (selectedCategory && selectedCategory !== "all") {
        filteredItems = filteredItems.filter((item: MedicalItem) => item.category === selectedCategory);
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = filteredItems.filter((item: MedicalItem) => 
          item.name.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
        );
      }
      
      return filteredItems;
    },
    enabled: !!selectedPost,
  });

  const { data: ambulancePosts = [] } = useQuery({
    queryKey: ["/api/ambulance-posts"],
    queryFn: async () => {
      const response = await fetch("/api/ambulance-posts");
      if (!response.ok) throw new Error("Failed to fetch ambulance posts");
      return response.json();
    },
  });

  // Auto-select first active post if none selected
  const activePosts = ambulancePosts.filter((post: any) => post.isActive);
  if (!selectedPost && activePosts.length > 0) {
    setSelectedPost(activePosts[0].id);
  }

  const categories = Array.from(new Set(items.map(item => item.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Professional Header */}
      <header className="medical-header sticky top-0 z-50">
        <div className="medical-container">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg overflow-hidden">
                <img 
                  src={ravLogo} 
                  alt="RAV FL&GV Logo" 
                  className="w-14 h-14 object-contain"
                  data-testid="logo-rav"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MedInventory</h1>
                <p className="text-sm text-slate-600 font-medium">RAV FL&GV • Medische Voorraad Beheer</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-3">
                <span className="text-sm font-medium text-slate-700">Ambulancepost:</span>
                <Select value={selectedPost} onValueChange={setSelectedPost}>
                  <SelectTrigger className="w-48 h-10 border-slate-300 shadow-sm">
                    <SelectValue placeholder="Selecteer post" />
                  </SelectTrigger>
                  <SelectContent>
                    {ambulancePosts
                      .filter((post: any) => post.isActive)
                      .map((post: any) => (
                        <SelectItem key={post.id} value={post.id}>
                          {post.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="btn-medical-primary h-10 px-6 shadow-sm"
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuw Item
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 border-slate-300 shadow-sm hover:bg-slate-50"
                      data-testid="button-settings"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Instellingen
                      <ChevronDown className="w-3 h-3 ml-2 text-slate-500" />
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
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      Kasten Beheren
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/email-settings" data-testid="menu-email-settings">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Instellingen
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/ambulance-posts" data-testid="menu-ambulance-posts">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Posten Beheer
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="medical-container py-8">
        {/* Professional Search and Filters Section */}
        <div className="mb-8">
          {isLoading ? (
            <ProfessionalSearchSkeleton />
          ) : (
            <div className="medical-card medical-fade-in">
              <div className="medical-card-header">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Zoeken & Filteren</h2>
                {selectedPost && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span>{ambulancePosts.find((p: any) => p.id === selectedPost)?.name}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Zoek op naam, beschrijving of categorie..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={selectedCabinet} onValueChange={setSelectedCabinet}>
                    <SelectTrigger className="w-44 h-12 border-slate-300 shadow-sm" data-testid="select-cabinet">
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
                    <SelectTrigger className="w-44 h-12 border-slate-300 shadow-sm" data-testid="select-category">
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
            </div>
          )}
        </div>

        {/* Cabinet Overview */}
        <CabinetOverview 
          onCabinetSelect={setSelectedCabinet} 
          selectedAmbulancePost={selectedPost}
          ambulancePostName={ambulancePosts.find((p: any) => p.id === selectedPost)?.name}
        />

        {/* Professional Detailed Inventory */}
        {!selectedPost ? (
          <ProfessionalError 
            title="Geen ambulancepost geselecteerd"
            message="Selecteer een ambulancepost in de header om de medische inventaris te bekijken."
            showRetry={false}
          />
        ) : isLoading ? (
          <ProfessionalTableSkeleton />
        ) : (
          <div className="medical-slide-up">
            <InventoryTable 
              items={items} 
              isLoading={isLoading} 
              onRefetch={refetch}
              selectedPost={selectedPost}
            />
          </div>
        )}

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
