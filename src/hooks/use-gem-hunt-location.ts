"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GemHuntLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

/** Tight GPS while hunting — small steps update bearing for walk-around 3D. */
const HUNT_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 12_000,
};

/** High-frequency location for gem hunt walk-around (does not replace map GPS hook). */
export function useGemHuntLocation(enabled: boolean) {
  const [location, setLocation] = useState<GemHuntLocation | null>(null);
  const watchRef = useRef<number | null>(null);

  const apply = useCallback((pos: GeolocationPosition) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, HUNT_WATCH);
    watchRef.current =     watchRef.current = navigator.geolocation.watchPosition((pos) => apply(pos), () => {}, HUNT_WATCH);
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [enabled, apply]);

  return location;
}
