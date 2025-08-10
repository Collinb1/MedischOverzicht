import { type User, type InsertUser, type MedicalItem, type InsertMedicalItem, type EmailNotification, type InsertEmailNotification } from "@shared/schema";
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
  
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  getEmailNotifications(): Promise<EmailNotification[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private medicalItems: Map<string, MedicalItem>;
  private emailNotifications: Map<string, EmailNotification>;

  constructor() {
    this.users = new Map();
    this.medicalItems = new Map();
    this.emailNotifications = new Map();
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleItems: InsertMedicalItem[] = [
      {
        name: "Insuline Spuiten 1ml",
        description: "Steriel, eenmalig gebruik",
        category: "Spuiten",
        cabinet: "A",
        quantity: 25,
        minimumStock: 10,
        expiryDate: "2024-12-15"
      },
      {
        name: "Paracetamol 500mg",
        description: "Pijnstillende tabletten",
        category: "Medicijnen",
        cabinet: "B",
        quantity: 100,
        minimumStock: 20,
        expiryDate: "2025-03-20"
      },
      {
        name: "Chirurgisch Scalpel #10",
        description: "Steriel, wegwerpbaar",
        category: "Instrumenten",
        cabinet: "C",
        quantity: 15,
        minimumStock: 20,
        expiryDate: "2024-08-30"
      },
      {
        name: "Digitale Thermometer",
        description: "Snelle, nauwkeurige metingen",
        category: "Monitoring",
        cabinet: "D",
        quantity: 8,
        minimumStock: 5,
        expiryDate: null
      },
      {
        name: "N95 Gezichtsmaskers",
        description: "Hoge filtratie-efficiëntie",
        category: "PBM",
        cabinet: "E",
        quantity: 50,
        minimumStock: 25,
        expiryDate: "2025-01-15"
      },
      {
        name: "Steriele Handschoenen",
        description: "Latex-vrij, poedervrij",
        category: "PBM",
        cabinet: "A",
        quantity: 200,
        minimumStock: 50,
        expiryDate: "2024-11-30"
      },
      {
        name: "Verbandgaas 10x10cm",
        description: "Steriel verbandmateriaal",
        category: "Verbandmiddelen",
        cabinet: "A",
        quantity: 75,
        minimumStock: 30,
        expiryDate: "2025-06-15"
      },
      {
        name: "Bloeddrukmeters",
        description: "Automatische digitale meter",
        category: "Monitoring",
        cabinet: "D",
        quantity: 3,
        minimumStock: 2,
        expiryDate: null
      }
    ];

    sampleItems.forEach(item => {
      const id = randomUUID();
      const medicalItem: MedicalItem = { 
        ...item, 
        id,
        description: item.description || null,
        quantity: item.quantity ?? 0,
        minimumStock: item.minimumStock ?? 5,
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
      quantity: insertItem.quantity ?? 0,
      minimumStock: insertItem.minimumStock ?? 5,
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
}

export const storage = new MemStorage();
