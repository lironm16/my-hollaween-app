"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";
import { shouldStartGeoWatchOnBoot, trustPermissionsQueryDenied } from "@/lib/geo-watch-boot";
import { readGpsSessionSeed, writeGpsSessionSeed } from "@/lib/gps-session-seed";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

/** Live watch — tight but Android-safe (`maximumAge: 0` stalls watches after WebXR). */
function mapWatchPositionOptions(): PositionOptions {
  if (isAndroidLike()) {
    return { enableHighAccuracy: true, maximumAge: 5_000, timeout: 25_000 };
  }
  return { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 };
}

const freshOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

const androidRelaxedOpts: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 20_000,
};

/** One-shot reads — allow a recent OS fix (e.g. Google Maps just updated GPS). */
export const GEOLOCATION_CACHED_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 12_000,
};
/** Force a new high-accuracy read when cache is empty. */
export const GEOLOCATION_FRESH_OPTS: PositionOptions = freshOpts;

/** Android: restart watch if no fix (WebXR / dual-watch can kill callbacks). */
const MAP_GPS_STALE_MS = 8_000;
const MAP_GPS_HEALTH_INTERVAL_MS = 4_000;
const ANDROID_GPS_POLL_MS = 3_500;

export function readUserLocation(options: PositionOptions = GEOLOCATION_CACHED_OPTS): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      options,
    );
  });
}

/** Shared lookup for «המיקום שלי» — reuse app GPS, then cached, then fresh. */
export async function resolveUserLocationForUi(input?: {
  seed?: UserLocation | null;
  refresh?: () => Promise<UserLocation | null>;
}): Promise<UserLocation | null> {
  if (input?.seed) return input.seed;
  if (input?.refresh) {
    const refreshed = await input.refresh();
    if (refreshed) return refreshed;
  }
  const cached = await readUserLocation(GEOLOCATION_CACHED_OPTS);
  if (cached) return cached;
  return readUserLocation(GEOLOCATION_FRESH_OPTS);
}

async function queryGeoPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const result = await navigator.permissions?.query({ name: "geolocation" });
    if (result?.state === "granted" || result?.state === "denied" || result?.state === "prompt") {
      return result.state;
    }
  } catch {
    /* Safari / insecure context */
  }
  return "unknown";
}

export function useUserLocation(options?: { watch?: boolean }) {
  const [watchOverride, setWatchOverride] = useState<boolean | null>(null);
  const setWatchEnabled = useCallback((enabled: boolean) => setWatchOverride(enabled), []);
  const watchEnabled = watchOverride ?? options?.watch ?? true;
  const [location, setLocation] = useState<UserLocation | null>(() => readGpsSessionSeed());
  const [status, setStatus] = useState<LocationStatus>(() =>
    readGpsSessionSeed() ? "ready" : "idle",
  );
  const watchId = useRef<number | null>(null);
  const last = useRef<UserLocation | null>(readGpsSessionSeed());
  const lastFixAtRef = useRef(readGpsSessionSeed() ? Date.now() : 0);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const apply = useCallback((pos: GeolocationPosition) => {
    const next: UserLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    lastFixAtRef.current = Date.now();
    const prev = last.current;
    if (
      prev &&
      prev.lat === next.lat &&
      prev.lng === next.lng &&
      prev.accuracy === next.accuracy
    ) {
      return;
    }
    last.current = next;
    writeGpsSessionSeed(next);
    setLocation(next);
    setStatus("ready");
  }, []);

  const restartWatchRef = useRef<() => void>(() => {});

  const pokeRelaxedFix = useCallback(() => {
    if (!navigator.geolocation || !isAndroidLike()) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos),
      () => {},
      androidRelaxedOpts,
    );
  }, [apply]);

  const fail = useCallback(
    (err?: GeolocationPositionError) => {
      if (err?.code === 1) {
        stopWatch();
        setStatus("denied");
        return;
      }
      if (last.current) {
        setStatus("ready");
      } else {
        setStatus("error");
      }
      if (err?.code === 2 || err?.code === 3) {
        if (isAndroidLike()) pokeRelaxedFix();
        window.setTimeout(() => restartWatchRef.current(), 800);
      }
    },
    [pokeRelaxedFix, stopWatch],
  );

  const startWatch = useCallback(() => {
    if (!watchEnabled) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (watchId.current !== null) return;
    setStatus((s) => (s === "ready" ? s : "pending"));
    const opts = mapWatchPositionOptions();
    watchId.current = navigator.geolocation.watchPosition((pos) => apply(pos), fail, opts);
    navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, opts);
  }, [apply, fail, watchEnabled]);

  const restartWatch = useCallback(() => {
    stopWatch();
    startWatch();
  }, [startWatch, stopWatch]);

  restartWatchRef.current = restartWatch;

  const pokeFreshFix = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos),
      () => {
        if (isAndroidLike()) pokeRelaxedFix();
      },
      freshOpts,
    );
  }, [apply, pokeRelaxedFix]);

  const refresh = useCallback((): Promise<UserLocation | null> => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      void (async () => {
        const permission = await queryGeoPermission();
        if (permission === "denied" && trustPermissionsQueryDenied()) {
          setStatus("denied");
          resolve(null);
          return;
        }
        setStatus((s) => (s === "ready" ? s : "pending"));
        if (shouldStartGeoWatchOnBoot(permission)) startWatch();

        const finish = (pos: GeolocationPosition) => {
          apply(pos);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        };

        const onFail = (err: GeolocationPositionError, retriedFresh: boolean) => {
          if (!retriedFresh) {
            navigator.geolocation.getCurrentPosition(
              finish,
              (retryErr) => {
                if (isAndroidLike() && retryErr.code !== 1) {
                  navigator.geolocation.getCurrentPosition(
                    finish,
                    (finalErr) => {
                      fail(finalErr);
                      resolve(last.current);
                    },
                    androidRelaxedOpts,
                  );
                  return;
                }
                fail(retryErr);
                resolve(last.current);
              },
              freshOpts,
            );
            return;
          }
          fail(err);
          resolve(last.current);
        };

        navigator.geolocation.getCurrentPosition(
          finish,
          (err) => onFail(err, false),
          GEOLOCATION_CACHED_OPTS,
        );
      })();
    });
  }, [apply, fail, startWatch]);

  useEffect(() => {
    if (!watchEnabled) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const seed = readGpsSessionSeed();
      if (seed) {
        last.current = seed;
        lastFixAtRef.current = Date.now();
        setLocation(seed);
        setStatus("ready");
      }
      restartWatch();
      pokeFreshFix();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [watchEnabled, restartWatch, pokeFreshFix]);

  useEffect(() => {
    const onPageShow = () => {
      const seed = readGpsSessionSeed();
      if (seed) {
        last.current = seed;
        lastFixAtRef.current = Date.now();
        setLocation(seed);
        setStatus("ready");
      }
      if (watchEnabled) {
        restartWatch();
        pokeFreshFix();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [watchEnabled, restartWatch, pokeFreshFix]);

  useEffect(() => {
    if (!watchEnabled || !isAndroidLike()) return;
    const id = window.setInterval(() => {
      const stale =
        lastFixAtRef.current === 0 || Date.now() - lastFixAtRef.current > MAP_GPS_STALE_MS;
      if (!stale) return;
      restartWatch();
      pokeFreshFix();
    }, MAP_GPS_HEALTH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [watchEnabled, restartWatch, pokeFreshFix]);

  /** Android WebView: watchPosition callbacks sometimes stop; poll as backup. */
  useEffect(() => {
    if (!watchEnabled || !isAndroidLike()) return;
    const id = window.setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => apply(pos),
        () => pokeRelaxedFix(),
        mapWatchPositionOptions(),
      );
    }, ANDROID_GPS_POLL_MS);
    return () => window.clearInterval(id);
  }, [watchEnabled, apply, pokeRelaxedFix]);

  useEffect(() => {
    if (!watchEnabled) {
      stopWatch();
      return;
    }

    let cancelled = false;
    let permission: PermissionStatus | null = null;

    const onPermission = () => {
      if (cancelled || !permission) return;
      if (permission.state === "denied" && trustPermissionsQueryDenied()) {
        stopWatch();
        setStatus("denied");
        return;
      }
      startWatch();
      pokeFreshFix();
    };

    async function boot() {
      if (!navigator.geolocation) {
        setStatus("unavailable");
        return;
      }
      startWatch();
      pokeFreshFix();
      try {
        permission = (await navigator.permissions?.query({ name: "geolocation" })) ?? null;
        permission?.addEventListener("change", onPermission);
      } catch {
        /* ignore */
      }
    }

    void boot();
    return () => {
      cancelled = true;
      permission?.removeEventListener("change", onPermission);
      stopWatch();
    };
  }, [watchEnabled, startWatch, stopWatch, pokeFreshFix]);

  return { location, status, refresh, setWatchEnabled };
}
