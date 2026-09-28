#!/usr/bin/env node
/**
 * Fix stored neighborhood when the pin is inside a different event zone
 * (e.g. Gefen houses saved as נחלת גנים before zone/footprint fixes).
 *
 *   DRY_RUN=1 node scripts/reconcile-house-neighborhoods.mjs
 *   node scripts/reconcile-house-neighborhoods.mjs
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

async function loadResolveNeighborhood() {
  const mod = await import(pathToFileURL(join(root, "src/lib/config.ts")).href);
  return mod.resolveNeighborhood;
}

async function main() {
  const resolveNeighborhood = await loadResolveNeighborhood();
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
    const before = row.neighborhood ?? null;
    const next = resolveNeighborhood({
      address: String(row.address ?? ""),
      neighborhood: before,
      lat: Number(row.lat),
      lng: Number(row.lng),
    });
    if (!next || next === before) continue;
    changed += 1;
    console.log(doc.id, row.address, `${before ?? "∅"} → ${next}`);
    if (!dryRun) {
      await doc.ref.set({ neighborhood: next, updatedAt: now }, { merge: true });
    }
  }
  console.log(
    dryRun ? `[dry run] would update ${changed} house(s)` : `updated ${changed} house(s)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
