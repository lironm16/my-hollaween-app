"use client";

import { useEffect, useRef } from "react";
import type { GemScreenPlacement } from "@/lib/gem-hunt";

/** Low-pass filter so compass/GPS jitter does not fling the pin around the ring. */
export function useSmoothedGemPlacement(
  placement: GemScreenPlacement | null,
  resetKey: string,
  alpha = 0.38,
): GemScreenPlacement | null {
  const stateRef = useRef<GemScreenPlacement | null>(null);

  useEffect(() => {
    stateRef.current = null;
  }, [resetKey]);

  if (!placement) {
    stateRef.current = null;
    return null;
  }

  const prev = stateRef.current;
  if (!prev) {
    stateRef.current = placement;
    return placement;
  }

  const smooth: GemScreenPlacement = {
    ...placement,
    xPercent: prev.xPercent + (placement.xPercent - prev.xPercent) * alpha,
    yPercent: prev.yPercent + (placement.yPercent - prev.yPercent) * alpha,
  };
  stateRef.current = smooth;
  return smooth;
}
