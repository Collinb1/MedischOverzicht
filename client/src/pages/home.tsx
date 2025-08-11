import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Settings, ChevronDown, AlertTriangle, Mail, MapPin } from "lucide-react";
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
    <div className="min-h-screen bg-medical-light">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                <img 
                  src={ravLogo} 
                  alt="RAV FL&GV Logo" 
                  className="w-full h-full object-contain"
                  data-testid="logo-rav"
                />
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
          selectedPost={selectedPost}
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
