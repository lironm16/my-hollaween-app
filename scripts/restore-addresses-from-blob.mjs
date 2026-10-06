#!/usr/bin/env node
/**
 * Restore empty Firestore `address` / `arrival` from Vercel Blob backups.
 *
 * Sources (first hit wins per house id):
 *   1. halloween-houses/db.json
 *   2. halloween-houses/catalog-snapshot.json → `houses` (full rows, not public catalog)
 *
 *   DRY_RUN=1 node --import tsx scripts/restore-addresses-from-blob.mjs
 *   node --import tsx scripts/restore-addresses-from-blob.mjs
 *
 * Requires FIREBASE_* credentials and BLOB_READ_WRITE_TOKEN (same as production).
 */
import { get as getBlob } from "@vercel/blob";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { privateBlobGetOptions } from "../src/lib/blob-auth.ts";
import { preserveStoredAddressFields } from "../src/lib/firestore-address-preserve.ts";

const DB_BLOB = "halloween-houses/db.json";
const SNAPSHOT_BLOB = "halloween-houses/catalog-snapshot.json";

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

async function readBlobJson(path) {
  const result = await getBlob(path, privateBlobGetOptions());
  if (!result?.stream) return null;
  return JSON.parse(await new Response(result.stream).text());
}

function indexById(houses) {
  const map = new Map();
  for (const row of houses ?? []) {
    if (!row?.id) continue;
    map.set(String(row.id), row);
  }
  return map;
}

async function loadBackupIndex() {
  const db = await readBlobJson(DB_BLOB);
  const fromDb = indexById(db?.houses);
  const snap = await readBlobJson(SNAPSHOT_BLOB);
  const fromSnap = indexById(snap?.houses);
  return { fromDb, fromSnap };
}

function pickBackup(id, fromDb, fromSnap) {
  return fromDb.get(id) ?? fromSnap.get(id) ?? null;
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  if (!getApps().length) {
    initializeApp({ credential: cert(parseServiceAccount()) });
  }
  const { fromDb, fromSnap } = await loadBackupIndex();
  console.log(`backup rows: db.json=${fromDb.size}, catalog-snapshot=${fromSnap.size}`);
  const col = getFirestore().collection("neighborhoods").doc(neighborhoodId()).collection("houses");
  const snap = await col.get();
  let restored = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  for (const doc of snap.docs) {
    const row = doc.data();
    if (row.deletedAt) continue;
    const current = { ...row, id: doc.id };
    if (current.address?.trim() && current.arrival?.trim()) {
      skipped += 1;
      continue;
    }
    const backup = pickBackup(doc.id, fromDb, fromSnap);
    if (!backup) continue;
    const merged = preserveStoredAddressFields(
      {
        ...current,
        address: backup.address ?? "",
        arrival: backup.arrival ?? "",
      },
      current,
    );
    if (
      merged.address === (current.address ?? "") &&
      merged.arrival === (current.arrival ?? "")
    ) {
      continue;
    }
    restored += 1;
    console.log(doc.id, "→", merged.address || "(still empty)", merged.arrival ? "+ arrival" : "");
    if (!dryRun) {
      await doc.ref.set(
        { address: merged.address, arrival: merged.arrival, updatedAt: now },
        { merge: true },
      );
    }
  }
  console.log(
    dryRun
      ? `[dry run] would restore ${restored} house(s), ${skipped} already complete`
      : `restored ${restored} house(s), ${skipped} already complete`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
