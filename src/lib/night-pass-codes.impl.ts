import { createHash, randomInt } from "crypto";
import { HOUSE_ACCESS_CODE_LENGTH } from "@/lib/house-access-code";

export function newHouseAccessCode() {
  let out = "";
  for (let i = 0; i < HOUSE_ACCESS_CODE_LENGTH; i += 1) {
    out += String(randomInt(10));
  }
  return out;
}

/** Stable pass document id — code lives only on house.editCode. */
export function passIdForHouse(houseId: string) {
  const id = houseId.trim();
  return createHash("sha256").update(`hw-house-access:${id}`).digest("hex").slice(0, 32);
}

export function hashNightPassToken(token: string) {
  return createHash("sha256").update(`hw-night-pass-token:${token}`).digest("hex");
}
