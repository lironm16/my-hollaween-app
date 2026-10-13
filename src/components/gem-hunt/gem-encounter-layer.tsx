"use client";

import type { PublicHouse } from "@/lib/types";
import type { GemEncounterPhase } from "@/lib/gem-encounter";

/** Encounter chrome lives in hunt footer + gem tap — no overlay copy or a11y buttons. */
export function GemEncounterLayer({
  phase: _phase,
  repeatVisit: _repeatVisit,
  house: _house,
  distanceM: _distanceM,
  inRange: _inRange,
  hideApproachLine: _hideApproachLine,
  showTutorial: _showTutorial,
  onOfferTreatButton: _onOfferTreatButton,
}: {
  house: PublicHouse;
  phase: GemEncounterPhase;
  distanceM: number | null;
  inRange: boolean;
  repeatVisit: boolean;
  showTutorial?: boolean;
  hideApproachLine?: boolean;
  onOfferTreatButton?: () => void;
}) {
  return null;
}
