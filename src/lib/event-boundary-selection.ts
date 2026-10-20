import type { EventBoundaryZone } from "@/lib/event-boundary";
import { zoneKeyCity } from "@/lib/event-boundary";

export function settlementNamesMatch(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

export function zoneWithinSettlement(zone: EventBoundaryZone, settlement: string): boolean {
  const s = settlement.trim();
  if (!s) return false;
  if (zone.kind === "city") return settlementNamesMatch(zone.label, s);
  return zone.city ? settlementNamesMatch(zone.city, s) : false;
}

/** Add a zone; whole-settlement choice removes finer zones inside it. */
export function addEventBoundaryZone(
  current: EventBoundaryZone[],
  zone: EventBoundaryZone,
): EventBoundaryZone[] {
  if (current.some((z) => z.id === zone.id)) return current;

  let next = [...current, zone];

  if (zone.kind === "city") {
    const settlement = zone.label.trim();
    next = next.filter((z) => z.id === zone.id || z.kind === "city" || !zoneWithinSettlement(z, settlement));
  } else if (zone.kind === "neighborhood") {
    const settlement = zone.city?.trim();
    if (settlement) {
      next = next.filter(
        (z) =>
          z.id === zone.id ||
          !(
            (z.kind === "street" && z.city && settlementNamesMatch(z.city, settlement)) ||
            (z.kind === "city" && settlementNamesMatch(z.label, settlement))
          ),
      );
    }
  } else {
    const settlement = zone.city?.trim();
    if (settlement) {
      next = next.filter(
        (z) => !(z.kind === "city" && settlementNamesMatch(z.label, settlement)),
      );
    }
  }

  return next;
}

/** Zones removed from the selection if `incoming` is added (for confirm UI). */
export function zonesDisplacedByAdd(
  current: EventBoundaryZone[],
  incoming: EventBoundaryZone,
): EventBoundaryZone[] {
  if (current.some((z) => z.id === incoming.id)) return [];
  const after = addEventBoundaryZone(current, incoming);
  const afterIds = new Set(after.map((z) => z.id));
  return current.filter((z) => !afterIds.has(z.id));
}

export function removeEventBoundaryZone(current: EventBoundaryZone[], id: string): EventBoundaryZone[] {
  return current.filter((z) => z.id !== id);
}

export function toggleEventBoundaryZone(
  current: EventBoundaryZone[],
  zone: EventBoundaryZone,
): EventBoundaryZone[] {
  const i = current.findIndex((z) => z.id === zone.id);
  if (i >= 0) return removeEventBoundaryZone(current, zone.id);
  return addEventBoundaryZone(current, zone);
}

export function cityZoneId(settlement: string): string {
  return zoneKeyCity(settlement);
}
