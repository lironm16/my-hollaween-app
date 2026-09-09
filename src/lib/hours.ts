import { appNow } from "@/lib/app-clock";
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

/** True when two or more windows share any open minute (adjacent is fine). */
export function hoursWindowsOverlap(windows: HoursWindow[]): boolean {
  const parsed = windows
    .map((window) => ({
      from: parseClockMinutes(window.from),
      to: parseClockMinutes(window.to),
    }))
    .filter((window): window is { from: number; to: number } => window.from !== null && window.to !== null)
    .sort((a, b) => a.from - b.from);
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i]!.from < parsed[i - 1]!.to) return true;
  }
  return false;
}

export function hoursWindowsIssue(windows: HoursWindow[]): string | null {
  if (windows.length === 0) return "מלאו לפחות חלון שעות אחד.";
  for (const window of windows) {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) return "מלאו את כל חלונות השעות, או הסירו חלון ריק.";
    if (to <= from) return "שעת הסגירה חייבת להיות אחרי שעת הפתיחה.";
  }
  if (hoursWindowsOverlap(windows)) {
    return "חלונות השעות חופפים. בחרו טווחים שלא נחתכים.";
  }
  return null;
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

export type HoursSource = {
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
  const first = openHours[0] ?? { from: "17:00", to: "20:00" };
  const second = openHours[1];
  return {
    openHours,
    openFrom: first.from,
    openTo: first.to,
    openFrom2: second?.from ?? "",
    openTo2: second?.to ?? "",
  };
}

export function formatHoursRange(from: string, to: string): string {
  return `${from}–${to}`;
}

export function formatHoursLabel(house: HoursSource): string {
  const windows = houseHoursWindows(house);
  if (windows.length === 0) {
    if (house.openFrom && house.openTo) return formatHoursRange(house.openFrom, house.openTo);
    return "";
  }
  return windows.map((window) => formatHoursRange(window.from, window.to)).join(" · ");
}

export function eventNightAtMinutes(totalMin: number) {
  const { year, month, day } = config.eventNight;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function hasVisitWindow(visitWindowFrom?: string, visitWindowTo?: string) {
  const from = visitWindowFrom ? parseClockMinutes(visitWindowFrom) : null;
  const to = visitWindowTo ? parseClockMinutes(visitWindowTo) : null;
  return from !== null || to !== null;
}

export function visitWindowIssue(visitWindowFrom = "", visitWindowTo = ""): string | null {
  const fromSet = Boolean(visitWindowFrom.trim());
  const toSet = Boolean(visitWindowTo.trim());
  if (!fromSet && !toSet) return null;

  const vf = fromSet ? parseClockMinutes(visitWindowFrom) : null;
  const vt = toSet ? parseClockMinutes(visitWindowTo) : null;
  if (fromSet && vf === null) return "שעת ההתחלה לא תקינה.";
  if (toSet && vt === null) return "שעת הסיום לא תקינה.";
  if (vf !== null && vt !== null && vt <= vf) {
    return "שעת הסיום חייבת להיות אחרי שעת ההתחלה.";
  }
  return null;
}

export function hasValidVisitWindow(visitWindowFrom = "", visitWindowTo = "") {
  return hasVisitWindow(visitWindowFrom, visitWindowTo) && visitWindowIssue(visitWindowFrom, visitWindowTo) === null;
}

export function visitWindowMinuteRange(visitWindowFrom = "", visitWindowTo = "") {
  if (visitWindowIssue(visitWindowFrom, visitWindowTo)) return null;
  const vf = visitWindowFrom ? parseClockMinutes(visitWindowFrom) : null;
  const vt = visitWindowTo ? parseClockMinutes(visitWindowTo) : null;
  if (vf === null && vt === null) return null;
  if (vf !== null && vt !== null) return { start: vf, end: vt };
  const point = vf ?? vt!;
  return { start: point, end: point };
}

function visitRangeIsSpan(range: { start: number; end: number }) {
  return range.start < range.end;
}

function minuteRangesOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && b0 < a1;
}

type FilterHouse = HoursSource & {
  id?: string;
  visit?: VisitState;
  soldOut?: boolean;
  adminFrozen?: boolean;
  ownerFrozenUntil?: string | null;
};

function filterProbeAt(minutes: number) {
  return eventNightAtMinutes(minutes);
}

function preparedFilterHouse(house: FilterHouse, probe: Date) {
  return withRehearsalPin(house, probe);
}

/** Clock used for hour-status filters — visitor start, else end, else wall clock. */
export function resolveFilterNow(
  visitWindowFrom: string | undefined,
  visitWindowTo: string | undefined,
  wallNow: Date,
) {
  const from = visitWindowFrom ? parseClockMinutes(visitWindowFrom) : null;
  const to = visitWindowTo ? parseClockMinutes(visitWindowTo) : null;
  if (from !== null) return eventNightAtMinutes(from);
  if (to !== null) return eventNightAtMinutes(to);
  return wallNow;
}

/** True when any house window overlaps the visitor's optional from/to bounds. */
export function houseOpenDuringVisitWindow(
  house: HoursSource,
  visitWindowFrom = "",
  visitWindowTo = "",
) {
  const vf = visitWindowFrom ? parseClockMinutes(visitWindowFrom) : null;
  const vt = visitWindowTo ? parseClockMinutes(visitWindowTo) : null;
  if (vf === null && vt === null) return true;

  const windows = houseHoursWindows(house).flatMap((window) => {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) return [];
    return [{ from, to }];
  });
  if (windows.length === 0) return false;

  if (vf !== null && vt !== null) {
    if (vt <= vf) return false;
    return windows.some((window) => window.from < vt && vf < window.to);
  }
  if (vf !== null) {
    return windows.some((window) => vf >= window.from && vf < window.to);
  }
  return windows.some((window) => vt! >= window.from && vt! < window.to);
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
export function eventNightRelation(now = appNow()): -1 | 0 | 1 {
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

/** Pause/stop chips: only after the house’s first window on Halloween night. */
export function nightStatusControlsEnabled(house: HoursSource, now = appNow()) {
  if (eventNightRelation(now) !== 0) return false;
  const first = houseHoursWindows(house)[0];
  if (!first) return false;
  const from = parseClockMinutes(first.from);
  if (from === null) return false;
  return minutesNow(now) >= from;
}

/** True after the last listed window on event night (or on a later calendar day). Uses the house’s real hours, not rehearsal stubs. */
export function isHoursNightOver(house: HoursSource, now = appNow()) {
  const day = eventNightRelation(now);
  if (day > 0) return true;
  if (day < 0) return false;
  const windows = houseHoursWindows(house);
  if (windows.length === 0) return false;
  const nowMin = minutesNow(now);
  return windows.every((window) => {
    const to = parseClockMinutes(window.to);
    return to !== null && nowMin >= to;
  });
}

/** True on event night before the first listed window. Uses the house’s real hours, not rehearsal stubs. */
export function isHoursNotYetOpen(house: HoursSource, now = appNow()) {
  if (eventNightRelation(now) !== 0) return false;
  const windows = houseHoursWindows(house);
  if (windows.length === 0) return false;
  const from = parseClockMinutes(windows[0]!.from);
  if (from === null) return false;
  return minutesNow(now) < from;
}

/** Open / not-yet / closing-soon — only on the Halloween event night. */
export function hoursStatus(
  house: HoursSource & {
    id?: string;
    visit?: VisitState;
    soldOut?: boolean;
  },
  now = appNow(),
): HoursStatus {
  house = withRehearsalPin(house, now);
  if (effectiveVisit(house) === "closed") return { kind: "closedVisit" };
  if (house.id && REHEARSAL_PIN[house.id] === "break") {
    const opensAt = onBreakAt(house, now);
    if (opensAt) return { kind: "between", opensAt };
  }
  if (house.id && REHEARSAL_PIN[house.id] === "opensSoon") {
    const opensAt = openingSoonAt(house, now);
    if (opensAt) return { kind: "opensSoon", opensAt };
  }
  if (house.id && REHEARSAL_PIN[house.id] === "closingSoon") {
    const closesAt = closingSoonAt(house, now);
    if (closesAt) return { kind: "closingSoon", closesAt };
  }

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

type SoonHouse = HoursSource & {
  id?: string;
  visit?: VisitState;
  soldOut?: boolean;
  adminFrozen?: boolean;
  ownerFrozenUntil?: string | null;
};

/** Stub houses that always show one pin state during rehearsal, regardless of wall-clock. */
const REHEARSAL_PIN: Record<string, "opensSoon" | "closingSoon" | "break" | "closed"> = {
  "בית-9310": "opensSoon",
  "בית-9311": "closingSoon",
  "בית-9312": "break",
  "בית-9313": "closed",
};

function clockLabel(totalMin: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMin));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function rehearsalWindows(kind: "opensSoon" | "closingSoon" | "break", now: Date): HoursWindow[] {
  const nowMin = minutesNow(now);
  if (kind === "opensSoon") {
    return [{ from: clockLabel(nowMin + 15), to: clockLabel(nowMin + 120) }];
  }
  if (kind === "closingSoon") {
    return [{ from: clockLabel(nowMin - 90), to: clockLabel(nowMin + 12) }];
  }
  return [
    { from: clockLabel(nowMin - 150), to: clockLabel(nowMin - 40) },
    { from: clockLabel(nowMin + 50), to: clockLabel(nowMin + 150) },
  ];
}

function withRehearsalPin<T extends SoonHouse>(house: T, now: Date): T {
  const kind = house.id ? REHEARSAL_PIN[house.id] : undefined;
  if (!kind) return house;
  if (kind === "closed") return { ...house, visit: "closed" };
  // After the real last window the night is over — do not invent a later reopen.
  if (isHoursNightOver(house, now)) return house;
  return { ...house, ...syncHoursFields(rehearsalWindows(kind, now)), visit: "come" };
}

/**
 * Last 30 minutes of an open clock window. Ignores the Halloween date so
 * rehearsal nights still mark pins and cards; sold-out / frozen houses do not.
 */
export function closingSoonAt(house: SoonHouse, now = appNow()): string | null {
  house = withRehearsalPin(house, now);
  if (effectiveVisit(house) === "closed") return null;
  if (isFrozen(house, now.getTime())) return null;
  const nowMin = minutesNow(now);
  for (const window of houseHoursWindows(house)) {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) continue;
    if (nowMin >= from && nowMin < to && to - nowMin <= CLOSING_SOON_MINUTES) {
      return window.to;
    }
  }
  return null;
}

/** Next 30 minutes before an open clock window. Same rehearsal rules as closing soon. */
export function openingSoonAt(house: SoonHouse, now = appNow()): string | null {
  house = withRehearsalPin(house, now);
  if (effectiveVisit(house) === "closed") return null;
  if (isFrozen(house, now.getTime())) return null;
  if (closingSoonAt(house, now)) return null;
  const nowMin = minutesNow(now);
  for (const window of houseHoursWindows(house)) {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) continue;
    if (nowMin < from && from - nowMin <= OPENS_SOON_MINUTES) {
      return window.from;
    }
  }
  return null;
}

export function isClosingSoon(house: SoonHouse, now = appNow()) {
  return closingSoonAt(house, now) !== null;
}

export function isOpeningSoon(house: SoonHouse, now = appNow()) {
  return openingSoonAt(house, now) !== null;
}

/** Opening-soon interval overlaps the visitor outing window (or a single probe time). */
export function isOpeningSoonForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  if (!range || !visitRangeIsSpan(range)) {
    const probe = range ? filterProbeAt(range.start) : wallNow;
    return isOpeningSoon(house, probe);
  }
  const probe = filterProbeAt(range.start);
  const prepared = preparedFilterHouse(house, probe);
  if (effectiveVisit(prepared) === "closed" || isFrozen(prepared, probe.getTime())) return false;
  return houseHoursWindows(prepared).some((window) => {
    const from = parseClockMinutes(window.from);
    if (from === null) return false;
    return minuteRangesOverlap(from - OPENS_SOON_MINUTES, from, range.start, range.end);
  });
}

/** Closing-soon interval overlaps the visitor outing window (or a single probe time). */
export function isClosingSoonForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  if (!range || !visitRangeIsSpan(range)) {
    const probe = range ? filterProbeAt(range.start) : wallNow;
    return isClosingSoon(house, probe);
  }
  const probe = filterProbeAt(range.start);
  const prepared = preparedFilterHouse(house, probe);
  if (effectiveVisit(prepared) === "closed" || isFrozen(prepared, probe.getTime())) return false;
  return houseHoursWindows(prepared).some((window) => {
    const to = parseClockMinutes(window.to);
    if (to === null) return false;
    return minuteRangesOverlap(to - CLOSING_SOON_MINUTES, to, range.start, range.end);
  });
}

/** Open during the visitor outing window (or at a single probe time). */
export function isOpenNowForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  if (!range || !visitRangeIsSpan(range)) {
    const probe = range ? filterProbeAt(range.start) : wallNow;
    return isOpenNow(house, probe);
  }
  const probe = filterProbeAt(range.start);
  const prepared = preparedFilterHouse(house, probe);
  if (effectiveVisit(prepared) === "closed" || isFrozen(prepared, probe.getTime())) return false;
  return houseHoursWindows(prepared).some((window) => {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) return false;
    return minuteRangesOverlap(from, to, range.start, range.end);
  });
}

/** On break between hour windows during the visitor outing window. */
export function isOnBreakForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  if (!range || !visitRangeIsSpan(range)) {
    const probe = range ? filterProbeAt(range.start) : wallNow;
    return isOnBreak(house, probe) || isFrozen(house, probe.getTime());
  }
  const probe = filterProbeAt(range.start);
  const prepared = preparedFilterHouse(house, probe);
  if (effectiveVisit(prepared) === "closed") return false;
  if (isFrozen(prepared, probe.getTime())) return true;
  const windows = houseHoursWindows(prepared)
    .flatMap((window) => {
      const from = parseClockMinutes(window.from);
      const to = parseClockMinutes(window.to);
      if (from === null || to === null) return [];
      return [{ from, to }];
    })
    .sort((a, b) => a.from - b.from);
  for (let i = 0; i < windows.length - 1; i++) {
    const gapStart = windows[i]!.to;
    const gapEnd = windows[i + 1]!.from;
    if (minuteRangesOverlap(gapStart, gapEnd, range.start, range.end)) return true;
  }
  return false;
}

/** Not yet open at the start of the visitor window (or probe time). */
export function isNotYetOpenForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  const probe = range ? filterProbeAt(range.start) : wallNow;
  if (effectiveVisit(house) === "closed") return false;
  return isHoursNotYetOpen(house, probe);
}

/** After hours at the end of the visitor window (or probe time). */
export function isAfterHoursForFilter(
  house: FilterHouse,
  visitWindowFrom = "",
  visitWindowTo = "",
  wallNow = appNow(),
) {
  const range = visitWindowMinuteRange(visitWindowFrom, visitWindowTo);
  const probe = range
    ? filterProbeAt(visitRangeIsSpan(range) ? range.end : range.start)
    : wallNow;
  if (effectiveVisit(house) === "closed") return false;
  return isHoursNightOver(house, probe);
}

/** Between two clock windows (not yet opening-soon). Same rehearsal rules. */
export function onBreakAt(house: SoonHouse, now = appNow()): string | null {
  if (isHoursNightOver(house, now)) return null;
  house = withRehearsalPin(house, now);
  if (effectiveVisit(house) === "closed") return null;
  if (isFrozen(house, now.getTime())) return null;
  if (closingSoonAt(house, now) || openingSoonAt(house, now)) return null;
  const nowMin = minutesNow(now);
  const parsed = houseHoursWindows(house).flatMap((window) => {
    const from = parseClockMinutes(window.from);
    const to = parseClockMinutes(window.to);
    if (from === null || to === null) return [];
    return [{ from, to, labelFrom: window.from }];
  });
  if (parsed.some((window) => nowMin >= window.from && nowMin < window.to)) return null;
  const next = parsed.find((window) => nowMin < window.from);
  const anyEnded = parsed.some((window) => nowMin >= window.to);
  if (next && anyEnded) return next.labelFrom;
  return null;
}

export function isOnBreak(house: SoonHouse, now = appNow()) {
  return onBreakAt(house, now) !== null;
}

/** True when kids should come now (within hours, not sold out / frozen). */
export function isOpenNow(
  house: HoursSource & {
    visit?: VisitState;
    soldOut?: boolean;
    adminFrozen?: boolean;
    ownerFrozenUntil?: string | null;
  },
  now = appNow(),
) {
  if (isFrozen(house, now.getTime())) return false;
  const status = hoursStatus(house, now);
  return status.kind === "open" || status.kind === "closingSoon";
}

export const MAX_HOUR_WINDOWS = MAX_WINDOWS;
