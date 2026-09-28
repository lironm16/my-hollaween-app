"use client";

import { useCallback, useRef } from "react";

type SwipeOpts = {
  /** Min distance px toward upper screen (negative dy). */
  minDistance?: number;
  onSuccess: () => void;
  onMiss?: () => void;
};

/** Swipe treat toward pet — upward flick in lower third. */
export function useTreatSwipe({ minDistance = 72, onSuccess, onMiss }: SwipeOpts) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    firedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || firedRef.current) return;
      const dy = e.clientY - start.y;
      const dx = e.clientX - start.x;
      const dist = Math.hypot(dx, dy);
      if (dist >= minDistance && dy < -minDistance * 0.55) {
        firedRef.current = true;
        onSuccess();
      } else if (dist > 24) {
        onMiss?.();
      }
    },
    [minDistance, onMiss, onSuccess],
  );

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
