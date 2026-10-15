import { createHash, randomInt } from "crypto";
import { HOUSE_ACCESS_CODE_LENGTH, houseAccessCodeAlphabet } from "@/lib/house-access-code";

export {
  formatHouseAccessCode,
  HOUSE_ACCESS_CODE_LENGTH,
  HOUSE_ACCESS_MAX_DEVICES,
  maskPhone,
  normalizeHolderName,
  normalizeIsraeliMobile,
  normalizeNightPassCode,
} from "@/lib/house-access-code";

export function newHouseAccessCode() {
  const alphabet = houseAccessCodeAlphabet();
  let out = "";
  for (let i = 0; i < HOUSE_ACCESS_CODE_LENGTH; i += 1) {
    out += alphabet[randomInt(alphabet.length)];
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
