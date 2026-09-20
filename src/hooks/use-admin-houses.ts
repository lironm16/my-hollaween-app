"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/api-json";
import { appInForeground } from "@/lib/catalog-poll";
import {
  notifyCatalogChanged,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import type { House, PublicHouse } from "@/lib/types";

export function useAdminHouses({
  admin,
  refresh,
  catalogUpdatedAt,
}: {
  admin: boolean;
  refresh: (force?: boolean) => Promise<void> | void;
  catalogUpdatedAt?: string;
}) {
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [busyAction, setBusyAction] = useState(false);

  const rememberAdminDb = useCallback((houses: House[], updatedAt: string) => {
    saveServerDbBackup({
      updatedAt,
      houses: houses as ServerDbBackup["houses"],
    });
  }, []);

  const loadAdminHouses = useCallback(async () => {
    if (!admin) return;
    try {
      const res = await fetch("/api/admin/houses", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { houses?: House[]; updatedAt?: string };
      const houses = data.houses ?? [];
      const updatedAt = data.updatedAt ?? new Date().toISOString();
      setAdminHouses(houses);
      rememberAdminDb(houses, updatedAt);
    } catch {
      /* keep last list */
    }
  }, [admin, rememberAdminDb]);

  useEffect(() => {
    if (!admin) {
      setAdminHouses([]);
      return;
    }
    void loadAdminHouses();

    const onChanged = () => void loadAdminHouses();
    const onRefreshed = () => void loadAdminHouses();
    const onVis = () => {
      if (appInForeground()) void loadAdminHouses();
    };
    window.addEventListener("hw-catalog-changed", onChanged);
    window.addEventListener("hw-catalog-refreshed", onRefreshed);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("hw-catalog-changed", onChanged);
      window.removeEventListener("hw-catalog-refreshed", onRefreshed);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [admin, loadAdminHouses]);

  useEffect(() => {
    if (!admin || !catalogUpdatedAt) return;
    void loadAdminHouses();
  }, [admin, catalogUpdatedAt, loadAdminHouses]);

  const applyAdminHouse = useCallback(
    (next: House | PublicHouse) => {
      const full = "editCode" in next && typeof next.editCode === "string" ? (next as House) : null;
      setAdminHouses((list) => {
        let nextList: House[];
        if (full) {
          const idx = list.findIndex((h) => h.id === full.id);
          if (idx < 0) nextList = [...list, full];
          else {
            nextList = [...list];
            nextList[idx] = full;
          }
        } else {
          nextList = list.map((h) => (h.id === next.id ? { ...h, ...next } : h));
        }
        rememberAdminDb(nextList, new Date().toISOString());
        return nextList;
      });
      notifyCatalogChanged();
      void refresh(true);
    },
    [rememberAdminDb, refresh],
  );

  const patchAdmin = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      setBusyAction(true);
      try {
        const res = await fetch(`/api/admin/houses/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await readApiJson<{ error?: string; house?: House }>(res);
        if (!res.ok || !data.house) {
          toast.error(data.error ?? "העדכון נכשל");
          return false;
        }
        applyAdminHouse(data.house);
        return true;
      } catch {
        toast.error("אין קשר לשרת");
        return false;
      } finally {
        setBusyAction(false);
      }
    },
    [applyAdminHouse],
  );

  const removeAdminHouse = useCallback(
    (id: string) => {
      setAdminHouses((list) => {
        const next = list.filter((house) => house.id !== id);
        rememberAdminDb(next, new Date().toISOString());
        return next;
      });
    },
    [rememberAdminDb],
  );

  return {
    adminHouses,
    busyAction,
    loadAdminHouses,
    applyAdminHouse,
    patchAdmin,
    removeAdminHouse,
  };
}
