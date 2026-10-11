import { config } from "@/lib/config";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import type { AddressRevealSchedule } from "@/lib/types";

/** When private home addresses become visible to registered devices. */
export function privateHomeAddressesRevealLine(
  addressReveal?: AddressRevealSchedule | null,
): string {
  const schedule = mergeAddressRevealSchedule(addressReveal);
  const time = `${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`;
  return `כתובות בתים פרטיים יוצגו כאן ב-${config.eventNight.labelHe} בשעה ${time}.`;
}

export const NIGHT_PASS_REGISTER_SUBTITLE =
  "קיבלתם קוד? הירשמו כדי לראות כתובות בתים פרטיים ביום החשיפה";
