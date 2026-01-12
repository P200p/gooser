import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertLayer, type Layer } from "@shared/schema";

// GET /api/layers
export function useLayers() {
  return useQuery({
    queryKey: [api.layers.list.path],
    queryFn: async () => {
      const res = await fetch(api.layers.list.path);
      if (!res.ok) throw new Error("Failed to fetch layers");
      return api.layers.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/layers
export function useCreateLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertLayer) => {
      const res = await fetch(api.layers.create.path, {
        method: api.layers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.layers.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create layer");
      }
      return api.layers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.layers.list.path] }),
  });
}

// PUT /api/layers/:id
export function useUpdateLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertLayer>) => {
      const url = buildUrl(api.layers.update.path, { id });
      const res = await fetch(url, {
        method: api.layers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Layer not found");
        throw new Error("Failed to update layer");
      }
      return api.layers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.layers.list.path] }),
  });
}

// DELETE /api/layers/:id
export function useDeleteLayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.layers.delete.path, { id });
      const res = await fetch(url, { method: api.layers.delete.method });
      if (!res.ok) throw new Error("Failed to delete layer");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.layers.list.path] }),
  });
}
