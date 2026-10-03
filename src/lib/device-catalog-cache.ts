import type { PublicHouse } from "@/lib/types";

/** Client-only marker: row came from on-device cache, not a verified server payload. */
export function isDeviceCachePinHouse(house: PublicHouse | null | undefined): boolean {
  return Boolean(house?.deviceCachePin);
}

export function withServerHouseDetail(house: PublicHouse): PublicHouse {
  const { deviceCachePin, ...rest } = house;
  void deviceCachePin;
  return rest;
}

/** Persist map/list shell fields only — no address, story text, or photo URL. */
export function stripHouseForDeviceCache(house: PublicHouse): PublicHouse {
  return {
    ...house,
    address: "",
    arrival: "",
    notes: "",
    description: "",
    photoUrl: "",
    deviceCachePin: true,
  };
}

export function houseServerDetailReady(house: PublicHouse | null | undefined): boolean {
  return Boolean(house && !isDeviceCachePinHouse(house));
}
