import { config } from "@/lib/config";

/** Event-night clock — Israel local (matches visitors in the neighborhood). */
export const EVENT_TIME_ZONE = "Asia/Jerusalem";

type EventLocalParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

function readZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

/** Wall instant for a calendar time on event night in {@link EVENT_TIME_ZONE}. */
export function dateInEventTimeZone(parts: EventLocalParts): Date {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
  } = parts;
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zoned = readZonedParts(new Date(utcMs), EVENT_TIME_ZONE);
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualMs = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    const delta = desiredMs - actualMs;
    if (delta === 0) break;
    utcMs += delta;
  }
  return new Date(utcMs);
}

/** Configured Halloween calendar night at local midnight in the event zone. */
export function eventNightMidnightInTimeZone(reference = config.eventNight) {
  const { year, month, day } = reference;
  return dateInEventTimeZone({ year, month, day, hour: 0, minute: 0, second: 0 });
}
