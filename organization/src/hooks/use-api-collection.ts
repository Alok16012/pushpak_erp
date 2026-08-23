import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { WithId } from "@/hooks/use-local-collection";

type ApiCollectionState<T extends WithId> = {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (item: Omit<T, "id"> & { id?: string }) => Promise<T | undefined>;
  update: (id: string, patch: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
};

export function useApiCollection<T extends WithId>(
  endpoint: string,
  fallbackItems: T[],
  options?: { enabled?: boolean },
): ApiCollectionState<T> {
  const { toast } = useToast();
  const [items, setItems] = useState<T[]>(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<T[]>(endpoint);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options?.enabled === false) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, options?.enabled]);

  const add = useCallback(
    async (item: Omit<T, "id"> & { id?: string }): Promise<T | undefined> => {
      try {
        const data = await api<T>(endpoint, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setItems((list) => [data, ...list]);
        toast({ title: "Saved", description: "Record created successfully." });
        return data;
      } catch (err) {
        toast({
          title: "Failed to save",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return undefined;
      }
    },
    [endpoint, toast],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      try {
        await api<T>(`${endpoint}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
        toast({ title: "Updated", description: "Record updated successfully." });
      } catch (err) {
        toast({
          title: "Update failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [endpoint, toast],
  );

  const removeCb = useCallback(
    async (id: string) => {
      try {
        await api<void>(`${endpoint}/${id}`, { method: "DELETE" });
        setItems((list) => list.filter((i) => i.id !== id));
        toast({ title: "Deleted", description: "Record removed." });
      } catch (err) {
        toast({
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [endpoint, toast],
  );

  return { items, loading, error, refresh, add, update, remove: removeCb, setItems };
}
