import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ACCESS_DEVICE_COOKIE,
  ACCESS_SESSION_COOKIE,
  ACCESS_SESSION_MAX_AGE_SEC,
} from "@/lib/house-access/config";
import { accessSigningKey, hashDeviceToken } from "@/lib/house-access/crypto";
import type { DeviceRole } from "@/lib/types";

export type AccessRegistration = {
  houseId: string;
  role: DeviceRole;
};

export type AccessSessionPayload = {
  v: 1;
  tokenHash: string;
  registrations: AccessRegistration[];
};

function signPayload(payload: string) {
  return createHmac("sha256", accessSigningKey()).update(payload).digest("hex");
}

function encodeSession(payload: AccessSessionPayload) {
  const body = JSON.stringify(payload);
  return `${signPayload(body)}.${Buffer.from(body, "utf8").toString("base64url")}`;
}

function decodeSession(value: string | undefined): AccessSessionPayload | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 8) return null;
  const sig = value.slice(0, dot);
  const encoded = value.slice(dot + 1);
  let body = "";
  try {
    body = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = signPayload(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(body) as AccessSessionPayload;
    if (parsed?.v !== 1 || typeof parsed.tokenHash !== "string") return null;
    if (!Array.isArray(parsed.registrations)) return null;
    const registrations = parsed.registrations.filter(
      (row): row is AccessRegistration =>
        Boolean(row && typeof row.houseId === "string" && (row.role === "editor" || row.role === "visitor")),
    );
    return { v: 1, tokenHash: parsed.tokenHash, registrations };
  } catch {
    return null;
  }
}

export async function readDeviceTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(ACCESS_DEVICE_COOKIE)?.value?.trim();
  return value || null;
}

export async function readAccessSession(): Promise<AccessSessionPayload | null> {
  const jar = await cookies();
  const session = decodeSession(jar.get(ACCESS_SESSION_COOKIE)?.value);
  const deviceToken = jar.get(ACCESS_DEVICE_COOKIE)?.value?.trim();
  if (!session || !deviceToken) return null;
  if (session.tokenHash !== hashDeviceToken(deviceToken)) return null;
  return session;
}

export async function writeAccessCookies(deviceToken: string, registrations: AccessRegistration[]) {
  const jar = await cookies();
  const tokenHash = hashDeviceToken(deviceToken);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_SESSION_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
  jar.set(ACCESS_DEVICE_COOKIE, deviceToken, cookieOpts);
  jar.set(
    ACCESS_SESSION_COOKIE,
    encodeSession({ v: 1, tokenHash, registrations }),
    cookieOpts,
  );
}

export async function clearAccessCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_DEVICE_COOKIE);
  jar.delete(ACCESS_SESSION_COOKIE);
}

export function mergeRegistration(
  current: AccessRegistration[],
  houseId: string,
  role: DeviceRole,
): AccessRegistration[] {
  const next = current.filter((row) => row.houseId !== houseId);
  next.unshift({ houseId, role });
  return next;
}

export function removeRegistration(current: AccessRegistration[], houseId: string) {
  return current.filter((row) => row.houseId !== houseId);
}

export function registrationForHouse(session: AccessSessionPayload | null, houseId: string) {
  return session?.registrations.find((row) => row.houseId === houseId) ?? null;
}

export function hasFullCatalogAccess(session: AccessSessionPayload | null) {
  return Boolean(session && session.registrations.length > 0);
}

export function isEditorForHouse(session: AccessSessionPayload | null, houseId: string) {
  const row = registrationForHouse(session, houseId);
  return row?.role === "editor";
}
