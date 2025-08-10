import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMedicalItemSchema, insertEmailNotificationSchema, insertCabinetSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all medical items
  app.get("/api/medical-items", async (req, res) => {
    try {
      const { cabinet, category, search } = req.query;
      let items = await storage.getMedicalItems();
      
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
      const partialData = insertMedicalItemSchema.partial().parse(req.body);
      const item = await storage.updateMedicalItem(req.params.id, partialData);
      if (!item) {
        return res.status(404).json({ message: "Medical item not found" });
      }
      res.json(item);
    } catch (error) {
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
        const lowStockItems = cabinetItems.filter(item => item.isLowStock).length;
        
        // Group by category
        const categories = cabinetItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          id: cabinet.id,
          name: cabinet.name,
          totalItems,
          lowStockItems: lowStockItems, // Items that are low stock
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

  const httpServer = createServer(app);
  return httpServer;
}


