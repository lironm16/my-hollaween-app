import { createHash, randomBytes } from "node:crypto";
import { adminPassword } from "@/lib/admin";

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(`invite:${token}`).digest("hex");
}

export function newOpaqueToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function accessSigningKey() {
  return process.env.ACCESS_SIGNING_SECRET?.trim() || adminPassword();
}
