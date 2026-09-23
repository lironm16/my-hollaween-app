import { config } from "@/lib/config";

/** Badge line under the countdown sign — e.g. `17:00 · 31.10`. */
export function eventCountdownDateBadgeLabel(): string {
  const { day, month } = config.eventNight;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `17:00 · ${dd}.${mm}`;
}
