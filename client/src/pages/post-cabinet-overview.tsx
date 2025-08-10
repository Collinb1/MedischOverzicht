import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Archive, Layers3 } from "lucide-react";
import type { AmbulancePost, Cabinet, ItemLocation } from "@shared/schema";

export default function PostCabinetOverview() {
  const { data: ambulancePosts = [] } = useQuery<AmbulancePost[]>({
    queryKey: ["/api/ambulance-posts"],
  });

  const { data: cabinets = [] } = useQuery<Cabinet[]>({
    queryKey: ["/api/cabinets"],
  });

  const { data: itemLocations = [] } = useQuery<ItemLocation[]>({
    queryKey: ["/api/item-locations"],
  });

  // Group item locations by ambulance post and cabinet
  const locationsByPost = ambulancePosts.map(post => {
    const postLocations = itemLocations.filter(loc => loc.ambulancePostId === post.id);
    const cabinetGroups = cabinets.map(cabinet => {
      const cabinetLocations = postLocations.filter(loc => loc.cabinet === cabinet.id);
      const drawers = Array.from(new Set(cabinetLocations.map(loc => loc.drawer).filter(Boolean)));
      return {
        cabinet,
        itemCount: cabinetLocations.length,
        drawers: drawers.sort()
      };
    }).filter(group => group.itemCount > 0);

    return {
      post,
      cabinetGroups,
      totalItems: postLocations.length
    };
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Ambulancepost Locatie Overzicht</h1>
        <p className="text-muted-foreground">
          Overzicht van kasten en laden per ambulancepost
        </p>
      </div>

      <div className="grid gap-6">
        {locationsByPost.map(({ post, cabinetGroups, totalItems }) => (
          <Card key={post.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{post.name}</CardTitle>
                    <CardDescription>
                      {post.location && `Locatie: ${post.location}`}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {totalItems} items totaal
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {cabinetGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Geen items gevonden voor deze ambulancepost</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Kast ID</TableHead>
                      <TableHead>Kast Naam</TableHead>
                      <TableHead>Aantal Items</TableHead>
                      <TableHead>Laden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cabinetGroups.map(({ cabinet, itemCount, drawers }) => (
                      <TableRow key={cabinet.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {cabinet.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {cabinet.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {drawers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {drawers.map(drawer => (
                                <Badge 
                                  key={drawer} 
                                  variant="outline" 
                                  className="text-xs flex items-center"
                                >
                                  <Layers3 className="w-3 h-3 mr-1" />
                                  {drawer}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Geen lade opgegeven</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {locationsByPost.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Geen ambulanceposten gevonden</h3>
            <p className="text-muted-foreground">
              Er zijn nog geen ambulanceposten geconfigureerd in het systeem.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}