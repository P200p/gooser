import { db } from "./db";
import {
  layers,
  tabs,
  settings,
  type InsertLayer,
  type Layer,
  type InsertTab,
  type Tab,
  type InsertSetting,
  type Setting
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLayers(): Promise<Layer[]>;
  createLayer(layer: InsertLayer): Promise<Layer>;
  updateLayer(id: number, layer: Partial<InsertLayer>): Promise<Layer>;
  deleteLayer(id: number): Promise<void>;
  
  getTabs(): Promise<Tab[]>;
  createTab(tab: InsertTab): Promise<Tab>;
  
  getSettings(): Promise<Setting | undefined>;
  updateSettings(setting: InsertSetting): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  async getLayers(): Promise<Layer[]> {
    return await db.select().from(layers).orderBy(layers.sortOrder);
  }

  async createLayer(insertLayer: InsertLayer): Promise<Layer> {
    const [layer] = await db.insert(layers).values(insertLayer).returning();
    return layer;
  }

  async updateLayer(id: number, updates: Partial<InsertLayer>): Promise<Layer> {
    const [layer] = await db.update(layers)
      .set(updates)
      .where(eq(layers.id, id))
      .returning();
    return layer;
  }

  async deleteLayer(id: number): Promise<void> {
    await db.delete(layers).where(eq(layers.id, id));
  }

  async getTabs(): Promise<Tab[]> {
    return await db.select().from(tabs);
  }

  async createTab(insertTab: InsertTab): Promise<Tab> {
    const [tab] = await db.insert(tabs).values(insertTab).returning();
    return tab;
  }

  async getSettings(): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).limit(1);
    return setting;
  }

  async updateSettings(insertSetting: InsertSetting): Promise<Setting> {
    // Simple upsert logic
    await db.delete(settings);
    const [setting] = await db.insert(settings).values(insertSetting).returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
