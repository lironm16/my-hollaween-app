"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";
import { distanceMeters } from "@/lib/geo";
import { shouldStartGeoWatchOnBoot, trustPermissionsQueryDenied } from "@/lib/geo-watch-boot";
import { kickAndroidGeoPoll, subscribeAndroidGeoPoll } from "@/lib/android-geo-poll";
import { androidMapUsesGeoPolling } from "@/lib/map-geo-platform";
import { readGpsSessionSeed, writeGpsSessionSeed } from "@/lib/gps-session-seed";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  /** GeolocationPosition.timestamp when available (Android debug / staleness). */
  measuredAt?: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

const MAP_MOVE_MIN_METERS = 0.25;

function mapWatchPositionOptions(): PositionOptions {
  return { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 };
}

const freshOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

const androidRelaxedOpts: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 15_000,
  timeout: 22_000,
};

/** One-shot reads — allow a recent OS fix (e.g. Google Maps just updated GPS). */
export const GEOLOCATION_CACHED_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 12_000,
};
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

function fixChanged(prev: UserLocation | null, next: UserLocation): boolean {
  if (!prev) return true;
  if (prev.accuracy !== next.accuracy) return true;
  return distanceMeters(prev, next) >= MAP_MOVE_MIN_METERS;
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
  const androidUnsubRef = useRef<(() => void) | null>(null);
  const last = useRef<UserLocation | null>(readGpsSessionSeed());
  const lastFixAtRef = useRef(readGpsSessionSeed() ? Date.now() : 0);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (androidUnsubRef.current) {
      androidUnsubRef.current();
      androidUnsubRef.current = null;
    }
  }, []);

  const applyFix = useCallback((next: UserLocation) => {
    lastFixAtRef.current = Date.now();
    const prev = last.current;
    if (!fixChanged(prev, next)) return;
    last.current = next;
    writeGpsSessionSeed(next);
    setLocation(next);
    setStatus("ready");
  }, []);

  const apply = useCallback(
    (pos: GeolocationPosition) => {
      applyFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    [applyFix],
  );

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
        if (!androidMapUsesGeoPolling()) {
          window.setTimeout(() => restartWatchRef.current(), 800);
        }
      }
    },
    [pokeRelaxedFix, stopWatch],
  );

  const startAndroidPoll = useCallback(() => {
    if (!watchEnabled || !androidMapUsesGeoPolling()) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (androidUnsubRef.current) return;
    setStatus((s) => (s === "ready" ? s : "pending"));
    androidUnsubRef.current = subscribeAndroidGeoPoll((loc) =>
      applyFix({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        measuredAt: loc.measuredAt,
      }),
    );
  }, [applyFix, watchEnabled]);

  const startWatch = useCallback(() => {
    if (!watchEnabled) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (androidMapUsesGeoPolling()) {
      startAndroidPoll();
      return;
    }
    if (watchId.current !== null) return;
    setStatus((s) => (s === "ready" ? s : "pending"));
    const opts = mapWatchPositionOptions();
    watchId.current = navigator.geolocation.watchPosition((pos) => apply(pos), fail, opts);
    navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, opts);
  }, [apply, fail, startAndroidPoll, watchEnabled]);

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
        if (isAndroidLike()) kickAndroidGeoPoll();
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

  const resumeTracking = useCallback(() => {
    const seed = readGpsSessionSeed();
    if (seed) {
      last.current = seed;
      lastFixAtRef.current = Date.now();
      setLocation(seed);
      setStatus("ready");
    }
    if (!watchEnabled) return;
    if (androidMapUsesGeoPolling()) {
      kickAndroidGeoPoll();
      startAndroidPoll();
      return;
    }
    restartWatch();
    pokeFreshFix();
  }, [pokeFreshFix, restartWatch, startAndroidPoll, watchEnabled]);

  useEffect(() => {
    if (!watchEnabled) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      resumeTracking();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [watchEnabled, resumeTracking]);

  useEffect(() => {
    const onPageShow = () => resumeTracking();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resumeTracking]);

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
