import { appNow } from "@/lib/app-clock";
import { addHouseCutoffTime, eventNightRelation } from "@/lib/hours";

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

export function formatEventCountdownParts(totalMs: number): EventCountdownParts {
  const ms = Math.max(0, totalMs);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
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

/** Countdown target — event night at 17:00 (same as add-house cutoff). */
export function eventCountdownTarget(now = appNow()) {
  void now;
  return addHouseCutoffTime();
}

/** True before the Halloween calendar night. Hidden on and after Oct 31. */
export function shouldShowEventCountdown(now = appNow()) {
  return eventNightRelation(now) < 0;
}

export function eventCountdownRemaining(now = appNow()): EventCountdownParts | null {
  if (!shouldShowEventCountdown(now)) return null;
  const remaining = eventCountdownTarget(now).getTime() - now.getTime();
  if (remaining <= 0) return null;
  return formatEventCountdownParts(remaining);
}
