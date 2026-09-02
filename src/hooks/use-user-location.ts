"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type LocationStatus = "idle" | "pending" | "ready" | "denied" | "unavailable" | "error";

const watchOpts: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 8_000,
  timeout: 12_000,
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const watchId = useRef<number | null>(null);

  const apply = useCallback((pos: GeolocationPosition) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
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
    navigator.geolocation.getCurrentPosition(apply, fail, watchOpts);
  }, [apply, fail]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("pending");
    watchId.current = navigator.geolocation.watchPosition(apply, fail, watchOpts);
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [apply, fail]);

  return { location, status, refresh };
}
