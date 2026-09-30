import {
  DEFAULT_DEVICE_SLOT_MAX,
  MAX_DEVICE_SLOT_MAX,
  MIN_DEVICE_SLOT_MAX,
} from "@/lib/house-access/config";
import type { House, HouseDeviceAccess, PendingDeviceInvite, RegisteredDevice } from "@/lib/types";

export function emptyDeviceAccess(): HouseDeviceAccess {
  return { deviceSlotMax: null, devices: [], pending: [] };
}

export function deviceAccessOf(house: Pick<House, "deviceAccess">): HouseDeviceAccess {
  return house.deviceAccess ?? emptyDeviceAccess();
}

export function effectiveDeviceSlotMax(house: Pick<House, "deviceAccess">): number {
  const raw = house.deviceAccess?.deviceSlotMax;
  if (raw === null || raw === undefined) return DEFAULT_DEVICE_SLOT_MAX;
  if (!Number.isFinite(raw)) return DEFAULT_DEVICE_SLOT_MAX;
  return Math.min(MAX_DEVICE_SLOT_MAX, Math.max(MIN_DEVICE_SLOT_MAX, Math.floor(raw)));
}

export function pruneExpiredPending(access: HouseDeviceAccess, now = Date.now()): HouseDeviceAccess {
  const pending = access.pending.filter((item) => Date.parse(item.expiresAt) > now);
  if (pending.length === access.pending.length) return access;
  return { ...access, pending };
}

export function slotsReserved(access: HouseDeviceAccess, now = Date.now()): number {
  const pruned = pruneExpiredPending(access, now);
  return pruned.devices.length + pruned.pending.length;
}

export function canAddSlot(house: Pick<House, "deviceAccess">, now = Date.now()): boolean {
  return slotsReserved(deviceAccessOf(house), now) < effectiveDeviceSlotMax(house);
}

export function findRegisteredByTokenHash(
  access: HouseDeviceAccess,
  tokenHash: string,
): RegisteredDevice | undefined {
  return access.devices.find((device) => device.tokenHash === tokenHash);
}

export function findPendingByTokenHash(
  access: HouseDeviceAccess,
  inviteHash: string,
  now = Date.now(),
): PendingDeviceInvite | undefined {
  const pruned = pruneExpiredPending(access, now);
  return pruned.pending.find((item) => item.tokenHash === inviteHash);
}

export function normalizeAdminDeviceSlotMax(value: unknown): number | null {
  if (value === null) return null;
  if (value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_DEVICE_SLOT_MAX, Math.max(MIN_DEVICE_SLOT_MAX, Math.floor(n)));
}
