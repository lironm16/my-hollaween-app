"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

export type GemHuntLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

/** Tight GPS while hunting — small steps update bearing for walk-around 3D. */
const HUNT_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 3_000,
  timeout: 20_000,
};

const HUNT_POLL: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 2_000,
  timeout: 10_000,
};

/** High-frequency location for gem hunt walk-around (does not replace map GPS hook). */
export function useGemHuntLocation(enabled: boolean) {
  const [location, setLocation] = useState<GemHuntLocation | null>(null);
  const watchRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const lastRef = useRef<GemHuntLocation | null>(null);

  const apply = useCallback((pos: GeolocationPosition) => {
    const next: GemHuntLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
    const prev = lastRef.current;
    if (
      prev &&
      prev.lat === next.lat &&
      prev.lng === next.lng &&
      prev.accuracy === next.accuracy
    ) {
      return;
    }
    lastRef.current = next;
    setLocation(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      lastRef.current = null;
      return;
    }
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, HUNT_WATCH);
    watchRef.current = navigator.geolocation.watchPosition((pos) => apply(pos), () => {}, HUNT_WATCH);

    /** WebXR / installed PWA: watch callbacks can stall — poll keeps distance hints moving. */
    if (isAndroidLike()) {
      pollRef.current = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, HUNT_POLL);
      }, 1800);
    }

    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, apply]);

  return location;
}
