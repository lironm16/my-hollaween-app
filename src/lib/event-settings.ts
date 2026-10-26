import { config } from "@/lib/config";
import { parseClockMinutes } from "@/lib/hours";
import type {
  AddHouseCutoffSchedule,
  AddressRevealSchedule,
  Catalog,
  DbFile,
  EventOpenHoursSchedule,
} from "@/lib/types";

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

export function defaultAddHouseCutoffSchedule(): AddHouseCutoffSchedule {
  const d = config.addHouseCutoff;
  return {
    year: d.year,
    month: d.month,
    day: d.day,
    hour: d.hour,
    minute: d.minute,
  };
}

export function normalizeAddHouseCutoffSchedule(input: {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
}): AddHouseCutoffSchedule {
  const defaults = defaultAddHouseCutoffSchedule();
  const yearRaw = Number(input.year);
  const monthRaw = Number(input.month);
  const dayRaw = Number(input.day);
  const hourRaw = Number(input.hour);
  const minuteRaw = Number(input.minute);
  const year = Number.isFinite(yearRaw) ? Math.trunc(yearRaw) : defaults.year;
  const month = Number.isFinite(monthRaw)
    ? Math.min(12, Math.max(1, Math.trunc(monthRaw)))
    : defaults.month;
  const day = Number.isFinite(dayRaw) ? Math.min(31, Math.max(1, Math.trunc(dayRaw))) : defaults.day;
  const hour = Number.isFinite(hourRaw) ? Math.min(23, Math.max(0, Math.trunc(hourRaw))) : defaults.hour;
  const minute = Number.isFinite(minuteRaw)
    ? Math.min(59, Math.max(0, Math.trunc(minuteRaw)))
    : defaults.minute;
  return { year, month, day, hour, minute };
}

export function mergeAddHouseCutoffSchedule(
  override?: AddHouseCutoffSchedule | null,
): AddHouseCutoffSchedule {
  if (!override) return defaultAddHouseCutoffSchedule();
  return normalizeAddHouseCutoffSchedule(override);
}

export function addHouseCutoffDate(schedule: AddHouseCutoffSchedule) {
  return new Date(schedule.year, schedule.month - 1, schedule.day, schedule.hour, schedule.minute, 0, 0);
}

export function addHouseCutoffScheduleFromDb(
  eventSettings?: DbFile["eventSettings"] | null,
): AddHouseCutoffSchedule {
  return mergeAddHouseCutoffSchedule(eventSettings?.addHouseCutoff);
}

export function gemHuntPublicFromDb(eventSettings?: DbFile["eventSettings"] | null): boolean {
  return eventSettings?.gemHuntPublic === true;
}

/** Default on — only an explicit `false` in DB/catalog hides the countdown UI. */
export function countdownBannerFromDb(eventSettings?: DbFile["eventSettings"] | null): boolean {
  return eventSettings?.countdownBanner !== false;
}

export function countdownBannerFromCatalog(
  eventSettings?: Pick<NonNullable<Catalog["eventSettings"]>, "countdownBanner"> | null,
): boolean {
  return eventSettings?.countdownBanner !== false;
}

export function defaultEventOpenHoursSchedule(): EventOpenHoursSchedule {
  const d = config.eventNight;
  return {
    year: d.year,
    month: d.month,
    day: d.day,
    openFrom: "17:00",
    openTo: "20:00",
  };
}

export function normalizeEventOpenHoursSchedule(input: {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  openFrom?: unknown;
  openTo?: unknown;
}): EventOpenHoursSchedule {
  const defaults = defaultEventOpenHoursSchedule();
  const yearRaw = Number(input.year);
  const monthRaw = Number(input.month);
  const dayRaw = Number(input.day);
  const year = Number.isFinite(yearRaw) ? Math.trunc(yearRaw) : defaults.year;
  const month = Number.isFinite(monthRaw)
    ? Math.min(12, Math.max(1, Math.trunc(monthRaw)))
    : defaults.month;
  const day = Number.isFinite(dayRaw) ? Math.min(31, Math.max(1, Math.trunc(dayRaw))) : defaults.day;
  const fromRaw = typeof input.openFrom === "string" ? input.openFrom.trim().slice(0, 5) : defaults.openFrom;
  const toRaw = typeof input.openTo === "string" ? input.openTo.trim().slice(0, 5) : defaults.openTo;
  const openFrom = parseClockMinutes(fromRaw) !== null ? fromRaw : defaults.openFrom;
  const openTo = parseClockMinutes(toRaw) !== null ? toRaw : defaults.openTo;
  return { year, month, day, openFrom, openTo };
}

export function mergeEventOpenHoursSchedule(
  override?: EventOpenHoursSchedule | null,
): EventOpenHoursSchedule {
  if (!override) return defaultEventOpenHoursSchedule();
  return normalizeEventOpenHoursSchedule(override);
}

export function eventOpenHoursScheduleFromDb(
  eventSettings?: DbFile["eventSettings"] | null,
): EventOpenHoursSchedule {
  return mergeEventOpenHoursSchedule(eventSettings?.eventOpenHours);
}

/** Default open windows for the add-house form (from admin event settings or config). */
export function defaultAddHouseOpenHours(eventSettings?: DbFile["eventSettings"] | null) {
  const schedule = eventOpenHoursScheduleFromDb(eventSettings);
  return {
    openFrom: schedule.openFrom,
    openTo: schedule.openTo,
    openHours: [{ from: schedule.openFrom, to: schedule.openTo }],
  };
}

export function catalogEventSettings(
  eventSettings?: DbFile["eventSettings"] | null,
): NonNullable<Catalog["eventSettings"]> {
  return {
    ...(eventSettings?.updatedAt ? { updatedAt: eventSettings.updatedAt } : {}),
    addressReveal: addressRevealScheduleFromDb(eventSettings),
    addHouseCutoff: addHouseCutoffScheduleFromDb(eventSettings),
    gemHuntPublic: gemHuntPublicFromDb(eventSettings),
    countdownBanner: countdownBannerFromDb(eventSettings),
    eventOpenHours: eventOpenHoursScheduleFromDb(eventSettings),
  };
}

export function eventSettingsStamp(eventSettings?: DbFile["eventSettings"] | null) {
  const raw = eventSettings?.updatedAt ?? "";
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}
