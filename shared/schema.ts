import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const drawers = pgTable("drawers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: varchar("cabinet_id", { length: 10 }).notNull(),
  name: text("name").notNull(),
  position: text("position").notNull(), // "boven", "onder", "links", "rechts", "midden"
  drawerNumber: integer("drawer_number").notNull(),
  description: text("description"),
});

// Item locations table - tracks where items are stored at each post
export const medicalItems = pgTable("medical_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  searchTerms: text("search_terms"), // Zoektermen voor alternatieve benamingen
  expiryDate: date("expiry_date"),
  alertEmail: text("alert_email"),
  photoUrl: text("photo_url"),
  isDiscontinued: boolean("is_discontinued").notNull().default(false),
  replacementItemId: varchar("replacement_item_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const itemLocations = pgTable("item_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => medicalItems.id, { onDelete: "cascade" }),
  ambulancePostId: varchar("ambulance_post_id").notNull().references(() => ambulancePosts.id),
  cabinet: varchar("cabinet", { length: 10 }).notNull(),
  drawer: text("drawer"),
  contactPersonId: varchar("contact_person_id").references(() => postContacts.id),
  isLowStock: boolean("is_low_stock").notNull().default(false),
  stockStatus: text("stock_status").notNull().default("op-voorraad"), // "op-voorraad", "bijna-op", "niet-meer-aanwezig"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon").default("📦"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cabinets = pgTable("cabinets", {
  id: varchar("id", { length: 10 }).primaryKey(),
  name: text("name").notNull(),
  abbreviation: varchar("abbreviation", { length: 3 }).notNull(), // Max 3 letters
  description: text("description"),
  location: text("location"),
  color: varchar("color", { length: 20 }).default("bg-slate-200"),
});

// Cabinet ordering per ambulance post
export const postCabinetOrder = pgTable("post_cabinet_order", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ambulancePostId: varchar("ambulance_post_id").notNull().references(() => ambulancePosts.id),
  cabinetId: varchar("cabinet_id", { length: 10 }).notNull().references(() => cabinets.id),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cabinet locations - tracks which cabinets are present at which ambulance posts
export const cabinetLocations = pgTable("cabinet_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cabinetId: varchar("cabinet_id", { length: 10 }).notNull().references(() => cabinets.id, { onDelete: "cascade" }),
  ambulancePostId: varchar("ambulance_post_id").notNull().references(() => ambulancePosts.id, { onDelete: "cascade" }),
  specificLocation: text("specific_location"), // e.g. "Voor in de ambulance", "Achterin bij de brancard", etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailNotifications = pgTable("email_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => medicalItems.id),
  recipientEmail: text("recipient_email").notNull(),
  department: text("department").notNull(), // Afdeling waar mail naartoe is verzonden
  sentAt: date("sent_at").notNull().default(sql`CURRENT_DATE`),
});

export const insertMedicalItemSchema = createInsertSchema(medicalItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItemLocationSchema = createInsertSchema(itemLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCabinetSchema = createInsertSchema(cabinets);

export const insertCabinetLocationSchema = createInsertSchema(cabinetLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostCabinetOrderSchema = createInsertSchema(postCabinetOrder).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrawerSchema = createInsertSchema(drawers).omit({
  id: true,
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  sentAt: true,
});

export type InsertMedicalItem = z.infer<typeof insertMedicalItemSchema>;
export type MedicalItem = typeof medicalItems.$inferSelect;
export type InsertItemLocation = z.infer<typeof insertItemLocationSchema>;
export type ItemLocation = typeof itemLocations.$inferSelect;
export type InsertCabinet = z.infer<typeof insertCabinetSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type PostCabinetOrder = typeof postCabinetOrder.$inferSelect;
export type InsertPostCabinetOrder = z.infer<typeof insertPostCabinetOrderSchema>;
export type Cabinet = typeof cabinets.$inferSelect;
export type InsertCabinetLocation = z.infer<typeof insertCabinetLocationSchema>;
export type CabinetLocation = typeof cabinetLocations.$inferSelect;
export type InsertDrawer = z.infer<typeof insertDrawerSchema>;
export type Drawer = typeof drawers.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;

export const emailConfigs = pgTable("email_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  smtpSecure: boolean("smtp_secure").notNull().default(true),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).omit({
  id: true,
});

export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfigs.$inferSelect;

export const ambulancePosts = pgTable("ambulance_posts", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postContacts = pgTable("post_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ambulancePostId: varchar("ambulance_post_id").notNull().references(() => ambulancePosts.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAmbulancePostSchema = createInsertSchema(ambulancePosts).omit({
  createdAt: true,
});

export const insertPostContactSchema = createInsertSchema(postContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAmbulancePost = z.infer<typeof insertAmbulancePostSchema>;
export type AmbulancePost = typeof ambulancePosts.$inferSelect;
export type InsertPostContact = z.infer<typeof insertPostContactSchema>;
export type PostContact = typeof postContacts.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const supplyRequests = pgTable("supply_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => medicalItems.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => itemLocations.id, { onDelete: 'cascade' }),
  ambulancePostId: varchar("ambulance_post_id").notNull(),
  contactPersonId: varchar("contact_person_id"),
  contactPersonName: text("contact_person_name"),
  contactPersonEmail: text("contact_person_email"),
  status: text("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertSupplyRequestSchema = createInsertSchema(supplyRequests).omit({
  id: true,
  sentAt: true,
});

export type InsertSupplyRequest = z.infer<typeof insertSupplyRequestSchema>;
export type SupplyRequest = typeof supplyRequests.$inferSelect;
