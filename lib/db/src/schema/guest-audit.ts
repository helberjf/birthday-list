import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestAuditTable = pgTable("guest_audit", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id"),
  guestName: text("guest_name").notNull(),
  action: text("action").notNull(),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuestAuditSchema = createInsertSchema(guestAuditTable).omit({ id: true, createdAt: true });
export type InsertGuestAudit = z.infer<typeof insertGuestAuditSchema>;
export type GuestAudit = typeof guestAuditTable.$inferSelect;
