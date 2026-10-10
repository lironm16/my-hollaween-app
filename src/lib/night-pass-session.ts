import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin";
import { isAddressRevealed } from "@/lib/address-reveal";
import { canonicalHouseId } from "@/lib/ids";
import type { NightPassScopeContext } from "@/lib/night-pass-scope";
import { validNightPassForToken } from "@/lib/night-pass-service";
import { readNightPassSettings, type NightPassRecord } from "@/lib/night-pass-store";
import { ownerHouseIds } from "@/lib/owner-session";
import { loadAddressRevealSchedule } from "@/lib/store";
import type { NightPassViewer } from "@/lib/types";

const COOKIE = "hw_pass";
const MAX_AGE = 60 * 60 * 24 * 120;

export async function readNightPassCookie(): Promise<{ passId: string; token: string } | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  return { passId: raw.slice(0, dot), token: raw.slice(dot + 1) };
}

export async function setNightPassCookie(passId: string, token: string) {
  const jar = await cookies();
  jar.set(COOKIE, `${passId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearNightPassCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Pass registered on this device, if its token is still the latest for that code. */
export async function currentNightPass(): Promise<NightPassRecord | null> {
  const cookie = await readNightPassCookie();
  if (!cookie) return null;
  try {
    return await validNightPassForToken(cookie.passId, cookie.token);
  } catch (error) {
    console.error("[night-passes] pass lookup failed", error);
    return null;
  }
}

export type NightPassRequestViewer = {
  enabled: boolean;
  viewer: NightPassViewer;
  pass: NightPassRecord | null;
  /** Scope input for catalog / house routes — null when night passes are off (legacy rules). */
  scope: NightPassScopeContext | null;
};

/**
 * Who is asking. `asUser` = admin «תצוגת משתמש» — evaluate the admin device like a visitor
 * (its own pass / owned houses still count).
 */
export async function resolveNightPassViewer(options?: {
  asUser?: boolean;
}): Promise<NightPassRequestViewer> {
  const settings = await readNightPassSettings();
  if (!settings.enabled) return { enabled: false, viewer: "legacy", pass: null, scope: null };
  const [admin, pass, owned, schedule] = await Promise.all([
    isAdmin(),
    currentNightPass(),
    ownerHouseIds(),
    loadAddressRevealSchedule(),
  ]);
  const viewer: Exclude<NightPassViewer, "legacy"> =
    admin && !options?.asUser ? "admin" : pass ? "pass" : owned.length ? "owner" : "public";
  return {
    enabled: true,
    viewer,
    pass,
    scope: {
      viewer,
      revealed: isAddressRevealed(new Date(), schedule),
      ownedIds: new Set(owned.map(canonicalHouseId)),
    },
  };
}

export function readAsUserParam(request: Request) {
  return new URL(request.url).searchParams.get("asUser") === "1";
}
