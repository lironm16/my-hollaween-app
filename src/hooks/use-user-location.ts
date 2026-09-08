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

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const watchId = useRef<number | null>(null);
  const last = useRef<UserLocation | null>(null);

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
  }, [apply, fail]);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus((s) => (s === "ready" ? s : "pending"));
    navigator.geolocation.getCurrentPosition((pos) => apply(pos, true), fail, watchOpts);
    startWatch();
  }, [apply, fail, startWatch]);

  useEffect(() => {
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
      // Only attach the GPS watch when the browser already allowed it.
      // Calling watchPosition while permission is "prompt" re-asks on every refresh.
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
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [startWatch]);

  return { location, status, refresh };
}
