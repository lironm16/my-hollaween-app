"use client";

import { useCallback, useEffect, useState } from "react";
import { isGemHuntOrientationGranted } from "@/lib/gem-hunt-sensors";
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

/** Listen only — call prepareGemHuntSensors() from a button before opening hunt. */
export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>("idle");

  const onOrientation = useCallback((event: Event) => {
    const value = readHeading(event as OrientationLike);
    if (value != null) {
      setHeading(value);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    if (!active) {
      window.removeEventListener("deviceorientation", onOrientation, true);
      setHeading(null);
      setStatus("idle");
      return;
    }

    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setStatus("unsupported");
      return;
    }

    const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const needsPrompt = typeof ctor.requestPermission === "function";
    if (needsPrompt && !isGemHuntOrientationGranted()) {
      setStatus("denied");
      return;
    }

    setStatus("pending");
    window.addEventListener("deviceorientation", onOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
  }, [active, onOrientation]);

  return { heading, status };
}
