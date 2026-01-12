import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertTab } from "@shared/schema";

// GET /api/tabs
export function useTabs() {
  return useQuery({
    queryKey: [api.tabs.list.path],
    queryFn: async () => {
      const res = await fetch(api.tabs.list.path);
      if (!res.ok) throw new Error("Failed to fetch tabs");
      return api.tabs.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/tabs
export function useCreateTab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTab) => {
      const res = await fetch(api.tabs.create.path, {
        method: api.tabs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tab");
      return api.tabs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.tabs.list.path] }),
  });
}
