import { medicalItems, type MedicalItem, type InsertMedicalItem, type EmailNotification, type InsertEmailNotification, type Cabinet, type InsertCabinet, cabinets, drawers, type Drawer, type InsertDrawer, emailNotifications, users, type User, type InsertUser, emailConfigs, type EmailConfig, type InsertEmailConfig, ambulancePosts, type AmbulancePost, type InsertAmbulancePost, itemLocations, type ItemLocation, type InsertItemLocation, postContacts, type PostContact, type InsertPostContact, supplyRequests, type SupplyRequest, type InsertSupplyRequest, postCabinetOrder, type PostCabinetOrder, type InsertPostCabinetOrder, categories, type Category, type InsertCategory, cabinetLocations, type CabinetLocation, type InsertCabinetLocation } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

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
  
  getItemLocations(): Promise<ItemLocation[]>;
  getItemLocation(id: string): Promise<ItemLocation | undefined>;
  getItemLocationsByPost(ambulancePostId: string): Promise<ItemLocation[]>;
  getItemLocationsByItem(itemId: string): Promise<ItemLocation[]>;
  createItemLocation(location: InsertItemLocation): Promise<ItemLocation>;
  updateItemLocation(id: string, location: Partial<InsertItemLocation>): Promise<ItemLocation | undefined>;
  deleteItemLocation(id: string): Promise<boolean>;
  deleteItemLocationsByItemId(itemId: string): Promise<boolean>;
  
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
  getLastEmailNotificationForItem(itemId: string): Promise<EmailNotification | undefined>;
  
  getEmailConfig(): Promise<EmailConfig | undefined>;
  createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig>;
  updateEmailConfig(config: InsertEmailConfig): Promise<EmailConfig>;
  
  getAmbulancePosts(): Promise<AmbulancePost[]>;
  getAmbulancePost(id: string): Promise<AmbulancePost | undefined>;
  createAmbulancePost(post: InsertAmbulancePost): Promise<AmbulancePost>;
  updateAmbulancePost(id: string, post: Partial<InsertAmbulancePost>): Promise<AmbulancePost | undefined>;
  deleteAmbulancePost(id: string): Promise<boolean>;
  
  getPostContacts(): Promise<PostContact[]>;
  getPostContact(id: string): Promise<PostContact | undefined>;
  getPostContactsByPost(ambulancePostId: string): Promise<PostContact[]>;
  createPostContact(contact: InsertPostContact): Promise<PostContact>;
  updatePostContact(id: string, contact: Partial<InsertPostContact>): Promise<PostContact | undefined>;
  deletePostContact(id: string): Promise<boolean>;
  
  getAllSupplyRequests(): Promise<SupplyRequest[]>;
  getSupplyRequestsByItem(itemId: string, ambulancePost?: string): Promise<SupplyRequest[]>;
  createSupplyRequest(request: InsertSupplyRequest): Promise<SupplyRequest>;
  deleteSupplyRequestsByLocation(locationId: string): Promise<boolean>;
  
  getPostCabinetOrder(ambulancePostId: string): Promise<PostCabinetOrder[]>;
  setPostCabinetOrder(ambulancePostId: string, orderedCabinetIds: string[]): Promise<PostCabinetOrder[]>;
  getCabinetsOrderedByPost(ambulancePostId: string): Promise<Cabinet[]>;
  
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  getCabinetLocations(): Promise<CabinetLocation[]>;
  getCabinetLocationsByCabinet(cabinetId: string): Promise<CabinetLocation[]>;
  getCabinetLocationsByPost(ambulancePostId: string): Promise<CabinetLocation[]>;
  createCabinetLocation(location: InsertCabinetLocation): Promise<CabinetLocation>;
  deleteCabinetLocation(id: string): Promise<boolean>;
  deleteCabinetLocationsByPost(ambulancePostId: string, cabinetId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Medical Items operations
  async getMedicalItems(): Promise<MedicalItem[]> {
    return await db.select().from(medicalItems);
  }

  async getMedicalItem(id: string): Promise<MedicalItem | undefined> {
    const [item] = await db.select().from(medicalItems).where(eq(medicalItems.id, id));
    return item;
  }

  async getMedicalItemsByCabinet(cabinet: string): Promise<MedicalItem[]> {
    // This will be handled through item locations now
    return [];
  }

  async createMedicalItem(item: InsertMedicalItem): Promise<MedicalItem> {
    const [newItem] = await db.insert(medicalItems).values(item).returning();
    return newItem;
  }

  async updateMedicalItem(id: string, item: Partial<InsertMedicalItem>): Promise<MedicalItem | undefined> {
    const [updatedItem] = await db
      .update(medicalItems)
      .set(item)
      .where(eq(medicalItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteMedicalItem(id: string): Promise<boolean> {
    const result = await db.delete(medicalItems).where(eq(medicalItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Item Location operations
  async getItemLocations(): Promise<ItemLocation[]> {
    return await db.select().from(itemLocations);
  }

  async getItemLocation(id: string): Promise<ItemLocation | undefined> {
    const [location] = await db.select().from(itemLocations).where(eq(itemLocations.id, id));
    return location || undefined;
  }

  async getItemLocationsByPost(ambulancePostId: string): Promise<ItemLocation[]> {
    return await db.select().from(itemLocations).where(eq(itemLocations.ambulancePostId, ambulancePostId));
  }

  async getItemLocationsByItem(itemId: string): Promise<ItemLocation[]> {
    return await db.select().from(itemLocations).where(eq(itemLocations.itemId, itemId));
  }

  async createItemLocation(location: InsertItemLocation): Promise<ItemLocation> {
    const [newLocation] = await db.insert(itemLocations).values(location).returning();
    return newLocation;
  }

  async updateItemLocation(id: string, location: Partial<InsertItemLocation>): Promise<ItemLocation | undefined> {
    const [updatedLocation] = await db
      .update(itemLocations)
      .set(location)
      .where(eq(itemLocations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteItemLocation(id: string): Promise<boolean> {
    const result = await db.delete(itemLocations).where(eq(itemLocations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteItemLocationsByItemId(itemId: string): Promise<boolean> {
    const result = await db.delete(itemLocations).where(eq(itemLocations.itemId, itemId));
    return (result.rowCount ?? 0) > 0;
  }

  // Cabinet operations
  async getCabinets(): Promise<Cabinet[]> {
    return await db.select().from(cabinets);
  }

  async getCabinet(id: string): Promise<Cabinet | undefined> {
    const [cabinet] = await db.select().from(cabinets).where(eq(cabinets.id, id));
    return cabinet;
  }

  async createCabinet(cabinet: InsertCabinet): Promise<Cabinet> {
    const [newCabinet] = await db.insert(cabinets).values(cabinet).returning();
    return newCabinet;
  }

  async updateCabinet(id: string, cabinet: Partial<InsertCabinet>): Promise<Cabinet | undefined> {
    const [updatedCabinet] = await db
      .update(cabinets)
      .set(cabinet)
      .where(eq(cabinets.id, id))
      .returning();
    return updatedCabinet;
  }

  async deleteCabinet(id: string): Promise<boolean> {
    const result = await db.delete(cabinets).where(eq(cabinets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Drawer operations
  async getDrawers(): Promise<Drawer[]> {
    return await db.select().from(drawers);
  }

  async getDrawer(id: string): Promise<Drawer | undefined> {
    const [drawer] = await db.select().from(drawers).where(eq(drawers.id, id));
    return drawer;
  }

  async getDrawersByCabinet(cabinetId: string): Promise<Drawer[]> {
    return await db.select().from(drawers).where(eq(drawers.cabinetId, cabinetId));
  }

  async createDrawer(insertDrawer: InsertDrawer): Promise<Drawer> {
    const [newDrawer] = await db.insert(drawers).values(insertDrawer).returning();
    return newDrawer;
  }

  async updateDrawer(id: string, updates: Partial<InsertDrawer>): Promise<Drawer | undefined> {
    const [updatedDrawer] = await db
      .update(drawers)
      .set(updates)
      .where(eq(drawers.id, id))
      .returning();
    return updatedDrawer;
  }

  async deleteDrawer(id: string): Promise<boolean> {
    const result = await db.delete(drawers).where(eq(drawers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Email notification operations
  async createEmailNotification(insertEmailNotification: InsertEmailNotification): Promise<EmailNotification> {
    const [notification] = await db.insert(emailNotifications).values(insertEmailNotification).returning();
    return notification;
  }

  async getEmailNotifications(): Promise<EmailNotification[]> {
    return await db.select().from(emailNotifications);
  }

  async getLastEmailNotificationForItem(itemId: string): Promise<EmailNotification | undefined> {
    const [notification] = await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.itemId, itemId))
      .orderBy(sql`${emailNotifications.sentAt} DESC`)
      .limit(1);
    return notification;
  }

  // Email config operations
  async getEmailConfig(): Promise<EmailConfig | undefined> {
    const [config] = await db.select().from(emailConfigs).limit(1);
    return config;
  }

  async createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig> {
    const [newConfig] = await db.insert(emailConfigs).values(config).returning();
    return newConfig;
  }

  async updateEmailConfig(config: InsertEmailConfig): Promise<EmailConfig> {
    const existingConfig = await this.getEmailConfig();
    if (existingConfig) {
      const [updatedConfig] = await db
        .update(emailConfigs)
        .set(config)
        .where(eq(emailConfigs.id, existingConfig.id))
        .returning();
      return updatedConfig;
    } else {
      return await this.createEmailConfig(config);
    }
  }

  // Ambulance Post operations
  async getAmbulancePosts(): Promise<AmbulancePost[]> {
    return await db.select().from(ambulancePosts);
  }

  async getAmbulancePost(id: string): Promise<AmbulancePost | undefined> {
    const [post] = await db.select().from(ambulancePosts).where(eq(ambulancePosts.id, id));
    return post || undefined;
  }

  async createAmbulancePost(post: InsertAmbulancePost): Promise<AmbulancePost> {
    const [newPost] = await db.insert(ambulancePosts).values(post).returning();
    return newPost;
  }

  async updateAmbulancePost(id: string, post: Partial<InsertAmbulancePost>): Promise<AmbulancePost | undefined> {
    const [updatedPost] = await db
      .update(ambulancePosts)
      .set(post)
      .where(eq(ambulancePosts.id, id))
      .returning();
    return updatedPost;
  }

  async deleteAmbulancePost(id: string): Promise<boolean> {
    const result = await db.delete(ambulancePosts).where(eq(ambulancePosts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Post contact operations
  async getPostContacts(): Promise<PostContact[]> {
    return await db.select().from(postContacts);
  }

  async getPostContact(id: string): Promise<PostContact | undefined> {
    const [contact] = await db.select().from(postContacts).where(eq(postContacts.id, id));
    return contact || undefined;
  }

  async getPostContactsByPost(ambulancePostId: string): Promise<PostContact[]> {
    return await db.select().from(postContacts).where(eq(postContacts.ambulancePostId, ambulancePostId));
  }

  async createPostContact(contact: InsertPostContact): Promise<PostContact> {
    const [newContact] = await db.insert(postContacts).values(contact).returning();
    return newContact;
  }

  async updatePostContact(id: string, contact: Partial<InsertPostContact>): Promise<PostContact | undefined> {
    const [updatedContact] = await db
      .update(postContacts)
      .set(contact)
      .where(eq(postContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deletePostContact(id: string): Promise<boolean> {
    const result = await db.delete(postContacts).where(eq(postContacts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Supply Request operations
  async getAllSupplyRequests(): Promise<SupplyRequest[]> {
    return await db.select().from(supplyRequests);
  }

  async getSupplyRequestsByItem(itemId: string, ambulancePost?: string): Promise<SupplyRequest[]> {
    if (ambulancePost) {
      return await db.select()
        .from(supplyRequests)
        .where(and(
          eq(supplyRequests.itemId, itemId),
          eq(supplyRequests.ambulancePostId, ambulancePost)
        ));
    } else {
      return await db.select()
        .from(supplyRequests)
        .where(eq(supplyRequests.itemId, itemId));
    }
  }

  async createSupplyRequest(request: InsertSupplyRequest): Promise<SupplyRequest> {
    const [newRequest] = await db.insert(supplyRequests).values(request).returning();
    return newRequest;
  }

  async deleteSupplyRequestsByLocation(locationId: string): Promise<boolean> {
    const result = await db.delete(supplyRequests).where(eq(supplyRequests.locationId, locationId));
    return (result.rowCount ?? 0) > 0;
  }

  // Post Cabinet Order operations
  async getPostCabinetOrder(ambulancePostId: string): Promise<PostCabinetOrder[]> {
    return await db.select()
      .from(postCabinetOrder)
      .where(eq(postCabinetOrder.ambulancePostId, ambulancePostId))
      .orderBy(postCabinetOrder.displayOrder);
  }

  async setPostCabinetOrder(ambulancePostId: string, orderedCabinetIds: string[]): Promise<PostCabinetOrder[]> {
    // Delete existing orders for this post
    await db.delete(postCabinetOrder).where(eq(postCabinetOrder.ambulancePostId, ambulancePostId));
    
    // Insert new orders
    const orderData = orderedCabinetIds.map((cabinetId, index) => ({
      ambulancePostId,
      cabinetId,
      displayOrder: index + 1,
    }));
    
    if (orderData.length > 0) {
      return await db.insert(postCabinetOrder).values(orderData).returning();
    }
    return [];
  }

  async getCabinetsOrderedByPost(ambulancePostId: string): Promise<Cabinet[]> {
    const orderedCabinets = await db
      .select({
        id: cabinets.id,
        name: cabinets.name,
        abbreviation: cabinets.abbreviation,
        description: cabinets.description,
        location: cabinets.location,
        color: cabinets.color,
        displayOrder: postCabinetOrder.displayOrder,
      })
      .from(cabinets)
      .leftJoin(postCabinetOrder, and(
        eq(cabinets.id, postCabinetOrder.cabinetId),
        eq(postCabinetOrder.ambulancePostId, ambulancePostId)
      ))
      .orderBy(postCabinetOrder.displayOrder);

    // If no custom order is set, return cabinets in their default order (by ID)
    if (orderedCabinets.every(c => c.displayOrder === null)) {
      return await db.select().from(cabinets);
    }

    return orderedCabinets.map(c => ({
      id: c.id,
      name: c.name,
      abbreviation: c.abbreviation,
      description: c.description,
      location: c.location,
      color: c.color,
    }));
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories)
      .set({ ...category, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Cabinet Location operations
  async getCabinetLocations(): Promise<CabinetLocation[]> {
    return await db.select().from(cabinetLocations);
  }

  async getCabinetLocationsByCabinet(cabinetId: string): Promise<CabinetLocation[]> {
    return await db.select().from(cabinetLocations).where(eq(cabinetLocations.cabinetId, cabinetId));
  }

  async getCabinetLocationsByPost(ambulancePostId: string): Promise<CabinetLocation[]> {
    return await db.select().from(cabinetLocations).where(eq(cabinetLocations.ambulancePostId, ambulancePostId));
  }

  async createCabinetLocation(location: InsertCabinetLocation): Promise<CabinetLocation> {
    const [newLocation] = await db.insert(cabinetLocations).values(location).returning();
    return newLocation;
  }

  async deleteCabinetLocation(id: string): Promise<boolean> {
    const result = await db.delete(cabinetLocations).where(eq(cabinetLocations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteCabinetLocationsByPost(ambulancePostId: string, cabinetId: string): Promise<boolean> {
    const result = await db.delete(cabinetLocations)
      .where(and(
        eq(cabinetLocations.ambulancePostId, ambulancePostId),
        eq(cabinetLocations.cabinetId, cabinetId)
      ));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();