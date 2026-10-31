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
import { useLocale } from "@/hooks/use-locale";
import {
  catalogScopeOf,
  hiddenCountFields,
  catalogDeltaSince,
  mergeCatalogDelta,
  normalizeCatalogDelta,
  syncCatalog,
} from "@/lib/catalog-sync";
import { config } from "@/lib/config";
import { adaptiveCatalogPollMs, appInForeground } from "@/lib/catalog-poll";
import {
  loadCatalogCache,
  loadCatalogCacheMeta,
  loadCatalogCacheSync,
  recordCatalogCacheVerified,
  clearCatalogCacheMeta,
  flushScheduledCatalogCacheWrite,
  scheduleSaveCatalogCache,
  flushPendingHouseWrites,
  refreshStaleOwnedPreviews,
  withDeviceHouseOverlays,
} from "@/lib/offline-db";
import { appNow, CLOCK_EVENT, readServerSimDown, SERVER_SIM_EVENT } from "@/lib/app-clock";
import { runCatalogBootMigrationIfNeeded } from "@/lib/catalog-boot-migration";
import {
  catalogCacheIncomplete,
  catalogNeedsFullRefresh,
  catalogServerCountMismatch,
  catalogServerCountSatisfied,
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
import { syncPlacedGemAnchors } from "@/lib/gem-placed-anchors";
import { gemHuntMapHouses } from "@/lib/gem-monsters";
import { isPoiHouse } from "@/lib/house-kind";
import { houseWithLocationPolicy, isAddressRevealed } from "@/lib/address-reveal";
import { visitorPreviewAddressRevealContext } from "@/lib/visitor-preview-address";
import { withServerHouseDetail } from "@/lib/device-catalog-cache";
import { HOUSE_DETAIL_LOADED_EVENT } from "@/lib/fetch-public-house";
import { houseIsAtLeastAsNew } from "@/lib/house-updated-at";
import { readGemPreviewAsUser } from "@/lib/gem-preview-as-user";
import { isMapListSuspended, subscribeMapListSuspend } from "@/lib/map-list-suspend";
import { trackCatalogRemovalDelta } from "@/lib/catalog-removed";
import {
  catalogScopeKey,
  catalogScopeMismatchesResponse,
  catalogUrls,
  nightPassAudience,
  readNightPassState,
  readStoredCatalogScope,
  refreshNightPassState,
  subscribeNightPassState,
  writeStoredCatalogScope,
} from "@/lib/night-pass-client";
import { clearDeviceCatalogCache } from "@/lib/offline-db";
import { clearSessionHouseDetails } from "@/lib/house-detail-session-cache";
import { subscribeAdminPreviewAsUser } from "@/lib/admin-preview-as-user";
import { recordLiveCatalogRemovals } from "@/lib/server-removed-houses";
import { verifyOwnedHousesOnServer } from "@/lib/owned-house-check";
import { repairOwnedPreviewsMissingAddress } from "@/lib/owned-bookmark-house";

type Source = "network" | "cache" | "snapshot" | "ssr";

function catalogHomesMissingStreet(catalog: Catalog | null | undefined): boolean {
  if (!catalog?.houses?.length) return false;
  return catalog.houses.some(
    (house) => !house.locationPublic && !isPoiHouse(house) && !house.address?.trim(),
  );
}

/** Full-list source: static deploy bundle (night passes off) or the scoped catalog API. */
function snapshotUrl() {
  return catalogUrls().snapshot;
}

/** Live catalog / `?since=` delta source for this device's night-pass scope. */
function catalogApiUrl() {
  return catalogUrls().api;
}
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

/** Live API full catalogs may drop ids; never use for CDN snapshot bundles. */
function syncLiveCatalog(prev: Catalog | null, incoming: CatalogDelta): Catalog {
  const normalized = normalizeCatalogDelta(incoming);
  const opts = incoming.full === true ? { trustedCompleteList: true as const } : undefined;
  return syncCatalog(prev, normalized, opts);
}

async function fetchJson(url: string, force = false, since?: string): Promise<CatalogDelta> {
  const params = new URLSearchParams();
  if (force) params.set("t", String(Date.now()));
  else if (since) params.set("since", since);
  const qs = params.toString();
  const href = qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
  const res = await fetch(href, {
    cache: force || since ? "no-store" : "default",
    signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("bad status");
  const raw: unknown = await res.json();
  return normalizeCatalogDelta(raw);
}

/** Response → Catalog, keeping `scope` so lists for different night-pass audiences never merge. */
function catalogFromResponse(res: CatalogDelta): Catalog {
  return {
    updatedAt: res.updatedAt,
    neighborhood: res.neighborhood,
    houses: res.houses ?? [],
    houseCount: res.houseCount,
    pushTemplates: res.pushTemplates,
    eventSettings: res.eventSettings,
    ...(res.scope ? { scope: res.scope } : {}),
    ...hiddenCountFields(res),
  };
}

/** Last resort — full live catalog (expensive on Firestore). Prefer recoverCatalogShortfall. */
async function fetchFullCatalogBundle(base: Catalog | null): Promise<Catalog | null> {
  try {
    const full = await fetchJson(catalogApiUrl(), true);
    recordLiveCatalogRemovals(full);
    const payload = catalogFromResponse(full);
    return withDeviceHouseOverlays(
      syncCatalog(base, payload, { trustedCompleteList: true as const }),
    );
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

    const snap = await fetchJson(snapshotUrl(), true);
    const snapCatalog = catalogFromResponse(snap);
    merged = withDeviceHouseOverlays(syncCatalog(merged, snapCatalog));
    resolvedCount =
      resolvedCount ??
      resolveServerHouseCount(merged) ??
      resolveServerHouseCount(snapCatalog);

    const live = await fetchJson(catalogApiUrl(), false, snap.updatedAt);
    recordLiveCatalogRemovals(live);
    merged = withDeviceHouseOverlays(applyCatalogResponse(merged, live));
    resolvedCount = resolvedCount ?? resolveServerHouseCount(live) ?? resolveServerHouseCount(merged);

    if (resolvedCount != null && catalogServerCountSatisfied(merged, resolvedCount)) {
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
    return syncLiveCatalog(prev, live);
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
  const { t } = useLocale();
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
  /** Bumped when the night-pass scope wipes the device cache — stale async reads must not land. */
  const scopeGenRef = useRef(0);
  const ownedCheckedRef = useRef(false);
  /** Tracks reveal clock so pass holders refetch unredacted rows once addresses open. */
  const revealWasOpenRef = useRef<boolean | null>(null);
  const houseDetailBatchRef = useRef<Map<string, PublicHouse>>(new Map());
  const houseDetailBatchTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  /** Night-pass audience changed (registered, pass lost, feature toggled) — drop the old list. */
  const syncCatalogScope = useCallback(async () => {
    const key = catalogScopeKey(readNightPassState());
    if (readStoredCatalogScope() === key) return false;
    scopeGenRef.current += 1;
    writeStoredCatalogScope(key);
    await clearDeviceCatalogCache();
    clearSessionHouseDetails();
    catalogRef.current = null;
    setCatalog(null);
    return true;
  }, []);

  useLayoutEffect(() => {
    if (cacheHydratedRef.current) return;
    cacheHydratedRef.current = true;
    runCatalogBootMigrationIfNeeded();
    if (readStoredCatalogScope() !== catalogScopeKey(readNightPassState())) {
      setLoading(false);
      return;
    }
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
    if (readStoredCatalogScope() !== catalogScopeKey(readNightPassState())) return;
    const gen = scopeGenRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchJson(snapshotUrl(), true);
        const snapshot = catalogFromResponse(snap);
        if (catalogScopeOf(syncCache) !== catalogScopeOf(snapshot)) {
          if (!cancelled) {
            setLoading(false);
            setReady(true);
          }
          return;
        }
        const repaired = applySnapshotStubFlags(
          withDeviceHouseOverlays(syncCache),
          snapshot,
        );
        if (cancelled || gen !== scopeGenRef.current) return;
        setCatalog(repaired);
        setSource("cache");
        setLoading(false);
        setReady(true);
        scheduleSaveCatalogCache(repaired);
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
    if (catalog?.houses) syncPlacedGemAnchors(catalog.houses);
  }, [catalog]);

  useEffect(() => {
    let cancelled = false;
    const gen = scopeGenRef.current;
    void (async () => {
      const merged = await reconcileWithDeviceCache(catalogRef.current);
      if (cancelled || !merged || gen !== scopeGenRef.current) return;
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
    refreshStaleOwnedPreviews(next.houses);
    void repairOwnedPreviewsMissingAddress();
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
    scheduleSaveCatalogCache(initial);
  }, []);

  const applyLiveResponse = useCallback(async (live: CatalogDelta) => {
    const passState = readNightPassState();
    if (catalogScopeMismatchesResponse(passState, live.scope)) {
      await refreshNightPassState({ force: true });
      await syncCatalogScope();
      void refresh(true);
      return catalogRef.current;
    }
    if (live.pollSeconds) {
      pollSecondsRef.current = live.pollSeconds;
      setPollSeconds(live.pollSeconds);
    }
    recordLiveCatalogRemovals(live);
    const prev = catalogRef.current;
    if (isEmptyDelta(live, prev)) {
      emptyDeltaStreakRef.current += 1;
      setUnreachable(false);
      setError(null);
      return prev;
    }
    emptyDeltaStreakRef.current = 0;
    const mergeInto = (cur: Catalog | null): Catalog => {
      const merged = withDeviceHouseOverlays(applyCatalogResponse(cur, live));
      const withDetail: Catalog = {
        ...merged,
        houses: merged.houses.map((row) => withServerHouseDetail(row)),
      };
      return publishCatalog(withDetail, cur) ?? withDetail;
    };
    // React may defer a state updater to the next render, so the code below cannot read its result.
    const next = mergeInto(prev);
    catalogRef.current = next;
    setCatalog((cur) => (cur === prev ? next : mergeInto(cur)));
    trackCatalogRemovalDelta(prev, next, live.removed);
    if (isMapListSuspended()) return next;
    setSource("network");
    setUnreachable(false);
    setError(null);
    quickRetryCountRef.current = 0;
    const serverCount = resolveServerHouseCount(live);
    if (serverCount != null && serverCount < next.houses.length) {
      clearCatalogCacheMeta();
    }
    if (live.full || catalogServerCountSatisfied(next, serverCount)) {
      recordCatalogCacheVerified(next);
    }
    window.dispatchEvent(new Event("hw-catalog-refreshed"));
    scheduleSaveCatalogCache(next);
    return next;
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (isMapListSuspended() && !force) return;
    const online = typeof navigator === "undefined" || navigator.onLine;
    setOffline(!online);
    if (!online) {
      const cached = await readDeviceCatalog();
      if (cached) {
        setCatalog((prev) => {
          const next = withDeviceHouseOverlays(syncCatalog(cached, prev ?? cached));
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
    const since = needsFullRefresh ? undefined : catalogDeltaSince(catalogRef.current);
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
        catalogHouseCount: catalogRef.current?.houseCount ?? null,
      })
    ) {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        const live = await fetchJson(catalogApiUrl(), false, since);
        let current = (await applyLiveResponse(live)) ?? catalogRef.current;
        const beforeLen = localCatalogHouseCount(current);
        const reconciled = await reconcileWithDeviceCache(current);
        if (reconciled && reconciled.houses.length > beforeLen) {
          current = reconciled;
          setCatalog((prev) => publishCatalog(reconciled, prev) ?? reconciled);
          if (!isMapListSuspended()) {
            setSource("cache");
            scheduleSaveCatalogCache(reconciled);
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
            catalogServerCountSatisfied(recovered, target) &&
            localCatalogHouseCount(recovered) >= localCatalogHouseCount(current)
          ) {
            setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
            if (!isMapListSuspended()) {
              setSource("network");
              setUnreachable(false);
              setError(null);
              quickRetryCountRef.current = 0;
              recordCatalogCacheVerified(recovered);
              scheduleSaveCatalogCache(recovered);
              window.dispatchEvent(new Event("hw-catalog-refreshed"));
            }
            return;
          }
          if (recovered && localCatalogHouseCount(recovered) > localCatalogHouseCount(current)) {
            current = recovered;
            setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
            if (!isMapListSuspended()) scheduleSaveCatalogCache(recovered);
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
      if (resolvedTarget != null && recovered && catalogServerCountSatisfied(recovered, resolvedTarget)) {
        setCatalog((prev) => publishCatalog(recovered, prev) ?? recovered);
        if (!isMapListSuspended()) {
          setSource("network");
          setUnreachable(false);
          setError(null);
          quickRetryCountRef.current = 0;
          recordCatalogCacheVerified(recovered);
          scheduleSaveCatalogCache(recovered);
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
      const snap = await fetchJson(snapshotUrl(), force || needsFullRefresh);
      let merged = withDeviceHouseOverlays(syncCatalog(catalogRef.current, snap));
      try {
        const live = await fetchJson(catalogApiUrl(), false, snap.updatedAt);
        recordLiveCatalogRemovals(live);
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
        if (serverCountFinal == null || catalogServerCountSatisfied(merged, serverCountFinal)) {
          recordCatalogCacheVerified(merged);
        }
        setCatalog((prev) => publishCatalog(merged, prev) ?? merged);
        if (isMapListSuspended()) return;
        setSource("network");
        setUnreachable(false);
        setError(null);
        quickRetryCountRef.current = 0;
        scheduleSaveCatalogCache(merged);
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
          recordCatalogCacheVerified(merged);
          scheduleSaveCatalogCache(merged);
        }
        window.dispatchEvent(new Event("hw-catalog-refreshed"));
        return;
      }
    } catch {
      try {
        if (readServerSimDown()) throw new Error("sim-down");
        await applyLiveResponse(await fetchJson(catalogApiUrl(), force));
        return;
      } catch {
        const cached = await readDeviceCatalog();
        const kept = Boolean(catalogRef.current ?? cached);
        setCatalog((prev) => {
          const merged = prev && cached ? syncCatalog(cached, prev) : (prev ?? cached);
          const next = merged ? withDeviceHouseOverlays(merged) : merged;
          if (next && !isMapListSuspended()) scheduleSaveCatalogCache(next);
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
        setError(online ? t("catalogBoot.serverDown") : t("catalogBoot.offlineNoCache"));
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

  const refreshPassCatalogIfStale = useCallback(async () => {
    const pass = readNightPassState();
    if (!pass.enabled || !pass.registered) return;
    const schedule =
      catalogRef.current?.eventSettings?.addressReveal ??
      loadCatalogCacheSync()?.eventSettings?.addressReveal;
    if (!isAddressRevealed(appNow(), schedule)) return;
    clearSessionHouseDetails();
    const cat = catalogRef.current ?? loadCatalogCacheSync();
    const scope = catalogScopeOf(cat);
    if (scope === "public" || (scope === "pass" && catalogHomesMissingStreet(cat))) {
      await refresh(true);
    }
  }, [refresh]);

  useEffect(() => {
    const flushHouseDetailBatch = () => {
      houseDetailBatchTimerRef.current = undefined;
      const batch = houseDetailBatchRef.current;
      if (batch.size === 0) return;
      houseDetailBatchRef.current = new Map();
      setCatalog((prev) => {
        if (!prev) return prev;
        let changed = false;
        const houses = prev.houses.map((row) => {
          const hit = batch.get(row.id);
          if (!hit) return row;
          if (!houseIsAtLeastAsNew(hit, row)) return row;
          changed = true;
          return hit;
        });
        if (!changed) return prev;
        const next = { ...prev, houses };
        catalogRef.current = next;
        scheduleSaveCatalogCache(next);
        window.dispatchEvent(new Event("hw-catalog-refreshed"));
        return next;
      });
    };

    const onHouseDetail = (event: Event) => {
      let house = (event as CustomEvent<PublicHouse>).detail;
      if (!house?.id) return;
      if (readGemPreviewAsUser()) {
        house = houseWithLocationPolicy(
          house,
          visitorPreviewAddressRevealContext(catalogRef.current?.eventSettings?.addressReveal),
        );
      }
      houseDetailBatchRef.current.set(house.id, house);
      if (houseDetailBatchTimerRef.current !== undefined) return;
      houseDetailBatchTimerRef.current = window.setTimeout(flushHouseDetailBatch, 48);
    };
    window.addEventListener(HOUSE_DETAIL_LOADED_EVENT, onHouseDetail);
    return () => {
      window.removeEventListener(HOUSE_DETAIL_LOADED_EVENT, onHouseDetail);
      if (houseDetailBatchTimerRef.current !== undefined) {
        window.clearTimeout(houseDetailBatchTimerRef.current);
      }
    };
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
        scheduleSaveCatalogCache(pending);
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
      await withTimeout(refreshNightPassState({ force: true }), 3000);
      await syncCatalogScope();
      if (!cancelled && !seededRef.current) {
        await refresh(false);
      }
      if (!cancelled) await refreshPassCatalogIfStale();
      if (!cancelled) {
        setLoading(false);
        setReady(true);
      }
      if (cancelled || ownedCheckedRef.current || !navigator.onLine) return;
      ownedCheckedRef.current = true;
      const gone = new Set(await verifyOwnedHousesOnServer());
      if (cancelled || gone.size === 0) return;
      setCatalog((prev) => {
        if (!prev) return prev;
        const next = { ...prev, houses: prev.houses.filter((house) => !gone.has(house.id)) };
        return publishCatalog(next, prev) ?? next;
      });
      window.dispatchEvent(new Event("hw-catalog-refreshed"));
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
    const onVisibilityFlush = () => {
      if (document.visibilityState === "hidden") void flushScheduledCatalogCacheWrite();
    };
    document.addEventListener("visibilitychange", onVisibilityFlush);
    const onChanged = () => void refresh(true);
    window.addEventListener("hw-catalog-changed", onChanged);
    const onSim = () => void refresh(true);
    window.addEventListener(SERVER_SIM_EVENT, onSim);
    const unsubscribeNightPass = subscribeNightPassState(() => {
      void (async () => {
        if (await syncCatalogScope()) await refresh(true);
        await refreshPassCatalogIfStale();
      })();
    });
    const unsubscribePreview = subscribeAdminPreviewAsUser(() => {
      clearSessionHouseDetails();
      void (async () => {
        await refreshNightPassState({ force: true });
        if (await syncCatalogScope()) await refresh(true);
      })();
    });

    const onRehearsalClock = () => {
      if (readGemPreviewAsUser()) clearSessionHouseDetails();
      const nightPass = readNightPassState();
      const revealed = isAddressRevealed(
        appNow(),
        catalogRef.current?.eventSettings?.addressReveal,
      );
      const wasRevealed = revealWasOpenRef.current;
      if (wasRevealed === null) {
        revealWasOpenRef.current = revealed;
        if (revealed && nightPass.enabled && nightPass.registered) {
          void refreshPassCatalogIfStale();
        }
        return;
      }
      revealWasOpenRef.current = revealed;
      if (
        wasRevealed === false &&
        revealed &&
        nightPass.enabled &&
        nightPass.registered
      ) {
        clearSessionHouseDetails();
        void refresh(true);
        void refreshPassCatalogIfStale();
      }
    };
    window.addEventListener(CLOCK_EVENT, onRehearsalClock);

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
      document.removeEventListener("visibilitychange", onVisibilityFlush);
      window.removeEventListener("hw-catalog-changed", onChanged);
      window.removeEventListener(SERVER_SIM_EVENT, onSim);
      unsubscribeNightPass();
      unsubscribePreview();
      window.removeEventListener(CLOCK_EVENT, onRehearsalClock);
    };
  }, [refresh, refreshPassCatalogIfStale, syncCatalogScope, publishCatalog]);

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
