import type { VisitState } from "@/lib/types";
import { effectiveVisit } from "@/lib/house-state";

export type HoursWindow = { from: string; to: string };

export type HoursStatus =
  | { kind: "before"; opensAt: string }
  | { kind: "between"; opensAt: string }
  | { kind: "open"; closesAt: string }
  | { kind: "closingSoon"; closesAt: string }
  | { kind: "after" }
  | { kind: "closedVisit" }
  | { kind: "unknown" };

const CLOSING_SOON_MINUTES = 30;

export function parseClockMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function houseHoursWindows(house: {
  openFrom?: string;
  openTo?: string;
  openFrom2?: string;
  openTo2?: string;
}): HoursWindow[] {
  const windows: HoursWindow[] = [];
  if (house.openFrom && house.openTo) {
    windows.push({ from: house.openFrom.slice(0, 5), to: house.openTo.slice(0, 5) });
  }
  if (house.openFrom2 && house.openTo2) {
    windows.push({ from: house.openFrom2.slice(0, 5), to: house.openTo2.slice(0, 5) });
  }
  return windows.filter((window) => {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    return from !== null && to !== null && to > from;
  });
}

export function formatHoursLabel(house: {
  openFrom?: string;
  openTo?: string;
  openFrom2?: string;
  openTo2?: string;
}): string {
  const windows = houseHoursWindows(house);
  if (windows.length === 0) {
    if (house.openFrom && house.openTo) return `${house.openFrom}–${house.openTo}`;
    return "";
  }
  return windows.map((window) => `${window.from}–${window.to}`).join(" · ");
}

function minutesNow(now: Date) {
  return now.getHours() * 60 + now.getMinutes();
}

/** Open / not-yet / closing-soon based on today's clock windows. */
export function hoursStatus(
  house: {
    openFrom?: string;
    openTo?: string;
    openFrom2?: string;
    openTo2?: string;
    visit?: VisitState;
    soldOut?: boolean;
  },
  now = new Date(),
): HoursStatus {
  if (effectiveVisit(house) === "closed") return { kind: "closedVisit" };

  const windows = houseHoursWindows(house);
  if (windows.length === 0) return { kind: "unknown" };

  const nowMin = minutesNow(now);
  const parsed = windows
    .map((window) => ({
      from: parseClockMinutes(window.from) as number,
      to: parseClockMinutes(window.to) as number,
      labelFrom: window.from,
      labelTo: window.to,
    }))
    .sort((a, b) => a.from - b.from);

  for (const window of parsed) {
    if (nowMin >= window.from && nowMin < window.to) {
      const minutesLeft = window.to - nowMin;
      if (minutesLeft <= CLOSING_SOON_MINUTES) {
        return { kind: "closingSoon", closesAt: window.labelTo };
      }
      return { kind: "open", closesAt: window.labelTo };
    }
  }

  const next = parsed.find((window) => nowMin < window.from);
  if (next) {
    const anyEarlierEnded = parsed.some((window) => nowMin >= window.to);
    return {
      kind: anyEarlierEnded ? "between" : "before",
      opensAt: next.labelFrom,
    };
  }

  return { kind: "after" };
}
