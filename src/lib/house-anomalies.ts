import { parseStreetAndNumber } from "@/lib/address-text";
import { inNeighborhood } from "@/lib/config";
import { eventOpenHoursScheduleFromDb } from "@/lib/event-settings";
import { clusterAddressKey, clusterAddressKeyForHouse, clusterMembersForHouse } from "@/lib/house-clusters";
import { houseNeedsArrivalInstructions } from "@/lib/dwelling-kind";
import { isHouseDeleted } from "@/lib/house-state";
import { isPoiHouse } from "@/lib/house-kind";
import { isStubHouse, type HouseSet } from "@/lib/house-set";
import { boothNumberForHouse } from "@/lib/cluster-booth";
import {
  houseHoursWindows,
  hoursWindowsIssue,
  parseClockMinutes,
} from "@/lib/hours";
import type {
  DbFile,
  EventOpenHoursSchedule,
  House,
  HouseAnomalyKind,
  HouseAnomalyReview,
  PublicHouse,
} from "@/lib/types";

export type DetectedHouseAnomaly = {
  kind: HouseAnomalyKind;
  severity: "warning" | "info";
  messageHe: string;
  detailHe?: string;
};

export type AnomalyListItem = DetectedHouseAnomaly & {
  houseId: string;
  houseName: string;
  address: string;
  updatedAt: string;
  reviewed?: HouseAnomalyReview;
  /** One row per building for shared-pin issues. */
  clusterKey?: string;
  affectedHouseIds?: string[];
  isStub?: boolean;
};

const CLUSTER_DEDUPE_KINDS = new Set<HouseAnomalyKind>([
  "building_accessible_mismatch",
  "building_address_mismatch",
]);

export function anomalyHouseSetFilter(set: HouseSet): (house: House) => boolean {
  if (set === "all") return () => true;
  if (set === "stubs") return (house) => isStubHouse(house);
  return (house) => !isStubHouse(house);
}

const VERY_SHORT_MINUTES = 30;
const EARLY_MORNING_BEFORE = 12 * 60;

export type AnomalyDetectionContext = {
  eventOpenHours: EventOpenHoursSchedule;
  eventFromMin: number;
  eventToMin: number;
};

export function anomalyDetectionContextFromDb(db: Pick<DbFile, "eventSettings">): AnomalyDetectionContext {
  const eventOpenHours = eventOpenHoursScheduleFromDb(db.eventSettings);
  const eventFromMin = parseClockMinutes(eventOpenHours.openFrom) ?? 17 * 60;
  const eventToMin = parseClockMinutes(eventOpenHours.openTo) ?? 20 * 60;
  return { eventOpenHours, eventFromMin, eventToMin };
}

function windowDurationMinutes(from: string, to: string): number | null {
  const start = parseClockMinutes(from);
  const end = parseClockMinutes(to);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

function windowOverlapsEvent(from: string, to: string, eventFromMin: number, eventToMin: number): boolean {
  const start = parseClockMinutes(from);
  const end = parseClockMinutes(to);
  if (start === null || end === null || end <= start) return false;
  return start < eventToMin && end > eventFromMin;
}

function nameLooksLikeAddress(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const parsed = parseStreetAndNumber(trimmed);
  if (parsed.road && parsed.num && parsed.road.length >= 2) return true;
  if (/\d/.test(trimmed) && /(?:רח|רחוב|שדר|יהוד|נחל|חרוז|הגפן)/u.test(trimmed)) return true;
  return false;
}

function isActiveHouse(house: House): boolean {
  if (isHouseDeleted(house) || house.isPractice) return false;
  return true;
}

export function detectHouseAnomalies(
  house: House,
  allHouses: House[],
  ctx: AnomalyDetectionContext,
): DetectedHouseAnomaly[] {
  if (!isActiveHouse(house)) return [];
  const out: DetectedHouseAnomaly[] = [];
  const publicPeers = allHouses.filter(isActiveHouse) as PublicHouse[];

  const windows = houseHoursWindows(house);
  const hoursIssue = hoursWindowsIssue(windows);
  if (hoursIssue) {
    out.push({
      kind: "hours_invalid",
      severity: "warning",
      messageHe: "שעות פתיחה לא תקינות",
      detailHe: hoursIssue,
    });
  } else {
    for (const window of windows) {
      const duration = windowDurationMinutes(window.from, window.to);
      if (duration !== null && duration <= VERY_SHORT_MINUTES) {
        out.push({
          kind: "hours_very_short",
          severity: "warning",
          messageHe: "חלון שעות קצר מאוד (עד חצי שעה)",
          detailHe: `${window.from}–${window.to}`,
        });
        break;
      }
    }

    for (const window of windows) {
      const fromMin = parseClockMinutes(window.from);
      if (fromMin !== null && fromMin < EARLY_MORNING_BEFORE) {
        out.push({
          kind: "hours_early_morning",
          severity: "warning",
          messageHe: "שעות פתיחה בבוקר — כנראה טעות",
          detailHe: `${window.from}–${window.to}`,
        });
        break;
      }
    }

    const outside = windows.filter(
      (window) => !windowOverlapsEvent(window.from, window.to, ctx.eventFromMin, ctx.eventToMin),
    );
    if (outside.length > 0) {
      out.push({
        kind: "hours_outside_event",
        severity: "warning",
        messageHe: "שעות מחוץ לחלון האירוע",
        detailHe: `צפוי בערך ${ctx.eventOpenHours.openFrom}–${ctx.eventOpenHours.openTo} · ${outside.map((w) => `${w.from}–${w.to}`).join(" · ")}`,
      });
    }
  }

  if (!house.name.trim()) {
    out.push({
      kind: "empty_display_name",
      severity: "warning",
      messageHe: "שם בית ריק",
    });
  } else if (nameLooksLikeAddress(house.name)) {
    out.push({
      kind: "name_looks_like_address",
      severity: "info",
      messageHe: "שם הבית נראה כמו כתובת",
      detailHe: house.name.trim(),
    });
  }

  if (houseNeedsArrivalInstructions(house) && !house.arrival?.trim()) {
    out.push({
      kind: "missing_arrival",
      severity: "info",
      messageHe: "חסרות הוראות הגעה (דירה בבניין)",
    });
  }

  if (house.visit === "closed" && windows.length > 0 && hoursIssue === null) {
    out.push({
      kind: "visit_closed_with_hours",
      severity: "info",
      messageHe: "מסומן סגור אבל יש שעות פתיחה",
      detailHe: windows.map((w) => `${w.from}–${w.to}`).join(" · "),
    });
  }

  if (
    Number.isFinite(house.lat) &&
    Number.isFinite(house.lng) &&
    !inNeighborhood(house.lat, house.lng)
  ) {
    out.push({
      kind: "pin_outside_bounds",
      severity: "warning",
      messageHe: "הסיכה מחוץ לאזור האירוע",
    });
  }

  const members = clusterMembersForHouse(publicPeers, house.id).filter((m) => m.id !== house.id);
  if (members.length > 0 && !isPoiHouse(house)) {
    const accessiblePeers = members.filter((m) => !isPoiHouse(m));
    if (accessiblePeers.length > 0) {
      const hasAccessible = accessiblePeers.some((m) => m.accessible);
      const hasInaccessible = accessiblePeers.some((m) => !m.accessible);
      if (house.accessible ? hasInaccessible : hasAccessible) {
        out.push({
          kind: "building_accessible_mismatch",
          severity: "warning",
          messageHe: "באותו בניין — נגישות שונה בין דירות",
          detailHe: accessiblePeers
            .map((m) => `${m.name || m.id}: ${m.accessible ? "נגיש" : "לא נגיש"}`)
            .concat(`${house.name || house.id}: ${house.accessible ? "נגיש" : "לא נגיש"}`)
            .join(" · "),
        });
      }
    }

    const myAddrKey = clusterAddressKey(house.address);
    const peerKeys = new Set(
      members.map((m) => clusterAddressKey(m.address)).filter((key) => key.includes("#")),
    );
    if (myAddrKey.includes("#") && peerKeys.size > 0 && !peerKeys.has(myAddrKey)) {
      out.push({
        kind: "building_address_mismatch",
        severity: "info",
        messageHe: "כתובות שונות באותו בניין (סיכה משותפת)",
        detailHe: [house.address, ...members.map((m) => m.address)].filter(Boolean).join(" · "),
      });
    }
  }

  const deduped = new Map<HouseAnomalyKind, DetectedHouseAnomaly>();
  for (const item of out) {
    if (!deduped.has(item.kind)) deduped.set(item.kind, item);
  }
  return [...deduped.values()];
}

export function isAnomalyActionable(
  house: House,
  anomaly: DetectedHouseAnomaly,
): boolean {
  const review = house.adminAnomalyReviews?.[anomaly.kind];
  if (!review) return true;
  const houseStamp = Date.parse(house.updatedAt);
  const reviewStamp = Date.parse(review.houseUpdatedAt);
  if (Number.isFinite(houseStamp) && Number.isFinite(reviewStamp) && houseStamp > reviewStamp) {
    return true;
  }
  return false;
}

export function listActionableAnomaliesForHouse(
  house: House,
  allHouses: House[],
  ctx: AnomalyDetectionContext,
): AnomalyListItem[] {
  return detectHouseAnomalies(house, allHouses, ctx)
    .filter((anomaly) => isAnomalyActionable(house, anomaly))
    .map((anomaly) => ({
      ...anomaly,
      houseId: house.id,
      houseName: house.name,
      address: house.address,
      updatedAt: house.updatedAt,
      reviewed: house.adminAnomalyReviews?.[anomaly.kind],
    }));
}

function pickClusterRepresentative(members: House[]): House {
  return [...members].sort((a, b) => {
    const an = boothNumberForHouse(a);
    const bn = boothNumberForHouse(b);
    if (an != null && bn != null && an !== bn) return an - bn;
    if (an != null && bn == null) return -1;
    if (an == null && bn != null) return 1;
    return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id, "he");
  })[0]!;
}

function dedupeClusterAnomalies(items: AnomalyListItem[], houses: House[]): AnomalyListItem[] {
  const houseById = new Map(houses.map((h) => [h.id, h]));
  const clusterRows = new Map<string, AnomalyListItem>();
  const rest: AnomalyListItem[] = [];

  for (const item of items) {
    if (!CLUSTER_DEDUPE_KINDS.has(item.kind)) {
      rest.push(item);
      continue;
    }
    const source = houseById.get(item.houseId);
    if (!source) {
      rest.push(item);
      continue;
    }
    const members = clusterMembersForHouse(houses, source.id)
      .map((m) => houseById.get(m.id))
      .filter((h): h is House => Boolean(h));
    const clusterKey = clusterAddressKeyForHouse(source);
    const rowKey = `${item.kind}:${clusterKey}`;
    const representative = pickClusterRepresentative(members);
    const affectedHouseIds = members.map((m) => m.id);
    let detailHe = item.detailHe;
    if (item.kind === "building_accessible_mismatch" && members.length > 1) {
      const accessibleCount = members.filter((m) => m.accessible).length;
      const notCount = members.length - accessibleCount;
      detailHe = `${accessibleCount} נגיש · ${notCount} לא נגיש · ${members.length} בתים בבניין`;
    } else if (affectedHouseIds.length > 1) {
      detailHe = detailHe
        ? `${detailHe} · ${affectedHouseIds.length} בתים בבניין`
        : `${affectedHouseIds.length} בתים בבניין`;
    }
    const merged: AnomalyListItem = {
      ...item,
      houseId: representative.id,
      houseName: representative.name,
      address: representative.address,
      updatedAt: representative.updatedAt,
      clusterKey,
      affectedHouseIds,
      isStub: isStubHouse(representative),
      detailHe,
    };
    if (!clusterRows.has(rowKey)) clusterRows.set(rowKey, merged);
  }

  return [...rest, ...clusterRows.values()];
}

export function clusterMembersForAnomalyReview(
  houses: House[],
  houseId: string,
  kind: HouseAnomalyKind,
): string[] {
  if (!CLUSTER_DEDUPE_KINDS.has(kind)) return [houseId];
  const members = clusterMembersForHouse(houses, houseId);
  return members.map((m) => m.id);
}

export function listAllActionableAnomalies(
  houses: House[],
  ctx: AnomalyDetectionContext,
  options?: { houseSet?: HouseSet },
): AnomalyListItem[] {
  const setFilter = anomalyHouseSetFilter(options?.houseSet ?? "real");
  const active = houses.filter((h) => isActiveHouse(h) && setFilter(h));
  const items: AnomalyListItem[] = [];
  for (const house of active) {
    items.push(
      ...listActionableAnomaliesForHouse(house, active, ctx).map((item) => ({
        ...item,
        isStub: isStubHouse(house),
      })),
    );
  }
  const deduped = dedupeClusterAnomalies(items, active);
  deduped.sort((a, b) => {
    const severity = (s: AnomalyListItem["severity"]) => (s === "warning" ? 0 : 1);
    const bySeverity = severity(a.severity) - severity(b.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  return deduped;
}

/** Drop reviews for issues that no longer apply; returns updated house if changed. */
export function reconcileHouseAnomalyReviews(
  house: House,
  allHouses: House[],
  ctx: AnomalyDetectionContext,
): House {
  const detected = new Set(detectHouseAnomalies(house, allHouses, ctx).map((d) => d.kind));
  const reviews = house.adminAnomalyReviews;
  if (!reviews || Object.keys(reviews).length === 0) return house;
  let changed = false;
  const nextReviews = { ...reviews };
  for (const kind of Object.keys(nextReviews) as HouseAnomalyKind[]) {
    if (!detected.has(kind)) {
      delete nextReviews[kind];
      changed = true;
    }
  }
  if (!changed) return house;
  return {
    ...house,
    adminAnomalyReviews: Object.keys(nextReviews).length ? nextReviews : undefined,
  };
}

export const ANOMALY_KIND_LABELS: Record<HouseAnomalyKind, string> = {
  hours_invalid: "שעות לא תקינות",
  hours_very_short: "שעות קצרות מדי",
  hours_outside_event: "מחוץ לשעות האירוע",
  hours_early_morning: "שעות בוקר",
  name_looks_like_address: "שם כמו כתובת",
  building_accessible_mismatch: "נגישות בבניין",
  building_address_mismatch: "כתובות בבניין",
  visit_closed_with_hours: "סגור עם שעות",
  missing_arrival: "חסרה הגעה",
  pin_outside_bounds: "סיכה מחוץ לאזור",
  empty_display_name: "שם ריק",
};
