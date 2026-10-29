import { config } from "@/lib/config";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import type { AddressRevealSchedule } from "@/lib/types";

/** Badge line under the countdown sign — e.g. `12:00 · 31.10`. */
export function eventCountdownDateBadgeLabel(schedule?: AddressRevealSchedule | null): string {
  const { hour, minute } = mergeAddressRevealSchedule(schedule ?? undefined);
  const { day, month } = config.eventNight;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${hh}:${min} · ${dd}.${mm}`;
}
