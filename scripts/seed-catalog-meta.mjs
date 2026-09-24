#!/usr/bin/env node
/**
 * Set meta/catalog.updatedAt from the newest house (or push settings) in Firestore.
 * Run once after deploy so cold delta polls use the 1-read meta gate immediately.
 *
 *   node scripts/seed-catalog-meta.mjs
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) return JSON.parse(raw);
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY",
    );
  }
  return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
}

function neighborhoodId() {
  return process.env.FIRESTORE_NEIGHBORHOOD_ID?.trim() || "default";
}

function candidateDatabaseIds() {
  const raw = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (raw) return [raw];
  return ["(default)", "default"];
}

function stamp(iso) {
  const ms = Date.parse(String(iso ?? ""));
  return Number.isFinite(ms) ? ms : 0;
}

async function resolveDb() {
  for (const id of candidateDatabaseIds()) {
    const db = getFirestore(undefined, id);
    try {
      await db.collection("_hw_firestore_probe").limit(1).get();
      if (id !== candidateDatabaseIds()[0]) console.log(`Using Firestore database id: ${id}`);
      return db;
    } catch (error) {
      if (error?.code !== 5) throw error;
    }
  }
  throw new Error("FIRESTORE_NOT_FOUND — create a database in Firebase Console");
}

async function main() {
  const account = parseServiceAccount();
  if (!getApps().length) initializeApp({ credential: cert(account) });
  const db = await resolveDb();
  const nId = neighborhoodId();
  const rootRef = db.collection("neighborhoods").doc(nId);
  const [housesSnap, pushSnap, metaSnap] = await Promise.all([
    rootRef.collection("houses").get(),
    rootRef.collection("meta").doc("pushSettings").get(),
    rootRef.collection("meta").doc("catalog").get(),
  ]);

  let updatedAt = "";
  for (const doc of housesSnap.docs) {
    const row = doc.data();
    const candidate = String(row.updatedAt ?? "");
    if (stamp(candidate) > stamp(updatedAt)) updatedAt = candidate;
  }
  if (pushSnap.exists) {
    const pushUpdatedAt = String(pushSnap.data()?.updatedAt ?? "");
    if (stamp(pushUpdatedAt) > stamp(updatedAt)) updatedAt = pushUpdatedAt;
  }
  if (!updatedAt) updatedAt = new Date().toISOString();

  const existing = metaSnap.exists ? String(metaSnap.data()?.updatedAt ?? "") : "";
  if (existing && stamp(existing) >= stamp(updatedAt)) {
    console.log(`meta/catalog already up to date (${existing})`);
    return;
  }

  const houseCount = housesSnap.size;
  await rootRef.collection("meta").doc("catalog").set({ updatedAt, houseCount }, { merge: true });
  console.log(`Set meta/catalog.updatedAt → ${updatedAt}, houseCount → ${houseCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
