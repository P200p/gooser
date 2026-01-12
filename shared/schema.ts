import { pgTable, text, serial, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const layers = pgTable("layers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'js', 'css', 'bookmarklet'
  content: text("content").notNull(),
  isVisible: boolean("is_visible").default(true),
  isLocked: boolean("is_locked").default(false),
  showOnFab: boolean("show_on_fab").default(false),
  sortOrder: integer("sort_order").default(0),
  autoRunBackground: boolean("auto_run_background").default(false),
  autoRunOnLoad: boolean("auto_run_on_load").default(false),
  autoRunOnUrlChange: boolean("auto_run_on_url_change").default(false),
});

export const tabs = pgTable("tabs", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  isActive: boolean("is_active").default(false),
  isSplit: boolean("is_split").default(false), // For split view
  splitOrientation: text("split_orientation").default("vertical"), // 'vertical' or 'horizontal'
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  language: text("language").default("th"),
  theme: text("theme").default("system"),
});

export const insertLayerSchema = createInsertSchema(layers).omit({ id: true });
export const insertTabSchema = createInsertSchema(tabs).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Layer = typeof layers.$inferSelect;
export type InsertLayer = z.infer<typeof insertLayerSchema>;
export type Tab = typeof tabs.$inferSelect;
export type InsertTab = z.infer<typeof insertTabSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;
