import { isHouseClosedForDisplay } from "@/lib/filter-houses";
import { distanceMeters } from "@/lib/geo";
import { effectiveVisit } from "@/lib/house-state";
import type { PublicHouse } from "@/lib/types";

export const LIST_SORT_KEY = "hw-list-sort";
export const LIST_SORT_EVENT = "hw-list-sort";

export const LIST_SORTS = ["nearby", "added", "updated", "open", "name"] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export const LIST_SORT_LABELS: Record<ListSort, string> = {
  nearby: "לידי",
  added: "חדשים קודם",
  updated: "עודכנו לאחרונה",
  open: "פתוח כעת",
  name: "לפי שם",
};

function isListSort(value: string | null | undefined): value is ListSort {
  return Boolean(value && (LIST_SORTS as readonly string[]).includes(value));
}

export function readListSort(): ListSort {
  if (typeof window === "undefined") return "nearby";
  try {
    const stored = localStorage.getItem(LIST_SORT_KEY);
    if (isListSort(stored)) return stored;
  } catch {
    /* private mode */
  }
  return "nearby";
}

export function writeListSort(next: ListSort) {
  if (typeof window === "undefined") return;
  if (readListSort() === next) return;
  try {
    localStorage.setItem(LIST_SORT_KEY, next);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(LIST_SORT_EVENT));
}

export function cycleListSort(current: ListSort, delta: 1 | -1): ListSort {
  const index = LIST_SORTS.indexOf(current);
  const next = (index + delta + LIST_SORTS.length) % LIST_SORTS.length;
  return LIST_SORTS[next]!;
}

function stamp(value: string | undefined) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

function closedRank(house: PublicHouse, now: Date) {
  if (effectiveVisit(house) === "closed") return 2;
  if (isHouseClosedForDisplay(house, now)) return 1;
  return 0;
}

export function sortHousesForList(
  houses: PublicHouse[],
  sort: ListSort,
  origin: { lat: number; lng: number } | null | undefined,
  now: Date,
): Array<{ house: PublicHouse; distanceM?: number }> {
  const withDistance = houses.map((house) => ({
    house,
    distanceM: origin ? distanceMeters(origin, house) : undefined,
  }));

  const byName = (a: PublicHouse, b: PublicHouse) => a.name.localeCompare(b.name, "he");
  const byClosed = (a: PublicHouse, b: PublicHouse) => closedRank(a, now) - closedRank(b, now);

  withDistance.sort((a, b) => {
    const closed = byClosed(a.house, b.house);
    if (closed !== 0 && sort !== "added" && sort !== "updated") return closed;

    switch (sort) {
      case "added": {
        const delta = stamp(b.house.createdAt) - stamp(a.house.createdAt);
        return delta !== 0 ? delta : byName(a.house, b.house);
      }
      case "updated": {
        const delta = stamp(b.house.updatedAt) - stamp(a.house.updatedAt);
        return delta !== 0 ? delta : byName(a.house, b.house);
      }
      case "open": {
        const openDelta = closedRank(a.house, now) - closedRank(b.house, now);
        if (openDelta !== 0) return openDelta;
        if (a.distanceM !== undefined && b.distanceM !== undefined) return a.distanceM - b.distanceM;
        return byName(a.house, b.house);
      }
      case "name":
        return byName(a.house, b.house);
      case "nearby":
      default:
        if (a.distanceM !== undefined && b.distanceM !== undefined) {
          const delta = a.distanceM - b.distanceM;
          if (delta !== 0) return delta;
        }
        return byName(a.house, b.house);
    }
  });

  return withDistance;
}
