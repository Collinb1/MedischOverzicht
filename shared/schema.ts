import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const medicalItems = pgTable("medical_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  cabinet: varchar("cabinet", { length: 10 }).notNull(),
  isLowStock: boolean("is_low_stock").notNull().default(false),
  expiryDate: date("expiry_date"),
});

export const cabinets = pgTable("cabinets", {
  id: varchar("id", { length: 10 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
});

export const emailNotifications = pgTable("email_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => medicalItems.id),
  recipientEmail: text("recipient_email").notNull(),
  sentAt: date("sent_at").notNull().default(sql`CURRENT_DATE`),
});

export const insertMedicalItemSchema = createInsertSchema(medicalItems).omit({
  id: true,
});

export const insertCabinetSchema = createInsertSchema(cabinets);

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  sentAt: true,
});

export type InsertMedicalItem = z.infer<typeof insertMedicalItemSchema>;
export type MedicalItem = typeof medicalItems.$inferSelect;
export type InsertCabinet = z.infer<typeof insertCabinetSchema>;
export type Cabinet = typeof cabinets.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
