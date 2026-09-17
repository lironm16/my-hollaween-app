import { candyPinDot, effectiveVisit, isOwnerFrozen } from "@/lib/house-state";
import { isHoursNightOver, isHoursNotYetOpen, isOnBreak } from "@/lib/hours";
import type { PublicHouse } from "@/lib/types";

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
): "closed" | "break" | null {
  if (effectiveVisit(house) === "closed") return "closed";
  if (isHoursNightOver(house, now)) return "closed";
  if (isHoursNotYetOpen(house, now)) return "closed";
  if (isOwnerFrozen(house, now.getTime()) || isOnBreak(house, now)) return "break";
  return null;
}

export function clusterPinStatus(
  house: PublicHouse,
  now: Date,
  opts?: { skipped?: boolean },
): ClusterPinStatus {
  if (opts?.skipped) return "skipped";
  const visit = clusterPinVisitKind(house, now);
  if (visit === "closed") return "closed";
  if (visit === "break") return "break";
  return candyPinDot(house) ?? "out";
}

export function clusterPinStatusClass(status: ClusterPinStatus) {
  return status === "none" ? "is-out" : `is-${status}`;
}
