import type { EventBoundaryZone } from "@/lib/event-boundary";

export function addEventBoundaryZone(
  current: EventBoundaryZone[],
  zone: EventBoundaryZone,
): EventBoundaryZone[] {
  if (current.some((z) => z.id === zone.id)) return current;
  return [...current, zone];
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
