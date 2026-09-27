#!/usr/bin/env node
/**
 * Persist OSM footprint alignment for houses already in Firestore (one-time / maintenance).
 *
 *   node scripts/realign-house-footprints.mjs
 *   DRY_RUN=1 node scripts/realign-house-footprints.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

async function loadAlign() {
  const mod = await import(pathToFileURL(join(root, "src/lib/house-footprint-align.ts")).href);
  return mod.alignPublicHouseCoords;
}

async function main() {
  const alignPublicHouseCoords = await loadAlign();
  const dryRun = process.env.DRY_RUN === "1";
  if (!getApps().length) {
    initializeApp({ credential: cert(parseServiceAccount()) });
  }
  const db = getFirestore();
  const col = db.collection("neighborhoods").doc(neighborhoodId()).collection("houses");
  const snap = await col.get();
  let changed = 0;
  const now = new Date().toISOString();
  for (const doc of snap.docs) {
    const row = doc.data();
    if (row.deletedAt) continue;
    const before = { lat: row.lat, lng: row.lng };
    const aligned = alignPublicHouseCoords({
      address: String(row.address ?? ""),
      lat: Number(row.lat),
      lng: Number(row.lng),
    });
    if (before.lat === aligned.lat && before.lng === aligned.lng) continue;
    changed += 1;
    console.log(
      doc.id,
      row.address,
      `${before.lat},${before.lng}`,
      "→",
      `${aligned.lat},${aligned.lng}`,
    );
    if (!dryRun) {
      await doc.ref.set({ lat: aligned.lat, lng: aligned.lng, updatedAt: now }, { merge: true });
    }
  }
  console.log(dryRun ? `[dry run] would update ${changed} house(s)` : `updated ${changed} house(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
