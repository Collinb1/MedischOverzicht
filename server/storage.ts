import { type User, type InsertUser, type MedicalItem, type InsertMedicalItem, type EmailNotification, type InsertEmailNotification, type Cabinet, type InsertCabinet } from "@shared/schema";
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
  
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  getEmailNotifications(): Promise<EmailNotification[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private medicalItems: Map<string, MedicalItem>;
  private emailNotifications: Map<string, EmailNotification>;
  private cabinets: Map<string, Cabinet>;

  constructor() {
    this.users = new Map();
    this.medicalItems = new Map();
    this.emailNotifications = new Map();
    this.cabinets = new Map();
    
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
    const sampleItems: InsertMedicalItem[] = [
      {
        name: "Insuline Spuiten 1ml",
        description: "Steriel, eenmalig gebruik",
        category: "Spuiten",
        cabinet: "A",
        isLowStock: false,
        expiryDate: "2024-12-15"
      },
      {
        name: "Paracetamol 500mg",
        description: "Pijnstillende tabletten",
        category: "Medicijnen",
        cabinet: "B",
        isLowStock: false,
        expiryDate: "2025-03-20"
      },
      {
        name: "Chirurgisch Scalpel #10",
        description: "Steriel, wegwerpbaar",
        category: "Instrumenten",
        cabinet: "C",
        isLowStock: true,
        expiryDate: "2024-08-30"
      },
      {
        name: "Digitale Thermometer",
        description: "Snelle, nauwkeurige metingen",
        category: "Monitoring",
        cabinet: "D",
        isLowStock: false,
        expiryDate: null
      },
      {
        name: "N95 Gezichtsmaskers",
        description: "Hoge filtratie-efficiëntie",
        category: "PBM",
        cabinet: "E",
        isLowStock: false,
        expiryDate: "2025-01-15"
      },
      {
        name: "Steriele Handschoenen",
        description: "Latex-vrij, poedervrij",
        category: "PBM",
        cabinet: "A",
        isLowStock: true,
        expiryDate: "2024-11-30"
      },
      {
        name: "Verbandgaas 10x10cm",
        description: "Steriel verbandmateriaal",
        category: "Verbandmiddelen",
        cabinet: "A",
        isLowStock: true,
        expiryDate: "2025-06-15"
      },
      {
        name: "Bloeddrukmeters",
        description: "Automatische digitale meter",
        category: "Monitoring",
        cabinet: "D",
        isLowStock: false,
        expiryDate: null
      }
    ];

    sampleItems.forEach(item => {
      const id = randomUUID();
      const medicalItem: MedicalItem = { 
        ...item, 
        id,
        description: item.description || null,
        expiryDate: item.expiryDate || null
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
}

export const storage = new MemStorage();
