"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GPS_MOVE_METERS, movedAtLeast } from "@/lib/geo";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

const watchOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 12_000,
};

const freshOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

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

  const apply = useCallback((pos: GeolocationPosition, force = false) => {
    const next: UserLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    const prev = last.current;
    if (!force && prev && !movedAtLeast(prev, next, GPS_MOVE_METERS)) {
      return;
    }
    last.current = next;
    setLocation(next);
    setStatus("ready");
  }, []);

  const fail = useCallback((err?: GeolocationPositionError) => {
    if (err?.code === 1) setStatus("denied");
    else setStatus("error");
  }, []);

  const startWatch = useCallback(() => {
    if (!watchEnabled) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (watchId.current !== null) return;
    setStatus((s) => (s === "ready" ? s : "pending"));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => apply(pos, false),
      fail,
      watchOpts,
    );
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
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            apply(pos, true);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          },
          (err) => {
            fail(err);
            resolve(last.current);
          },
          freshOpts,
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
