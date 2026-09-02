import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "pumpkin2026";
}

function sign() {
  return createHmac("sha256", adminPassword()).update("ok").digest("hex");
}

export function passwordMatches(input: string) {
  const expected = Buffer.from(adminPassword());
  const got = Buffer.from(input);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(config.adminCookie, sign(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(config.adminCookie);
}

export async function isAdmin() {
  const jar = await cookies();
  const value = jar.get(config.adminCookie)?.value;
  if (!value) return false;
  const expected = sign();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
