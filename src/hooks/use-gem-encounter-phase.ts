"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GEM_ENCOUNTER_APPROACH_MIN_MS,
  GEM_ENCOUNTER_APPROACH_SKIP_MS,
  GEM_ENCOUNTER_BREAKOUT_MS,
  GEM_ENCOUNTER_CELEBRATE_MS,
  GEM_ENCOUNTER_HIT_MS,
  GEM_ENCOUNTER_REPEAT_REWARD_MS,
  GEM_ENCOUNTER_WIGGLE1_MS,
  GEM_ENCOUNTER_WIGGLE2_MS,
  type GemEncounterPhase,
} from "@/lib/gem-encounter";

type Args = {
  enabled: boolean;
  repeatVisit: boolean;
  collectEnabled: boolean;
  petRevealed: boolean;
  inRange: boolean;
  /** After celebrate completes — run collect + reward handoff. */
  onEncounterCollect: () => void;
  onRepeatRewardDone: () => void;
};

export function useGemEncounterPhase({
  enabled,
  repeatVisit,
  collectEnabled,
  petRevealed,
  inRange,
  onEncounterCollect,
  onRepeatRewardDone,
}: Args) {
  const [phase, setPhase] = useState<GemEncounterPhase>(enabled ? "approach" : "encounter");
  const approachEnteredRef = useRef<number | null>(null);
  const breakoutUsedRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setPhase("approach");
    approachEnteredRef.current = Date.now();
    breakoutUsedRef.current = 0;
    clearTimer();
    return clearTimer;
  }, [enabled, clearTimer]);

  useEffect(() => {
    if (!enabled || phase !== "approach") return;
    if (!petRevealed || (!inRange && !collectEnabled)) return;
    const entered = approachEnteredRef.current ?? Date.now();
    const elapsed = Date.now() - entered;
    const minWait = Math.max(0, GEM_ENCOUNTER_APPROACH_MIN_MS - elapsed);
    const skipWait = Math.max(0, GEM_ENCOUNTER_APPROACH_SKIP_MS - elapsed);
    const delay = Math.min(skipWait, Math.max(minWait, 0));
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPhase("encounter");
    }, delay || 400);
    return clearTimer;
  }, [enabled, phase, petRevealed, inRange, collectEnabled, clearTimer]);

  const runResolveChain = useCallback(() => {
    clearTimer();
    setPhase("resolve-hit");
    timerRef.current = window.setTimeout(() => {
      setPhase("resolve-wiggle1");
      timerRef.current = window.setTimeout(() => {
        if (!repeatVisit) {
          setPhase("resolve-wiggle2");
          timerRef.current = window.setTimeout(() => {
            const roll = Math.random();
            if (roll < 0.12 && breakoutUsedRef.current < 1) {
              breakoutUsedRef.current += 1;
              setPhase("resolve-breakout");
              timerRef.current = window.setTimeout(() => {
                setPhase("encounter");
              }, GEM_ENCOUNTER_BREAKOUT_MS);
              return;
            }
            setPhase("resolve-celebrate");
            timerRef.current = window.setTimeout(() => {
              setPhase("reward");
              onEncounterCollect();
              if (repeatVisit) {
                timerRef.current = window.setTimeout(onRepeatRewardDone, GEM_ENCOUNTER_REPEAT_REWARD_MS);
              }
            }, GEM_ENCOUNTER_CELEBRATE_MS);
          }, GEM_ENCOUNTER_WIGGLE2_MS);
        } else {
          setPhase("resolve-celebrate");
          timerRef.current = window.setTimeout(() => {
            setPhase("reward");
            onEncounterCollect();
            timerRef.current = window.setTimeout(onRepeatRewardDone, GEM_ENCOUNTER_REPEAT_REWARD_MS);
          }, GEM_ENCOUNTER_CELEBRATE_MS);
        }
      }, GEM_ENCOUNTER_WIGGLE1_MS);
    }, GEM_ENCOUNTER_HIT_MS);
  }, [clearTimer, onEncounterCollect, onRepeatRewardDone, repeatVisit]);

  const onTreatSuccess = useCallback(() => {
    if (phase !== "encounter") return;
    if (!collectEnabled) return;
    runResolveChain();
  }, [phase, collectEnabled, runResolveChain]);

  const onTreatMiss = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
  }, []);

  return {
    encounterPhase: phase,
    setEncounterPhase: setPhase,
    onTreatSuccess,
    onTreatMiss,
    runResolveChain,
  };
}
