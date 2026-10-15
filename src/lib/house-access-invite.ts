import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminPassword } from "@/lib/admin";
import { canonicalHouseId } from "@/lib/ids";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function sign(payload: string) {
  return createHmac("sha256", adminPassword()).update(payload).digest("base64url");
}

/** `houseId.expiry.random.sig` */
export function createHouseAccessInviteToken(houseId: string) {
  const id = canonicalHouseId(houseId);
  const exp = Date.now() + INVITE_TTL_MS;
  const nonce = randomBytes(8).toString("base64url");
  const body = `${id}.${exp}.${nonce}`;
  return `${body}.${sign(body)}`;
}

export function parseHouseAccessInviteToken(raw: unknown): { houseId: string } | null {
  if (typeof raw !== "string" || raw.length > 512) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [houseId, expStr, nonce, sig] = parts;
  if (!houseId || !expStr || !nonce || !sig) return null;
  const body = `${houseId}.${expStr}.${nonce}`;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const canonical = canonicalHouseId(houseId);
  if (!canonical) return null;
  return { houseId: canonical };
}

export function houseAccessInviteUrl(token: string, origin?: string) {
  const base =
    origin?.replace(/\/$/, "") ??
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") : "") ??
    "";
  const path = `/?invite=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}
