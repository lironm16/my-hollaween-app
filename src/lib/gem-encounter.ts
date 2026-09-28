/** PoGo-style encounter phases (camera + WebXR). */

export type GemEncounterPhase =
  | "transition"
  | "approach"
  | "encounter"
  | "resolve-hit"
  | "resolve-wiggle1"
  | "resolve-wiggle2"
  | "resolve-breakout"
  | "resolve-celebrate"
  | "reward";

export const GEM_ENCOUNTER_TRANSITION_MS = 1100;
export const GEM_ENCOUNTER_APPROACH_MIN_MS = 1200;
export const GEM_ENCOUNTER_APPROACH_SKIP_MS = 3000;
export const GEM_ENCOUNTER_HIT_MS = 320;
export const GEM_ENCOUNTER_WIGGLE1_MS = 1200;
export const GEM_ENCOUNTER_WIGGLE2_MS = 1000;
export const GEM_ENCOUNTER_CELEBRATE_MS = 2400;
export const GEM_ENCOUNTER_BREAKOUT_MS = 900;
export const GEM_ENCOUNTER_REPEAT_REWARD_MS = 1400;

export const GEM_ENCOUNTER_TUTORIAL_KEY = "gem-encounter-tutorial-v1";

export function readEncounterTutorialSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GEM_ENCOUNTER_TUTORIAL_KEY) === "1";
  } catch {
    return true;
  }
}

export function markEncounterTutorialSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GEM_ENCOUNTER_TUTORIAL_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function encounterUiChromeHidden(phase: GemEncounterPhase): boolean {
  return (
    phase === "encounter" ||
    phase === "resolve-hit" ||
    phase === "resolve-wiggle1" ||
    phase === "resolve-wiggle2" ||
    phase === "resolve-breakout" ||
    phase === "resolve-celebrate"
  );
}
