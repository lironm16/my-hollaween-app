import { effectiveVisit } from "@/lib/house-state";
import {
  closingSoonAt,
  isHoursNightOver,
  isOpeningSoon,
  openingSoonAt,
} from "@/lib/hours";
import type { PublicHouse } from "@/lib/types";

export type PinHoursTimeKind = "closing" | "opening";

export type PinHoursTime = {
  kind: PinHoursTimeKind;
  time: string;
  ariaLabel: string;
};

export function pinHoursTime(
  house: PublicHouse,
  now: Date,
  visitBlocked = false,
): PinHoursTime | null {
  if (visitBlocked) return null;

  const closesAt = closingSoonAt(house, now);
  if (closesAt) {
    return {
      kind: "closing",
      time: closesAt,
      ariaLabel: `נסגר ב־${closesAt}`,
    };
  }

  if (
    isOpeningSoon(house, now) &&
    effectiveVisit(house) !== "closed" &&
    !isHoursNightOver(house, now)
  ) {
    const opensAt = openingSoonAt(house, now);
    if (opensAt) {
      return {
        kind: "opening",
        time: opensAt,
        ariaLabel: `נפתח ב־${opensAt}`,
      };
    }
  }

  return null;
}

/** Extra divIcon width when a time label sits beside the pin. */
export function pinHoursLaneExtraWidth(hasLabel: boolean) {
  return hasLabel ? 46 : 0;
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function pinHoursTimeLabelHtml(meta: PinHoursTime) {
  const time = escapeAttr(meta.time);
  const label = escapeAttr(meta.ariaLabel);
  return `<time class="pin-hours-time is-${meta.kind}" dir="ltr" datetime="${time}" title="${label}" aria-label="${label}">${time}</time>`;
}

export function pinHoursLaneClass(meta: PinHoursTime | null) {
  if (!meta) return "";
  return meta.kind === "closing"
    ? " is-closing-soon has-hours-time"
    : " is-opening-soon has-hours-time";
}
