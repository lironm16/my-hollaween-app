"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isGemHuntOrientationGranted } from "@/lib/gem-hunt-sensors";
import { normalizeHeading } from "@/lib/gem-hunt";

type OrientationLike = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

/** Degrees from horizon: positive = camera tilted up, negative = looking down. */
export function readDevicePitch(event: DeviceOrientationEvent): number | null {
  if (typeof window === "undefined") return null;
  const beta = event.beta;
  const gamma = event.gamma;
  if (typeof beta !== "number" || !Number.isFinite(beta)) return null;
  const angle =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(orientation: landscape)").matches &&
    typeof gamma === "number" &&
    Number.isFinite(gamma)
      ? gamma
      : beta;
  return 90 - angle;
}

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

const HEADING_UI_MS = 90;
const HEADING_MIN_STEP_DEG = 1.25;

function headingStep(prev: number | null, next: number) {
  if (prev == null) return 360;
  let d = Math.abs(next - prev);
  if (d > 180) d = 360 - d;
  return d;
}

/** Listen only — call prepareGemHuntSensors() from a button before opening hunt. */
export function useDeviceHeading(active: boolean, retryToken = 0) {
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [status, setStatus] = useState<HeadingStatus>("idle");
  const lastUiRef = useRef<number>(0);
  const lastValueRef = useRef<number | null>(null);
  const lastPitchRef = useRef<number | null>(null);

  const onOrientation = useCallback((event: Event) => {
    const orient = event as OrientationLike;
    const pitchValue = readDevicePitch(orient);
    if (pitchValue != null) {
      lastPitchRef.current = pitchValue;
      setPitch(pitchValue);
    }
    const value = readHeading(orient);
    if (value == null) return;
    const prev = lastValueRef.current;
    const now = performance.now();
    const due =
      prev == null ||
      now - lastUiRef.current >= HEADING_UI_MS ||
      headingStep(prev, value) >= HEADING_MIN_STEP_DEG;
    lastValueRef.current = value;
    if (!due) return;
    lastUiRef.current = now;
    setHeading(value);
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!active) {
      window.removeEventListener("deviceorientation", onOrientation, true);
      lastUiRef.current = 0;
      lastValueRef.current = null;
      lastPitchRef.current = null;
      setHeading(null);
      setPitch(null);
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
  }, [active, onOrientation, retryToken]);

  return { heading, pitch, status };
}
