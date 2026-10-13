import { bearingDegrees, destinationPoint, distanceMeters } from "@/lib/geo";
import type { GemAnchorPlacement } from "@/lib/types";

/** Owners/admins may drag the gem this far from the house pin (keeps it at the house, not across the street block). */
export const GEM_ANCHOR_PLACE_MAX_METERS = 40;

export const GEM_ANCHOR_TOO_FAR_HE = `אפשר להזיז את השדון עד ${GEM_ANCHOR_PLACE_MAX_METERS} מטר מהבית.`;

export function parseGemAnchorPlacement(value: unknown): GemAnchorPlacement | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<GemAnchorPlacement>;
  if (typeof row.lat !== "number" || typeof row.lng !== "number") return null;
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) return null;
  return {
    lat: row.lat,
    lng: row.lng,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "",
  };
}

export function gemAnchorPlacementError(
  house: { lat: number; lng: number },
  point: { lat: number; lng: number },
): string | null {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return "מיקום לא תקין.";
  if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return "מיקום לא תקין.";
  if (distanceMeters(house, point) > GEM_ANCHOR_PLACE_MAX_METERS + 0.05) return GEM_ANCHOR_TOO_FAR_HE;
  return null;
}

export type GemAnchorNudge = "north" | "south" | "east" | "west";

/** Fine-tune placement by about one meter (center-pin nudge pad). */
export function nudgeGemAnchorPoint(
  house: { lat: number; lng: number },
  point: { lat: number; lng: number },
  direction: GemAnchorNudge,
  meters = 1,
): { lat: number; lng: number } {
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.max(0.2, Math.abs(cosLat)));
  let next = point;
  if (direction === "north") next = { lat: point.lat + dLat, lng: point.lng };
  if (direction === "south") next = { lat: point.lat - dLat, lng: point.lng };
  if (direction === "east") next = { lat: point.lat, lng: point.lng + dLng };
  if (direction === "west") next = { lat: point.lat, lng: point.lng - dLng };
  return clampGemAnchorPlacement(house, next);
}

/** Keep a dragged point inside the allowed circle (map drag UX). */
export function clampGemAnchorPlacement(
  house: { lat: number; lng: number },
  point: { lat: number; lng: number },
): { lat: number; lng: number } {
  const d = distanceMeters(house, point);
  if (d <= GEM_ANCHOR_PLACE_MAX_METERS || d === 0) return point;
  return destinationPoint(house, bearingDegrees(house, point), GEM_ANCHOR_PLACE_MAX_METERS);
}
