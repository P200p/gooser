import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Layers
  app.get(api.layers.list.path, async (req, res) => {
    const layers = await storage.getLayers();
    res.json(layers);
  });

  app.post(api.layers.create.path, async (req, res) => {
    try {
      const input = api.layers.create.input.parse(req.body);
      const layer = await storage.createLayer(input);
      res.status(201).json(layer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.layers.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.layers.update.input.parse(req.body);
      const layer = await storage.updateLayer(id, input);
      res.json(layer);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.layers.delete.path, async (req, res) => {
    await storage.deleteLayer(parseInt(req.params.id));
    res.status(204).end();
  });

  // Tabs
  app.get(api.tabs.list.path, async (req, res) => {
    const tabs = await storage.getTabs();
    res.json(tabs);
  });

  // Seed data
  const existingLayers = await storage.getLayers();
  if (existingLayers.length === 0) {
    await storage.createLayer({
      name: "Console",
      type: "js",
      content: "console.log('Hello from Layer');",
      isVisible: true,
      isLocked: false,
      showOnFab: true,
      sortOrder: 0
    });
    await storage.createLayer({
      name: "Red Border",
      type: "css",
      content: "body { border: 5px solid red; }",
      isVisible: false,
      isLocked: false,
      showOnFab: false,
      sortOrder: 1
    });
  }

  const existingTabs = await storage.getTabs();
  if (existingTabs.length === 0) {
    await storage.createTab({
      url: "https://www.google.com",
      title: "Google",
      isActive: true,
      isSplit: false
    });
  }

  return httpServer;
}
