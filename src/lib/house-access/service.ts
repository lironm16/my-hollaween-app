import { customAlphabet } from "nanoid";
import { canonicalHouseId, sameHouseId } from "@/lib/ids";
import { isAdmin } from "@/lib/admin";
import { ownerMayEdit } from "@/lib/owner-session";
import {
  INVITE_TTL_MS,
} from "@/lib/house-access/config";
import {
  hashDeviceToken,
  hashInviteToken,
  newOpaqueToken,
} from "@/lib/house-access/crypto";
import {
  canAddSlot,
  deviceAccessOf,
  effectiveDeviceSlotMax,
  emptyDeviceAccess,
  findPendingByTokenHash,
  findRegisteredByTokenHash,
  pruneExpiredPending,
  slotsReserved,
} from "@/lib/house-access/policy";
import {
  mergeRegistration,
  readAccessSession,
  readDeviceTokenFromCookies,
  removeRegistration,
  writeAccessCookies,
  type AccessRegistration,
} from "@/lib/house-access/session";
import { asCatalogForSnapshot, countPublishedHouses } from "@/lib/catalog-cache-build";
import { isPubliclyListed } from "@/lib/house-state";
import { config } from "@/lib/config";
import type {
  Catalog,
  DeviceRole,
  House,
  HouseDeviceAccess,
  PublicHouse,
  RegisteredDevice,
} from "@/lib/types";
import { runSyncedWrite, getMem } from "@/lib/store/core";
import { toPublicHouse } from "@/lib/ids";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function buildLimitedCatalog(full: Catalog): Catalog {
  const count = full.houseCount ?? full.houses.length;
  return {
    updatedAt: full.updatedAt,
    neighborhood: full.neighborhood,
    houses: [],
    houseCount: count,
    pushTemplates: full.pushTemplates,
    accessTier: "limited",
    accessRegistrations: [],
  };
}

export async function applyAccessToCatalog(full: Catalog): Promise<Catalog> {
  if (await isAdmin()) {
    return { ...full, accessTier: "full" };
  }
  const session = await readAccessSession();
  if (!session?.registrations.length) {
    return buildLimitedCatalog(full);
  }
  return {
    ...full,
    accessTier: "full",
    accessRegistrations: session.registrations.map((row) => ({
      houseId: row.houseId,
      role: row.role,
    })),
  };
}

export async function deviceRegisteredAsEditor(houseId: string): Promise<boolean> {
  if (await isAdmin()) return true;
  const session = await readAccessSession();
  const row = session?.registrations.find((item) => sameHouseId(item.houseId, houseId));
  return row?.role === "editor";
}

export async function canUseEditCodeForHouse(houseId: string): Promise<boolean> {
  if (await isAdmin()) return true;
  if (await ownerMayEdit(houseId)) return true;
  return deviceRegisteredAsEditor(houseId);
}

async function editorAuthorized(houseId: string): Promise<boolean> {
  if (await isAdmin()) return true;
  if (await ownerMayEdit(houseId)) return true;
  return deviceRegisteredAsEditor(houseId);
}

function setDeviceAccess(house: House, access: HouseDeviceAccess) {
  house.deviceAccess = access;
}

export type DeviceListRow = {
  id: string;
  role: DeviceRole;
  createdAt: string;
  label?: string;
  isSelf: boolean;
};

export type PendingListRow = {
  id: string;
  role: DeviceRole;
  expiresAt: string;
  createdAt: string;
};

export async function getHouseDevicePanel(houseId: string) {
  const id = canonicalHouseId(houseId);
  if (!id) return { error: "not_found" as const };
  if (!(await editorAuthorized(id))) return { error: "forbidden" as const };
  const session = await readAccessSession();
  const selfHash = session?.tokenHash ?? null;
  const db = getMem();
  const house = db?.houses.find((row) => sameHouseId(row.id, id));
  if (!house) return { error: "not_found" as const };
  const access = pruneExpiredPending(deviceAccessOf(house));
  return {
    houseId: house.id,
    houseName: house.name,
    slotsUsed: slotsReserved(access),
    slotsMax: effectiveDeviceSlotMax(house),
    devices: access.devices.map(
      (device): DeviceListRow => ({
        id: device.id,
        role: device.role,
        createdAt: device.createdAt,
        label: device.label,
        isSelf: Boolean(selfHash && device.tokenHash === selfHash),
      }),
    ),
    pending: access.pending.map(
      (item): PendingListRow => ({
        id: item.id,
        role: item.role,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
      }),
    ),
  };
}

export async function createDeviceInvite(houseId: string, role: DeviceRole) {
  const id = canonicalHouseId(houseId);
  if (!id) return { error: "not_found" as const };
  if (!(await editorAuthorized(id))) return { error: "forbidden" as const };
  if (role !== "editor" && role !== "visitor") return { error: "invalid_role" as const };

  const plainToken = newOpaqueToken();
  const inviteHash = hashInviteToken(plainToken);
  const pendingId = nano();
  const now = Date.now();
  const expiresAt = new Date(now + INVITE_TTL_MS).toISOString();

  const saved = await runSyncedWrite((db) => {
    const house = db.houses.find((row) => sameHouseId(row.id, id));
    if (!house) return null;
    let access = pruneExpiredPending(deviceAccessOf(house), now);
    if (!canAddSlot({ deviceAccess: access }, now)) return { error: "slots_full" as const };
    access = {
      ...access,
      pending: [
        ...access.pending,
        {
          id: pendingId,
          tokenHash: inviteHash,
          role,
          expiresAt,
          createdAt: new Date(now).toISOString(),
        },
      ],
    };
    setDeviceAccess(house, access);
    house.updatedAt = new Date(now).toISOString();
    db.updatedAt = house.updatedAt;
    return { ok: true as const };
  });

  if (!saved) return { error: "not_found" as const };
  if ("error" in saved) return saved;

  return {
    token: plainToken,
    pendingId,
    expiresAt,
    role,
    bindPath: `/access/bind?token=${encodeURIComponent(plainToken)}&house=${encodeURIComponent(id)}`,
  };
}

export async function cancelDeviceInvite(houseId: string, pendingId: string) {
  const id = canonicalHouseId(houseId);
  if (!id) return { error: "not_found" as const };
  if (!(await editorAuthorized(id))) return { error: "forbidden" as const };

  const ok = await runSyncedWrite((db) => {
    const house = db.houses.find((row) => sameHouseId(row.id, id));
    if (!house) return false;
    const access = deviceAccessOf(house);
    const nextPending = access.pending.filter((item) => item.id !== pendingId);
    if (nextPending.length === access.pending.length) return false;
    setDeviceAccess(house, { ...access, pending: nextPending });
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return true;
  });
  return ok ? { ok: true as const } : { error: "not_found" as const };
}

async function ensureDeviceToken(): Promise<{ token: string; registrations: AccessRegistration[] }> {
  let token = await readDeviceTokenFromCookies();
  let registrations: AccessRegistration[] = [];
  const session = await readAccessSession();
  if (token && session) {
    registrations = session.registrations;
  } else {
    token = newOpaqueToken();
  }
  return { token, registrations };
}

export async function bindDeviceInvite(plainToken: string, houseId: string) {
  const id = canonicalHouseId(houseId);
  if (!id || !plainToken.trim()) return { error: "invalid" as const };
  const inviteHash = hashInviteToken(plainToken.trim());
  const now = Date.now();

  const { token, registrations: priorRegs } = await ensureDeviceToken();
  const tokenHash = hashDeviceToken(token);

  const result = await runSyncedWrite((db) => {
    const house = db.houses.find((row) => sameHouseId(row.id, id));
    if (!house) return { error: "not_found" as const };
    let access = pruneExpiredPending(deviceAccessOf(house), now);
    const pending = findPendingByTokenHash(access, inviteHash, now);
    if (!pending) return { error: "invite_invalid" as const };

    const existing = findRegisteredByTokenHash(access, tokenHash);
    if (existing) {
      existing.role = pending.role;
    } else {
      if (!canAddSlot({ deviceAccess: access }, now) && !findRegisteredByTokenHash(access, tokenHash)) {
        return { error: "slots_full" as const };
      }
      const device: RegisteredDevice = {
        id: nano(),
        tokenHash,
        role: pending.role,
        createdAt: new Date().toISOString(),
      };
      access = { ...access, devices: [...access.devices, device] };
    }

    access = {
      ...access,
      pending: access.pending.filter((item) => item.id !== pending.id),
    };
    setDeviceAccess(house, access);
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return { ok: true as const, role: pending.role };
  });

  if ("error" in result) return result;

  const registrations = mergeRegistration(priorRegs, id, result.role);
  await writeAccessCookies(token, registrations);
  return { ok: true as const, houseId: id, role: result.role };
}

export async function registerBootstrapEditor(houseId: string) {
  const id = canonicalHouseId(houseId);
  if (!id) return { error: "not_found" as const };
  const { token, registrations: priorRegs } = await ensureDeviceToken();
  const tokenHash = hashDeviceToken(token);
  const now = Date.now();

  const result = await runSyncedWrite((db) => {
    const house = db.houses.find((row) => sameHouseId(row.id, id));
    if (!house) return { error: "not_found" as const };
    let access = pruneExpiredPending(deviceAccessOf(house), now);
    const existing = findRegisteredByTokenHash(access, tokenHash);
    if (existing) {
      existing.role = "editor";
    } else {
      if (!canAddSlot({ deviceAccess: access }, now)) return { error: "slots_full" as const };
      access = {
        ...access,
        devices: [
          ...access.devices,
          {
            id: nano(),
            tokenHash,
            role: "editor",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
    setDeviceAccess(house, access);
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return { ok: true as const };
  });

  if ("error" in result) return result;
  const registrations = mergeRegistration(priorRegs, id, "editor");
  await writeAccessCookies(token, registrations);
  return { ok: true as const, houseId: id, role: "editor" as const };
}

export async function revokeSelfFromHouse(houseId: string) {
  const id = canonicalHouseId(houseId);
  if (!id) return { error: "not_found" as const };
  const session = await readAccessSession();
  const token = await readDeviceTokenFromCookies();
  if (!session || !token) return { error: "forbidden" as const };
  const tokenHash = hashDeviceToken(token);
  const row = session.registrations.find((item) => sameHouseId(item.houseId, id));
  if (!row) return { error: "forbidden" as const };

  if (row.role === "editor") {
    const db = getMem();
    const house = db?.houses.find((h) => sameHouseId(h.id, id));
    const editors =
      house?.deviceAccess?.devices.filter((d) => d.role === "editor" && d.tokenHash !== tokenHash) ??
      [];
    if (editors.length === 0) {
      return { error: "last_editor" as const };
    }
  }

  const ok = await runSyncedWrite((db) => {
    const house = db.houses.find((h) => sameHouseId(h.id, id));
    if (!house) return false;
    const access = deviceAccessOf(house);
    const devices = access.devices.filter((device) => device.tokenHash !== tokenHash);
    if (devices.length === access.devices.length) return false;
    setDeviceAccess(house, { ...access, devices });
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return true;
  });

  if (!ok) return { error: "not_found" as const };

  const registrations = removeRegistration(session.registrations, id);
  await writeAccessCookies(token, registrations);
  return { ok: true as const };
}

export async function listMyRegistrations(): Promise<
  Array<{
    houseId: string;
    houseName: string;
    role: DeviceRole;
    slotsUsed: number;
    slotsMax: number;
  }>
> {
  const session = await readAccessSession();
  if (!session) return [];
  const db = getMem();
  if (!db) return [];
  return session.registrations
    .map((row) => {
      const house = db.houses.find((h) => sameHouseId(h.id, row.houseId));
      if (!house || !isPubliclyListed(house)) return null;
      const access = pruneExpiredPending(deviceAccessOf(house));
      return {
        houseId: house.id,
        houseName: house.name,
        role: row.role,
        slotsUsed: slotsReserved(access),
        slotsMax: effectiveDeviceSlotMax(house),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export function clearDeviceAccessOnHouse(house: House) {
  house.deviceAccess = emptyDeviceAccess();
}

export async function setAdminDeviceSlotMax(houseId: string, value: number | null) {
  const id = canonicalHouseId(houseId);
  if (!id) return null;
  return runSyncedWrite((db) => {
    const house = db.houses.find((row) => sameHouseId(row.id, id));
    if (!house) return null;
    const access = deviceAccessOf(house);
    access.deviceSlotMax = value;
    setDeviceAccess(house, access);
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return house;
  });
}

export function publicHouseSummariesForAccess(houses: House[]): PublicHouse[] {
  return houses.filter(isPubliclyListed).map((h) => toPublicHouse(h) as PublicHouse);
}

export function buildFullCatalogFromDb(db: { houses: House[]; updatedAt: string; pushSettings?: unknown }) {
  return asCatalogForSnapshot(db.houses, db.updatedAt, db.pushSettings as never);
}
