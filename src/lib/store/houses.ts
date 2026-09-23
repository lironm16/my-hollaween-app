import { canonicalAddressForBuilding } from "@/lib/house-clusters";
import { canonicalHouseId, newEditCode, newPoiPublicId, newPublicId, sameHouseId } from "@/lib/ids";
import { normalizePoiCategory } from "@/lib/house-kind";
import { normalizeAddressFields } from "@/lib/address-fields";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import { assertRealAddress } from "@/lib/geocode";
import {
  defaultTreatStock,
  syncDecorFields,
} from "@/lib/house-state";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
import { cloneDb } from "@/lib/catalog-sync";
import { parsePhotoUrl } from "@/lib/photos";
import type { House, HouseInput, NightPatch, TreatStock, VisitState } from "@/lib/types";
import { payloadForKind } from "@/lib/push";
import { neighborhoodPushBroadcastAllowed } from "@/lib/push-policy";
import {
  AUTO_PUSH_KINDS,
  classifyHouseAlert,
  ownerOfferKindFromPatch,
  type OwnerNotifyPatch,
  type PushKind,
  type StoredPushSettings,
} from "@/lib/push-templates";
import {
  firestoreConfigured,
  readFirestoreHouse,
  writeFirestoreHouse,
} from "@/lib/firestore-db";
import {
  getMem,
  loadDb,
  normalizeHouse,
  runSyncedWrite,
  setMem,
  withLock,
} from "./core";
import { broadcastPush } from "./push";

function findHouseIn(houses: House[], id: string): House | undefined {
  const needle = canonicalHouseId(id);
  if (!needle) return undefined;
  return houses.find((house) => sameHouseId(house.id, needle));
}

function upsertMemHouse(house: House, updatedAt: string) {
  const mem = getMem();
  const db = mem ? cloneDb(mem) : { updatedAt, houses: [] as House[] };
  const idx = db.houses.findIndex((item) => sameHouseId(item.id, house.id));
  if (idx >= 0) db.houses[idx] = house;
  else db.houses.push(house);
  db.updatedAt = updatedAt;
  setMem(db);
}

export async function getAllHouses(): Promise<House[]> {
  return (await loadDb()).houses;
}

export async function getDbSnapshot() {
  return loadDb();
}

export async function getHouse(id: string): Promise<House | undefined> {
  const found = findHouseIn((await loadDb()).houses, id);
  if (found) return found;
  const docId = canonicalHouseId(id);
  if (firestoreConfigured() && docId) {
    const remote = await readFirestoreHouse(docId);
    if (remote) {
      upsertMemHouse(remote, remote.updatedAt);
      return remote;
    }
    return undefined;
  }
  return findHouseIn((await loadDb(true)).houses, id);
}

function nextPublicId(db: { houses: House[] }, kind: HouseInput["kind"]) {
  const makeId = kind === "poi" ? newPoiPublicId : newPublicId;
  let id = makeId();
  while (db.houses.some((h) => sameHouseId(h.id, id))) id = makeId();
  return id;
}

export async function submitHouse(
  input: HouseInput,
  options?: { includeEndpoint?: string; addedBy?: string; admin?: boolean },
) {
  await assertRealAddress(input);
  const kind = options?.admin && input.kind === "poi" ? "poi" : "house";
  const poiCategory = normalizePoiCategory(kind, input.poiCategory);
  let id = "";
  let editCode = "";
  const house = await runSyncedWrite((db) => {
    if (!id) {
      id = nextPublicId(db, kind);
      editCode = newEditCode();
    }
    const already = findHouseIn(db.houses, id);
    if (already) return already;
    const now = new Date().toISOString();
    const visit: VisitState = input.visit ?? "come";
    const treats = Array.isArray(input.treats) ? input.treats : [];
    const treatStock: TreatStock = {
      ...defaultTreatStock(treats),
      ...(input.treatStock ?? {}),
    };
    if (treats.includes("candy") && !treatStock.candy) treatStock.candy = "plenty";
    const hours = syncHoursFields(
      input.openHours?.length
        ? input.openHours
        : houseHoursWindows(input),
    );
    const decor = syncDecorFields({ ...input, visit });
    const canonical = canonicalAddressForBuilding(input.address, db.houses);
    const addressFields = normalizeAddressFields({
      address: canonical,
      neighborhood: input.neighborhood,
      lat: input.lat,
      lng: input.lng,
    });
    const house: House = {
      ...input,
      kind,
      poiCategory,
      address: addressFields.address,
      neighborhood: addressFields.neighborhood,
      treats,
      treatStock,
      visit,
      ...hours,
      id,
      decorLevel: decor.decorLevel,
      decorated: decor.decorated,
      soldOut: visit === "closed",
      adminFrozen: false,
      ownerFrozenUntil: null,
      photoUrl: "",
      editCode,
      createdAt: now,
      updatedAt: now,
      addedBy: options?.addedBy?.trim() || null,
    };
    db.houses.push(house);
    db.updatedAt = now;
    return house;
  });
  const push = await dispatchHousePush(null, house, "houseAdded", undefined, options?.includeEndpoint);
  return { house, push };
}

function ownerAddressChanged(current: House, patch: Partial<HouseInput> & NightPatch) {
  if (patch.address !== undefined && patch.address.trim() !== current.address.trim()) return true;
  if (patch.neighborhood !== undefined && patch.neighborhood !== current.neighborhood) return true;
  if (patch.lat !== undefined && patch.lat !== current.lat) return true;
  if (patch.lng !== undefined && patch.lng !== current.lng) return true;
  return false;
}

async function validateOwnerAddressChange(current: House, patch: Partial<HouseInput> & NightPatch) {
  if (!ownerAddressChanged(current, patch)) return;
  await assertRealAddress({
    address: patch.address ?? current.address,
    lat: patch.lat ?? current.lat,
    lng: patch.lng ?? current.lng,
  });
}

function sanitizeOwnerPatch(
  patch: Partial<HouseInput> & NightPatch,
): Partial<House> {
  const next: Partial<House> = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.theme !== undefined) next.theme = patch.theme;
  if (patch.address !== undefined) next.address = patch.address;
  if (patch.arrival !== undefined) next.arrival = patch.arrival;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.lat !== undefined) next.lat = patch.lat;
  if (patch.lng !== undefined) next.lng = patch.lng;
  if (patch.treats !== undefined) next.treats = patch.treats;
  if (patch.treatStock !== undefined) next.treatStock = patch.treatStock;
  if (patch.visit !== undefined) {
    next.visit = patch.visit;
    next.soldOut = patch.visit === "closed";
  } else if (patch.soldOut !== undefined) {
    next.soldOut = patch.soldOut;
    next.visit = patch.soldOut ? "closed" : "come";
  }
  if (patch.scareLevel !== undefined) next.scareLevel = patch.scareLevel;
  if (patch.openFrom !== undefined) next.openFrom = patch.openFrom;
  if (patch.openTo !== undefined) next.openTo = patch.openTo;
  if (patch.openFrom2 !== undefined) next.openFrom2 = patch.openFrom2;
  if (patch.openTo2 !== undefined) next.openTo2 = patch.openTo2;
  if (patch.openHours !== undefined || patch.openFrom !== undefined || patch.openTo !== undefined) {
    const synced = syncHoursFields(
      patch.openHours?.length
        ? patch.openHours
        : houseHoursWindows({
            openFrom: patch.openFrom,
            openTo: patch.openTo,
            openFrom2: patch.openFrom2,
            openTo2: patch.openTo2,
            openHours: patch.openHours,
          }),
    );
    next.openHours = synced.openHours;
    next.openFrom = synced.openFrom;
    next.openTo = synced.openTo;
    next.openFrom2 = synced.openFrom2;
    next.openTo2 = synced.openTo2;
  }
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.accessible !== undefined) next.accessible = patch.accessible;
  if (patch.decorLevel !== undefined) next.decorLevel = patch.decorLevel;
  if (patch.decorated !== undefined) next.decorated = patch.decorated;
  if (patch.ownerFrozenUntil !== undefined) next.ownerFrozenUntil = patch.ownerFrozenUntil;
  if (patch.photoUrl !== undefined) next.photoUrl = patch.photoUrl;
  if (patch.addedBy !== undefined) next.addedBy = patch.addedBy?.trim() || null;
  return next;
}

function applyOwnerPatch(house: House, patch: Partial<HouseInput> & NightPatch) {
  const clean = sanitizeOwnerPatch(patch);
  if (clean.treatStock) {
    house.treatStock = { ...house.treatStock, ...clean.treatStock };
    delete clean.treatStock;
  }
  Object.assign(house, clean);
  if (patch.ownerFrozenUntil !== undefined) house.ownerFrozenUntil = patch.ownerFrozenUntil;
  if (
    patch.address !== undefined ||
    patch.neighborhood !== undefined ||
    patch.lat !== undefined ||
    patch.lng !== undefined
  ) {
    const fields = normalizeAddressFields(house);
    house.address = fields.address;
    house.neighborhood = fields.neighborhood;
  }
  if (house.photoUrl) {
    const parsed = parsePhotoUrl(house.photoUrl);
    if (parsed !== null) house.photoUrl = parsed;
  }
  const decor = syncDecorFields(house);
  house.decorLevel = decor.decorLevel;
  house.decorated = decor.decorated;
  house.updatedAt = new Date().toISOString();
  house.soldOut = house.visit === "closed";
}

function snapshotHouse(house: House): House {
  return {
    ...house,
    treats: [...house.treats],
    treatStock: { ...house.treatStock },
  };
}

async function patchHouseDoc(
  docId: string,
  editCode: string,
  patch: Partial<HouseInput> & NightPatch,
  options?: { includeEndpoint?: string },
) {
  const mem = getMem();
  const existing =
    findHouseIn(mem?.houses ?? [], docId) ??
    (firestoreConfigured() ? await readFirestoreHouse(docId) : null) ??
    (await getHouse(docId));
  if (!existing) return { error: "missing" as const };
  if (existing.editCode !== editCode) return { error: "forbidden" as const };

  await validateOwnerAddressChange(existing, patch);

  const prev = snapshotHouse(existing);
  const house = normalizeHouse({ ...existing });
  applyOwnerPatch(house, patch);

  if (firestoreConfigured()) {
    await writeFirestoreHouse(house);
    upsertMemHouse(house, house.updatedAt);
  } else {
    const updated = await runSyncedWrite((db) => {
      const row = findHouseIn(db.houses, docId);
      if (!row || row.editCode !== editCode) return null;
      applyOwnerPatch(row, patch);
      db.updatedAt = row.updatedAt;
      return row;
    });
    if (!updated) return { error: "missing" as const };
  }

  const push = await dispatchHousePush(prev, house, undefined, patch, options?.includeEndpoint);
  return { house, push };
}

/** Owner patch — partial fields merged onto one house doc (1 Firestore read + 1 write). */
export async function updateByEditCode(
  id: string,
  editCode: string,
  patch: Partial<HouseInput> & NightPatch,
  options?: { includeEndpoint?: string },
) {
  const docId = canonicalHouseId(id);
  if (firestoreConfigured()) {
    return withLock(() => patchHouseDoc(docId, editCode, patch, options));
  }
  return patchHouseDoc(docId, editCode, patch, options);
}

export async function deleteByEditCode(id: string, editCode: string) {
  return runSyncedWrite((db) => {
    const idx = db.houses.findIndex((h) => sameHouseId(h.id, id) && h.editCode === editCode);
    if (idx < 0) return false;
    db.houses.splice(idx, 1);
    db.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function adminDeleteHouse(id: string) {
  return runSyncedWrite((db) => {
    const idx = db.houses.findIndex((h) => sameHouseId(h.id, id));
    if (idx < 0) return false;
    db.houses.splice(idx, 1);
    db.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function adminUpdate(
  id: string,
  patch: Partial<HouseInput> & NightPatch,
  options?: { includeEndpoint?: string },
) {
  const current = await getHouse(id);
  if (!current) return null;
  const prev = snapshotHouse(current);
  await validateOwnerAddressChange(current, patch);
  const updated = await runSyncedWrite((db) => {
    const house = findHouseIn(db.houses, id);
    if (!house) return null;
    if (patch.name !== undefined) house.name = patch.name;
    if (patch.theme !== undefined) house.theme = patch.theme;
    if (patch.address !== undefined) house.address = patch.address;
    if (patch.neighborhood !== undefined) house.neighborhood = patch.neighborhood;
    if (patch.arrival !== undefined) house.arrival = patch.arrival;
    if (patch.description !== undefined) house.description = patch.description;
    if (patch.lat !== undefined) house.lat = patch.lat;
    if (patch.lng !== undefined) house.lng = patch.lng;
    if (
      patch.address !== undefined ||
      patch.neighborhood !== undefined ||
      patch.lat !== undefined ||
      patch.lng !== undefined
    ) {
      const fields = normalizeAddressFields(house);
      house.address = fields.address;
      house.neighborhood = fields.neighborhood;
    }
    if (patch.treats !== undefined) house.treats = patch.treats;
    if (patch.treatStock !== undefined) house.treatStock = { ...house.treatStock, ...patch.treatStock };
    if (patch.visit !== undefined) house.visit = patch.visit;
    if (patch.scareLevel !== undefined) house.scareLevel = patch.scareLevel;
    if (patch.openFrom !== undefined) house.openFrom = patch.openFrom;
    if (patch.openTo !== undefined) house.openTo = patch.openTo;
    if (patch.openFrom2 !== undefined) house.openFrom2 = patch.openFrom2;
    if (patch.openTo2 !== undefined) house.openTo2 = patch.openTo2;
    if (patch.openHours !== undefined || patch.openFrom !== undefined || patch.openTo !== undefined || patch.openFrom2 !== undefined || patch.openTo2 !== undefined) {
      const synced = syncHoursFields(
        patch.openHours?.length
          ? patch.openHours
          : houseHoursWindows({
              openFrom: house.openFrom,
              openTo: house.openTo,
              openFrom2: house.openFrom2,
              openTo2: house.openTo2,
              openHours: house.openHours,
            }),
      );
      house.openHours = synced.openHours;
      house.openFrom = synced.openFrom;
      house.openTo = synced.openTo;
      house.openFrom2 = synced.openFrom2;
      house.openTo2 = synced.openTo2;
    }
    if (patch.notes !== undefined) house.notes = patch.notes;
    if (patch.accessible !== undefined) house.accessible = patch.accessible;
    if (
      patch.decorLevel !== undefined ||
      patch.decorated !== undefined ||
      patch.visit === "decorOnly"
    ) {
      const decor = syncDecorFields({
        ...house,
        decorLevel: patch.decorLevel ?? house.decorLevel,
        decorated: patch.decorated ?? house.decorated,
        visit: patch.visit ?? house.visit,
      });
      house.decorLevel = decor.decorLevel;
      house.decorated = decor.decorated;
    }
    if (patch.adminFrozen !== undefined) house.adminFrozen = patch.adminFrozen;
    if (patch.ownerFrozenUntil !== undefined) house.ownerFrozenUntil = patch.ownerFrozenUntil;
    if (patch.photoUrl !== undefined) house.photoUrl = parsePhotoUrl(patch.photoUrl) ?? patch.photoUrl;
    if (patch.addedBy !== undefined) house.addedBy = patch.addedBy?.trim() || null;
    if (patch.kind !== undefined) {
      house.kind = patch.kind === "poi" ? "poi" : "house";
      house.poiCategory = normalizePoiCategory(house.kind, patch.poiCategory ?? house.poiCategory);
    } else if (patch.poiCategory !== undefined && house.kind === "poi") {
      house.poiCategory = normalizePoiCategory("poi", patch.poiCategory);
    }
    if (patch.visit !== undefined) house.soldOut = patch.visit === "closed";
    else if (patch.soldOut !== undefined) {
      house.soldOut = patch.soldOut;
      house.visit = patch.soldOut ? "closed" : house.visit === "closed" ? "come" : house.visit;
    }
    house.updatedAt = new Date().toISOString();
    db.updatedAt = house.updatedAt;
    return house;
  });
  if (!updated) return null;
  const push = await dispatchHousePush(prev, updated, undefined, patch, options?.includeEndpoint);
  return { house: updated, push };
}

export type HousePushResult = {
  kind: PushKind;
  autoSent?: boolean;
  title?: string;
  body?: string;
  offer?: { kind: PushKind; title: string; body: string };
};

async function dispatchHousePush(
  prev: House | null,
  next: House,
  forcedKind?: PushKind,
  patch?: OwnerNotifyPatch,
  includeEndpoint?: string,
): Promise<HousePushResult | undefined> {
  const kind =
    forcedKind ??
    (prev ? classifyHouseAlert(prev, next) : "houseAdded") ??
    ownerOfferKindFromPatch(patch, next, prev ?? undefined);
  if (!kind) return;
  if (!pushAlertsEnabled()) return;
  if (!neighborhoodPushBroadcastAllowed(kind)) return;
  const stored = (await loadDb()).pushSettings as StoredPushSettings | undefined;
  const payload = payloadForKind(kind, next, stored);
  if (!payload) return { kind };
  if (AUTO_PUSH_KINDS.has(kind)) {
    void broadcastPush(payload, includeEndpoint).catch(() => undefined);
    return { kind, autoSent: true, title: payload.title, body: payload.body };
  }
  return { kind, offer: { kind, title: payload.title, body: payload.body } };
}
