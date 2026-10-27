"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/hooks/use-locale";

export function gemTellMeReadyHighlight(args: {
  inRange: boolean;
  centerReveal: boolean;
  naturalDiscoverActive: boolean;
}): boolean {
  return args.inRange && !args.centerReveal && !args.naturalDiscoverActive;
}

export function useGemTellMeButton({
  enforceHuntRadius,
  inRange,
  centerReveal,
  /** In collect band with world/camera gem showing — skip green **ready** nudge. */
  naturalDiscoverActive = false,
  blocked,
  onActivate,
  onDeactivate,
}: {
  enforceHuntRadius: boolean;
  inRange: boolean;
  centerReveal: boolean;
  naturalDiscoverActive?: boolean;
  /** e.g. collecting or session not active */
  blocked?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const { t } = useLocale();
  const [showRangeError, setShowRangeError] = useState(false);

  useEffect(() => {
    if (!showRangeError) return;
    const t = window.setTimeout(() => setShowRangeError(false), 4500);
    return () => window.clearTimeout(t);
  }, [showRangeError]);

  const readyHighlight = gemTellMeReadyHighlight({
    inRange,
    centerReveal,
    naturalDiscoverActive,
  });
  const lastToggleRef = useRef(0);

  const onTellMeClick = useCallback(() => {
    if (blocked) return;
    const now = Date.now();
    if (now - lastToggleRef.current < 480) return;
    lastToggleRef.current = now;
    if (centerReveal) {
      onDeactivate();
      return;
    }
    if (enforceHuntRadius && !inRange) {
      setShowRangeError(true);
      return;
    }
    setShowRangeError(false);
    onActivate();
  }, [blocked, centerReveal, enforceHuntRadius, inRange, onActivate, onDeactivate]);

  return {
    onTellMeClick,
    readyHighlight,
    showRangeError,
    rangeErrorMessage: t("gem.tellMeRangeError"),
  };
}
