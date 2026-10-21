"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeAndroidGeo } from "@/lib/android-geo-watch";
import { distanceMeters } from "@/lib/geo";
import { isAndroidLike } from "@/lib/gem-hunt-ar-platform";

export type GemHuntLocation = {
  lat: number;
  lng: number;
  accuracy: number;
};

const MOVE_MIN_M = 0.25;

/** Tight GPS while hunting — small steps update bearing for walk-around 3D. */
const HUNT_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

/** High-frequency location for gem hunt walk-around (does not replace map GPS hook). */
export function useGemHuntLocation(enabled: boolean) {
  const [location, setLocation] = useState<GemHuntLocation | null>(null);
  const watchRef = useRef<number | null>(null);
  const androidUnsubRef = useRef<(() => void) | null>(null);
  const lastRef = useRef<GemHuntLocation | null>(null);

  const applyFix = useCallback((next: GemHuntLocation) => {
    const prev = lastRef.current;
    if (
      prev &&
      prev.accuracy === next.accuracy &&
      distanceMeters(prev, next) < MOVE_MIN_M
    ) {
      return;
    }
    lastRef.current = next;
    setLocation(next);
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

  useEffect(() => {
    if (!enabled) {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (androidUnsubRef.current) {
        androidUnsubRef.current();
        androidUnsubRef.current = null;
      }
      lastRef.current = null;
      setLocation(null);
      return;
    }
    if (!navigator.geolocation) return;

    if (isAndroidLike()) {
      androidUnsubRef.current = subscribeAndroidGeo((loc) =>
        applyFix({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
        }),
      );
      return () => {
        androidUnsubRef.current?.();
        androidUnsubRef.current = null;
      };
    }

    navigator.geolocation.getCurrentPosition((pos) => apply(pos), () => {}, HUNT_WATCH);
    watchRef.current = navigator.geolocation.watchPosition((pos) => apply(pos), () => {}, HUNT_WATCH);

    return () => {
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [enabled, apply, applyFix]);

  return location;
}
