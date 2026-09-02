"use client";

import { useEffect, useState } from "react";
import type { Catalog } from "@/lib/types";
import { loadCatalogCache, saveCatalogCache } from "@/lib/offline-db";

type Source = "network" | "cache" | "snapshot";

export type CatalogState = {
  catalog: Catalog | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
  source: Source | null;
  refresh: (force?: boolean) => Promise<void>;
};

async function fetchJson(url: string, force = false): Promise<Catalog> {
  const res = await fetch(url, {
    cache: force ? "reload" : "default",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("bad status");
  return res.json() as Promise<Catalog>;
}

export function useCatalog(): CatalogState {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);

  const refresh = async (force = false) => {
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    try {
      const live = await fetchJson("/api/catalog", force);
      setCatalog(live);
      setSource("network");
      setError(null);
      await saveCatalogCache(live);
      return;
    } catch {
      try {
        const snap = await fetchJson("/catalog.json", force);
        setCatalog(snap);
        setSource("snapshot");
        setError(null);
        await saveCatalogCache(snap);
        return;
      } catch {
        const cached = await loadCatalogCache();
        if (cached) {
          setCatalog(cached);
          setSource("cache");
          setError(null);
          return;
        }
        setError("לא הצלחנו לטעון את המפה. נסו שוב בעוד רגע.");
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCatalogCache();
      if (cached && !cancelled) {
        setCatalog(cached);
        setSource("cache");
        setLoading(false);
      }
      await refresh(false);
      if (!cancelled) setLoading(false);
    })();
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { catalog, loading, offline, error, source, refresh };
}
