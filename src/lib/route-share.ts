import type { PublicHouse } from "@/lib/types";
import type { WalkingRoute } from "@/lib/route";

export const ROUTE_SHARE_QUERY = "routeShare";
export const ROUTE_SHARE_STORAGE_KEY = "hw-pending-route-share";

export type SharedRoutePayload = {
  v: 1;
  /** One house id per stop — order defines stop numbers for everyone. */
  stopIds: string[];
};

export function sharedRoutePayloadFromRoute(route: WalkingRoute): SharedRoutePayload {
  return {
    v: 1,
    stopIds: route.stops.map((stop) => stop.house.id),
  };
}

export function encodeSharedRoutePayload(payload: SharedRoutePayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSharedRoutePayload(encoded: string): SharedRoutePayload | null {
  const trimmed = encoded.trim();
  if (!trimmed) return null;
  try {
    let json: string;
    if (typeof atob === "function") {
      const b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      json = atob(b64 + pad);
    } else {
      json = Buffer.from(trimmed, "base64url").toString("utf8");
    }
    const parsed = JSON.parse(json) as SharedRoutePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.stopIds)) return null;
    const stopIds = parsed.stopIds.filter((id) => typeof id === "string" && id.length > 0);
    if (stopIds.length === 0) return null;
    return { v: 1, stopIds };
  } catch {
    return null;
  }
}

export function buildRouteSharePath(payload: SharedRoutePayload): string {
  return `/?${ROUTE_SHARE_QUERY}=${encodeURIComponent(encodeSharedRoutePayload(payload))}`;
}

export function buildRouteShareUrl(payload: SharedRoutePayload, origin = ""): string {
  const path = buildRouteSharePath(payload);
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

/** Resolve shared ids to houses in shared order (skips unknown ids). */
export function housesForSharedRoute(
  stopIds: readonly string[],
  housesById: ReadonlyMap<string, PublicHouse>,
): PublicHouse[] {
  const out: PublicHouse[] = [];
  for (const id of stopIds) {
    const house = housesById.get(id);
    if (house) out.push(house);
  }
  return out;
}

export function readPendingRouteShare(): SharedRoutePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROUTE_SHARE_STORAGE_KEY);
    if (!raw) return null;
    return decodeSharedRoutePayload(raw);
  } catch {
    return null;
  }
}

export function writePendingRouteShare(payload: SharedRoutePayload | null) {
  if (typeof window === "undefined") return;
  try {
    if (!payload) sessionStorage.removeItem(ROUTE_SHARE_STORAGE_KEY);
    else sessionStorage.setItem(ROUTE_SHARE_STORAGE_KEY, encodeSharedRoutePayload(payload));
  } catch {
    /* private mode */
  }
}

export type ShareUrlOutcome = "shared" | "copied" | "cancelled" | "failed";

/** Web Share when available; otherwise clipboard. Prefer `{ url }` only — most reliable on Android. */
export async function shareUrlWithFallback(
  url: string,
  extras?: { title?: string; text?: string },
): Promise<ShareUrlOutcome> {
  if (typeof navigator === "undefined") return "failed";

  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => Promise<boolean>;
  };

  if (typeof nav.share === "function") {
    const attempts: ShareData[] = [{ url }];
    if (extras?.title || extras?.text) {
      attempts.push({ url, title: extras.title, text: extras.text });
    }
    for (const data of attempts) {
      try {
        if (typeof nav.canShare === "function") {
          const ok = await nav.canShare(data);
          if (!ok) continue;
        }
        await nav.share(data);
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "cancelled";
      }
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* fall through */
  }

  return "failed";
}
