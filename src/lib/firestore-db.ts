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
import { isPubliclyListed } from "@/lib/house-state";
import { stripStubHouses } from "@/lib/rehearsal-stubs";
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

let catalogMetaMem: { updatedAt: string } | null = null;
let catalogMetaMemAt = 0;
const CATALOG_META_MEM_TTL_MS = 120_000;

/** Cheap catalog revision stamp — one doc read for idle delta polls. */
export async function readCatalogMeta(): Promise<{ updatedAt: string } | null> {
  if (catalogMetaMem && Date.now() - catalogMetaMemAt < CATALOG_META_MEM_TTL_MS) {
    return catalogMetaMem;
  }
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const snap = await metaDoc("catalog").get();
    if (!snap.exists) return null;
    const updatedAt = String((snap.data() as { updatedAt?: string })?.updatedAt ?? "");
    if (!updatedAt) return null;
    catalogMetaMem = { updatedAt };
    catalogMetaMemAt = Date.now();
    return catalogMetaMem;
  } catch (error) {
    console.error("[firestore] catalog meta read failed", error);
    return null;
  }
}

export async function bumpCatalogMeta(updatedAt: string) {
  if (!firestoreConfigured() || !updatedAt) return;
  catalogMetaMem = { updatedAt };
  catalogMetaMemAt = Date.now();
  await resolveAdminFirestore();
  await metaDoc("catalog").set({ updatedAt }, { merge: true });
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

export async function readFirestoreDb(): Promise<DbFile | null> {
  if (!firestoreConfigured()) return null;
  try {
    await resolveAdminFirestore();
    const [housesSnap, pushSettingsSnap, vapidSnap, subsSnap] = await Promise.all([
      housesCollection().get(),
      metaDoc("pushSettings").get(),
      metaDoc("vapid").get(),
      pushSubscriptionsCollection().get(),
    ]);

    const houses: House[] = [];
    for (const doc of housesSnap.docs) {
      const row = doc.data() as House;
      if (!row?.id && !doc.id) continue;
      const house = rowToHouse(doc.id, row);
      if (isStubHouse(house)) continue;
      houses.push(house);
    }

    const pushSubscriptions: PushSubscriptionRecord[] = subsSnap.docs
      .map((doc) => doc.data() as PushSubscriptionRecord)
      .filter((row) => row?.endpoint && row.keys?.p256dh && row.keys?.auth);

    let updatedAt = "";
    for (const house of houses) {
      if (stamp(house.updatedAt) > stamp(updatedAt)) updatedAt = house.updatedAt;
    }

    const pushSettings = pushSettingsSnap.exists
      ? (pushSettingsSnap.data() as DbFile["pushSettings"])
      : undefined;
    if (pushSettings?.updatedAt && stamp(pushSettings.updatedAt) > stamp(updatedAt)) {
      updatedAt = pushSettings.updatedAt;
    }

    const vapidRaw = vapidSnap.exists ? (vapidSnap.data() as VapidKeys) : undefined;
    const vapid =
      vapidRaw?.publicKey && vapidRaw?.privateKey
        ? {
            publicKey: vapidRaw.publicKey,
            privateKey: vapidRaw.privateKey,
            subject: vapidRaw.subject ?? "mailto:halloween@localhost",
          }
        : undefined;

    if (!updatedAt) updatedAt = new Date().toISOString();

    return {
      updatedAt,
      houses,
      pushSubscriptions,
      ...(pushSettings?.templates ? { pushSettings } : {}),
      ...(vapid ? { vapid } : {}),
    };
  } catch (error) {
    console.error("[firestore] db read failed", error);
    return null;
  }
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

function subsChanged(prev: PushSubscriptionRecord[] | undefined, next: PushSubscriptionRecord[] | undefined) {
  const a = prev ?? [];
  const b = next ?? [];
  if (a.length !== b.length) return true;
  const map = new Map(a.map((item) => [item.endpoint, JSON.stringify(item)]));
  for (const item of b) {
    if (map.get(item.endpoint) !== JSON.stringify(item)) return true;
  }
  return false;
}

export async function writeFirestorePushSettings(settings: DbFile["pushSettings"]) {
  if (!firestoreConfigured() || !settings?.templates) return;
  await resolveAdminFirestore();
  await metaDoc("pushSettings").set(settings, { merge: true });
  await bumpCatalogMeta(settings.updatedAt ?? new Date().toISOString());
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

  if (prevHouses) {
    for (const id of removedHouseIds(prevHouses, houses)) {
      await deleteFirestoreHouse(id, { skipCatalogMeta: true });
    }
  }

  if (db.pushSettings?.templates) {
    await metaDoc("pushSettings").set(db.pushSettings, { merge: true });
  }

  if (db.vapid?.publicKey && db.vapid.privateKey) {
    await metaDoc("vapid").set(db.vapid, { merge: true });
  }

  if (subsChanged(prev?.pushSubscriptions, db.pushSubscriptions)) {
    const subs = db.pushSubscriptions ?? [];
    const col = pushSubscriptionsCollection();
    const existing = await col.get();
    const nextIds = new Set(subs.map((item) => pushEndpointDocId(item.endpoint)));
    const batch = firestore.batch();
    for (const doc of existing.docs) {
      if (!nextIds.has(doc.id)) batch.delete(doc.ref);
    }
    for (const sub of subs) {
      batch.set(col.doc(pushEndpointDocId(sub.endpoint)), sub, { merge: true });
    }
    await batch.commit();
  }

  await bumpCatalogMeta(db.updatedAt);
}
