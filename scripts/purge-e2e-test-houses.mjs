#!/usr/bin/env node
/**
 * Remove E2E / integration test houses that were accidentally written to Firestore.
 * Matches names, descriptions, or the isolated E2E address העמל 99.
 *
 *   node scripts/purge-e2e-test-houses.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { E2E_HOUSE_ADDRESS } from "./lib/e2e-house.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TEST_NAME =
  /(?:^בית אינטגרציה$|בית (?:בדיקה(?:\s*[—–-]\s*.+)?|תור E2E|batch5|poll E2E|בדיקה E2E|אינטגרציה)|(?:אינטגרציה|סטאב E2E)(?:\s*[—–-]\s*.+)?)/;
const TEST_DESCRIPTION = /בדיק(?:ה|ת)\s+(?:E2E|batch5|תור offline|API)/i;

function isE2eTestHouse(house) {
  if (!house || typeof house !== "object") return false;
  const name = String(house.name ?? "");
  const description = String(house.description ?? "");
  const address = String(house.address ?? "");
  return (
    TEST_NAME.test(name) ||
    TEST_DESCRIPTION.test(description) ||
    address === E2E_HOUSE_ADDRESS ||
    address === "חרוזים 8" && TEST_DESCRIPTION.test(description)
  );
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
  const testDocs = snap.docs.filter((doc) => isE2eTestHouse({ id: doc.id, ...doc.data() }));
  console.log(`Found ${testDocs.length} E2E test documents in neighborhoods/${nId}/houses`);
  for (const doc of testDocs) {
    console.log(`  - ${doc.id}: ${doc.data().name ?? "(no name)"}`);
  }
  if (testDocs.length === 0) return;

  const now = new Date().toISOString();
  for (let i = 0; i < testDocs.length; i += 400) {
    const batch = db.batch();
    for (const doc of testDocs.slice(i, i + 400)) {
      batch.delete(doc.ref);
      batch.set(removedCol.doc(doc.id), { id: doc.id, deletedAt: now });
    }
    await batch.commit();
  }

  console.log(`Deleted ${testDocs.length} E2E test documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
