#!/usr/bin/env node
/**
 * Import house data into Firestore from seed.json, a local db file, or Vercel Blob.
 *
 * Env (one of):
 *   FIREBASE_SERVICE_ACCOUNT_JSON — full service account JSON string
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * Optional:
 *   FIRESTORE_NEIGHBORHOOD_ID — defaults to "default"
 *   MIGRATE_SOURCE — path to db JSON (default: data/seed.json)
 *   BLOB_READ_WRITE_TOKEN / BLOB_STORE_ID — read db from Blob when local file missing
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { get as getBlob } from "@vercel/blob";

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

function pushEndpointDocId(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 40);
}

function asCatalog(db, neighborhood) {
  const houses = (db.houses ?? [])
    .filter((h) => h.status === "approved" || !h.status)
    .map((h) => {
      const { editCode, rejectionReason, ...rest } = h;
      return rest;
    });
  return {
    updatedAt: db.updatedAt ?? new Date().toISOString(),
    neighborhood,
    houses,
    pushTemplates: db.pushSettings?.templates ?? {},
  };
}

async function loadSource() {
  const source = process.env.MIGRATE_SOURCE?.trim() || join(root, "data", "seed.json");
  if (existsSync(source)) {
    console.log(`Reading ${source}`);
    return JSON.parse(readFileSync(source, "utf8"));
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (token || storeId) {
    console.log("Reading halloween-houses/db.json from Vercel Blob");
    const result = await getBlob("halloween-houses/db.json", {
      ...(token ? { token } : {}),
      ...(storeId ? { storeId } : {}),
    });
    if (!result?.downloadUrl) throw new Error("Blob db.json not found");
    const text = await fetch(result.downloadUrl).then((r) => r.text());
    return JSON.parse(text);
  }
  throw new Error(`No source at ${source} and Blob not configured`);
}

async function main() {
  const account = parseServiceAccount();
  if (!getApps().length) initializeApp({ credential: cert(account) });
  const db = getFirestore();
  const nId = neighborhoodId();
  const rootRef = db.collection("neighborhoods").doc(nId);
  const housesCol = rootRef.collection("houses");
  const data = await loadSource();
  const neighborhood =
    process.env.NEXT_PUBLIC_NEIGHBORHOOD_NAME?.trim() ||
    "שיכון ותיקים · חרוזים · נחלת גנים";
  const catalog = asCatalog(data, neighborhood);

  const houses = data.houses ?? [];
  console.log(`Writing ${houses.length} houses to neighborhoods/${nId}/houses`);
  for (let i = 0; i < houses.length; i += 400) {
    const batch = db.batch();
    for (const house of houses.slice(i, i + 400)) {
      const id = String(house.id ?? "").trim();
      if (!id) continue;
      batch.set(housesCol.doc(id), { ...house, id, storeId: id }, { merge: true });
    }
    await batch.commit();
  }

  await rootRef.collection("meta").doc("catalog").set(catalog, { merge: false });
  if (data.pushSettings?.templates) {
    await rootRef.collection("meta").doc("pushSettings").set(data.pushSettings, { merge: true });
  }
  if (data.vapid?.publicKey && data.vapid?.privateKey) {
    await rootRef.collection("meta").doc("vapid").set(data.vapid, { merge: true });
  }

  const subs = data.pushSubscriptions ?? [];
  if (subs.length) {
    const col = rootRef.collection("pushSubscriptions");
    const batch = db.batch();
    for (const sub of subs) {
      if (!sub?.endpoint) continue;
      batch.set(col.doc(pushEndpointDocId(sub.endpoint)), sub, { merge: true });
    }
    await batch.commit();
    console.log(`Wrote ${subs.length} push subscriptions`);
  }

  console.log(`Done. Catalog has ${catalog.houses.length} public houses.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
