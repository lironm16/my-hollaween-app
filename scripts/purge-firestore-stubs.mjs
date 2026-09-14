#!/usr/bin/env node
/**
 * Remove rehearsal stub house documents from Firestore.
 * Stubs are served statically from data/seed.json — they should not live in Firestore.
 *
 * Env: same Firebase credentials as migrate-to-firestore.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STUB_ID = /^בית-931\d$/;

function isStubHouse(house) {
  if (house?.id && STUB_ID.test(String(house.id))) return true;
  return Boolean(house?.description?.includes("סטאב לחזרה"));
}

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
  const housesCol = db.collection("neighborhoods").doc(nId).collection("houses");
  const removedCol = db.collection("neighborhoods").doc(nId).collection("removedHouses");
  const snap = await housesCol.get();
  const stubDocs = snap.docs.filter((doc) => isStubHouse({ id: doc.id, ...doc.data() }));
  console.log(`Found ${stubDocs.length} stub documents in neighborhoods/${nId}/houses`);

  const now = new Date().toISOString();
  for (let i = 0; i < stubDocs.length; i += 400) {
    const batch = db.batch();
    for (const doc of stubDocs.slice(i, i + 400)) {
      batch.delete(doc.ref);
      batch.set(removedCol.doc(doc.id), { id: doc.id, deletedAt: now });
    }
    await batch.commit();
  }

  console.log(`Deleted ${stubDocs.length} stub documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
