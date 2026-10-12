import { GEM_ANCHOR_CHANGED_EVENT } from "@/lib/gem-anchor-overrides";
import { parseGemAnchorPlacement } from "@/lib/gem-anchor-placement";
import type { GemAnchorPlacement, PublicHouse } from "@/lib/types";

type PlacedRow = Pick<PublicHouse, "id" | "updatedAt" | "gemAnchor">;

const fromCatalog = new Map<string, GemAnchorPlacement | null>();
/** Saved on this device but not yet reflected in the (CDN-cached) catalog. */
const pending = new Map<string, { anchor: GemAnchorPlacement | null; serverUpdatedAt: string }>();
let signature = "";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GEM_ANCHOR_CHANGED_EVENT));
}

function currentSignature() {
  const parts: string[] = [];
  for (const [id, a] of fromCatalog) if (a) parts.push(`${id}:${a.lat},${a.lng}`);
  for (const [id, p] of pending) parts.push(`p${id}:${p.anchor ? `${p.anchor.lat},${p.anchor.lng}` : "-"}`);
  return parts.sort().join("|");
}

function notifyIfChanged() {
  const next = currentSignature();
  if (next === signature) return;
  signature = next;
  notify();
}

export function syncPlacedGemAnchors(houses: readonly PlacedRow[]) {
  fromCatalog.clear();
  for (const house of houses) {
    fromCatalog.set(house.id, parseGemAnchorPlacement(house.gemAnchor));
    const waiting = pending.get(house.id);
    if (waiting && (house.updatedAt ?? "") >= waiting.serverUpdatedAt) pending.delete(house.id);
  }
  notifyIfChanged();
}

export function notePlacedGemAnchor(
  houseId: string,
  anchor: GemAnchorPlacement | null,
  serverUpdatedAt: string,
) {
  pending.set(houseId, { anchor, serverUpdatedAt });
  notifyIfChanged();
}

/** `undefined` = this house is unknown here; fall back to the row's own `gemAnchor`. */
export function getPlacedGemAnchor(houseId: string): GemAnchorPlacement | null | undefined {
  const waiting = pending.get(houseId);
  if (waiting) return waiting.anchor;
  return fromCatalog.get(houseId);
}

export function __resetPlacedGemAnchorsForTests() {
  fromCatalog.clear();
  pending.clear();
  signature = "";
}
