import { encounterUiChromeHidden, type GemEncounterPhase } from "@/lib/gem-encounter";

/** Shared footer visibility for iOS overlay + Android WebXR DOM chrome. */
export function gemHuntFooterVisible(args: {
  phase: string;
  encounterMode: boolean;
  encounterPhase: GemEncounterPhase;
  centerReveal: boolean;
  campusSession: boolean;
  sessionActive?: boolean;
}): boolean {
  if (args.phase === "collecting") return false;
  if (args.sessionActive === false) return false;
  const hideFooterChrome =
    args.encounterMode && encounterUiChromeHidden(args.encounterPhase);
  if (hideFooterChrome) return false;
  const showEncounterFooter =
    args.encounterMode &&
    (args.encounterPhase === "approach" || args.encounterPhase === "encounter");
  const huntActive =
    args.phase === "visible" || args.phase === "placed" || args.phase === "scanning";
  return (
    !args.encounterMode ||
    showEncounterFooter ||
    args.centerReveal ||
    (args.campusSession && huntActive)
  );
}
