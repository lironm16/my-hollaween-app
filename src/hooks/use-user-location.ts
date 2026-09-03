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

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus((s) => (s === "ready" ? s : "pending"));
    navigator.geolocation.getCurrentPosition((pos) => apply(pos, true), fail, watchOpts);
  }, [apply, fail]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("pending");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => apply(pos, false),
      fail,
      watchOpts,
    );
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [apply, fail]);

  return { location, status, refresh };
}
