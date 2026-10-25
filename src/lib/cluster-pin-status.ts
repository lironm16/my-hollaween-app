import { candyPinDot, effectiveVisit, isOwnerFrozen } from "@/lib/house-state";
import { isHouseClosedBeforeOpening, isHoursNightOver, isOnBreak } from "@/lib/hours";
import type { AddressRevealSchedule, PublicHouse } from "@/lib/types";

export type ClusterPinStatus =
  | "plenty"
  | "low"
  | "out"
  | "closed"
  | "break"
  | "skipped"
  | "none";

export function clusterPinVisitKind(
  house: PublicHouse,
  now: Date,
  addressReveal?: AddressRevealSchedule,
): "closed" | "break" | null {
  if (effectiveVisit(house) === "closed") return "closed";
  if (isHoursNightOver(house, now)) return "closed";
  if (isHouseClosedBeforeOpening(house, now, addressReveal)) return "closed";
  if (isOwnerFrozen(house, now.getTime()) || isOnBreak(house, now)) return "break";
  return null;
}

export function clusterPinStatus(
  house: PublicHouse,
  now: Date,
  opts?: { skipped?: boolean; addressReveal?: AddressRevealSchedule },
): ClusterPinStatus {
  void opts?.skipped;
  const visit = clusterPinVisitKind(house, now, opts?.addressReveal);
  if (visit === "closed") return "closed";
  if (visit === "break") return "break";
  return candyPinDot(house) ?? "out";
}

export function clusterPinStatusClass(status: ClusterPinStatus) {
  return status === "none" ? "is-out" : `is-${status}`;
}
