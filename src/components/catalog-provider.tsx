"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Catalog, CatalogDelta, PublicHouse } from "@/lib/types";
import { mergeCatalogDelta, normalizeCatalogDelta, syncCatalog } from "@/lib/catalog-sync";
import { config } from "@/lib/config";
import { adaptiveCatalogPollMs, appInForeground } from "@/lib/catalog-poll";
import {
  loadCatalogCache,
  loadCatalogCacheMeta,
  loadCatalogCacheSync,
  markCatalogCacheComplete,
  clearCatalogCacheComplete,
  saveCatalogCache,
  flushPendingHouseWrites,
  withDeviceHouseOverlays,
} from "@/lib/offline-db";
import { readServerSimDown, SERVER_SIM_EVENT } from "@/lib/app-clock";
import {
  catalogCacheIncomplete,
  catalogNeedsFullRefresh,
  catalogServerCountMismatch,
  isAuthoritativeHouseList,
  localCatalogHouseCount,
  resolveServerHouseCount,
} from "@/lib/catalog-houses";
import {
  shouldFetchFullCatalogAfterCheapRecovery,
  shouldUseSteadyDeltaPoll,
} from "@/lib/catalog-recovery";
import { catalogHasRealHouses } from "@/lib/house-set";
import { applySnapshotStubFlags } from "@/lib/catalog-stub-flags";
import { catalogHasExplicitStubFlags } from "@/lib/house-set";
import { ensureGemOsmAnchorsLoaded } from "@/lib/gem-osm-anchor-cache";
import { gemHuntMapHouses } from "@/lib/gem-monsters";
import { houseWithLocationPolicy, visitorAddressRevealContext } from "@/lib/address-reveal";
import { appNow } from "@/lib/app-clock";
import { withServerHouseDetail } from "@/lib/device-catalog-cache";
import { HOUSE_DETAIL_LOADED_EVENT } from "@/lib/fetch-public-house";
import { readGemPreviewAsUser } from "@/lib/gem-preview-as-user";
import { loadOwnedHouses } from "@/lib/offline-db";
import { isMapListSuspended, subscribeMapListSuspend } from "@/lib/map-list-suspend";
import { trackCatalogRemovalDelta } from "@/lib/catalog-removed";

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

const CATALOG_FETCH_TIMEOUT_MS = 18_000;
/** After a failed sync, retry sooner than the normal poll (e.g. post-deploy cold start). */
const CATALOG_QUICK_RETRY_MS = 12_000;
const CATALOG_QUICK_RETRY_MAX = 4;

function isFetchTimeout(err: unknown) {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError" || err.name === "AbortSignal")
  );
}

async function fetchJson(url: string, force = false, since?: string): Promise<CatalogDelta> {
  const params = new URLSearchParams();
  if (force) params.set("t", String(Date.now()));
  else if (since) params.set("since", since);
  const qs = params.toString();
  const href = qs ? `${url}?${qs}` : url;
  const res = await fetch(href, {
    cache: force || since ? "no-store" : "default",
    signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("bad status");
  const raw: unknown = await res.json();
  return normalizeCatalogDelta(raw);
}

/** Last resort — full live catalog (expensive on Firestore). Prefer recoverCatalogShortfall. */
async function fetchFullCatalogBundle(base: Catalog | null): Promise<Catalog | null> {
  try {
    const full = await fetchJson("/api/catalog", true);
    const payload: Catalog = {
      updatedAt: full.updatedAt,
      neighborhood: full.neighborhood,
      houses: full.houses ?? [],
      houseCount: full.houseCount,
      pushTemplates: full.pushTemplates,
      eventSettings: full.eventSettings,
    };
    return withDeviceHouseOverlays(syncCatalog(base, payload));
  } catch {
    return null;
  }
}

/** CDN snapshot + wide incremental delta; full catalog only for large gaps (or force). */
async function recoverCatalogShortfall(
  base: Catalog | null,
  serverCount: number | undefined,
  opts: { forceFull?: boolean },
): Promise<Catalog | null> {
  if (opts.forceFull) return fetchFullCatalogBundle(base);
  if (
    serverCount != null &&
    serverCount >= 0 &&
    !catalogServerCountMismatch(base, serverCount)
  ) {
    return base;
  }

  let merged = base;
  let resolvedCount = serverCount;
  try {
    const cached = await readDeviceCatalog();
    if (cached) merged = mergeDeviceCatalog(merged, cached);

    const snap = await fetchJson(SNAPSHOT_URL, true);
    const snapCatalog: Catalog = {
      updatedAt: snap.updatedAt,
      neighborhood: snap.neighborhood,
      houses: snap.houses ?? [],
      houseCount: snap.houseCount,
      pushTemplates: snap.pushTemplates,
      eventSettings: snap.eventSettings,
    };
    merged = withDeviceHouseOverlays(syncCatalog(merged, snapCatalog));
    resolvedCount =
      resolvedCount ??
      resolveServerHouseCount(merged) ??
      resolveServerHouseCount(snapCatalog);

    const live = await fetchJson("/api/catalog", false, snap.updatedAt);
    merged = withDeviceHouseOverlays(applyCatalogResponse(merged, live));
    resolvedCount = resolvedCount ?? resolveServerHouseCount(live) ?? resolveServerHouseCount(merged);

    if (resolvedCount != null && !catalogServerCountMismatch(merged, resolvedCount)) {
      return merged;
    }
  } catch {
    /* best-effort cheap path */
  }

  if (resolvedCount == null || resolvedCount < 0) return merged;

  const localCount = localCatalogHouseCount(merged);
  if (shouldFetchFullCatalogAfterCheapRecovery(resolvedCount, localCount)) {
    return fetchFullCatalogBundle(merged);
  }
  return merged;
}

function applyCatalogResponse(prev: Catalog | null, live: CatalogDelta): Catalog {
  live = normalizeCatalogDelta(live);
  if (!prev || live.full) {
    return syncCatalog(prev, live);
  }
  if (live.houses.length || live.removed?.length || live.pushTemplates || live.eventSettings) {
    return mergeCatalogDelta(prev, live);
  }
  const serverCount = resolveServerHouseCount(live);
  if (catalogServerCountMismatch(prev, serverCount)) {
    return {
      ...prev,
      updatedAt: live.updatedAt,
      houseCount: serverCount ?? prev.houseCount,
    };
  }
  if (prev.updatedAt === live.updatedAt) return prev;
  return {
    ...prev,
    updatedAt: live.updatedAt,
    houseCount: live.houseCount ?? prev.houseCount,
  };
}

function isEmptyDelta(live: CatalogDelta, prev: Catalog | null) {
  if (live.full) return false;
  if (live.houses.length || live.removed?.length || live.pushTemplates || live.eventSettings) {
    return false;
  }
  if (!prev) return false;
  if (catalogServerCountMismatch(prev, resolveServerHouseCount(live))) return false;
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
  if (prev && isAuthoritativeHouseList(prev)) {
    if (cached.houses.length > prev.houses.length) {
      return mergeDeviceCatalog(prev, cached);
    }
    return withDeviceHouseOverlays(prev);
  }
  const merged = mergeDeviceCatalog(prev, cached);
  if (prev && isAuthoritativeHouseList(merged)) return merged;
  if (prev && merged.houses.length <= prev.houses.length) return prev;
  if (prev && merged.houses.length > prev.houses.length && isAuthoritativeHouseList(prev)) {
    return withDeviceHouseOverlays(prev);
  }
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
  const catalogRef = useRef(catalog);
  const pollSecondsRef = useRef(config.catalogPollSeconds);
  const emptyDeltaStreakRef = useRef(0);
  const offlineSinceRef = useRef<number | null>(null);
  const seededRef = useRef(false);
  const pendingCatalogRef = useRef<Catalog | null>(null);
  const quickRetryCountRef = useRef(0);
  const quickRetryTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

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
    if (catalogHasExplicitStubFlags(syncCache)) {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const syncCache = loadCatalogCacheSync();
    if (!syncCache?.houses.length || catalogHasExplicitStubFlags(syncCache)) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchJson(SNAPSHOT_URL, true);
        const snapshot: Catalog = {
          updatedAt: snap.updatedAt,
          neighborhood: snap.neighborhood,
          houses: snap.houses ?? [],
          houseCount: snap.houseCount,
          pushTemplates: snap.pushTemplates,
          eventSettings: snap.eventSettings,
        };
        const repaired = applySnapshotStubFlags(
          withDeviceHouseOverlays(syncCache),
          snapshot,
        );
        if (cancelled) return;
        setCatalog(repaired);
        setSource("cache");
        setLoading(false);
        setReady(true);
        await saveCatalogCache(repaired);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const gemEligibleHouses = useMemo(() => {
    if (!catalog?.houses?.length) return undefined;
    return gemHuntMapHouses(catalog.houses, "real");
  }, [catalog]);

  useEffect(() => {
    ensureGemOsmAnchorsLoaded(catalog?.updatedAt ?? null, gemEligibleHouses);
  }, [catalog?.updatedAt, gemEligibleHouses]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const merged = await reconcileWithDeviceCache(catalogRef.current);
      if (cancelled || !merged) return;
      setCatalog(merged);
      setSource("cache");
      if (catalogHasExplicitStubFlags(merged)) {
        setLoading(false);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [pollSeconds, setPollSeconds] = useState(config.catalogPollSeconds);

  const publishCatalog = useCallback((next: Catalog, prev: Catalog | null) => {
    if (isMapListSuspended()) {
      pendingCatalogRef.current = next;
      return prev;
    }
    return next;
  }, []);

  /** Banner only when the API failed and the on-device list may be stale — not every blip while online. */
  const markReachabilityAfterFetchFailure = useCallback((online: boolean) => {
    if (!online) {
      setUnreachable(false);
      return;
    }
    if (readServerSimDown()) {
      setUnreachable(true);
      return;
    }
    const cat = catalogRef.current;
    const stale =
      !cat ||
      !catalogHasRealHouses(cat) ||
      catalogCacheIncomplete(cat, loadCatalogCacheMeta(), resolveServerHouseCount(cat));
    setUnreachable(stale);
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
      setUnreachable(false);
      setError(null);
      return prev;
    }
    emptyDeltaStreakRef.current = 0;
    let next!: Catalog;
    setCatalog((cur) => {
      let merged = withDeviceHouseOverlays(applyCatalogResponse(cur, live));
      merged = {
        ...merged,
        houses: merged.houses.map((row) => withServerHouseDetail(row)),
      };
      next = merged === cur ? cur : merged;
      if (next === cur) return cur;
      const published = publishCatalog(next, cur);
      next = published ?? next;
      return next;
    });
    trackCatalogRemovalDelta(prev, next, live.removed);
    if (isMapListSuspended()) return next;
    setSource("network");
    setUnreachable(false);
    setError(null);
    quickRetryCountRef.current = 0;
    const serverCount = resolveServerHouseCount(live);
    if (serverCount != null && serverCount < next.houses.length) {
      clearCatalogCacheComplete();
    }
    if (
      live.full ||
      (serverCount != null &&
        serverCount >= next.houses.length &&
        next.houses.length >= serverCount)
    ) {
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
    const expectedServerCount =
      resolveServerHouseCount(catalogRef.current) ?? cacheMeta?.houseCount ?? null;
    const localCount = localCatalogHouseCount(catalogRef.current);

    // Delta poll — only when the local list already matches the server count.
    if (
      shouldUseSteadyDeltaPoll({
        localCount,
        since,
        needsFullRefresh,
        serverCount: expectedServerCount,
        cacheMarkedComplete: cacheMeta?.complete,
      })
    ) {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        const live = await fetchJson("/api/catalog", false, since);
        let current = (await applyLiveResponse(live)) ?? catalogRef.current;
        const beforeLen = localCatalogHouseCount(current);
        const reconciled = await reconcileWithDeviceCache(current);
        if (reconciled && reconciled.houses.length > beforeLen) {
          current = reconciled;
          setCatalog((prev) => publishCatalog(reconciled, prev) ?? reconciled);
          if (!isMapListSuspended()) {
            setSource("cache");
            await saveCatalogCache(reconciled);
            window.dispatchEvent(new Event("hw-catalog-refreshed"));
          }
        }
        const serverCountAfterPoll =
          resolveServerHouseCount(live) ?? resolveServerHouseCount(current);
        if (catalogServerCountMismatch(current, serverCountAfterPoll)) {
          const recovered = await recoverCatalogShortfall(current, serverCountAfterPoll, {
            forceFull: force,
          });
          const target = serverCountAfterPoll;
          if (
            recovered &&
            !catalogServerCountMismatch(recovered, target) &&
            localCatalogHouseCount(recovered) >= localCatalogHouseCount(current)
          ) {
            setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
            if (!isMapListSuspended()) {
              setSource("network");
              setUnreachable(false);
              setError(null);
              quickRetryCountRef.current = 0;
              markCatalogCacheComplete(recovered);
              await saveCatalogCache(recovered);
              window.dispatchEvent(new Event("hw-catalog-refreshed"));
            }
            return;
          }
          if (recovered && localCatalogHouseCount(recovered) > localCatalogHouseCount(current)) {
            current = recovered;
            setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
            if (!isMapListSuspended()) await saveCatalogCache(recovered);
          }
        }
        if (
          !catalogNeedsFullRefresh(
            current,
            loadCatalogCacheMeta(),
            serverCountAfterPoll,
          )
        ) {
          return;
        }
      } catch (err) {
        if (!isFetchTimeout(err)) console.warn("[catalog] delta poll failed", err);
        const cached = await readDeviceCatalog();
        if (cached) {
          setCatalog((prev) => {
            const next = withDeviceHouseOverlays(syncCatalog(cached, prev ?? cached));
            return publishCatalog(next, prev) ?? next;
          });
          if (isMapListSuspended()) return;
          setSource("cache");
          // Fall through to snapshot + API full load — CDN snapshot often works when serverless is cold.
        }
      }
    }

    const shortfallTarget = resolveServerHouseCount(catalogRef.current) ?? cacheMeta?.houseCount;
    const needsShortfallRecovery =
      localCount === 0 ||
      (shortfallTarget != null && catalogServerCountMismatch(catalogRef.current, shortfallTarget));
    if (needsShortfallRecovery) {
      const recovered = await recoverCatalogShortfall(catalogRef.current, shortfallTarget ?? undefined, {
        forceFull: force,
      });
      const resolvedTarget = resolveServerHouseCount(recovered) ?? shortfallTarget;
      if (resolvedTarget != null && recovered && !catalogServerCountMismatch(recovered, resolvedTarget)) {
        setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
        if (!isMapListSuspended()) {
          setSource("network");
          setUnreachable(false);
          setError(null);
          quickRetryCountRef.current = 0;
          markCatalogCacheComplete(recovered);
          await saveCatalogCache(recovered);
          window.dispatchEvent(new Event("hw-catalog-refreshed"));
        }
        return;
      }
      if (recovered && localCatalogHouseCount(recovered) > localCatalogHouseCount(catalogRef.current)) {
        setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
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
        const serverCountAfterDelta = resolveServerHouseCount(live);
        if (
          serverCountAfterDelta != null &&
          merged.houses.length < serverCountAfterDelta &&
          !live.full
        ) {
          const recovered = await recoverCatalogShortfall(merged, serverCountAfterDelta, {
            forceFull: force,
          });
          if (recovered) merged = recovered;
        }
        const serverCountFinal =
          resolveServerHouseCount(live) ?? resolveServerHouseCount(merged);
        if (
          serverCountFinal == null ||
          !catalogServerCountMismatch(merged, serverCountFinal)
        ) {
          markCatalogCacheComplete(merged);
        }
        setCatalog((prev) => publishCatalog(merged, prev) ?? merged);
        if (isMapListSuspended()) return;
        setSource("network");
        setUnreachable(false);
        setError(null);
        quickRetryCountRef.current = 0;
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
        quickRetryCountRef.current = 0;
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
          markReachabilityAfterFetchFailure(online);
          setError(null);
          return;
        }
        if (isMapListSuspended()) return;
        markReachabilityAfterFetchFailure(online);
        setError(
          online
            ? "השרת לא עונה, ואין עותק שמור בטלפון. נסו שוב כשיש קליטה."
            : "אין אינטרנט, ואין עותק שמור בטלפון. פתחו את האפליקציה פעם אחת כשיש רשת.",
        );
      }
    }

    if (online && !readServerSimDown()) {
      const cat = catalogRef.current;
      const stillStale =
        !cat ||
        !catalogHasRealHouses(cat) ||
        catalogCacheIncomplete(cat, loadCatalogCacheMeta(), resolveServerHouseCount(cat));
      if (
        stillStale &&
        quickRetryCountRef.current < CATALOG_QUICK_RETRY_MAX &&
        !isMapListSuspended()
      ) {
        quickRetryCountRef.current += 1;
        if (quickRetryTimerRef.current !== undefined) {
          window.clearTimeout(quickRetryTimerRef.current);
        }
        quickRetryTimerRef.current = window.setTimeout(() => {
          quickRetryTimerRef.current = undefined;
          void refresh(false);
        }, CATALOG_QUICK_RETRY_MS);
      } else if (!stillStale) {
        quickRetryCountRef.current = 0;
      }
    }
  }, [applyLiveResponse, markReachabilityAfterFetchFailure]);

  useEffect(() => {
    const onHouseDetail = (event: Event) => {
      let house = (event as CustomEvent<PublicHouse>).detail;
      if (!house?.id) return;
      if (readGemPreviewAsUser()) {
        house = houseWithLocationPolicy(
          house,
          visitorAddressRevealContext(
            appNow(),
            loadOwnedHouses().map((row) => row.id),
          ),
        );
      }
      setCatalog((prev) => {
        if (!prev) return prev;
        const houses = prev.houses.map((row) => (row.id === house.id ? house : row));
        return { ...prev, houses };
      });
    };
    window.addEventListener(HOUSE_DETAIL_LOADED_EVENT, onHouseDetail);
    return () => window.removeEventListener(HOUSE_DETAIL_LOADED_EVENT, onHouseDetail);
  }, []);

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
      if (quickRetryTimerRef.current !== undefined) window.clearTimeout(quickRetryTimerRef.current);
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("hw-catalog-changed", onChanged);
      window.removeEventListener(SERVER_SIM_EVENT, onSim);
    };
  }, [refresh]);

  const value: CatalogContextValue = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

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
