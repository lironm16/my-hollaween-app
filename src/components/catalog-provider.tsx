"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, CatalogDelta } from "@/lib/types";
import { mergeCatalogDelta, syncCatalog } from "@/lib/catalog-sync";
import { syncActivityCounts } from "@/lib/activity-sync";
import { config } from "@/lib/config";
import {
  loadCatalogCache,
  loadCatalogCacheSync,
  saveCatalogCache,
  flushPendingHouseWrites,
  withDeviceHouseOverlays,
} from "@/lib/offline-db";
import { readServerSimDown, SERVER_SIM_EVENT } from "@/lib/app-clock";
import { getDeviceId } from "@/lib/device-id";

function catalogPollMs(seconds?: number) {
  const n = seconds ?? config.catalogPollSeconds;
  return Math.max(30, n) * 1000;
}

/** Browser tab / PWA is in the foreground (any in-app route). */
function appInForeground() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

type Source = "network" | "cache" | "snapshot" | "ssr";

export type CatalogState = {
  catalog: Catalog | null;
  loading: boolean;
  offline: boolean;
  unreachable: boolean;
  error: string | null;
  source: Source | null;
  refresh: (force?: boolean) => Promise<void>;
};

type CatalogContextValue = CatalogState & {
  seedCatalog: (initial: Catalog) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

async function fetchJson(url: string, force = false, since?: string): Promise<CatalogDelta> {
  const params = new URLSearchParams();
  if (force) params.set("t", String(Date.now()));
  else if (since) params.set("since", since);
  const qs = params.toString();
  const href = qs ? `${url}?${qs}` : url;
  const headers: HeadersInit = {};
  const deviceId = getDeviceId();
  if (deviceId) headers["X-HW-Device-Id"] = deviceId;
  const res = await fetch(href, {
    cache: force || since ? "no-store" : "default",
    signal: AbortSignal.timeout(8000),
    headers,
  });
  if (!res.ok) throw new Error("bad status");
  return res.json() as Promise<CatalogDelta>;
}

function applyCatalogResponse(prev: Catalog | null, live: CatalogDelta): Catalog {
  if (!prev || live.full) return syncCatalog(prev, live);
  if (live.houses.length || live.removed?.length || live.pushTemplates) {
    return mergeCatalogDelta(prev, live);
  }
  return { ...prev, updatedAt: live.updatedAt };
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

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(() => loadCatalogCacheSync());
  const [loading, setLoading] = useState(() => !loadCatalogCacheSync());
  const [offline, setOffline] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(() =>
    loadCatalogCacheSync() ? "cache" : null,
  );
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const pollMsRef = useRef(catalogPollMs());
  const seededRef = useRef(false);

  const seedCatalog = useCallback((initial: Catalog) => {
    if (seededRef.current) return;
    seededRef.current = true;
    setCatalog(initial);
    setSource("ssr");
    setLoading(false);
    void saveCatalogCache(initial);
  }, []);

  const refresh = useCallback(async (force = false) => {
    const online = typeof navigator === "undefined" || navigator.onLine;
    setOffline(!online);
    if (!online) {
      const cached = await readDeviceCatalog();
      if (cached) {
        let next: Catalog = cached;
        setCatalog((prev) => {
          next = withDeviceHouseOverlays(syncCatalog(cached, prev ?? cached));
          return next;
        });
        setSource("cache");
        setUnreachable(false);
        setError(null);
        return;
      }
    }
    if (online) await flushPendingHouseWrites();
    try {
      if (readServerSimDown()) throw new Error("sim-down");
      const since = force ? undefined : catalogRef.current?.updatedAt;
      const live = await fetchJson("/api/catalog", force, since);
      if (live.pollSeconds) pollMsRef.current = catalogPollMs(live.pollSeconds);
      let next: Catalog = live;
      setCatalog((prev) => {
        next = withDeviceHouseOverlays(applyCatalogResponse(prev, live));
        return next;
      });
      setSource("network");
      setUnreachable(false);
      setError(null);
      await saveCatalogCache(next);
      void syncActivityCounts();
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readDeviceCatalog();
      if (cached && !cancelled && !seededRef.current) {
        setCatalog(cached);
        setSource("cache");
        setLoading(false);
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
      if (appInForeground()) void refresh(false);
    };
    document.addEventListener("visibilitychange", onVis);
    const onChanged = () => void refresh(true);
    window.addEventListener("hw-catalog-changed", onChanged);
    const onSim = () => void refresh(true);
    window.addEventListener(SERVER_SIM_EVENT, onSim);

    let pollTimer: number | undefined;
    const schedulePoll = () => {
      pollTimer = window.setTimeout(() => {
        if (!cancelled && appInForeground()) void refresh(false);
        if (!cancelled) schedulePoll();
      }, pollMsRef.current);
    };
    schedulePoll();

    return () => {
      cancelled = true;
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("hw-catalog-changed", onChanged);
      window.removeEventListener(SERVER_SIM_EVENT, onSim);
    };
  }, [refresh]);

  const value: CatalogContextValue = {
    catalog,
    loading,
    offline,
    unreachable,
    error,
    source,
    refresh,
    seedCatalog,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(initial?: Catalog | null): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog requires CatalogProvider");
  }
  useEffect(() => {
    if (initial) ctx.seedCatalog(initial);
  }, [initial, ctx]);
  return ctx;
}
