import { createHash } from "node:crypto";
import { cert, getApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | null = null;
let resolvePromise: Promise<Firestore> | null = null;

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      return null;
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

function ensureFirebaseApp() {
  const account = parseServiceAccount();
  if (!account) {
    throw new Error("FIRESTORE_NOT_CONFIGURED");
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(account) });
  }
}

function candidateDatabaseIds(): string[] {
  const explicit = process.env.FIRESTORE_DATABASE_ID?.trim();
  if (explicit) return [explicit];
  return ["(default)", "default"];
}

export function firestoreConfigured() {
  // Isolated API/E2E servers use DATA_DIR file storage — never touch production Firestore.
  if (process.env.DATA_DIR?.trim()) return false;
  return parseServiceAccount() !== null;
}

export function neighborhoodDocId() {
  return process.env.FIRESTORE_NEIGHBORHOOD_ID?.trim() || "default";
}

/** Firestore database id — set FIRESTORE_DATABASE_ID if auto-detect is wrong. */
export function firestoreDatabaseId() {
  return candidateDatabaseIds()[0];
}

function isNotFoundError(error: unknown) {
  const code = (error as { code?: number | string })?.code;
  return code === 5 || code === "not-found" || code === "NOT_FOUND";
}

async function probeDatabase(): Promise<Firestore> {
  ensureFirebaseApp();
  for (const id of candidateDatabaseIds()) {
    const db = getFirestore(getApp(), id);
    try {
      await db.collection("_hw_firestore_probe").limit(1).get();
      if (id !== candidateDatabaseIds()[0]) {
        console.info("[firestore] connected using database id", id);
      }
      firestore = db;
      return db;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
  }
  throw new Error("FIRESTORE_NOT_FOUND");
}

/** Resolve and cache the Firestore handle (tries `(default)` then `default`). */
export async function resolveAdminFirestore(): Promise<Firestore> {
  if (firestore) return firestore;
  if (!resolvePromise) resolvePromise = probeDatabase();
  return resolvePromise;
}

export function getAdminFirestore(): Firestore {
  if (firestore) return firestore;
  ensureFirebaseApp();
  firestore = getFirestore(getApp(), firestoreDatabaseId());
  return firestore;
}

export function neighborhoodRoot() {
  return getAdminFirestore().collection("neighborhoods").doc(neighborhoodDocId());
}

export function housesCollection() {
  return neighborhoodRoot().collection("houses");
}

export function removedHousesCollection() {
  return neighborhoodRoot().collection("removed");
}

export function pushSubscriptionsCollection() {
  return neighborhoodRoot().collection("pushSubscriptions");
}

export function metaDoc(name: "pushSettings" | "vapid" | "catalog" | "pushSubs" | "rehearsalStubs") {
  return neighborhoodRoot().collection("meta").doc(name);
}

export function pushEndpointDocId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 40);
}
