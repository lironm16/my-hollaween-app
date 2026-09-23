import { appNow } from "@/lib/app-clock";
import { addHouseCutoffTime } from "@/lib/hours";

export type EventCountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** `HH:MM:SS` for the bar and full screen. */
  time: string;
  /** `91 Days · 07:22:32` */
  label: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatEventCountdownPartsFromDates(from: Date, to: Date): EventCountdownParts {
  let cursor = new Date(from.getTime());
  let days = 0;
  while (true) {
    const nextDay = new Date(cursor.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay.getTime() > to.getTime()) break;
    days += 1;
    cursor = nextDay;
  }

  const remainingMs = Math.max(0, to.getTime() - cursor.getTime());
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  const dayLabel = days === 1 ? "Day" : "Days";
  return {
    days,
    hours,
    minutes,
    seconds,
    time,
    label: `${days} ${dayLabel} · ${time}`,
  };
}

/** @deprecated Prefer date-based decomposition; fixed 86400s days drift across DST. */
export function formatEventCountdownParts(totalMs: number): EventCountdownParts {
  const from = new Date(0);
  const to = new Date(Math.max(0, totalMs));
  return formatEventCountdownPartsFromDates(from, to);
}

/** Countdown target — event night at 17:00 (same as add-house cutoff). */
export function eventCountdownTarget(now = appNow()) {
  void now;
  return addHouseCutoffTime();
}

/** True until 17:00 on Oct 31 — then live house status takes over. */
export function shouldShowEventCountdown(now = appNow()) {
  return now.getTime() < eventCountdownTarget(now).getTime();
}

export function eventCountdownRemaining(now = appNow()): EventCountdownParts | null {
  const target = eventCountdownTarget(now);
  if (target.getTime() <= now.getTime()) return null;
  return formatEventCountdownPartsFromDates(now, target);
}
