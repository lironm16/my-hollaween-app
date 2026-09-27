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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeSharedRoutePayload(payload: SharedRoutePayload): string {
  const json = JSON.stringify(payload);
  if (typeof TextEncoder !== "undefined") {
    return bytesToBase64Url(new TextEncoder().encode(json));
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

function base64UrlToUtf8(encoded: string): string {
  const trimmed = encoded.trim();
  const b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  if (typeof atob === "function") {
    const binary = atob(b64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(trimmed, "base64url").toString("utf8");
}

export function decodeSharedRoutePayload(encoded: string): SharedRoutePayload | null {
  const trimmed = encoded.trim();
  if (!trimmed) return null;
  try {
    const json = base64UrlToUtf8(trimmed);
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

export function routeSharePlainText(url: string, stopCount: number) {
  return `מסלול HallowHood · ${stopCount} עצירות\n${url}`;
}

/** Sync clipboard copy — safe inside share `.catch` (still in the click gesture on many browsers). */
export function copyPlainTextSync(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    /* fall through */
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

async function copyPlainText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  return copyPlainTextSync(text);
}

export function startRouteShare(
  url: string,
  stopCount: number,
  onDone: (outcome: ShareUrlOutcome) => void,
) {
  const title = "מסלול HallowHood";
  const text = routeSharePlainText(url, stopCount);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    navigator
      .share({ url, title, text: text.slice(0, 2000) })
      .then(() => onDone("shared"))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          onDone("cancelled");
          return;
        }
        if (copyPlainTextSync(text)) {
          onDone("copied");
          return;
        }
        onDone("failed");
      });
    return;
  }
  if (copyPlainTextSync(text)) onDone("copied");
  else onDone("failed");
}

/**
 * Web Share when available (no canShare gate — it often false-negatives on Android).
 * Falls back to copying message + URL as plain text.
 */
export async function shareRouteUrl(url: string, stopCount: number): Promise<ShareUrlOutcome> {
  const title = "מסלול HallowHood";
  const text = routeSharePlainText(url, stopCount);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const attempts: ShareData[] = [
      { url, title, text: text.slice(0, 2000) },
      { url, title },
      { url },
      { title, text },
      { text },
    ];
    for (const data of attempts) {
      try {
        await navigator.share(data);
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "cancelled";
      }
    }
  }

  if (await copyPlainText(text)) return "copied";
  return "failed";
}

/** @deprecated Use shareRouteUrl */
export async function shareUrlWithFallback(
  url: string,
  extras?: { title?: string; text?: string },
): Promise<ShareUrlOutcome> {
  const stopMatch = extras?.text?.match(/(\d+)/);
  const stopCount = stopMatch ? Number(stopMatch[1]) : 0;
  return shareRouteUrl(url, stopCount || 1);
}
