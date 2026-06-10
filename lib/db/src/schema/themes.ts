import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const themesTable = pgTable("themes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🎉"),
  description: text("description").notNull(),
  heroBgFrom: text("hero_bg_from").notNull(),
  heroBgVia: text("hero_bg_via").notNull(),
  heroBgTo: text("hero_bg_to").notNull(),
  cssPrimary: text("css_primary").notNull(),
  cssSecondary: text("css_secondary").notNull(),
  cssAccent: text("css_accent").notNull(),
  confirmLabel: text("confirm_label").notNull(),
  successTitle: text("success_title").notNull(),
  successSub: text("success_sub").notNull(),
  confettiColors: jsonb("confetti_colors").$type<string[]>().notNull().default(["#ffffff"]),
  photoRecommendation: text("photo_recommendation").notNull(),
  photoPrompt: text("photo_prompt").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertThemeSchema = createInsertSchema(themesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTheme = z.infer<typeof insertThemeSchema>;
export type Theme = typeof themesTable.$inferSelect;
