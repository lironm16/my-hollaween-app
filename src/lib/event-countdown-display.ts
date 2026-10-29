import { mergeEventOpenHoursSchedule } from "@/lib/event-settings";
import type { EventOpenHoursSchedule } from "@/lib/types";

/** Badge line under the countdown sign — evening jump start, e.g. `17:00 · 31.10`. */
export function eventCountdownDateBadgeLabel(
  schedule?: EventOpenHoursSchedule | null,
): string {
  const { month, day, openFrom } = mergeEventOpenHoursSchedule(schedule ?? undefined);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${openFrom} · ${dd}.${mm}`;
}
