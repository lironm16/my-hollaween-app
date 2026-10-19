"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

/** Fresh fixes for a tight map location dot. */
const watchOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 12_000,
};

const freshOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

/** Prefer cached fix (same as watch) — reliable in Chrome when the main map already has GPS. */
export const GEOLOCATION_CACHED_OPTS: PositionOptions = watchOpts;
/** Force a new high-accuracy read when cache is empty. */
export const GEOLOCATION_FRESH_OPTS: PositionOptions = freshOpts;

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
    setLocation(next);
    setStatus("ready");
  }, []);

  const fail = useCallback((err?: GeolocationPositionError) => {
    if (err?.code === 1) {
      setStatus("denied");
      return;
    }
    // Timeout / position unavailable — keep last fix so UI stays usable (common in installed PWA).
    if (last.current) {
      setStatus("ready");
      return;
    }
    setStatus("error");
  }, []);

  const startWatch = useCallback(() => {
    if (!watchEnabled) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (watchId.current !== null) return;
    setStatus((s) => (s === "ready" ? s : "pending"));
    watchId.current = navigator.geolocation.watchPosition((pos) => apply(pos), fail, watchOpts);
  }, [apply, fail, watchEnabled]);

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
          watchOpts,
        );
        if (permission !== "granted") startWatch();
      })();
    });
  }, [apply, fail, startWatch]);

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
