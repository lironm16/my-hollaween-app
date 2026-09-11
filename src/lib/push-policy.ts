import { eventNightRelation } from "@/lib/hours";
import type { PushKind } from "@/lib/push-templates";

/**
 * Neighborhood-wide push (not map-only):
 * - Before event night: new houses only (owners register early).
 * - On event night: admin custom messages only (via /api/admin/push).
 * - House status (break, closed, candy, …): never pushed — live map + filters.
 */
export function neighborhoodPushBroadcastAllowed(kind: PushKind, now = new Date()): boolean {
  if (kind === "houseAdded") return eventNightRelation(now) < 0;
  return false;
}
