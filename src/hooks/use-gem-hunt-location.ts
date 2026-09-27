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

const MIN_MOVE_M = 1.5;

function movedEnough(
  a: GemHuntLocation,
  b: GemHuntLocation,
  minM: number,
): boolean {
  const cosLat = Math.cos((a.lat * Math.PI) / 180);
  const dy = (b.lat - a.lat) * 111_320;
  const dx = (b.lng - a.lng) * 111_320 * cosLat;
  return Math.hypot(dx, dy) >= minM;
}

/** High-frequency location for gem hunt walk-around (does not replace map GPS hook). */
export function useGemHuntLocation(enabled: boolean) {
  const [location, setLocation] = useState<GemHuntLocation | null>(null);
  const lastRef = useRef<GemHuntLocation | null>(null);
  const watchRef = useRef<number | null>(null);

  const apply = useCallback((pos: GeolocationPosition, force = false) => {
    const next: GemHuntLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    const prev = lastRef.current;
    if (!force && prev && !movedEnough(prev, next, MIN_MOVE_M)) return;
    lastRef.current = next;
    setLocation(next);
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

    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos, true),
      () => {},
      HUNT_WATCH,
    );
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => apply(pos, false),
      () => {},
      HUNT_WATCH,
    );
    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [enabled, apply]);

  return location;
}
