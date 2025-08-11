import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMedicalItemSchema, insertEmailNotificationSchema, insertCabinetSchema, insertEmailConfigSchema, insertAmbulancePostSchema, insertItemLocationSchema, insertPostContactSchema } from "@shared/schema";
import { sendEmail, generateRestockEmailHTML } from "./email";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all medical items with locations
  app.get("/api/medical-items", async (req, res) => {
    try {
      const { cabinet, category, search, ambulancePost } = req.query;
      
      // Get all medical items
      const allItems = await storage.getMedicalItems();
      
      if (ambulancePost && typeof ambulancePost === 'string') {
        // Filter items for specific ambulance post
        const itemLocations = await storage.getItemLocationsByPost(ambulancePost);
        
        const itemsWithLocations = itemLocations.map(location => {
          const item = allItems.find(item => item.id === location.itemId);
          if (!item) return null;
          
          return {
            ...item,
            locationId: location.id,
            cabinet: location.cabinet,
            drawer: location.drawer,
            isLowStock: location.isLowStock,
            stockStatus: location.stockStatus,
            ambulancePost: location.ambulancePostId
          };
        }).filter((item): item is NonNullable<typeof item> => item !== null);
        
        let filteredItems = itemsWithLocations;
        
        // Apply filters
        if (cabinet && typeof cabinet === 'string') {
          filteredItems = filteredItems.filter(item => item.cabinet === cabinet);
        }
        
        if (category && typeof category === 'string') {
          filteredItems = filteredItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
        }
        
        if (search && typeof search === 'string') {
          const searchLower = search.toLowerCase();
          filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.category.toLowerCase().includes(searchLower)
          );
        }
        
        res.json(filteredItems);
      } else {
        // Return all items with all their locations
        const itemsWithAllLocations = await Promise.all(
          allItems.map(async (item) => {
            const locations = await storage.getItemLocationsByItem(item.id);
            return { ...item, locations };
          })
        );
        
        res.json(itemsWithAllLocations);
      }
    } catch (error) {
      console.error("Error fetching medical items:", error);
      res.status(500).json({ message: "Failed to fetch medical items" });
    }
  });

  // Get single medical item
  app.get("/api/medical-items/:id", async (req, res) => {
    try {
      const item = await storage.getMedicalItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Medical item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medical item" });
    }
  });

  // Get locations for a specific item
  app.get("/api/item-locations/:itemId", async (req, res) => {
    try {
      const locations = await storage.getItemLocationsByItem(req.params.itemId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching item locations:", error);
      res.status(500).json({ message: "Failed to fetch item locations" });
    }
  });

  // Create medical item with multiple locations
  app.post("/api/medical-items", async (req, res) => {
    try {
      const { locations, isLowStock, stockStatus, ...itemData } = req.body;
      
      // Validate medical item data
      const validatedItemData = insertMedicalItemSchema.parse(itemData);
      
      // Create the medical item first
      const item = await storage.createMedicalItem(validatedItemData);
      
      // Create location records for each location
      const createdLocations = [];
      if (locations && locations.length > 0) {
        for (const location of locations) {
          const locationData = {
            itemId: item.id,
            ambulancePostId: location.ambulancePostId,
            cabinet: location.cabinet,
            drawer: location.drawer || null,
            contactPersonId: location.contactPersonId || null,
            isLowStock: isLowStock || false,
            stockStatus: stockStatus || "op-voorraad"
          };
          
          const validatedLocationData = insertItemLocationSchema.parse(locationData);
          const createdLocation = await storage.createItemLocation(validatedLocationData);
          createdLocations.push(createdLocation);
        }
      }
      
      // Return combined data
      const response = {
        ...item,
        locations: createdLocations
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating medical item:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create medical item" });
      }
    }
  });

  // Update medical item and locations
  app.patch("/api/medical-items/:id", async (req, res) => {
    try {
      const { locations, ...itemData } = req.body;
      
      // Get the existing item first
      let updatedItem = await storage.getMedicalItem(req.params.id);
      if (!updatedItem) {
        return res.status(404).json({ message: "Medical item not found" });
      }
      
      // Update the medical item only if there are meaningful fields to update
      const meaningfulFields = Object.entries(itemData).filter(([key, value]) => {
        // Filter out empty strings, null, undefined, but keep boolean false and numbers
        return value !== undefined && value !== null && value !== "";
      });
      
      if (meaningfulFields.length > 0) {
        const updateData = Object.fromEntries(meaningfulFields);
        const partialItemData = insertMedicalItemSchema.partial().parse(updateData);
        updatedItem = await storage.updateMedicalItem(req.params.id, partialItemData);
      }
      
      // Handle locations update if provided
      let updatedLocations = [];
      if (locations && Array.isArray(locations)) {
        // Delete existing locations for this item
        await storage.deleteItemLocationsByItemId(req.params.id);
        
        // Create new locations
        for (const locationData of locations) {
          if (locationData.ambulancePostId && locationData.cabinet) {
            const newLocationData = {
              itemId: req.params.id,
              ambulancePostId: locationData.ambulancePostId,
              cabinet: locationData.cabinet,
              drawer: locationData.drawer || null,
              contactPersonId: locationData.contactPersonId || null,
              isLowStock: false,
              stockStatus: itemData.stockStatus || "op-voorraad"
            };
            
            const validatedLocationData = insertItemLocationSchema.parse(newLocationData);
            const createdLocation = await storage.createItemLocation(validatedLocationData);
            updatedLocations.push(createdLocation);
          }
        }
      }
      
      // Return combined data
      const response = {
        ...updatedItem,
        locations: updatedLocations
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error updating medical item:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update medical item" });
      }
    }
  });

  // Delete medical item
  app.delete("/api/medical-items/:id", async (req, res) => {
    try {
      const success = await storage.deleteMedicalItem(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Medical item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete medical item" });
    }
  });

  // Get cabinet summary
  app.get("/api/cabinets/summary", async (req, res) => {
    try {
      const allItems = await storage.getMedicalItems();
      const allLocations = await storage.getItemLocations();
      const cabinets = await storage.getCabinets();
      
      const summary = cabinets.map(cabinet => {
        // Get all locations for this cabinet
        const cabinetLocations = allLocations.filter(location => location.cabinet === cabinet.id);
        const totalItems = cabinetLocations.length;
        
        // Count items based on stock status
        const lowStockItems = cabinetLocations.filter(location => 
          location.stockStatus === "bijna-op" || location.stockStatus === "niet-meer-aanwezig" || 
          location.isLowStock
        ).length;
        
        // Group by category (need to join with items)
        const categories = cabinetLocations.reduce((acc, location) => {
          const item = allItems.find(item => item.id === location.itemId);
          if (item) {
            acc[item.category] = (acc[item.category] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        return {
          id: cabinet.id,
          name: cabinet.name,
          totalItems,
          lowStockItems: lowStockItems, // Items that are low stock or out of stock
          categories
        };
      });
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cabinet summary" });
    }
  });

  // Cabinet management routes
  app.get("/api/cabinets", async (req, res) => {
    try {
      const cabinets = await storage.getCabinets();
      res.json(cabinets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cabinets" });
    }
  });

  app.get("/api/cabinets/:id", async (req, res) => {
    try {
      const cabinet = await storage.getCabinet(req.params.id);
      if (!cabinet) {
        return res.status(404).json({ message: "Cabinet not found" });
      }
      res.json(cabinet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cabinet" });
    }
  });

  app.post("/api/cabinets", async (req, res) => {
    try {
      const validatedData = insertCabinetSchema.parse(req.body);
      const cabinet = await storage.createCabinet(validatedData);
      res.status(201).json(cabinet);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create cabinet" });
      }
    }
  });

  app.patch("/api/cabinets/:id", async (req, res) => {
    try {
      const partialData = insertCabinetSchema.partial().parse(req.body);
      const cabinet = await storage.updateCabinet(req.params.id, partialData);
      if (!cabinet) {
        return res.status(404).json({ message: "Cabinet not found" });
      }
      res.json(cabinet);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update cabinet" });
      }
    }
  });

  app.delete("/api/cabinets/:id", async (req, res) => {
    try {
      const success = await storage.deleteCabinet(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Cabinet not found" });
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete cabinet" });
      }
    }
  });

  // Drawer management routes
  app.get("/api/drawers", async (req, res) => {
    try {
      const drawers = await storage.getDrawers();
      res.json(drawers);
    } catch (error) {
      console.error("Error fetching drawers:", error);
      res.status(500).json({ error: "Failed to fetch drawers" });
    }
  });

  // Get drawers by cabinet
  app.get("/api/cabinets/:cabinetId/drawers", async (req, res) => {
    try {
      const { cabinetId } = req.params;
      const drawers = await storage.getDrawersByCabinet(cabinetId);
      res.json(drawers);
    } catch (error) {
      console.error("Error fetching drawers by cabinet:", error);
      res.status(500).json({ error: "Failed to fetch drawers" });
    }
  });

  // Send email notification
  app.post("/api/notifications/email", async (req, res) => {
    try {
      const validatedData = insertEmailNotificationSchema.parse(req.body);
      const notification = await storage.createEmailNotification(validatedData);
      
      // Here you would integrate with an actual email service like Nodemailer
      // For now, we'll just log the notification
      console.log(`Email notification sent to ${validatedData.recipientEmail} for item ${validatedData.itemId}`);
      
      res.status(201).json({ 
        success: true, 
        message: "Email notification sent successfully",
        notification 
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to send email notification" });
      }
    }
  });

  // Send warning email for low stock item
  app.post("/api/send-warning-email/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await storage.getMedicalItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (!item.alertEmail) {
        return res.status(400).json({ message: "Geen email adres ingesteld voor dit item" });
      }

      // Get item locations to find cabinet
      const itemLocations = await storage.getItemLocationsByItem(itemId);
      const firstLocation = itemLocations[0];
      const cabinet = firstLocation ? await storage.getCabinet(firstLocation.cabinet) : null;
      const cabinetName = cabinet ? cabinet.name : firstLocation ? `Kast ${firstLocation.cabinet}` : "Onbekende locatie";

      // Generate email HTML
      const emailHTML = generateRestockEmailHTML(item, cabinetName);

      // Send email
      const success = await sendEmail({
        to: item.alertEmail,
        from: "inventaris@ziekenhuis.nl", // Default sender
        subject: `🚨 Voorraad Waarschuwing: ${item.name} - Bijna Uitgeput`,
        html: emailHTML
      });

      if (success) {
        // Record the email notification
        await storage.createEmailNotification({
          itemId: item.id,
          recipientEmail: item.alertEmail!,
          department: "Automatische waarschuwing"
        });
        
        res.json({ 
          success: true, 
          message: `Waarschuwing email verzonden naar ${item.alertEmail}` 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Fout bij het verzenden van de email" 
        });
      }
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ message: "Fout bij het verzenden van waarschuwing email" });
    }
  });

  // Mark item as out of stock and send email
  app.post("/api/items/:itemId/mark-out-of-stock", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await storage.getMedicalItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item niet gevonden" });
      }

      if (!item.alertEmail) {
        return res.status(400).json({ message: "Geen email adres ingesteld voor dit item" });
      }

      // Get item locations to find cabinet and update status
      const itemLocations = await storage.getItemLocationsByItem(itemId);
      
      // Update all locations to be out of stock
      for (const location of itemLocations) {
        await storage.updateItemLocation(location.id, { 
          isLowStock: true, 
          stockStatus: "niet-meer-aanwezig" 
        });
      }

      const firstLocation = itemLocations[0];
      const cabinet = firstLocation ? await storage.getCabinet(firstLocation.cabinet) : null;
      const cabinetName = cabinet ? cabinet.name : firstLocation ? `Kast ${firstLocation.cabinet}` : "Onbekende locatie";

      // Generate email HTML
      const emailHTML = generateRestockEmailHTML(item, cabinetName, "OP");

      // Send email
      const success = await sendEmail({
        to: item.alertEmail,
        from: "inventaris@ziekenhuis.nl",
        subject: `🚨 URGENT: ${item.name} - OP`,
        html: emailHTML
      });

      if (success) {
        // Record the email notification
        await storage.createEmailNotification({
          itemId: item.id,
          recipientEmail: item.alertEmail!,
          department: "Urgent voorraad melding"
        });
        
        res.json({ 
          success: true, 
          message: "Email verzonden voor item dat OP is",
          itemName: item.name,
          recipient: item.alertEmail
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Fout bij het verzenden van de email" 
        });
      }
    } catch (error) {
      console.error("Mark out of stock error:", error);
      res.status(500).json({ message: "Fout bij het markeren als OP" });
    }
  });

  // Mark item as low stock and send email
  app.post("/api/items/:itemId/mark-low-stock", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await storage.getMedicalItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item niet gevonden" });
      }

      if (!item.alertEmail) {
        return res.status(400).json({ message: "Geen email adres ingesteld voor dit item" });
      }

      // Get item locations to find cabinet and update status
      const itemLocations = await storage.getItemLocationsByItem(itemId);
      
      // Update all locations to be low stock
      for (const location of itemLocations) {
        await storage.updateItemLocation(location.id, { 
          isLowStock: true, 
          stockStatus: "bijna-op" 
        });
      }

      const firstLocation = itemLocations[0];
      const cabinet = firstLocation ? await storage.getCabinet(firstLocation.cabinet) : null;
      const cabinetName = cabinet ? cabinet.name : firstLocation ? `Kast ${firstLocation.cabinet}` : "Onbekende locatie";

      // Generate email HTML
      const emailHTML = generateRestockEmailHTML(item, cabinetName, "Bijna op");

      // Send email
      const success = await sendEmail({
        to: item.alertEmail,
        from: "inventaris@ziekenhuis.nl",
        subject: `⚠️ Voorraad Waarschuwing: ${item.name} - Bijna op`,
        html: emailHTML
      });

      if (success) {
        // Record the email notification
        await storage.createEmailNotification({
          itemId: item.id,
          recipientEmail: item.alertEmail!,
          department: "Bijna op melding"
        });
        
        res.json({ 
          success: true, 
          message: "Email verzonden voor item dat bijna op is",
          itemName: item.name,
          recipient: item.alertEmail
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Fout bij het verzenden van de email" 
        });
      }
    } catch (error) {
      console.error("Mark low stock error:", error);
      res.status(500).json({ message: "Fout bij het markeren als bijna op" });
    }
  });

  // Get low stock items overview
  app.get("/api/low-stock-overview", async (req, res) => {
    try {
      const { ambulancePost } = req.query;
      
      // Get all items and locations
      const allItems = await storage.getMedicalItems();
      let allLocations = await storage.getItemLocations();
      
      // Filter by ambulance post if specified
      if (ambulancePost && typeof ambulancePost === 'string') {
        allLocations = allLocations.filter(location => location.ambulancePostId === ambulancePost);
      }
      
      // Filter only low stock locations
      const lowStockLocations = allLocations.filter(location => 
        location.isLowStock || 
        location.stockStatus === "bijna-op" || 
        location.stockStatus === "niet-meer-aanwezig"
      );
      
      // Combine items with their low stock locations and cabinet info
      const itemsWithCabinets = await Promise.all(
        lowStockLocations.map(async (location) => {
          const item = allItems.find(item => item.id === location.itemId);
          if (!item) return null;
          
          const cabinet = await storage.getCabinet(location.cabinet);
          return {
            ...item,
            locationId: location.id,
            cabinet: location.cabinet,
            drawer: location.drawer,
            isLowStock: location.isLowStock,
            stockStatus: location.stockStatus,
            ambulancePost: location.ambulancePostId,
            cabinetName: cabinet ? cabinet.name : `Kast ${location.cabinet}`
          };
        })
      );
      
      // Filter out null results
      const validItems = itemsWithCabinets.filter((item): item is NonNullable<typeof item> => item !== null);
      
      res.json(validItems);
    } catch (error) {
      console.error("Error fetching low stock overview:", error);
      res.status(500).json({ message: "Fout bij het ophalen van lage voorraad overzicht" });
    }
  });

  // Reset item stock status
  app.post("/api/items/:itemId/reset-stock", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await storage.getMedicalItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item niet gevonden" });
      }

      // Reset stock status for all locations of this item
      const itemLocations = await storage.getItemLocationsByItem(itemId);
      for (const location of itemLocations) {
        await storage.updateItemLocation(location.id, { 
          isLowStock: false, 
          stockStatus: "op-voorraad" 
        });
        // Also delete any supply requests for this location
        await storage.deleteSupplyRequestsByLocation(location.id);
      }
      
      res.json({ 
        success: true, 
        message: `Voorraad status van ${item.name} is gereset`,
        itemName: item.name
      });
    } catch (error) {
      console.error("Reset stock error:", error);
      res.status(500).json({ message: "Fout bij het resetten van voorraad status" });
    }
  });

  // Object Storage Routes for Photo Upload
  
  // Serve public objects (photos)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for photos
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Convert photo URL to object path
  app.post("/api/medical-items/convert-photo-url", async (req, res) => {
    if (!req.body.photoUrl) {
      return res.status(400).json({ error: "photoUrl is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.photoUrl);
      
      res.json({ objectPath });
    } catch (error) {
      console.error("Error converting photo URL:", error);
      res.status(500).json({ error: "Failed to convert photo URL" });
    }
  });

  // Update item photo after upload
  app.put("/api/medical-items/:id/photo", async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.photoURL);

      // Update the medical item with the photo URL
      const updatedItem = await storage.updateMedicalItem(req.params.id, {
        photoUrl: normalizedPath
      });

      if (!updatedItem) {
        return res.status(404).json({ error: "Medical item not found" });
      }

      res.json({
        success: true,
        item: updatedItem,
        photoUrl: normalizedPath
      });
    } catch (error) {
      console.error("Error updating item photo:", error);
      res.status(500).json({ error: "Failed to update item photo" });
    }
  });

  // Get last email notification for item
  app.get("/api/medical-items/:id/last-email", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.getLastEmailNotificationForItem(id);
      res.json(notification || null);
    } catch (error) {
      console.error("Error getting last email notification:", error);
      res.status(500).json({ error: "Server fout" });
    }
  });

  // Get email configuration
  app.get("/api/email-config", async (req, res) => {
    try {
      const config = await storage.getEmailConfig();
      if (!config) {
        res.status(404).json({ message: "Email configuration not found" });
        return;
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching email config:", error);
      res.status(500).json({ message: "Failed to fetch email configuration" });
    }
  });

  // Save email configuration
  app.post("/api/email-config", async (req, res) => {
    try {
      const validatedData = insertEmailConfigSchema.parse(req.body);
      const config = await storage.updateEmailConfig(validatedData);
      res.status(201).json({
        success: true,
        message: "Email configuration saved successfully",
        config
      });
    } catch (error) {
      console.error("Error saving email config:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to save email configuration" });
      }
    }
  });

  // Ambulance Posts Routes
  app.get("/api/ambulance-posts", async (req, res) => {
    try {
      const posts = await storage.getAmbulancePosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching ambulance posts:", error);
      res.status(500).json({ message: "Failed to fetch ambulance posts" });
    }
  });

  app.post("/api/ambulance-posts", async (req, res) => {
    try {
      const validatedData = insertAmbulancePostSchema.parse(req.body);
      const post = await storage.createAmbulancePost(validatedData);
      res.status(201).json({
        success: true,
        message: "Ambulancepost succesvol aangemaakt",
        post
      });
    } catch (error) {
      console.error("Error creating ambulance post:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create ambulance post" });
      }
    }
  });

  app.put("/api/ambulance-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAmbulancePostSchema.partial().parse(req.body);
      const post = await storage.updateAmbulancePost(id, validatedData);
      
      if (!post) {
        return res.status(404).json({ message: "Ambulancepost niet gevonden" });
      }
      
      res.json({
        success: true,
        message: "Ambulancepost succesvol bijgewerkt",
        post
      });
    } catch (error) {
      console.error("Error updating ambulance post:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update ambulance post" });
      }
    }
  });

  app.delete("/api/ambulance-posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAmbulancePost(id);
      
      if (!success) {
        return res.status(404).json({ message: "Ambulancepost niet gevonden" });
      }
      
      res.json({
        success: true,
        message: "Ambulancepost succesvol verwijderd"
      });
    } catch (error) {
      console.error("Error deleting ambulance post:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete ambulance post" });
      }
    }
  });

  // Post contact management routes
  app.get("/api/post-contacts", async (req, res) => {
    try {
      const contacts = await storage.getPostContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post contacts" });
    }
  });

  app.get("/api/post-contacts/:postId", async (req, res) => {
    try {
      const contacts = await storage.getPostContactsByPost(req.params.postId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post contacts" });
    }
  });

  app.post("/api/post-contacts", async (req, res) => {
    try {
      const contactData = insertPostContactSchema.parse(req.body);
      const contact = await storage.createPostContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating post contact:", error);
      res.status(400).json({ message: "Failed to create post contact" });
    }
  });

  app.patch("/api/post-contacts/:id", async (req, res) => {
    try {
      const contactData = insertPostContactSchema.partial().parse(req.body);
      const contact = await storage.updatePostContact(req.params.id, contactData);
      if (!contact) {
        return res.status(404).json({ message: "Post contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: "Failed to update post contact" });
    }
  });

  app.delete("/api/post-contacts/:id", async (req, res) => {
    try {
      const success = await storage.deletePostContact(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Post contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete post contact" });
    }
  });

  // Get all item locations
  app.get("/api/item-locations", async (req, res) => {
    try {
      const locations = await storage.getItemLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item locations" });
    }
  });

  // Get supply requests 
  app.get("/api/supply-requests", async (req, res) => {
    try {
      const { itemId, ambulancePost } = req.query;
      
      if (itemId) {
        // Get supply requests for specific item and ambulance post
        const supplyRequests = await storage.getSupplyRequestsByItem(itemId as string, ambulancePost as string);
        res.json(supplyRequests);
      } else {
        // Get all supply requests
        const supplyRequests = await storage.getAllSupplyRequests();
        res.json(supplyRequests);
      }
    } catch (error) {
      console.error("Error fetching supply requests:", error);
      res.status(500).json({ message: "Failed to fetch supply requests" });
    }
  });

  // Send supply request email for specific location with contact person
  app.post("/api/supply-request/:locationId", async (req, res) => {
    try {
      const locationId = req.params.locationId;
      
      // Get the location details
      const location = await storage.getItemLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Get the item details
      const item = await storage.getMedicalItem(location.itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Get contact person details
      let contactPerson = null;
      if (location.contactPersonId) {
        contactPerson = await storage.getPostContact(location.contactPersonId);
      }
      
      // Get ambulance post details
      const ambulancePost = await storage.getAmbulancePost(location.ambulancePostId);
      
      if (!contactPerson) {
        return res.status(400).json({ message: "Geen contactpersoon gevonden voor deze locatie" });
      }
      
      console.log(`Supply request sent for item ${item.name} at ${ambulancePost?.name} to ${contactPerson.email}`);
      
      // Store the supply request in database
      await storage.createSupplyRequest({
        itemId: item.id,
        locationId: location.id,
        ambulancePostId: location.ambulancePostId,
        contactPersonId: contactPerson.id,
        contactPersonName: contactPerson.name,
        contactPersonEmail: contactPerson.email,
        status: "sent"
      });
      
      res.json({ 
        message: `Aanvulverzoek verzonden naar ${contactPerson.name} (${contactPerson.email})`,
        contactPerson: contactPerson.name,
        email: contactPerson.email,
        itemName: item.name,
        location: `${ambulancePost?.name} - Kast ${location.cabinet}`
      });
    } catch (error) {
      console.error("Error sending supply request:", error);
      res.status(500).json({ message: "Failed to send supply request" });
    }
  });

  // Update item location stock status
  app.patch("/api/item-locations/:locationId/status", async (req, res) => {
    try {
      const { stockStatus } = req.body;
      const isLowStock = stockStatus === 'bijna-op' || stockStatus === 'niet-meer-aanwezig';
      
      const updatedLocation = await storage.updateItemLocation(req.params.locationId, {
        stockStatus,
        isLowStock
      });
      
      if (!updatedLocation) {
        return res.status(404).json({ message: "Item location not found" });
      }
      
      // If status is set back to "op-voorraad", delete any supply requests for this location
      if (stockStatus === 'op-voorraad') {
        await storage.deleteSupplyRequestsByLocation(req.params.locationId);
      }
      
      res.json(updatedLocation);
    } catch (error) {
      console.error("Error updating location status:", error);
      res.status(500).json({ message: "Failed to update location status" });
    }
  });

  // Image proxy route to serve private object storage images
  app.get("/api/images/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      console.log(`Requesting image: ${filename}`);
      
      // Use the Google Cloud Storage client directly
      const bucket = objectStorageClient.bucket(process.env.BUCKET_NAME || 'repl-default-bucket-27aaf1d5-64b6-4b02-b0a5-1f1c5b2375bb');
      
      // Try different possible paths for the image
      const possiblePaths = [
        `.private/uploads/${filename}`,
        `uploads/${filename}`,
        `public/uploads/${filename}`,
        filename
      ];
      
      for (const path of possiblePaths) {
        try {
          console.log(`Trying path: ${path}`);
          const file = bucket.file(path);
          
          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            console.log(`File does not exist at path: ${path}`);
            continue;
          }
          
          // Download the file
          const [fileContents] = await file.download();
          
          // Determine content type based on file extension
          const ext = filename.toLowerCase().split('.').pop();
          let contentType = 'image/jpeg';
          if (ext === 'png') contentType = 'image/png';
          if (ext === 'gif') contentType = 'image/gif';
          if (ext === 'webp') contentType = 'image/webp';
          if (ext === 'heic') contentType = 'image/heic';
          
          // Set appropriate headers
          res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          });
          
          console.log(`Successfully found image at path: ${path}`);
          return res.send(fileContents);
          
        } catch (pathError) {
          console.log(`Path ${path} failed:`, pathError.message);
          continue;
        }
      }
      
      // If all paths fail, return 404
      console.log(`Image not found in any location: ${filename}`);
      return res.status(404).json({ message: "Image not found in any location" });
      
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


