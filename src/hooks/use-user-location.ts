"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

/** Live watch — tight but Android-safe (`maximumAge: 0` stalls watches after WebXR). */
function mapWatchPositionOptions(): PositionOptions {
  if (isAndroidLike()) {
    return { enableHighAccuracy: true, maximumAge: 3_000, timeout: 20_000 };
  }
  return { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 };
}

const freshOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
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
const MAP_GPS_STALE_MS = 12_000;
const MAP_GPS_HEALTH_INTERVAL_MS = 6_000;

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
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const watchId = useRef<number | null>(null);
  const last = useRef<UserLocation | null>(null);
  const lastFixAtRef = useRef(0);

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
    lastFixAtRef.current = Date.now();
    setLocation(next);
    setStatus("ready");
  }, []);

  const restartWatchRef = useRef<() => void>(() => {});

  const fail = useCallback((err?: GeolocationPositionError) => {
    if (err?.code === 1) {
      setStatus("denied");
      return;
    }
    // Timeout / position unavailable — keep last fix so UI stays usable (common in installed PWA).
    if (last.current) {
      setStatus("ready");
    } else {
      setStatus("error");
    }
    if (err?.code === 2 || err?.code === 3) {
      window.setTimeout(() => restartWatchRef.current(), 800);
    }
  }, []);

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
      () => {},
      freshOpts,
    );
  }, [apply]);

  const refresh = useCallback((): Promise<UserLocation | null> => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      void (async () => {
        const permission = await queryGeoPermission();
        if (permission === "denied") {
          setStatus("denied");
          resolve(null);
          return;
        }
        setStatus((s) => (s === "ready" ? s : "pending"));
        if (permission === "granted") startWatch();

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
        if (permission !== "granted") startWatch();
      })();
    });
  }, [apply, fail, startWatch]);

  useEffect(() => {
    if (!watchEnabled) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
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

  useEffect(() => {
    if (!watchEnabled) {
      stopWatch();
      return;
    }

    let cancelled = false;
    let permission: PermissionStatus | null = null;

    const onPermission = () => {
      if (cancelled || !permission) return;
      if (permission.state === "granted") startWatch();
      else if (permission.state === "denied") setStatus("denied");
    };

    async function boot() {
      if (!navigator.geolocation) {
        setStatus("unavailable");
        return;
      }
      const state = await queryGeoPermission();
      if (cancelled) return;
      if (state === "granted") startWatch();
      else if (state === "denied") setStatus("denied");
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
  }, [watchEnabled, startWatch, stopWatch]);

  return { location, status, refresh, setWatchEnabled };
}
