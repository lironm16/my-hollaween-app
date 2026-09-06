"use client";

import { useEffect, useState } from "react";
import type { Catalog } from "@/lib/types";
import { syncCatalog } from "@/lib/catalog-sync";
import { loadCatalogCache, loadCatalogCacheSync, saveCatalogCache, flushPendingHouseWrites, withDeviceHouseOverlays } from "@/lib/offline-db";
import { readServerSimDown, SERVER_SIM_EVENT } from "@/lib/app-clock";

type Source = "network" | "cache" | "snapshot" | "ssr";

export type CatalogState = {
  catalog: Catalog | null;
  loading: boolean;
  offline: boolean;
  /** Browser thinks it is online, but /api/catalog and /catalog.json both failed. */
  unreachable: boolean;
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

async function readDeviceCatalog() {
  return (await withTimeout(loadCatalogCache(), 1500)) ?? loadCatalogCacheSync();
}

export function useCatalog(initial?: Catalog | null): CatalogState {
  const [catalog, setCatalog] = useState<Catalog | null>(
    () => initial ?? loadCatalogCacheSync(),
  );
  const [loading, setLoading] = useState(() => !initial && !loadCatalogCacheSync());
  const [offline, setOffline] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(() =>
    initial ? "ssr" : loadCatalogCacheSync() ? "cache" : null,
  );

  const refresh = async (force = false) => {
    const online = typeof navigator === "undefined" || navigator.onLine;
    setOffline(!online);
    if (online) await flushPendingHouseWrites();
    try {
      if (readServerSimDown()) throw new Error("sim-down");
      const live = await fetchJson("/api/catalog", force);
      let next: Catalog = live;
      setCatalog((prev) => {
        next = withDeviceHouseOverlays(syncCatalog(prev, live));
        return next;
      });
      setSource("network");
      setUnreachable(false);
      setError(null);
      await saveCatalogCache(next);
      return;
    } catch {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        const snap = await fetchJson("/catalog.json", force);
        let next: Catalog = snap;
        setCatalog((prev) => {
          next = withDeviceHouseOverlays(syncCatalog(prev, snap));
          return next;
        });
        setSource("snapshot");
        setUnreachable(false);
        setError(null);
        await saveCatalogCache(next);
        return;
      } catch {
        const cached = await readDeviceCatalog();
        let kept = false;
        setCatalog((prev) => {
          const merged = prev && cached ? syncCatalog(cached, prev) : (prev ?? cached);
          const next = merged ? withDeviceHouseOverlays(merged) : merged;
          kept = Boolean(next);
          if (next) void saveCatalogCache(next);
          return next ?? prev;
        });
        if (kept) {
          setSource("cache");
          setUnreachable(online);
          setError(null);
          return;
        }
        setUnreachable(online);
        setError(
          online
            ? "השרת לא עונה, ואין עותק שמור בטלפון. נסו שוב כשיש קליטה."
            : "אין אינטרנט, ואין עותק שמור בטלפון. פתחו את האפליקציה פעם אחת כשיש רשת.",
        );
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initial) await saveCatalogCache(initial);
      if (!initial) {
        const cached = await readDeviceCatalog();
        if (cached && !cancelled) {
          setCatalog(cached);
          setSource("cache");
          setLoading(false);
        }
      }
      await refresh(false);
      if (!cancelled) setLoading(false);
    })();
    const onOff = () => {
      const nowOffline = !navigator.onLine;
      setOffline(nowOffline);
      if (nowOffline) setUnreachable(false);
      else {
        void (async () => {
          await flushPendingHouseWrites();
          await refresh(true);
        })();
      }
    };
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onVis);
    const onChanged = () => void refresh(true);
    window.addEventListener("hw-catalog-changed", onChanged);
    const onSim = () => void refresh(true);
    window.addEventListener(SERVER_SIM_EVENT, onSim);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("hw-catalog-changed", onChanged);
      window.removeEventListener(SERVER_SIM_EVENT, onSim);
    };
    // initial is server-provided for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { catalog, loading, offline, unreachable, error, source, refresh };
}
