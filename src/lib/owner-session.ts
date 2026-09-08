import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { adminPassword } from "@/lib/admin";
import { canonicalHouseId, sameHouseId } from "@/lib/ids";

const COOKIE = "hw_owner";
const MAX_HOUSES = 20;
const MAX_AGE = 60 * 60 * 24 * 90;

function sign(ids: string[]) {
  const payload = ids.slice().sort().join("|");
  return createHmac("sha256", adminPassword()).update(payload).digest("hex");
}

function parseCookie(value: string | undefined): string[] {
  if (!value) return [];
  const dot = value.indexOf(".");
  if (dot < 8) return [];
  const hmac = value.slice(0, dot);
  const encoded = value.slice(dot + 1);
  let ids: string[] = [];
  try {
    ids = decodeURIComponent(encoded)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_HOUSES);
  } catch {
    return [];
  }
  const expected = sign(ids);
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return [];
  return ids;
}

export async function grantOwnerHouse(id: string) {
  const canonical = canonicalHouseId(id);
  if (!canonical) return;
  const jar = await cookies();
  const current = parseCookie(jar.get(COOKIE)?.value);
  const ids = [canonical, ...current.filter((item) => !sameHouseId(item, canonical))].slice(
    0,
    MAX_HOUSES,
  );
  jar.set(COOKIE, `${sign(ids)}.${encodeURIComponent(ids.join(","))}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function ownerMayEdit(id: string) {
  const needle = canonicalHouseId(id);
  if (!needle) return false;
  const jar = await cookies();
  return parseCookie(jar.get(COOKIE)?.value).some((item) => sameHouseId(item, needle));
}
