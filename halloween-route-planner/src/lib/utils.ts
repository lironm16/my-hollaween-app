import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isWithinInterval, parse, set } from "date-fns";
import type { House } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_MAP = [6, 0, 1, 2, 3, 4, 5];

function getDayIndex(date: Date) {
  const jsDay = date.getDay();
  return DAY_MAP[jsDay] ?? jsDay;
}

function buildDateTime(time: string, reference: Date) {
  const [hours, minutes] = time.split(":").map(Number);
  return set(reference, { hours, minutes, seconds: 0, milliseconds: 0 });
}

export function isHouseOpenNow(house: House, reference = new Date()) {
  if (house.status !== "active") {
    return false;
  }

  const currentDay = getDayIndex(reference);
  const slots = house.hours.filter((slot) => slot.day === currentDay);

  if (!slots.length) {
    return false;
  }

  return slots.some((slot) => {
    const start = buildDateTime(slot.start, reference);
    const end = buildDateTime(slot.end, reference);

    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    return isWithinInterval(reference, { start, end });
  });
}

export function nextOpeningTime(house: House, reference = new Date()) {
  const sorted = [...house.hours].sort((a, b) => a.day - b.day);
  for (const slot of sorted) {
    const start = buildDateTime(slot.start, reference);
    start.setDate(start.getDate() + ((slot.day - getDayIndex(reference) + 7) % 7));
    if (start > reference) {
      return start;
    }
  }
  return undefined;
}

export function formatTimeRange(start: string, end: string) {
  return `${start} – ${end}`;
}

export function formatTimeLabel(time: string, reference = new Date()) {
  return parse(time, "HH:mm", reference).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
