"use client";

import { gemLabelHe, gemMonsterForHouse } from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import {
  readEncounterTutorialSeen,
  markEncounterTutorialSeen,
  type GemEncounterPhase,
} from "@/lib/gem-encounter";
import { cn } from "@/lib/utils";
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
  const monsterId = gemMonsterForHouse(house);
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
    phase === "resolve-breakout"
  ) {
    const msg =
      phase === "resolve-breakout"
        ? "אופס! נסו שוב…"
        : phase === "resolve-wiggle2"
          ? "רגע…"
          : phase === "resolve-wiggle1"
            ? "האם יישאר?"
            : "";
    return (
      <div className={cn("gem-encounter-layer gem-encounter-layer--resolve", phase === "resolve-breakout" && "is-breakout")} role="status">
        {msg ? <p className="gem-encounter-layer__resolve-msg">{msg}</p> : null}
      </div>
    );
  }

  if (phase === "resolve-celebrate") {
    return (
      <div className="gem-encounter-layer gem-encounter-layer--celebrate" role="status">
        <p className="gem-encounter-layer__celebrate-msg">
          {repeatVisit ? `שוב פגשתם את ${gemLabelHe(monsterId)}!` : "כל הכבוד!!"}
        </p>
      </div>
    );
  }

  if (phase === "reward" && repeatVisit) {
    return (
      <div className="gem-encounter-layer gem-encounter-layer--repeat-reward" role="status">
        <p className="gem-encounter-layer__repeat-msg">+1 למפגשים שלכם</p>
      </div>
    );
  }

  return null;
}
