import { config } from "@/lib/config";
import type { AddressRevealSchedule, Catalog, DbFile } from "@/lib/types";

export function defaultAddressRevealSchedule(): AddressRevealSchedule {
  return {
    hour: config.addressReveal.hour,
    minute: config.addressReveal.minute,
  };
}

export function normalizeAddressRevealSchedule(input: {
  hour?: unknown;
  minute?: unknown;
}): AddressRevealSchedule {
  const defaults = defaultAddressRevealSchedule();
  const hourRaw = Number(input.hour);
  const minuteRaw = Number(input.minute);
  const hour = Number.isFinite(hourRaw) ? Math.min(23, Math.max(0, Math.trunc(hourRaw))) : defaults.hour;
  const minute = Number.isFinite(minuteRaw)
    ? Math.min(59, Math.max(0, Math.trunc(minuteRaw)))
    : defaults.minute;
  return { hour, minute };
}

/** Effective Oct 31 reveal clock — DB override when set, otherwise config default. */
export function mergeAddressRevealSchedule(
  override?: AddressRevealSchedule | null,
): AddressRevealSchedule {
  if (!override) return defaultAddressRevealSchedule();
  return normalizeAddressRevealSchedule(override);
}

export function addressRevealScheduleFromDb(
  eventSettings?: DbFile["eventSettings"] | null,
): AddressRevealSchedule {
  return mergeAddressRevealSchedule(eventSettings?.addressReveal);
}

export function catalogEventSettings(
  eventSettings?: DbFile["eventSettings"] | null,
): NonNullable<Catalog["eventSettings"]> {
  return {
    addressReveal: addressRevealScheduleFromDb(eventSettings),
  };
}

export function eventSettingsStamp(eventSettings?: DbFile["eventSettings"] | null) {
  const raw = eventSettings?.updatedAt ?? "";
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}
