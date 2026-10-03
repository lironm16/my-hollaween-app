"use client";

import { useEffect, useRef, useState } from "react";
import type { GemScreenPlacement } from "@/lib/gem-hunt";

/** Low-pass filter so compass/GPS jitter does not fling the pin around the ring. */
export function useSmoothedGemPlacement(
  placement: GemScreenPlacement | null,
  resetKey: string,
  alpha = 0.38,
): GemScreenPlacement | null {
  const [smooth, setSmooth] = useState<GemScreenPlacement | null>(placement);
  const resetKeyRef = useRef(resetKey);

  useEffect(() => {
    resetKeyRef.current = resetKey;
    queueMicrotask(() => setSmooth(null));
  }, [resetKey]);

  useEffect(() => {
    if (!placement) {
      queueMicrotask(() => setSmooth(null));
      return;
    }
    queueMicrotask(() => {
      setSmooth((prev) => {
        if (resetKeyRef.current !== resetKey) return placement;
        if (!prev) return placement;
        return {
          ...placement,
          xPercent: prev.xPercent + (placement.xPercent - prev.xPercent) * alpha,
          yPercent: prev.yPercent + (placement.yPercent - prev.yPercent) * alpha,
        };
      });
    });
  }, [placement, alpha, resetKey]);

  return smooth;
}
