import type { HouseFiltersState } from "@/lib/offline-db";
import { hasVisitWindow, parseClockMinutes } from "@/lib/hours";

/** Typical end of an evening trick-or-treat outing. */
export const STANDARD_VISIT_END = "20:00";
/** Latest default end when the visitor starts after STANDARD_VISIT_END. */
export const LATE_VISIT_END = "23:00";

export type VisitWindowMode = "all" | "now" | "custom";

export function formatClockMinutes(totalMin: number): string {
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function clockMinutesFromDate(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function formatClockFromDate(now: Date): string {
  return formatClockMinutes(clockMinutesFromDate(now));
}

/**
 * Default trip end: 20:00 while it is still before 20:00.
 * After 20:00, extend to at least 90 more minutes but never past 23:00.
 */
export function defaultVisitWindowEnd(now: Date): string {
  return defaultVisitWindowEndFromStart(formatClockFromDate(now));
}

/** Default trip end for a chosen start clock on event night. */
export function defaultVisitWindowEndFromStart(startClock: string): string {
  const startMin = parseClockMinutes(startClock);
  const standardEnd = parseClockMinutes(STANDARD_VISIT_END)!;
  const lateCap = parseClockMinutes(LATE_VISIT_END)!;
  if (startMin === null) return STANDARD_VISIT_END;
  if (startMin >= standardEnd) {
    return formatClockMinutes(Math.min(startMin + 90, lateCap));
  }
  return STANDARD_VISIT_END;
}

export function effectiveVisitWindowMode(filters: HouseFiltersState): VisitWindowMode {
  if (filters.visitWindowMode) return filters.visitWindowMode;
  return hasVisitWindow(filters.visitWindowFrom, filters.visitWindowTo) ? "custom" : "all";
}

export function resolveVisitWindow(
  filters: HouseFiltersState,
  now: Date,
): { from: string; to: string; mode: VisitWindowMode } {
  const mode = effectiveVisitWindowMode(filters);
  if (mode === "all") {
    return { mode, from: "", to: "" };
  }
  if (mode === "now") {
    return {
      mode,
      from: formatClockFromDate(now),
      to: defaultVisitWindowEnd(now),
    };
  }
  const useFrom = filters.visitWindowUseFrom ?? true;
  const useTo = filters.visitWindowUseTo ?? false;
  const from = useFrom ? filters.visitWindowFrom || formatClockFromDate(now) : "";
  const to = useTo
    ? filters.visitWindowTo || defaultVisitWindowEndFromStart(from || formatClockFromDate(now))
    : "";
  return { mode, from, to };
}
