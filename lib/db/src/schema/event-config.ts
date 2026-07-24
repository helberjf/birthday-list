import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventConfigTable = pgTable("event_config", {
  id: serial("id").primaryKey(),
  childName: text("child_name").notNull().default("Julia"),
  age: text("age").notNull().default("5"),
  dateLabel: text("date_label").notNull().default("16/08/2026"),
  dateFull: text("date_full").notNull().default("Domingo, 16 de agosto de 2026"),
  timeLabel: text("time_label").notNull().default("13:00 às 18:00"),
  location: text("location").notNull().default("Av Rio Pardo, 4195"),
  neighborhood: text("neighborhood").notNull().default("Cidade Universitária - Ribeirão Preto"),
  tagline: text("tagline").notNull().default("Venha viver uma tarde de piscina, brincadeiras e muita alegria!"),
  inviteImageUrl: text("invite_image_url"),
  heroBgFrom: text("hero_bg_from").notNull().default("#4b1238"),
  heroBgVia: text("hero_bg_via").notNull().default("#b91d73"),
  heroBgTo: text("hero_bg_to").notNull().default("#f7a8cd"),
  musicUrl: text("music_url"),
  galleryEnabled: boolean("gallery_enabled").notNull().default(false),
  galleryTitle: text("gallery_title").notNull().default("Fotos da Festa 📸"),
  theme: text("theme").notNull().default("princesas"),
  spotifyPlaylistUrl: text("spotify_playlist_url"),
  mapsUrl: text("maps_url"),
  whatsappReminderEnabled: boolean("whatsapp_reminder_enabled").notNull().default(false),
  whatsappReminderDaysBefore: text("whatsapp_reminder_days_before").notNull().default("3"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEventConfigSchema = createInsertSchema(eventConfigTable).omit({ id: true, updatedAt: true });
export type EventConfig = typeof eventConfigTable.$inferSelect;
export type InsertEventConfig = z.infer<typeof insertEventConfigSchema>;
