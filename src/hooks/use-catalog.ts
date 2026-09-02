"use client";

import { useEffect, useState } from "react";
import type { Catalog } from "@/lib/types";
import { loadCatalogCache, saveCatalogCache } from "@/lib/offline-db";

type Source = "network" | "cache" | "snapshot" | "ssr";

export type CatalogState = {
  catalog: Catalog | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
  source: Source | null;
  refresh: (force?: boolean) => Promise<void>;
};

async function fetchJson(url: string, force = false): Promise<Catalog> {
  const href = force ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url;
  const res = await fetch(href, {
    cache: force ? "no-store" : "default",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("bad status");
  return res.json() as Promise<Catalog>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        window.clearTimeout(t);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(t);
        resolve(null);
      });
  });
}

export function useCatalog(initial?: Catalog | null): CatalogState {
  const [catalog, setCatalog] = useState<Catalog | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(initial ? "ssr" : null);

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
        const cached = await withTimeout(loadCatalogCache(), 400);
        if (cached) {
          setCatalog(cached);
          setSource("cache");
          setError(null);
          return;
        }
        if (!initial) {
          setError("לא הצלחנו לטעון את המפה. נסו שוב בעוד רגע.");
        }
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!initial) {
        const cached = await withTimeout(loadCatalogCache(), 400);
        if (cached && !cancelled) {
          setCatalog(cached);
          setSource("cache");
          setLoading(false);
        }
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
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", onVis);
    };
    // initial is server-provided for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { catalog, loading, offline, error, source, refresh };
}
