import { config } from "@/lib/config";
import type { VisitState } from "@/lib/types";
import { effectiveVisit, isFrozen } from "@/lib/house-state";

export type HoursWindow = { from: string; to: string };

export type HoursStatus =
  | { kind: "beforeEvent"; opensAt: string; dateLabel: string }
  | { kind: "before"; opensAt: string }
  | { kind: "opensSoon"; opensAt: string }
  | { kind: "between"; opensAt: string }
  | { kind: "open"; closesAt: string }
  | { kind: "closingSoon"; closesAt: string }
  | { kind: "after" }
  | { kind: "closedVisit" }
  | { kind: "unknown" };

const CLOSING_SOON_MINUTES = 30;
const OPENS_SOON_MINUTES = 30;
const MAX_WINDOWS = 6;

export function parseClockMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isValidHoursWindow(window: HoursWindow): boolean {
  const from = parseClockMinutes(window.from);
  const to = parseClockMinutes(window.to);
  return from !== null && to !== null && to > from;
}

export function normalizeHoursWindows(windows: HoursWindow[]): HoursWindow[] {
  const cleaned = windows
    .map((window) => ({
      from: window.from.slice(0, 5),
      to: window.to.slice(0, 5),
    }))
    .filter(isValidHoursWindow)
    .sort((a, b) => (parseClockMinutes(a.from) ?? 0) - (parseClockMinutes(b.from) ?? 0));
  return cleaned.slice(0, MAX_WINDOWS);
}

type HoursSource = {
  openFrom?: string;
  openTo?: string;
  openFrom2?: string;
  openTo2?: string;
  openHours?: HoursWindow[];
};

export function houseHoursWindows(house: HoursSource): HoursWindow[] {
  if (Array.isArray(house.openHours) && house.openHours.length > 0) {
    return normalizeHoursWindows(house.openHours);
  }
  const windows: HoursWindow[] = [];
  if (house.openFrom && house.openTo) {
    windows.push({ from: house.openFrom.slice(0, 5), to: house.openTo.slice(0, 5) });
  }
  if (house.openFrom2 && house.openTo2) {
    windows.push({ from: house.openFrom2.slice(0, 5), to: house.openTo2.slice(0, 5) });
  }
  return normalizeHoursWindows(windows);
}

/** Keep openFrom/openTo (+ legacy openFrom2) in sync with openHours. */
export function syncHoursFields(windows: HoursWindow[]): {
  openHours: HoursWindow[];
  openFrom: string;
  openTo: string;
  openFrom2: string;
  openTo2: string;
} {
  const openHours = normalizeHoursWindows(windows);
  const first = openHours[0] ?? { from: "17:00", to: "21:00" };
  const second = openHours[1];
  return {
    openHours,
    openFrom: first.from,
    openTo: first.to,
    openFrom2: second?.from ?? "",
    openTo2: second?.to ?? "",
  };
}

export function formatHoursLabel(house: HoursSource): string {
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

function ymdLocal(now: Date) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function eventNightParts() {
  const { year, month, day, labelHe } = config.eventNight;
  return { year, month, day, labelHe };
}

/** -1 before event night, 0 on the night, 1 after. */
export function eventNightRelation(now = new Date()): -1 | 0 | 1 {
  const event = eventNightParts();
  const today = ymdLocal(now);
  if (today.year < event.year) return -1;
  if (today.year > event.year) return 1;
  if (today.month < event.month) return -1;
  if (today.month > event.month) return 1;
  if (today.day < event.day) return -1;
  if (today.day > event.day) return 1;
  return 0;
}

export function eventNightDateLabel() {
  return eventNightParts().labelHe;
}

/** Open / not-yet / closing-soon — only on the Halloween event night. */
export function hoursStatus(
  house: HoursSource & {
    visit?: VisitState;
    soldOut?: boolean;
  },
  now = new Date(),
): HoursStatus {
  if (effectiveVisit(house) === "closed") return { kind: "closedVisit" };

  const windows = houseHoursWindows(house);
  if (windows.length === 0) return { kind: "unknown" };

  const firstOpen = windows[0]!.from;
  const day = eventNightRelation(now);

  if (day < 0) {
    return {
      kind: "beforeEvent",
      opensAt: firstOpen,
      dateLabel: eventNightDateLabel(),
    };
  }

  if (day > 0) return { kind: "after" };

  const nowMin = minutesNow(now);
  const parsed = windows.map((window) => ({
    from: parseClockMinutes(window.from) as number,
    to: parseClockMinutes(window.to) as number,
    labelFrom: window.from,
    labelTo: window.to,
  }));

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
    const minutesUntil = next.from - nowMin;
    if (minutesUntil <= OPENS_SOON_MINUTES) {
      return { kind: "opensSoon", opensAt: next.labelFrom };
    }
    const anyEarlierEnded = parsed.some((window) => nowMin >= window.to);
    return {
      kind: anyEarlierEnded ? "between" : "before",
      opensAt: next.labelFrom,
    };
  }

  return { kind: "after" };
}

/** True when kids should come now (within hours, not sold out / frozen). */
export function isOpenNow(
  house: HoursSource & {
    visit?: VisitState;
    soldOut?: boolean;
    adminFrozen?: boolean;
    ownerFrozenUntil?: string | null;
  },
  now = new Date(),
) {
  if (isFrozen(house, now.getTime())) return false;
  const status = hoursStatus(house, now);
  return status.kind === "open" || status.kind === "closingSoon";
}

export const MAX_HOUR_WINDOWS = MAX_WINDOWS;
