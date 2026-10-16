"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GEM_TELL_ME_OUT_OF_RANGE_MESSAGE } from "@/lib/gem-tell-me-gate";

const TELL_ME_DOUBLE_TAP_MS = 450;

export function useGemTellMeButton({
  enforceHuntRadius,
  inRange,
  centerReveal,
  blocked,
  onActivate,
  onDeactivate,
}: {
  enforceHuntRadius: boolean;
  inRange: boolean;
  centerReveal: boolean;
  /** e.g. collecting or session not active */
  blocked?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const [showRangeError, setShowRangeError] = useState(false);
  const lastActivateTapRef = useRef(0);

  useEffect(() => {
    if (!showRangeError) return;
    const t = window.setTimeout(() => setShowRangeError(false), 4500);
    return () => window.clearTimeout(t);
  }, [showRangeError]);

  const readyHighlight = inRange && !centerReveal;

  const onTellMeClick = useCallback(() => {
    if (blocked) return;
    if (centerReveal) {
      onDeactivate();
      return;
    }
    if (enforceHuntRadius && !inRange) {
      setShowRangeError(true);
      return;
    }
    const now = Date.now();
    if (now - lastActivateTapRef.current > TELL_ME_DOUBLE_TAP_MS) {
      lastActivateTapRef.current = now;
      return;
    }
    lastActivateTapRef.current = 0;
    setShowRangeError(false);
    onActivate();
  }, [blocked, centerReveal, enforceHuntRadius, inRange, onActivate, onDeactivate]);

  return {
    onTellMeClick,
    readyHighlight,
    showRangeError,
    rangeErrorMessage: GEM_TELL_ME_OUT_OF_RANGE_MESSAGE,
  };
}
