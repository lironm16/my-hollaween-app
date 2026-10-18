import type { GemEncounterPhase } from "@/lib/gem-encounter";

/** Tap the centered demon to collect (tell-me, cluster, encounter, onsite). */
export function gemTapCollectReady(args: {
  phase: string;
  gemAtCenter: boolean;
  tellMeCollectArmed: boolean;
  centerReveal: boolean;
  campusSession: boolean;
  encounterMode: boolean;
  encounterPhase: GemEncounterPhase;
  canCollectNow: boolean;
  simulate: boolean;
  pinCollectReady: boolean;
}): boolean {
  const huntActive = args.phase === "visible" || args.phase === "placed";
  if (!huntActive || !args.gemAtCenter) return false;
  if ((args.centerReveal || args.campusSession) && args.tellMeCollectArmed) {
    return true;
  }
  if (args.encounterMode && args.encounterPhase === "encounter") {
    return true;
  }
  if (!args.centerReveal && !args.campusSession) {
    return args.canCollectNow && (args.pinCollectReady || args.simulate);
  }
  return false;
}
