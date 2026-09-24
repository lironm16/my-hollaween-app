"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeHeading } from "@/lib/gem-hunt";

type OrientationLike = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

function readHeading(event: OrientationLike): number | null {
  if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading);
  }
  if (event.absolute && typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha);
  }
  if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha);
  }
  return null;
}

export type HeadingStatus = "idle" | "pending" | "ready" | "denied" | "unsupported";

export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>("idle");
  const enabledRef = useRef(false);

  const onOrientation = useCallback((event: Event) => {
    const value = readHeading(event as OrientationLike);
    if (value != null) {
      setHeading(value);
      setStatus("ready");
    }
  }, []);

  const requestAccess = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("DeviceOrientationEvent" in window)) {
      setStatus("unsupported");
      return false;
    }
    setStatus("pending");
    const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (typeof ctor.requestPermission === "function") {
        const result = await ctor.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return false;
        }
      }
      enabledRef.current = true;
      window.addEventListener("deviceorientation", onOrientation, true);
      setStatus((s) => (s === "ready" ? "ready" : "pending"));
      return true;
    } catch {
      setStatus("denied");
      return false;
    }
  }, [onOrientation]);

  useEffect(() => {
    if (!active) {
      enabledRef.current = false;
      window.removeEventListener("deviceorientation", onOrientation, true);
      setHeading(null);
      setStatus("idle");
      return;
    }
    void requestAccess();
    return () => {
      enabledRef.current = false;
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
  }, [active, onOrientation, requestAccess]);

  return { heading, status, requestAccess };
}
