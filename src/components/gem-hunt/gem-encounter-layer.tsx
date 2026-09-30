"use client";

import type { PublicHouse } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import {
  readEncounterTutorialSeen,
  markEncounterTutorialSeen,
  type GemEncounterPhase,
} from "@/lib/gem-encounter";
import { useEffect, useState } from "react";

export function GemEncounterLayer({
  house,
  phase,
  distanceM,
  inRange,
  repeatVisit,
  hideApproachLine = false,
  onOfferTreatButton,
}: {
  house: PublicHouse;
  phase: GemEncounterPhase;
  distanceM: number | null;
  inRange: boolean;
  repeatVisit: boolean;
  /** @deprecated Tutorial copy lives in hunt footer during encounter. */
  showTutorial?: boolean;
  /** Walk nav hint already shows distance + directions — skip duplicate approach pill. */
  hideApproachLine?: boolean;
  onOfferTreatButton?: () => void;
}) {
  const [tutorialSeen, setTutorialSeen] = useState(true);

  useEffect(() => {
    setTutorialSeen(readEncounterTutorialSeen());
  }, []);

  if (phase === "approach" && !hideApproachLine) {
    return (
      <div className="gem-encounter-layer gem-encounter-layer--approach" role="status">
        <p className="gem-encounter-layer__approach-line">
          {inRange
            ? "החיה מופיעה — התקרבו עוד רגע…"
            : distanceM != null
              ? `התקרבו לנקודה · ${formatDistance(distanceM)}`
              : "התקרבו לנקודה על המדרכה"}
        </p>
      </div>
    );
  }

  if (phase === "encounter") {
    return (
      <div className="gem-encounter-layer gem-encounter-layer--encounter" aria-hidden>
        {onOfferTreatButton ? (
          <button
            type="button"
            className="gem-encounter-layer__a11y-offer"
            onClick={(e) => {
              e.stopPropagation();
              markEncounterTutorialSeen();
              setTutorialSeen(true);
              onOfferTreatButton();
            }}
          >
            הציעו פינוק
          </button>
        ) : null}
      </div>
    );
  }

  if (
    phase === "resolve-hit" ||
    phase === "resolve-wiggle1" ||
    phase === "resolve-wiggle2" ||
    phase === "resolve-breakout" ||
    phase === "resolve-celebrate" ||
    (phase === "reward" && repeatVisit)
  ) {
    return null;
  }

  return null;
}
