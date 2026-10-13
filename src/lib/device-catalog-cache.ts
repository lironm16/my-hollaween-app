import { isPracticeHouse } from "@/lib/practice-house";
import { isStubHouse } from "@/lib/house-set";
import type { PublicHouse } from "@/lib/types";

/** Client-only marker: row came from on-device cache, not a verified server payload. */
export function isDeviceCachePinHouse(house: PublicHouse | null | undefined): boolean {
  return Boolean(house?.deviceCachePin);
}

export function withServerHouseDetail(house: PublicHouse): PublicHouse {
  const { deviceCachePin, deviceCacheStub, ...rest } = house;
  void deviceCachePin;
  void deviceCacheStub;
  return rest;
}

/** Persist map/list shell fields only — no address, story text, or photo URL. */
export function stripHouseForDeviceCache(house: PublicHouse): PublicHouse {
  const stub = isStubHouse(house);
  const stripped = {
    ...house,
    address: "",
    arrival: "",
    notes: "",
    description: "",
    photoUrl: "",
    deviceCachePin: true as const,
    isStub: stub,
    isPractice: isPracticeHouse(house),
  };
  if (stub) return { ...stripped, deviceCacheStub: true };
  const { deviceCacheStub, ...real } = stripped;
  void deviceCacheStub;
  return real;
}

export function houseServerDetailReady(house: PublicHouse | null | undefined): boolean {
  return Boolean(house && !isDeviceCachePinHouse(house));
}

/** Fetch `/api/houses/[id]` when pin-only cache or catalog redaction left address empty. */
export function houseNeedsLocationHydration(house: PublicHouse | null | undefined): boolean {
  if (!house) return false;
  if (isDeviceCachePinHouse(house)) return true;
  return !house.address?.trim();
}
