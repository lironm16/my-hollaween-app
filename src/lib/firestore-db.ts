import {
  firestoreConfigured,
  housesCollection,
  metaDoc,
  pushEndpointDocId,
  pushSubscriptionsCollection,
  removedHousesCollection,
  resolveAdminFirestore,
} from "@/lib/firestore-admin";
import { isStubHouse } from "@/lib/house-set";
import { canonicalHouseId, toPublicHouse } from "@/lib/ids";
import { countPublishedHouses } from "@/lib/catalog-cache-build";
import { isPubliclyListed } from "@/lib/house-state";
import { stripStubHouses } from "@/lib/rehearsal-stubs";
import { pushAlertsEnabled } from "@/lib/push-enabled";
import type { DbFile, House, PublicHouse, PushSubscriptionRecord, VapidKeys } from "@/lib/types";

export { firestoreConfigured };

function stamp(value?: string) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

function rowToHouse(docId: string, row: House): House {
  return { ...row, id: canonicalHouseId(row.id || docId), storeId: docId };
}

export async function readFirestoreHouse(id: string): Promise<House | null> {
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const docId = canonicalHouseId(id);
    const snap = await housesCollection().doc(docId).get();
    if (!snap.exists) return null;
    const house = rowToHouse(snap.id, snap.data() as House);
    return isStubHouse(house) ? null : house;
  } catch (error) {
    console.error("[firestore] house read failed", error);
    return null;
  }
}

let catalogMetaMem: { updatedAt: string; houseCount?: number } | null = null;
let catalogMetaMemAt = 0;
export const CATALOG_META_MEM_TTL_MS = 600_000;

let pushSettingsMetaMem: { updatedAt: string } | null = null;
let pushSettingsMetaMemAt = 0;

let pushSubsCountMem: { count: number; at: number } | null = null;

/** Cheap catalog revision stamp — one doc read for idle delta polls. */
export async function readCatalogMeta(): Promise<{ updatedAt: string; houseCount?: number } | null> {
  if (catalogMetaMem && Date.now() - catalogMetaMemAt < CATALOG_META_MEM_TTL_MS) {
    return catalogMetaMem;
  }
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const snap = await metaDoc("catalog").get();
    if (!snap.exists) return null;
    const row = snap.data() as { updatedAt?: string; houseCount?: number };
    const updatedAt = String(row?.updatedAt ?? "");
    if (!updatedAt) return null;
    const houseCount = Number(row?.houseCount);
    catalogMetaMem = {
      updatedAt,
      ...(Number.isFinite(houseCount) && houseCount >= 0 ? { houseCount } : {}),
    };
    catalogMetaMemAt = Date.now();
    return catalogMetaMem;
  } catch (error) {
    console.error("[firestore] catalog meta read failed", error);
    return null;
  }
}

/** Push template revision — separate from catalog meta (#9). */
export async function readPushSettingsMeta(): Promise<{ updatedAt: string } | null> {
  if (pushSettingsMetaMem && Date.now() - pushSettingsMetaMemAt < CATALOG_META_MEM_TTL_MS) {
    return pushSettingsMetaMem;
  }
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const snap = await metaDoc("pushSettings").get();
    if (!snap.exists) return null;
    const updatedAt = String((snap.data() as { updatedAt?: string })?.updatedAt ?? "");
    if (!updatedAt) return null;
    pushSettingsMetaMem = { updatedAt };
    pushSettingsMetaMemAt = Date.now();
    return pushSettingsMetaMem;
  } catch (error) {
    console.error("[firestore] push settings meta read failed", error);
    return null;
  }
}

export async function bumpCatalogMeta(updatedAt: string, houseCount?: number) {
  if (!firestoreConfigured() || !updatedAt) return;
  catalogMetaMem = {
    updatedAt,
    ...(typeof houseCount === "number" && houseCount >= 0 ? { houseCount } : {}),
  };
  catalogMetaMemAt = Date.now();
  await resolveAdminFirestore();
  await metaDoc("catalog").set(catalogMetaMem, { merge: true });
}

function rememberPushSettingsMeta(updatedAt: string) {
  if (!updatedAt) return;
  pushSettingsMetaMem = { updatedAt };
  pushSettingsMetaMemAt = Date.now();
}

async function readPushSubsCountMeta(): Promise<number | null> {
  if (pushSubsCountMem && Date.now() - pushSubsCountMem.at < CATALOG_META_MEM_TTL_MS) {
    return pushSubsCountMem.count;
  }
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const snap = await metaDoc("pushSubs").get();
    if (!snap.exists) return null;
    const count = Number((snap.data() as { count?: number })?.count);
    if (!Number.isFinite(count) || count < 0) return null;
    pushSubsCountMem = { count, at: Date.now() };
    return count;
  } catch (error) {
    console.error("[firestore] push subs count read failed", error);
    return null;
  }
}

async function setPushSubsCountMeta(count: number) {
  if (!firestoreConfigured()) return;
  pushSubsCountMem = { count, at: Date.now() };
  await resolveAdminFirestore();
  await metaDoc("pushSubs").set({ count, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function countFirestorePushSubscriptions(): Promise<number | null> {
  const cached = await readPushSubsCountMeta();
  if (cached !== null) return cached;
  const subs = await readFirestorePushSubscriptions();
  if (subs === null) return null;
  await setPushSubsCountMeta(subs.length);
  return subs.length;
}

export async function writeFirestoreHouse(house: House) {
  if (!firestoreConfigured()) {
    throw new Error("FIRESTORE_NOT_CONFIGURED");
  }
  if (isStubHouse(house)) return;
  await resolveAdminFirestore();
  const id = canonicalHouseId(house.id);
  await housesCollection().doc(id).set({ ...house, id, storeId: id }, { merge: true });
  await bumpCatalogMeta(house.updatedAt);
}

export async function deleteFirestoreHouse(id: string, options?: { skipCatalogMeta?: boolean }) {
  if (!firestoreConfigured()) return;
  await resolveAdminFirestore();
  const docId = canonicalHouseId(id);
  const now = new Date().toISOString();
  await housesCollection().doc(docId).delete();
  await removedHousesCollection().doc(docId).set({ id: docId, deletedAt: now });
  if (!options?.skipCatalogMeta) await bumpCatalogMeta(now);
}

export async function queryFirestoreHousesSince(since: string): Promise<PublicHouse[]> {
  if (!firestoreConfigured()) return [];
  try {
    await resolveAdminFirestore();
    const snap = await housesCollection().where("updatedAt", ">", since).get();
    const houses: PublicHouse[] = [];
    for (const doc of snap.docs) {
      const row = rowToHouse(doc.id, doc.data() as House);
      if (isStubHouse(row) || !isPubliclyListed(row)) continue;
      houses.push(toPublicHouse(row) as PublicHouse);
    }
    return houses;
  } catch (error) {
    console.error("[firestore] houses-since query failed", error);
    return [];
  }
}

export async function queryRemovedHouseIdsSince(since: string): Promise<string[]> {
  if (!firestoreConfigured()) return [];
  try {
    await resolveAdminFirestore();
    const snap = await removedHousesCollection().where("deletedAt", ">", since).get();
    return snap.docs.map((doc) => canonicalHouseId(doc.id));
  } catch (error) {
    console.error("[firestore] removed-since query failed", error);
    return [];
  }
}

/** Catalog path — houses + push templates only (#2). */
export async function readFirestoreCatalog(): Promise<Omit<DbFile, "pushSubscriptions" | "vapid"> | null> {
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const [housesSnap, pushSettingsSnap, catalogMetaSnap] = await Promise.all([
      housesCollection().get(),
      pushAlertsEnabled() ? metaDoc("pushSettings").get() : Promise.resolve(null),
      metaDoc("catalog").get(),
    ]);

    const houses: House[] = [];
    for (const doc of housesSnap.docs) {
      const row = doc.data() as House;
      if (!row?.id && !doc.id) continue;
      const house = rowToHouse(doc.id, row);
      if (isStubHouse(house)) continue;
      houses.push(house);
    }

    let updatedAt = catalogMetaSnap.exists
      ? String((catalogMetaSnap.data() as { updatedAt?: string })?.updatedAt ?? "")
      : "";
    if (!updatedAt) {
      for (const house of houses) {
        if (stamp(house.updatedAt) > stamp(updatedAt)) updatedAt = house.updatedAt;
      }
    }

    const pushSettings =
      pushSettingsSnap?.exists
        ? (pushSettingsSnap.data() as DbFile["pushSettings"])
        : undefined;

    if (!updatedAt) updatedAt = new Date().toISOString();

    return {
      updatedAt,
      houses,
      ...(pushSettings?.templates ? { pushSettings } : {}),
    };
  } catch (error) {
    console.error("[firestore] catalog read failed", error);
    return null;
  }
}

/** Push path — subscriptions + vapid (#2). */
export async function readFirestorePushData(): Promise<{
  pushSubscriptions: PushSubscriptionRecord[];
  vapid?: VapidKeys;
  pushSettings?: DbFile["pushSettings"];
} | null> {
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const [vapidSnap, subsSnap, pushSettingsSnap] = await Promise.all([
      metaDoc("vapid").get(),
      pushSubscriptionsCollection().get(),
      metaDoc("pushSettings").get(),
    ]);

    const pushSubscriptions: PushSubscriptionRecord[] = subsSnap.docs
      .map((doc) => doc.data() as PushSubscriptionRecord)
      .filter((row) => row?.endpoint && row.keys?.p256dh && row.keys?.auth);

    const vapidRaw = vapidSnap.exists ? (vapidSnap.data() as VapidKeys) : undefined;
    const vapid =
      vapidRaw?.publicKey && vapidRaw?.privateKey
        ? {
            publicKey: vapidRaw.publicKey,
            privateKey: vapidRaw.privateKey,
            subject: vapidRaw.subject ?? "mailto:halloween@localhost",
          }
        : undefined;

    const pushSettings = pushSettingsSnap.exists
      ? (pushSettingsSnap.data() as DbFile["pushSettings"])
      : undefined;

    await setPushSubsCountMeta(pushSubscriptions.length);

    return {
      pushSubscriptions,
      ...(vapid ? { vapid } : {}),
      ...(pushSettings?.templates ? { pushSettings } : {}),
    };
  } catch (error) {
    console.error("[firestore] push data read failed", error);
    return null;
  }
}

/** @deprecated Prefer readFirestoreCatalog + readFirestorePushData. */
export async function readFirestoreDb(): Promise<DbFile | null> {
  const [catalog, push] = await Promise.all([readFirestoreCatalog(), readFirestorePushData()]);
  if (!catalog) return null;
  return {
    ...catalog,
    pushSubscriptions: push?.pushSubscriptions ?? [],
    ...(push?.vapid ? { vapid: push.vapid } : {}),
    ...(push?.pushSettings?.templates && !catalog.pushSettings
      ? { pushSettings: push.pushSettings }
      : {}),
  };
}

export async function readFirestorePushSubscriptions(): Promise<PushSubscriptionRecord[] | null> {
  const data = await readFirestorePushData();
  return data?.pushSubscriptions ?? null;
}

export async function readFirestorePushSubscription(
  endpoint: string,
): Promise<PushSubscriptionRecord | null> {
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const snap = await pushSubscriptionsCollection().doc(pushEndpointDocId(endpoint)).get();
    if (!snap.exists) return null;
    const row = snap.data() as PushSubscriptionRecord;
    if (!row?.endpoint || !row.keys?.p256dh || !row.keys?.auth) return null;
    return row;
  } catch (error) {
    console.error("[firestore] push subscription read failed", error);
    return null;
  }
}

export async function writeFirestorePushSubscription(
  sub: PushSubscriptionRecord,
  options?: { isNew?: boolean },
) {
  if (!firestoreConfigured()) return;
  await resolveAdminFirestore();
  const ref = pushSubscriptionsCollection().doc(pushEndpointDocId(sub.endpoint));
  let isNew = options?.isNew;
  if (isNew === undefined) {
    const existing = await ref.get();
    isNew = !existing.exists;
  }
  await ref.set(sub, { merge: true });
  if (isNew) {
    const count = await readPushSubsCountMeta();
    if (count !== null) await setPushSubsCountMeta(count + 1);
  }
}

export async function deleteFirestorePushSubscription(endpoint: string) {
  if (!firestoreConfigured()) return;
  await resolveAdminFirestore();
  const ref = pushSubscriptionsCollection().doc(pushEndpointDocId(endpoint));
  const existing = await ref.get();
  if (!existing.exists) return;
  await ref.delete();
  const count = await readPushSubsCountMeta();
  if (count !== null) await setPushSubsCountMeta(Math.max(0, count - 1));
}

export async function writeFirestoreVapid(vapid: VapidKeys) {
  if (!firestoreConfigured()) return;
  await resolveAdminFirestore();
  await metaDoc("vapid").set(vapid, { merge: true });
}

function changedHouses(prev: House[], next: House[]) {
  const before = new Map(prev.map((house) => [canonicalHouseId(house.id), house.updatedAt]));
  const out: House[] = [];
  for (const house of next) {
    const id = canonicalHouseId(house.id);
    if (before.get(id) !== house.updatedAt) out.push(house);
  }
  return out;
}

function removedHouseIds(prev: House[], next: House[]) {
  const nextIds = new Set(next.map((house) => canonicalHouseId(house.id)));
  return prev
    .map((house) => canonicalHouseId(house.id))
    .filter((id) => id && !nextIds.has(id));
}

function pushSettingsChanged(
  prev: DbFile["pushSettings"] | undefined,
  next: DbFile["pushSettings"] | undefined,
) {
  return JSON.stringify(prev ?? null) !== JSON.stringify(next ?? null);
}

function vapidChanged(prev: VapidKeys | undefined, next: VapidKeys | undefined) {
  return JSON.stringify(prev ?? null) !== JSON.stringify(next ?? null);
}

export async function writeFirestorePushSettings(settings: DbFile["pushSettings"]) {
  if (!firestoreConfigured() || !settings?.templates) return;
  await resolveAdminFirestore();
  await metaDoc("pushSettings").set(settings, { merge: true });
  rememberPushSettingsMeta(settings.updatedAt ?? new Date().toISOString());
}

export async function writeFirestoreDb(input: { db: DbFile; prev?: DbFile | null }) {
  if (!firestoreConfigured()) {
    throw new Error("FIRESTORE_NOT_CONFIGURED");
  }
  await resolveAdminFirestore();
  const { db, prev } = input;
  const firestore = housesCollection().firestore;
  const houses = stripStubHouses(db.houses);
  const prevHouses = prev ? stripStubHouses(prev.houses) : null;
  const dirtyHouses = prevHouses ? changedHouses(prevHouses, houses) : houses;
  const housesChanged = dirtyHouses.length > 0;
  const removals = prevHouses ? removedHouseIds(prevHouses, houses) : [];

  for (let i = 0; i < dirtyHouses.length; i += 400) {
    const batch = firestore.batch();
    for (const house of dirtyHouses.slice(i, i + 400)) {
      const id = canonicalHouseId(house.id);
      batch.set(
        housesCollection().doc(id),
        { ...house, id, storeId: id },
        { merge: true },
      );
    }
    await batch.commit();
  }

  for (const id of removals) {
    await deleteFirestoreHouse(id, { skipCatalogMeta: true });
  }

  if (pushSettingsChanged(prev?.pushSettings, db.pushSettings) && db.pushSettings?.templates) {
    await metaDoc("pushSettings").set(db.pushSettings, { merge: true });
    rememberPushSettingsMeta(db.pushSettings.updatedAt ?? new Date().toISOString());
  }

  if (vapidChanged(prev?.vapid, db.vapid) && db.vapid?.publicKey && db.vapid.privateKey) {
    await metaDoc("vapid").set(db.vapid, { merge: true });
  }

  if (housesChanged || removals.length > 0) {
    await bumpCatalogMeta(db.updatedAt, countPublishedHouses(houses));
  }
}
