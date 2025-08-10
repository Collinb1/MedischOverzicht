import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMedicalItemSchema, insertEmailNotificationSchema, insertCabinetSchema } from "@shared/schema";
import { sendEmail, generateRestockEmailHTML } from "./email";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all medical items
  app.get("/api/medical-items", async (req, res) => {
    try {
      const { cabinet, category, search, ambulancePost } = req.query;
      let items = await storage.getMedicalItems();
      
      // Filter by ambulance post (most important filter)
      if (ambulancePost && typeof ambulancePost === 'string') {
        items = items.filter(item => item.ambulancePost === ambulancePost);
      }
      
      // Filter by cabinet if specified
      if (cabinet && typeof cabinet === 'string') {
        items = items.filter(item => item.cabinet === cabinet);
      }
      
      // Filter by category if specified
      if (category && typeof category === 'string') {
        items = items.filter(item => item.category.toLowerCase() === category.toLowerCase());
      }
      
      // Search filter
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        items = items.filter(item => 
          item.name.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(items);
    } catch (error) {
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

  // Create medical item
  app.post("/api/medical-items", async (req, res) => {
    try {
      const validatedData = insertMedicalItemSchema.parse(req.body);
      const item = await storage.createMedicalItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create medical item" });
      }
    }
  });

  // Update medical item
  app.patch("/api/medical-items/:id", async (req, res) => {
    try {
      console.log(`PATCH /api/medical-items/${req.params.id}`, req.body);
      const partialData = insertMedicalItemSchema.partial().parse(req.body);
      console.log("Parsed data:", partialData);
      const item = await storage.updateMedicalItem(req.params.id, partialData);
      if (!item) {
        console.log("Item not found:", req.params.id);
        return res.status(404).json({ message: "Medical item not found" });
      }
      console.log("Updated item:", item);
      res.json(item);
    } catch (error) {
      console.error("Update error:", error);
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
      const cabinets = await storage.getCabinets();
      
      const summary = cabinets.map(cabinet => {
        const cabinetItems = allItems.filter(item => item.cabinet === cabinet.id);
        const totalItems = cabinetItems.length;
        // Count items based on new stock status or fallback to isLowStock
        const lowStockItems = cabinetItems.filter(item => 
          item.stockStatus === "bijna-op" || item.stockStatus === "niet-meer-aanwezig" || 
          (!item.stockStatus && item.isLowStock)
        ).length;
        
        // Group by category
        const categories = cabinetItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
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

      // Get cabinet name
      const cabinet = await storage.getCabinet(item.cabinet);
      const cabinetName = cabinet ? cabinet.name : `Kast ${item.cabinet}`;

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

      // Update item status to out of stock
      await storage.updateMedicalItem(itemId, { isLowStock: true });

      // Get cabinet name
      const cabinet = await storage.getCabinet(item.cabinet);
      const cabinetName = cabinet ? cabinet.name : `Kast ${item.cabinet}`;

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

      // Update item status to low stock
      await storage.updateMedicalItem(itemId, { isLowStock: true });

      // Get cabinet name
      const cabinet = await storage.getCabinet(item.cabinet);
      const cabinetName = cabinet ? cabinet.name : `Kast ${item.cabinet}`;

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
      let items = await storage.getMedicalItems();
      
      // Filter by ambulance post
      if (ambulancePost && typeof ambulancePost === 'string') {
        items = items.filter(item => item.ambulancePost === ambulancePost);
      }
      
      // Filter only low stock items
      const lowStockItems = items.filter(item => item.isLowStock);
      
      // Get cabinet info for each item
      const itemsWithCabinets = await Promise.all(
        lowStockItems.map(async (item) => {
          const cabinet = await storage.getCabinet(item.cabinet);
          return {
            ...item,
            cabinetName: cabinet ? cabinet.name : `Kast ${item.cabinet}`
          };
        })
      );
      
      res.json(itemsWithCabinets);
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

      // Reset stock status
      await storage.updateMedicalItem(itemId, { isLowStock: false });
      
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

  const httpServer = createServer(app);
  return httpServer;
}


