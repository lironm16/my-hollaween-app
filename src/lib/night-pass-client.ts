import type { AddressRevealAudience } from "@/lib/address-reveal";
import { readAdminPreviewAsUser } from "@/lib/admin-preview-as-user";
import { reconcileCatalogRemovedWithServer } from "@/lib/server-removed-houses";
import { clearOwnedHouseEditCode, loadOwnedHouses } from "@/lib/offline-db";
import type { CatalogDelta, NightPassViewer } from "@/lib/types";

/** Mirror of `GET /api/night-passes/me`. */
export type NightPassState = {
  enabled: boolean;
  viewer: NightPassViewer;
  registered: boolean;
  holderName?: string;
  holderPhone?: string;
  houseName?: string;
  houseId?: string;
};

const STATE_KEY = "hw-night-pass-state";
/** Which audience the on-device catalog cache was built for — a change wipes it. */
const CATALOG_SCOPE_KEY = "hw-catalog-scope";
export const NIGHT_PASS_CHANGED_EVENT = "hw-night-pass-changed";
/** This device's pass stopped working (re-registered elsewhere or reset by the owner). */
export const NIGHT_PASS_LOST_EVENT = "hw-night-pass-lost";

export type NightPassLostDetail = {
  reason: "taken" | "reset" | "removed" | "house_removed";
  byName?: string;
  houseId?: string;
} | null;

function readLostDetail(value: unknown): NightPassLostDetail {
  if (!value || typeof value !== "object") return null;
  const raw = value as { reason?: unknown; byName?: unknown; houseId?: unknown };
  if (
    raw.reason !== "taken" &&
    raw.reason !== "reset" &&
    raw.reason !== "removed" &&
    raw.reason !== "house_removed"
  ) {
    return null;
  }
  return {
    reason: raw.reason,
    ...(typeof raw.byName === "string" && raw.byName.trim() ? { byName: raw.byName.trim() } : {}),
    ...(typeof raw.houseId === "string" && raw.houseId.trim() ? { houseId: raw.houseId.trim() } : {}),
  };
}
/** Owner codes list changed (pair, reset, re-register). */
export const NIGHT_PASSES_SLOTS_CHANGED_EVENT = "hw-night-passes-changed";
/** Owner unlocked a house but contact on file is incomplete — open register without code. */
export const NIGHT_PASS_OWNER_REGISTER_EVENT = "hw-night-pass-owner-register";

export type NightPassOwnerRegisterDetail = { houseId?: string };

const ownerRegisterPrompted = new Set<string>();

/** Auto-open owner register (no entrance code) once per house per tab session. */
export function dispatchOwnerRegisterPrompt(houseId?: string) {
  if (typeof window === "undefined") return;
  const key = houseId?.trim() || "*";
  if (ownerRegisterPrompted.has(key)) return;
  ownerRegisterPrompted.add(key);
  window.dispatchEvent(
    new CustomEvent<NightPassOwnerRegisterDetail>(NIGHT_PASS_OWNER_REGISTER_EVENT, {
      detail: houseId?.trim() ? { houseId: houseId.trim() } : {},
    }),
  );
}

export function notifyNightPassSlotsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NIGHT_PASSES_SLOTS_CHANGED_EVENT));
}

/** Clear pass on this device only; owner still sees the slot as paired. */
export async function disconnectNightPassOnDevice(): Promise<boolean> {
  try {
    const res = await fetch("/api/night-passes/disconnect", {
      method: "POST",
      cache: "no-store",
    });
    if (!res.ok) return false;
    lastFetchAt = 0;
    suppressNextPassLostEvent = true;
    await refreshNightPassState({ force: true });
    return true;
  } catch {
    return false;
  }
}

const LEGACY_STATE: NightPassState = { enabled: false, viewer: "legacy", registered: false };

function asState(value: unknown): NightPassState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<NightPassState>;
  if (typeof raw.enabled !== "boolean" || typeof raw.viewer !== "string") return null;
  return {
    enabled: raw.enabled,
    viewer: raw.viewer,
    registered: Boolean(raw.registered),
    ...(raw.holderName ? { holderName: raw.holderName } : {}),
    ...(raw.holderPhone ? { holderPhone: raw.holderPhone } : {}),
    ...(raw.houseName ? { houseName: raw.houseName } : {}),
    ...(raw.houseId ? { houseId: raw.houseId } : {}),
  };
}

export function readNightPassState(): NightPassState {
  if (typeof window === "undefined") return LEGACY_STATE;
  try {
    return asState(JSON.parse(localStorage.getItem(STATE_KEY) ?? "null")) ?? LEGACY_STATE;
  } catch {
    return LEGACY_STATE;
  }
}

function writeNightPassState(next: NightPassState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(NIGHT_PASS_CHANGED_EVENT));
}

export function subscribeNightPassState(onChange: () => void) {
  window.addEventListener(NIGHT_PASS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(NIGHT_PASS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let inflight: Promise<NightPassState | null> | null = null;
let lastFetchAt = 0;
const MIN_REFETCH_MS = 10_000;
/** While the event-registration modal is open — avoid background refresh that unmounts it. */
let refreshPausedForEventModal = false;

export function setNightPassRefreshPaused(paused: boolean) {
  refreshPausedForEventModal = paused;
}
/** Intentional **התנתקות** — do not show **pass lost** toast. */
let suppressNextPassLostEvent = false;

const ownerUnlockAttempted = new Set<string>();

if (typeof window !== "undefined") {
  window.addEventListener("hw-owned-changed", () => ownerUnlockAttempted.clear());
}

async function fetchNightPassMe(qs: string): Promise<{ json: { lost?: unknown }; state: NightPassState | null }> {
  const res = await fetch(`/api/night-passes/me${qs}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return { json: {}, state: null };
  const json = (await res.json()) as { lost?: unknown };
  return { json, state: asState(json) };
}

/** Server owner session is the signed hw_owner cookie — restore it from saved edit codes. */
async function restoreOwnerSessionFromLocalHouses(): Promise<boolean> {
  const owned = loadOwnedHouses();
  if (!owned.length) return false;
  let anyOk = false;
  for (const house of owned.slice(0, 8)) {
    const code = house.editCode?.trim();
    if (!code || ownerUnlockAttempted.has(house.id)) continue;
    ownerUnlockAttempted.add(house.id);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode: code }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) anyOk = true;
      else if (res.status === 403) clearOwnedHouseEditCode(house.id);
    } catch {
      /* offline */
    }
  }
  return anyOk;
}

/** Ask the server who this device is. Network failure keeps the last known state. */
export function refreshNightPassState(options?: { force?: boolean }): Promise<NightPassState | null> {
  if (refreshPausedForEventModal && !options?.force) {
    return Promise.resolve(readNightPassState());
  }
  if (inflight) return inflight;
  if (!options?.force && Date.now() - lastFetchAt < MIN_REFETCH_MS) {
    return Promise.resolve(readNightPassState());
  }
  lastFetchAt = Date.now();
  inflight = (async () => {
    try {
      const qs = readAdminPreviewAsUser() ? "?asUser=1" : "";
      const first = await fetchNightPassMe(qs);
      if (!first.state) return null;
      let next = first.state;
      const json = first.json;
      if (next.enabled && !next.registered && next.viewer === "public" && loadOwnedHouses().length > 0) {
        if (await restoreOwnerSessionFromLocalHouses()) {
          const again = await fetchNightPassMe(qs);
          if (again.state) next = again.state;
        }
      }
      const lost = readLostDetail(json.lost);
      const prev = readNightPassState();
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        writeNightPassState(next);
        const registrationLost =
          prev.enabled && prev.registered && next.enabled && !next.registered;
        if (registrationLost) {
          void fetch("/api/night-passes/disconnect", { method: "POST", cache: "no-store" });
          reconcileCatalogRemovedWithServer();
          if (lost?.houseId && lost.reason === "reset") {
            clearOwnedHouseEditCode(lost.houseId);
          } else if (lost?.houseId && (lost.reason === "removed" || lost.reason === "taken")) {
            clearOwnedHouseEditCode(lost.houseId);
          }
          if (suppressNextPassLostEvent) {
            suppressNextPassLostEvent = false;
          } else {
            window.dispatchEvent(
              new CustomEvent<NightPassLostDetail>(NIGHT_PASS_LOST_EVENT, { detail: lost }),
            );
          }
        }
      }
      return next;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Address audience for the reveal policy on this device. */
export function nightPassAudience(state: NightPassState): AddressRevealAudience {
  if (!state.enabled) return "everyone";
  if (state.registered || state.viewer === "admin") return "registered";
  return "none";
}

/** Admin's full house list must stay off the map in תצוגת משתמש once night passes gate homes. */
export function adminSeesAllHouses(
  admin: boolean,
  state: Pick<NightPassState, "enabled" | "viewer">,
): boolean {
  return admin && (!state.enabled || state.viewer === "admin");
}

export function catalogScopeKey(state: NightPassState): string {
  return state.enabled ? state.viewer : "legacy";
}

/**
 * API catalog mode disagrees with local pass state — do not merge (code stolen, feature toggled, etc.).
 * Legacy payloads omit `scope`; night-pass payloads always include it (`public`, `pass`, …).
 */
export function catalogScopeMismatchesResponse(
  state: NightPassState,
  responseScope: CatalogDelta["scope"],
): boolean {
  const scoped = Boolean(responseScope && responseScope !== "legacy");
  if (scoped && !state.enabled) return true;
  if (state.enabled && !scoped) return true;
  if (state.enabled && scoped && responseScope !== state.viewer) return true;
  return false;
}

export function readStoredCatalogScope(): string {
  try {
    return localStorage.getItem(CATALOG_SCOPE_KEY) ?? "legacy";
  } catch {
    return "legacy";
  }
}

export function writeStoredCatalogScope(key: string) {
  try {
    localStorage.setItem(CATALOG_SCOPE_KEY, key);
  } catch {
    /* private mode */
  }
}

/**
 * Catalog sources for this device. Always prefer live `/api/catalog` for snapshots so night-pass
 * scoping on the server is not bypassed by a stale `public/catalog.json` (built with passes off).
 * Pass holders, owners and admin use the private endpoint.
 */
export function catalogUrls(state = readNightPassState()): { snapshot: string; api: string } {
  if (!state.enabled || state.viewer === "public") {
    return { snapshot: "/api/catalog", api: "/api/catalog" };
  }
  const qs = readAdminPreviewAsUser() ? "?asUser=1" : "";
  const url = `/api/catalog/private${qs}`;
  return { snapshot: url, api: url };
}
