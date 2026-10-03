#!/usr/bin/env node
/**
 * Freeze legacy calculated hoods into `neighborhood` on Firestore houses.
 *
 *   DRY_RUN=1 node scripts/backfill-stored-neighborhoods.mjs
 *   MODE=all DRY_RUN=1 node scripts/backfill-stored-neighborhoods.mjs
 *   node scripts/backfill-stored-neighborhoods.mjs
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

async function loadBackfill() {
  const mod = await import(pathToFileURL(join(root, "src/lib/neighborhood-backfill.ts")).href);
  return mod;
}

async function main() {
  const { houseNeedsNeighborhoodBackfill, neighborhoodCalculatedLegacy } = await loadBackfill();
  const dryRun = process.env.DRY_RUN === "1";
  const mode = process.env.MODE === "all" ? "all" : "missing";
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
    const house = {
      id: doc.id,
      address: String(row.address ?? ""),
      neighborhood: row.neighborhood,
      lat: Number(row.lat),
      lng: Number(row.lng),
    };
    if (!houseNeedsNeighborhoodBackfill(house, mode)) continue;
    const to = neighborhoodCalculatedLegacy(house);
    if (house.neighborhood === to) continue;
    changed += 1;
    console.log(
      doc.id,
      house.address,
      "from",
      house.neighborhood ?? "(missing)",
      "→",
      to ?? "אחר",
    );
    if (!dryRun) {
      await doc.ref.set({ neighborhood: to, updatedAt: now }, { merge: true });
    }
  }
  console.log(
    dryRun
      ? `[dry run] would update ${changed} house(s) (mode=${mode})`
      : `updated ${changed} house(s) (mode=${mode})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
