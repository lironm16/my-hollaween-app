"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/api-json";
import {
  backupLooksNewer,
  loadServerDbBackup,
  notifyCatalogChanged,
  saveServerDbBackup,
  type ServerDbBackup,
} from "@/lib/offline-db";
import type { House, PublicHouse } from "@/lib/types";

export function useAdminHouses({
  admin,
  refresh,
}: {
  admin: boolean;
  refresh: (force?: boolean) => Promise<void> | void;
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
      let houses = data.houses ?? [];
      let updatedAt = data.updatedAt ?? new Date().toISOString();
      const backup = loadServerDbBackup();
      if (backup && backupLooksNewer(backup, updatedAt, houses)) {
        const restoreRes = await fetch("/api/admin/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backup),
        });
        if (restoreRes.ok) {
          const restored = (await restoreRes.json()) as {
            houses?: House[];
            updatedAt?: string;
          };
          houses = restored.houses ?? houses;
          updatedAt = restored.updatedAt ?? updatedAt;
          notifyCatalogChanged();
        }
      }
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
    const timer = window.setInterval(() => void loadAdminHouses(), 15_000);
    return () => window.clearInterval(timer);
  }, [admin, loadAdminHouses]);

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

  const approveHouse = useCallback(
    async (id: string) => {
      const ok = await patchAdmin(id, { status: "approved" });
      if (ok) toast.success("הבית אושר ונכנס למפה הציבורית");
    },
    [patchAdmin],
  );

  const rejectHouse = useCallback(
    async (id: string) => {
      setBusyAction(true);
      try {
        const res = await fetch(`/api/admin/houses/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await readApiJson<{ error?: string; ok?: boolean }>(res);
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? "המחיקה נכשלה");
          return false;
        }
        setAdminHouses((list) => {
          const next = list.filter((house) => house.id !== id);
          rememberAdminDb(next, new Date().toISOString());
          return next;
        });
        notifyCatalogChanged();
        void refresh(true);
        toast.success("הבית נדחה ונמחק");
        return true;
      } catch {
        toast.error("אין קשר לשרת");
        return false;
      } finally {
        setBusyAction(false);
      }
    },
    [rememberAdminDb, refresh],
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
    approveHouse,
    rejectHouse,
    removeAdminHouse,
  };
}
