import { addressRevealTime } from "@/lib/address-reveal";
import { appNow } from "@/lib/app-clock";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import type { AddressRevealSchedule } from "@/lib/types";

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

/** Countdown target — address reveal on event night (catalog override when set). */
export function eventCountdownTarget(
  now = appNow(),
  schedule?: AddressRevealSchedule | null,
) {
  void now;
  return addressRevealTime(mergeAddressRevealSchedule(schedule ?? undefined));
}

/** True until address reveal — then live house status takes over. */
export function shouldShowEventCountdown(
  now = appNow(),
  schedule?: AddressRevealSchedule | null,
) {
  return now.getTime() < eventCountdownTarget(now, schedule).getTime();
}

export function eventCountdownRemaining(
  now = appNow(),
  schedule?: AddressRevealSchedule | null,
): EventCountdownParts | null {
  const target = eventCountdownTarget(now, schedule);
  if (target.getTime() <= now.getTime()) return null;
  return formatEventCountdownPartsFromDates(now, target);
}

/** Last tick before reveal — `0 Days · 00:00:00`. */
export function eventCountdownIsZero(parts: EventCountdownParts): boolean {
  return parts.days === 0 && parts.hours === 0 && parts.minutes === 0 && parts.seconds === 0;
}
