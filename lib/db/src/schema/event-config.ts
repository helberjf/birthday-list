import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventConfigTable = pgTable("event_config", {
  id: serial("id").primaryKey(),
  childName: text("child_name").notNull().default("Bento"),
  age: text("age").notNull().default("5"),
  dateLabel: text("date_label").notNull().default("15/04/2026"),
  dateFull: text("date_full").notNull().default("Quarta-feira, 15 de Abril de 2026"),
  timeLabel: text("time_label").notNull().default("18h00 às 22h00"),
  location: text("location").notNull().default("Rua Luz Interior, 120"),
  neighborhood: text("neighborhood").notNull().default("Estrela Sul — Serelepe"),
  tagline: text("tagline").notNull().default("Venha se divertir, jogar, dar risada e fazer parte dessa missão especial!"),
  inviteImageUrl: text("invite_image_url"),
  heroBgFrom: text("hero_bg_from").notNull().default("#1a6b2a"),
  heroBgVia: text("hero_bg_via").notNull().default("#2d8a40"),
  heroBgTo: text("hero_bg_to").notNull().default("#4caf50"),
  musicUrl: text("music_url"),
  galleryEnabled: boolean("gallery_enabled").notNull().default(false),
  galleryTitle: text("gallery_title").notNull().default("Fotos da Festa 📸"),
  theme: text("theme").notNull().default("minecraft"),
  spotifyPlaylistUrl: text("spotify_playlist_url"),
  mapsUrl: text("maps_url"),
  whatsappReminderEnabled: boolean("whatsapp_reminder_enabled").notNull().default(false),
  whatsappReminderDaysBefore: text("whatsapp_reminder_days_before").notNull().default("3"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEventConfigSchema = createInsertSchema(eventConfigTable).omit({ id: true, updatedAt: true });
export type EventConfig = typeof eventConfigTable.$inferSelect;
export type InsertEventConfig = z.infer<typeof insertEventConfigSchema>;
