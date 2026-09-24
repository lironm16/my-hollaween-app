"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, CatalogDelta } from "@/lib/types";
import { mergeCatalogDelta, syncCatalog } from "@/lib/catalog-sync";
import { config } from "@/lib/config";
import {
  adaptiveCatalogPollMs,
  appInForeground,
  catalogPollMs,
} from "@/lib/catalog-poll";
import {
  loadCatalogCache,
  loadCatalogCacheMeta,
  loadCatalogCacheSync,
  markCatalogCacheComplete,
  saveCatalogCache,
  flushPendingHouseWrites,
  withDeviceHouseOverlays,
} from "@/lib/offline-db";
import { readServerSimDown, SERVER_SIM_EVENT } from "@/lib/app-clock";
import { catalogNeedsFullRefresh, resolveServerHouseCount } from "@/lib/catalog-houses";
import { catalogHasRealHouses } from "@/lib/house-set";
import { isMapListSuspended, subscribeMapListSuspend } from "@/lib/map-list-suspend";

type Source = "network" | "cache" | "snapshot" | "ssr";

/** Static deploy bundle — zero serverless / Firestore reads on full load. */
const SNAPSHOT_URL = "/catalog.json";
const OFFLINE_FORCE_REFRESH_MS = 30 * 60 * 1000;

export type CatalogState = {
  catalog: Catalog | null;
  loading: boolean;
  /** False until the first catalog refresh finishes (or real houses were read from cache). */
  ready: boolean;
  offline: boolean;
  unreachable: boolean;
  error: string | null;
  source: Source | null;
  pollSeconds: number;
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
  const res = await fetch(href, {
    cache: force || since ? "no-store" : "default",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("bad status");
  return res.json() as Promise<CatalogDelta>;
}

function applyCatalogResponse(prev: Catalog | null, live: CatalogDelta): Catalog {
  if (!prev || live.full) return syncCatalog(prev, live);
  if (live.houses.length || live.removed?.length || live.pushTemplates) {
    return mergeCatalogDelta(prev, live);
  }
  if (prev.updatedAt === live.updatedAt) return prev;
  return { ...prev, updatedAt: live.updatedAt };
}

function isEmptyDelta(live: CatalogDelta, prev: Catalog | null) {
  if (live.full) return false;
  if (live.houses.length || live.removed?.length || live.pushTemplates) return false;
  if (!prev) return false;
  return live.updatedAt === prev.updatedAt;
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

function mergeDeviceCatalog(prev: Catalog | null, cached: Catalog): Catalog {
  const base = prev ? syncCatalog(cached, prev) : cached;
  return withDeviceHouseOverlays(base);
}

async function reconcileWithDeviceCache(prev: Catalog | null): Promise<Catalog | null> {
  const cached = await readDeviceCatalog();
  if (!cached) return prev;
  const merged = mergeDeviceCatalog(prev, cached);
  if (prev && merged.houses.length <= prev.houses.length) return prev;
  return merged;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const cacheHydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (cacheHydratedRef.current) return;
    cacheHydratedRef.current = true;
    const syncCache = loadCatalogCacheSync();
    if (!syncCache) {
      setLoading(false);
      return;
    }
    setCatalog(withDeviceHouseOverlays(syncCache));
    setSource("cache");
    if (catalogHasRealHouses(syncCache)) {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const merged = await reconcileWithDeviceCache(catalogRef.current);
      if (cancelled || !merged) return;
      setCatalog(merged);
      setSource("cache");
      if (catalogHasRealHouses(merged)) {
        setLoading(false);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const pollSecondsRef = useRef(config.catalogPollSeconds);
  const emptyDeltaStreakRef = useRef(0);
  const offlineSinceRef = useRef<number | null>(null);
  const [pollSeconds, setPollSeconds] = useState(config.catalogPollSeconds);
  const seededRef = useRef(false);
  const pendingCatalogRef = useRef<Catalog | null>(null);

  const publishCatalog = useCallback((next: Catalog, prev: Catalog | null) => {
    if (isMapListSuspended()) {
      pendingCatalogRef.current = next;
      return prev;
    }
    return next;
  }, []);

  const seedCatalog = useCallback((initial: Catalog) => {
    if (seededRef.current) return;
    seededRef.current = true;
    setCatalog(initial);
    setSource("ssr");
    setLoading(false);
    setReady(true);
    void saveCatalogCache(initial);
  }, []);

  const applyLiveResponse = useCallback(async (live: CatalogDelta) => {
    if (live.pollSeconds) {
      pollSecondsRef.current = live.pollSeconds;
      setPollSeconds(live.pollSeconds);
    }
    const prev = catalogRef.current;
    if (isEmptyDelta(live, prev)) {
      emptyDeltaStreakRef.current += 1;
      if (!isMapListSuspended()) {
        setUnreachable(false);
        setError(null);
      }
      return prev;
    }
    emptyDeltaStreakRef.current = 0;
    let next!: Catalog;
    setCatalog((cur) => {
      const merged = withDeviceHouseOverlays(applyCatalogResponse(cur, live));
      next = merged === cur ? cur : merged;
      if (next === cur) return cur;
      const published = publishCatalog(next, cur);
      next = published ?? next;
      return next;
    });
    if (isMapListSuspended()) return next;
    setSource("network");
    setUnreachable(false);
    setError(null);
    const serverCount = resolveServerHouseCount(live);
    if (live.full || (serverCount != null && next.houses.length >= serverCount)) {
      markCatalogCacheComplete(next);
    }
    await saveCatalogCache(next);
    window.dispatchEvent(new Event("hw-catalog-refreshed"));
    return next;
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (isMapListSuspended() && !force) return;
    const online = typeof navigator === "undefined" || navigator.onLine;
    setOffline(!online);
    if (!online) {
      const cached = await readDeviceCatalog();
      if (cached) {
        let next: Catalog = cached;
        setCatalog((prev) => {
          next = withDeviceHouseOverlays(syncCatalog(cached, prev ?? cached));
          return publishCatalog(next, prev) ?? next;
        });
        if (isMapListSuspended()) return;
        setSource("cache");
        setUnreachable(false);
        setError(null);
        return;
      }
    }
    if (online) await flushPendingHouseWrites();

    const cacheMeta = loadCatalogCacheMeta();
    const needsFullRefresh =
      force ||
      catalogNeedsFullRefresh(
        catalogRef.current,
        cacheMeta,
        resolveServerHouseCount(catalogRef.current),
      );
    const since = needsFullRefresh ? undefined : catalogRef.current?.updatedAt;

    // Delta poll — live API only (0–1 Firestore reads when unchanged).
    if (since && !needsFullRefresh) {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        const live = await fetchJson("/api/catalog", false, since);
        await applyLiveResponse(live);
        const beforeLen = catalogRef.current?.houses.length ?? 0;
        const reconciled = await reconcileWithDeviceCache(catalogRef.current);
        if (reconciled && reconciled.houses.length > beforeLen) {
          setCatalog((prev) => publishCatalog(reconciled, prev) ?? reconciled);
          if (!isMapListSuspended()) {
            setSource("cache");
            await saveCatalogCache(reconciled);
            window.dispatchEvent(new Event("hw-catalog-refreshed"));
          }
        }
        if (
          !catalogNeedsFullRefresh(
            catalogRef.current,
            loadCatalogCacheMeta(),
            resolveServerHouseCount(live) ?? resolveServerHouseCount(catalogRef.current),
          )
        ) {
          return;
        }
      } catch (err) {
        console.warn("[catalog] delta poll failed", err);
        const cached = await readDeviceCatalog();
        if (cached) {
          setCatalog((prev) => {
            const next = withDeviceHouseOverlays(syncCatalog(cached, prev ?? cached));
            return publishCatalog(next, prev) ?? next;
          });
          if (isMapListSuspended()) return;
          setSource("cache");
          setUnreachable(online);
          setError(null);
          return;
        }
      }
    }

    // Full load — shared snapshot first, then API delta for anything newer.
    try {
      if (readServerSimDown()) throw new Error("sim-down");
      const snap = await fetchJson(SNAPSHOT_URL, force || needsFullRefresh);
      let merged = withDeviceHouseOverlays(syncCatalog(catalogRef.current, snap));
      try {
        const live = await fetchJson("/api/catalog", false, snap.updatedAt);
        if (live.pollSeconds) {
          pollSecondsRef.current = live.pollSeconds;
          setPollSeconds(live.pollSeconds);
        }
        merged = withDeviceHouseOverlays(applyCatalogResponse(merged, live));
        markCatalogCacheComplete(merged);
        setCatalog((prev) => publishCatalog(merged, prev) ?? merged);
        if (isMapListSuspended()) return;
        setSource("network");
        setUnreachable(false);
        setError(null);
        await saveCatalogCache(merged);
        window.dispatchEvent(new Event("hw-catalog-refreshed"));
        return;
      } catch {
        setCatalog((prev) => {
          const next = merged;
          if (prev && catalogHasRealHouses(prev) && !catalogHasRealHouses(next)) return prev;
          return publishCatalog(next, prev) ?? next;
        });
        if (isMapListSuspended()) return;
        setSource("snapshot");
        setUnreachable(false);
        setError(null);
        if (catalogHasRealHouses(merged)) {
          markCatalogCacheComplete(merged);
          await saveCatalogCache(merged);
        }
        window.dispatchEvent(new Event("hw-catalog-refreshed"));
        return;
      }
    } catch {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        await applyLiveResponse(await fetchJson("/api/catalog", force));
        return;
      } catch {
        const cached = await readDeviceCatalog();
        let kept = false;
        setCatalog((prev) => {
          const merged = prev && cached ? syncCatalog(cached, prev) : (prev ?? cached);
          const next = merged ? withDeviceHouseOverlays(merged) : merged;
          kept = Boolean(next);
          if (next && !isMapListSuspended()) void saveCatalogCache(next);
          if (!next) return prev;
          return publishCatalog(next, prev) ?? next;
        });
        if (kept && !isMapListSuspended()) {
          setSource("cache");
          setUnreachable(online);
          setError(null);
          return;
        }
        if (isMapListSuspended()) return;
        setUnreachable(online);
        setError(
          online
            ? "השרת לא עונה, ואין עותק שמור בטלפון. נסו שוב כשיש קליטה."
            : "אין אינטרנט, ואין עותק שמור בטלפון. פתחו את האפליקציה פעם אחת כשיש רשת.",
        );
      }
    }
  }, [applyLiveResponse]);

  useEffect(() => {
    return subscribeMapListSuspend(() => {
      if (isMapListSuspended()) return;
      const pending = pendingCatalogRef.current;
      if (pending) {
        pendingCatalogRef.current = null;
        setCatalog(pending);
        setSource("network");
        setUnreachable(false);
        setError(null);
        void saveCatalogCache(pending);
        window.dispatchEvent(new Event("hw-catalog-refreshed"));
      }
      void refresh(false);
    });
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Let SSR seed catalog before deciding whether mount needs a network refresh.
      await Promise.resolve();
      if (!cancelled && !seededRef.current) {
        await refresh(false);
      }
      if (!cancelled) {
        setLoading(false);
        setReady(true);
      }
    })();

    const onOff = () => {
      const nowOffline = !navigator.onLine;
      setOffline(nowOffline);
      if (nowOffline) {
        setUnreachable(false);
        offlineSinceRef.current = Date.now();
        return;
      }
      void (async () => {
        await flushPendingHouseWrites();
        const awayMs =
          offlineSinceRef.current != null ? Date.now() - offlineSinceRef.current : 0;
        offlineSinceRef.current = null;
        await refresh(awayMs >= OFFLINE_FORCE_REFRESH_MS);
      })();
    };
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    const onVis = () => {
      if (appInForeground() && !isMapListSuspended()) void refresh(false);
    };
    document.addEventListener("visibilitychange", onVis);
    const onChanged = () => void refresh(true);
    window.addEventListener("hw-catalog-changed", onChanged);
    const onSim = () => void refresh(true);
    window.addEventListener(SERVER_SIM_EVENT, onSim);

    let pollTimer: number | undefined;
    const schedulePoll = () => {
      const delay = adaptiveCatalogPollMs(
        pollSecondsRef.current,
        emptyDeltaStreakRef.current,
      );
      pollTimer = window.setTimeout(() => {
        if (!cancelled && appInForeground() && !isMapListSuspended()) void refresh(false);
        if (!cancelled) schedulePoll();
      }, delay);
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
    ready,
    offline,
    unreachable,
    error,
    source,
    pollSeconds,
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
