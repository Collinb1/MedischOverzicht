import { medicalItems, type MedicalItem, type InsertMedicalItem, type EmailNotification, type InsertEmailNotification, type Cabinet, type InsertCabinet, cabinets, drawers, type Drawer, type InsertDrawer, emailNotifications, users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getMedicalItems(): Promise<MedicalItem[]>;
  getMedicalItem(id: string): Promise<MedicalItem | undefined>;
  getMedicalItemsByCabinet(cabinet: string): Promise<MedicalItem[]>;
  createMedicalItem(item: InsertMedicalItem): Promise<MedicalItem>;
  updateMedicalItem(id: string, item: Partial<InsertMedicalItem>): Promise<MedicalItem | undefined>;
  deleteMedicalItem(id: string): Promise<boolean>;
  
  getCabinets(): Promise<Cabinet[]>;
  getCabinet(id: string): Promise<Cabinet | undefined>;
  createCabinet(cabinet: InsertCabinet): Promise<Cabinet>;
  updateCabinet(id: string, cabinet: Partial<InsertCabinet>): Promise<Cabinet | undefined>;
  deleteCabinet(id: string): Promise<boolean>;
  
  getDrawers(): Promise<Drawer[]>;
  getDrawer(id: string): Promise<Drawer | undefined>;
  getDrawersByCabinet(cabinetId: string): Promise<Drawer[]>;
  createDrawer(insertDrawer: InsertDrawer): Promise<Drawer>;
  updateDrawer(id: string, updates: Partial<InsertDrawer>): Promise<Drawer | undefined>;
  deleteDrawer(id: string): Promise<boolean>;
  
  createEmailNotification(insertEmailNotification: InsertEmailNotification): Promise<EmailNotification>;
  getEmailNotifications(): Promise<EmailNotification[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private medicalItems: Map<string, MedicalItem>;
  private emailNotifications: Map<string, EmailNotification>;
  private cabinets: Map<string, Cabinet>;
  private drawers: Map<string, Drawer>;

  constructor() {
    this.users = new Map();
    this.medicalItems = new Map();
    this.emailNotifications = new Map();
    this.cabinets = new Map();
    this.drawers = new Map();
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize default cabinets
    const defaultCabinets: Cabinet[] = [
      {
        id: "A",
        name: "Spoedhulp Voorraad",
        description: "Eerste hulp en spoedvoorraad",
        location: "Gang 1 - Links"
      },
      {
        id: "B", 
        name: "Medicijnen",
        description: "Algemene medicatie en pillen",
        location: "Gang 1 - Midden"
      },
      {
        id: "C",
        name: "Chirurgische Instrumenten", 
        description: "Operatie instrumenten en steriele materialen",
        location: "Gang 1 - Rechts"
      },
      {
        id: "D",
        name: "Monitoring Apparatuur",
        description: "Meet- en monitoringapparatuur", 
        location: "Gang 2 - Links"
      },
      {
        id: "E",
        name: "Persoonlijke Beschermingsmiddelen",
        description: "PBM en hygiënematerialen",
        location: "Gang 2 - Rechts"
      }
    ];

    defaultCabinets.forEach(cabinet => {
      this.cabinets.set(cabinet.id, cabinet);
    });

    // Initialize default drawers for each cabinet
    const defaultDrawers: Drawer[] = [
      // Kast A - Spoedhulp Voorraad
      { id: "A-1", cabinetId: "A", name: "Lade 1", position: "boven", drawerNumber: 1, description: "Spuiten en naalden" },
      { id: "A-2", cabinetId: "A", name: "Lade 2", position: "midden", drawerNumber: 2, description: "Verbandmiddelen" },
      { id: "A-3", cabinetId: "A", name: "Lade 3", position: "onder", drawerNumber: 3, description: "Handschoenen en maskers" },
      
      // Kast B - Medicijnen  
      { id: "B-1", cabinetId: "B", name: "Lade 1", position: "boven", drawerNumber: 1, description: "Pijnstillers" },
      { id: "B-2", cabinetId: "B", name: "Lade 2", position: "links", drawerNumber: 2, description: "Antibiotica" },
      { id: "B-3", cabinetId: "B", name: "Lade 3", position: "rechts", drawerNumber: 3, description: "Hartkwalen medicatie" },
      { id: "B-4", cabinetId: "B", name: "Lade 4", position: "onder", drawerNumber: 4, description: "Diabetes medicatie" },
      
      // Kast C - Chirurgische Instrumenten
      { id: "C-1", cabinetId: "C", name: "Lade 1", position: "boven", drawerNumber: 1, description: "Scalpels en messen" },
      { id: "C-2", cabinetId: "C", name: "Lade 2", position: "midden", drawerNumber: 2, description: "Pincetten en scharen" },
      { id: "C-3", cabinetId: "C", name: "Lade 3", position: "onder", drawerNumber: 3, description: "Hechtmateriaal" },
      
      // Kast D - Monitoring Apparatuur  
      { id: "D-1", cabinetId: "D", name: "Lade 1", position: "boven", drawerNumber: 1, description: "Thermometers" },
      { id: "D-2", cabinetId: "D", name: "Lade 2", position: "onder", drawerNumber: 2, description: "Bloeddrukmeters" },
      
      // Kast E - PBM
      { id: "E-1", cabinetId: "E", name: "Lade 1", position: "boven", drawerNumber: 1, description: "Gezichtsmaskers" },
      { id: "E-2", cabinetId: "E", name: "Lade 2", position: "midden", drawerNumber: 2, description: "Beschermende kleding" },
      { id: "E-3", cabinetId: "E", name: "Lade 3", position: "onder", drawerNumber: 3, description: "Desinfectantia" },
    ];

    defaultDrawers.forEach(drawer => {
      this.drawers.set(drawer.id, drawer);
    });
    const sampleItems: InsertMedicalItem[] = [
      // Post Hilversum items
      {
        name: "Insuline Spuiten 1ml",
        description: "Steriel, eenmalig gebruik",
        category: "Spuiten",
        cabinet: "A",
        drawerId: "A-1",
        ambulancePost: "hilversum",
        isLowStock: false,
        expiryDate: "2024-12-15",
        alertEmail: "spoedhulp@ziekenhuis.nl"
      },
      {
        name: "Paracetamol 500mg",
        description: "Pijnstillende tabletten",
        category: "Medicijnen",
        cabinet: "B",
        drawerId: "B-1",
        ambulancePost: "hilversum",
        isLowStock: false,
        expiryDate: "2025-03-20",
        alertEmail: "apotheek@ziekenhuis.nl"
      },
      {
        name: "Chirurgisch Scalpel #10",
        description: "Steriel, wegwerpbaar",
        category: "Instrumenten",
        cabinet: "C",
        drawerId: "C-1",
        ambulancePost: "hilversum",
        isLowStock: true,
        expiryDate: "2024-08-30",
        alertEmail: "chirurgie@ziekenhuis.nl"
      },
      {
        name: "Digitale Thermometer",
        description: "Snelle, nauwkeurige metingen",
        category: "Monitoring",
        cabinet: "D",
        drawerId: "D-1",
        ambulancePost: "hilversum",
        isLowStock: false,
        expiryDate: null,
        alertEmail: "monitoring@ziekenhuis.nl"
      },
      // Post Blaricum items
      {
        name: "N95 Gezichtsmaskers",
        description: "Hoge filtratie-efficiëntie",
        category: "PBM",
        cabinet: "E",
        drawerId: "E-1",
        ambulancePost: "blaricum",
        isLowStock: false,
        expiryDate: "2025-01-15",
        alertEmail: "preventie@ziekenhuis.nl"
      },
      {
        name: "Steriele Handschoenen",
        description: "Latex-vrij, poedervrij",
        category: "PBM",
        cabinet: "A",
        drawerId: "A-3",
        ambulancePost: "blaricum",
        isLowStock: true,
        expiryDate: "2024-11-30",
        alertEmail: "spoedhulp@ziekenhuis.nl"
      },
      {
        name: "Verbandgaas 10x10cm",
        description: "Steriel verbandmateriaal",
        category: "Verbandmiddelen",
        cabinet: "A",
        drawerId: "A-2",
        ambulancePost: "blaricum",
        isLowStock: true,
        expiryDate: "2025-06-15",
        alertEmail: "verpleging@ziekenhuis.nl"
      },
      {
        name: "Bloeddrukmeters",
        description: "Automatische digitale meter",
        category: "Monitoring",
        cabinet: "D",
        drawerId: "D-2",
        ambulancePost: "blaricum",
        isLowStock: false,
        expiryDate: null,
        alertEmail: "monitoring@ziekenhuis.nl"
      }
    ];

    sampleItems.forEach(item => {
      const id = randomUUID();
      const medicalItem: MedicalItem = { 
        ...item, 
        id,
        description: item.description || null,
        expiryDate: item.expiryDate || null,
        ambulancePost: (item as any).ambulancePost || "hilversum",
        alertEmail: (item as any).alertEmail || null,
        photoUrl: null,
        isLowStock: (item as any).isLowStock || false
      };
      this.medicalItems.set(id, medicalItem);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMedicalItems(): Promise<MedicalItem[]> {
    return Array.from(this.medicalItems.values());
  }

  async getMedicalItem(id: string): Promise<MedicalItem | undefined> {
    return this.medicalItems.get(id);
  }

  async getMedicalItemsByCabinet(cabinet: string): Promise<MedicalItem[]> {
    return Array.from(this.medicalItems.values()).filter(
      item => item.cabinet === cabinet
    );
  }

  async createMedicalItem(insertItem: InsertMedicalItem): Promise<MedicalItem> {
    const id = randomUUID();
    const item: MedicalItem = { 
      ...insertItem, 
      id,
      description: insertItem.description || null,
      ambulancePost: insertItem.ambulancePost || "hilversum",
      alertEmail: insertItem.alertEmail || null,
      photoUrl: insertItem.photoUrl || null,
      isLowStock: insertItem.isLowStock || false,
      expiryDate: insertItem.expiryDate || null
    };
    this.medicalItems.set(id, item);
    return item;
  }

  async updateMedicalItem(id: string, updateData: Partial<InsertMedicalItem>): Promise<MedicalItem | undefined> {
    const existingItem = this.medicalItems.get(id);
    if (!existingItem) {
      return undefined;
    }
    
    const updatedItem: MedicalItem = { 
      ...existingItem, 
      ...updateData,
      description: updateData.description !== undefined ? updateData.description || null : existingItem.description
    };
    this.medicalItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMedicalItem(id: string): Promise<boolean> {
    return this.medicalItems.delete(id);
  }

  async createEmailNotification(insertNotification: InsertEmailNotification): Promise<EmailNotification> {
    const id = randomUUID();
    const notification: EmailNotification = { 
      ...insertNotification, 
      id,
      sentAt: new Date().toISOString().split('T')[0]
    };
    this.emailNotifications.set(id, notification);
    return notification;
  }

  async getEmailNotifications(): Promise<EmailNotification[]> {
    return Array.from(this.emailNotifications.values());
  }

  async getCabinets(): Promise<Cabinet[]> {
    return Array.from(this.cabinets.values());
  }

  async getCabinet(id: string): Promise<Cabinet | undefined> {
    return this.cabinets.get(id);
  }

  async createCabinet(insertCabinet: InsertCabinet): Promise<Cabinet> {
    const cabinet: Cabinet = {
      ...insertCabinet,
      description: insertCabinet.description || null,
      location: insertCabinet.location || null
    };
    this.cabinets.set(cabinet.id, cabinet);
    return cabinet;
  }

  async updateCabinet(id: string, updateData: Partial<InsertCabinet>): Promise<Cabinet | undefined> {
    const existingCabinet = this.cabinets.get(id);
    if (!existingCabinet) {
      return undefined;
    }
    
    const updatedCabinet: Cabinet = { 
      ...existingCabinet, 
      ...updateData,
      description: updateData.description !== undefined ? updateData.description || null : existingCabinet.description,
      location: updateData.location !== undefined ? updateData.location || null : existingCabinet.location
    };
    this.cabinets.set(id, updatedCabinet);
    return updatedCabinet;
  }

  async deleteCabinet(id: string): Promise<boolean> {
    // Check if any items are in this cabinet before deleting
    const itemsInCabinet = Array.from(this.medicalItems.values()).filter(item => item.cabinet === id);
    if (itemsInCabinet.length > 0) {
      throw new Error("Cannot delete cabinet with items in it");
    }
    return this.cabinets.delete(id);
  }

  async getDrawers(): Promise<Drawer[]> {
    return Array.from(this.drawers.values());
  }

  async getDrawer(id: string): Promise<Drawer | undefined> {
    return this.drawers.get(id);
  }

  async getDrawersByCabinet(cabinetId: string): Promise<Drawer[]> {
    return Array.from(this.drawers.values()).filter(drawer => drawer.cabinetId === cabinetId);
  }

  async createDrawer(insertDrawer: InsertDrawer): Promise<Drawer> {
    const id = randomUUID();
    const drawer: Drawer = { ...insertDrawer, id };
    this.drawers.set(id, drawer);
    return drawer;
  }

  async updateDrawer(id: string, updates: Partial<InsertDrawer>): Promise<Drawer | undefined> {
    const existing = this.drawers.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Drawer = { ...existing, ...updates };
    this.drawers.set(id, updated);
    return updated;
  }

  async deleteDrawer(id: string): Promise<boolean> {
    return this.drawers.delete(id);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMedicalItems(): Promise<MedicalItem[]> {
    return await db.select().from(medicalItems);
  }

  async getMedicalItem(id: string): Promise<MedicalItem | undefined> {
    const [item] = await db.select().from(medicalItems).where(eq(medicalItems.id, id));
    return item || undefined;
  }

  async getMedicalItemsByCabinet(cabinet: string): Promise<MedicalItem[]> {
    return await db.select().from(medicalItems).where(eq(medicalItems.cabinet, cabinet));
  }

  async createMedicalItem(insertItem: InsertMedicalItem): Promise<MedicalItem> {
    const [item] = await db.insert(medicalItems).values(insertItem).returning();
    return item;
  }

  async updateMedicalItem(id: string, updateData: Partial<InsertMedicalItem>): Promise<MedicalItem | undefined> {
    const [item] = await db
      .update(medicalItems)
      .set(updateData)
      .where(eq(medicalItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteMedicalItem(id: string): Promise<boolean> {
    const result = await db.delete(medicalItems).where(eq(medicalItems.id, id));
    return result.rowCount > 0;
  }

  async getCabinets(): Promise<Cabinet[]> {
    return await db.select().from(cabinets);
  }

  async getCabinet(id: string): Promise<Cabinet | undefined> {
    const [cabinet] = await db.select().from(cabinets).where(eq(cabinets.id, id));
    return cabinet || undefined;
  }

  async createCabinet(insertCabinet: InsertCabinet): Promise<Cabinet> {
    const [cabinet] = await db.insert(cabinets).values(insertCabinet).returning();
    return cabinet;
  }

  async updateCabinet(id: string, updateData: Partial<InsertCabinet>): Promise<Cabinet | undefined> {
    const [cabinet] = await db
      .update(cabinets)
      .set(updateData)
      .where(eq(cabinets.id, id))
      .returning();
    return cabinet || undefined;
  }

  async deleteCabinet(id: string): Promise<boolean> {
    // Check if any items are in this cabinet before deleting
    const itemsInCabinet = await this.getMedicalItemsByCabinet(id);
    if (itemsInCabinet.length > 0) {
      throw new Error("Cannot delete cabinet with items in it");
    }
    const result = await db.delete(cabinets).where(eq(cabinets.id, id));
    return result.rowCount > 0;
  }

  async createEmailNotification(insertNotification: InsertEmailNotification): Promise<EmailNotification> {
    const [notification] = await db.insert(emailNotifications).values(insertNotification).returning();
    return notification;
  }

  async getEmailNotifications(): Promise<EmailNotification[]> {
    return await db.select().from(emailNotifications);
  }

  // Drawer operations for database storage
  async getDrawers(): Promise<Drawer[]> {
    return await db.select().from(drawers);
  }

  async getDrawer(id: string): Promise<Drawer | undefined> {
    const [drawer] = await db.select().from(drawers).where(eq(drawers.id, id));
    return drawer || undefined;
  }

  async getDrawersByCabinet(cabinetId: string): Promise<Drawer[]> {
    return await db.select().from(drawers).where(eq(drawers.cabinetId, cabinetId));
  }

  async createDrawer(insertDrawer: InsertDrawer): Promise<Drawer> {
    const [drawer] = await db.insert(drawers).values(insertDrawer).returning();
    return drawer;
  }

  async updateDrawer(id: string, updates: Partial<InsertDrawer>): Promise<Drawer | undefined> {
    const [drawer] = await db
      .update(drawers)
      .set(updates)
      .where(eq(drawers.id, id))
      .returning();
    return drawer || undefined;
  }

  async deleteDrawer(id: string): Promise<boolean> {
    const result = await db.delete(drawers).where(eq(drawers.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
