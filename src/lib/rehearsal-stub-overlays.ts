import { firestoreConfigured, metaDoc, resolveAdminFirestore } from "@/lib/firestore-admin";
import { canonicalHouseId } from "@/lib/ids";
import { isStubHouse } from "@/lib/house-set";
import type { DbFile, House } from "@/lib/types";

const OVERLAY_MEM_TTL_MS = 5_000;

type OverlayDoc = {
  updatedAt?: string;
  byId?: Record<string, House>;
};

let overlayMem: OverlayDoc | null = null;
let overlayMemAt = 0;

function stamp(value?: string) {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

/** Stub rows that changed between two in-memory db snapshots. */
export function changedRehearsalStubs(prev: DbFile | null | undefined, next: DbFile): House[] {
  const before = new Map(
    (prev?.houses ?? [])
      .filter((house) => isStubHouse(house))
      .map((house) => [canonicalHouseId(house.id), house.updatedAt]),
  );
  return next.houses.filter((house) => {
    if (!isStubHouse(house)) return false;
    const id = canonicalHouseId(house.id);
    return before.get(id) !== house.updatedAt;
  });
}

/** Rehearsal stub overrides — shared across server instances, never mixed into real house queries. */
export async function readRehearsalStubOverlays(): Promise<Map<string, House>> {
  if (process.env.DATA_DIR?.trim() || !firestoreConfigured()) return new Map();
  if (overlayMem?.byId && Date.now() - overlayMemAt < OVERLAY_MEM_TTL_MS) {
    return new Map(Object.entries(overlayMem.byId));
  }
  try {
    await resolveAdminFirestore();
    const snap = await metaDoc("rehearsalStubs").get();
    if (!snap.exists) {
      overlayMem = { byId: {} };
      overlayMemAt = Date.now();
      return new Map();
    }
    const data = snap.data() as OverlayDoc;
    const byId = data.byId ?? {};
    overlayMem = { byId, updatedAt: data.updatedAt };
    overlayMemAt = Date.now();
    return new Map(Object.entries(byId));
  } catch (error) {
    console.error("[rehearsal-stubs] overlay read failed", error);
    return new Map();
  }
}

export async function writeRehearsalStubOverlays(changes: readonly House[]) {
  if (process.env.DATA_DIR?.trim() || !firestoreConfigured() || changes.length === 0) return;
  const stubs = changes.filter((house) => isStubHouse(house));
  if (stubs.length === 0) return;

  await resolveAdminFirestore();
  const doc = metaDoc("rehearsalStubs");
  const snap = await doc.get();
  const existing = snap.exists ? ((snap.data() as OverlayDoc).byId ?? {}) : {};
  const byId = { ...existing };
  let updatedAt = snap.exists ? String((snap.data() as OverlayDoc).updatedAt ?? "") : "";

  for (const house of stubs) {
    const id = canonicalHouseId(house.id);
    byId[id] = { ...house, id, storeId: id };
    if (stamp(house.updatedAt) > stamp(updatedAt)) updatedAt = house.updatedAt;
  }
  if (!updatedAt) updatedAt = new Date().toISOString();

  await doc.set({ byId, updatedAt }, { merge: true });
  overlayMem = { byId, updatedAt };
  overlayMemAt = Date.now();
}
