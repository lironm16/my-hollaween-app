"use client";

import { SkipIcon } from "@/components/skip-icon";
import { clusterPinStatus, clusterPinVisitKind } from "@/lib/cluster-pin-status";
import { isPoiHouse } from "@/lib/house-kind";
import { pinScareSrc } from "@/lib/pin-faces";
import { pinBackgroundFill } from "@/lib/pin-colors";
import { effectiveVisit, isDecorated } from "@/lib/house-state";
import { isClosingSoon, isHoursNightOver, isOpeningSoon } from "@/lib/hours";
import type { PublicHouse } from "@/lib/types";
import { isPracticeHouse } from "@/lib/practice-house";
import { PRACTICE_PIN_BAT_SVG } from "@/lib/practice-pin-face";
import { cn } from "@/lib/utils";

export function HouseMapPinIcon({
  house,
  now,
  skipped = false,
  filteredOut = false,
  visited = false,
  className,
}: {
  house: PublicHouse;
  now: Date;
  skipped?: boolean;
  filteredOut?: boolean;
  visited?: boolean;
  className?: string;
}) {
  const decorated = isDecorated(house);
  const visit = clusterPinVisitKind(house, now);
  const status = clusterPinStatus(house, now, { skipped });
  const closingSoon = isClosingSoon(house, now) && !visit;
  const openingSoon =
    isOpeningSoon(house, now) &&
    effectiveVisit(house) !== "closed" &&
    !isHoursNightOver(house, now);
  const scare = house.scareLevel ?? "mild";
  const practice = isPracticeHouse(house);

  return (
    <div
      className={cn(
        "house-pin cluster-list-pin relative shrink-0",
        practice && "is-practice",
        isPoiHouse(house) && "is-poi",
        !decorated && "is-undecorated",
        closingSoon && "is-closing-soon",
        openingSoon && "is-opening-soon",
        visited && "is-visited",
        filteredOut && "is-filtered-out",
        className,
      )}
      style={
        practice
          ? {
              background: "linear-gradient(165deg,#0f766e 0%,#0d9488 55%,#14b8a6 100%)",
            }
          : { background: pinBackgroundFill(house, decorated) }
      }
      aria-hidden
    >
      {closingSoon ? <i className="pin-hours-ring is-closing" /> : null}
      {openingSoon ? <i className="pin-hours-ring is-opening" /> : null}
      {skipped ? (
        <b className="pin-status is-skipped" aria-hidden>
          <SkipIcon className="pin-skip-icon" />
        </b>
      ) : null}
      {!skipped && status === "closed" ? <b className="pin-status is-closed" /> : null}
      {!skipped && status === "break" ? <b className="pin-status is-break" /> : null}
      {!skipped && (status === "plenty" || status === "low" || status === "out") ? (
        <b className={`pin-status is-${status}`} />
      ) : null}
      {practice ? (
        <span
          className="pin-practice-face"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: PRACTICE_PIN_BAT_SVG }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pin-scare" src={pinScareSrc(house, decorated ? scare : "mild")} alt="" />
      )}
    </div>
  );
}
