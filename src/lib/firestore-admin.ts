import { createHash } from "node:crypto";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | null = null;

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

export function firestoreConfigured() {
  return parseServiceAccount() !== null;
}

export function neighborhoodDocId() {
  return process.env.FIRESTORE_NEIGHBORHOOD_ID?.trim() || "default";
}

export function getAdminFirestore(): Firestore {
  if (firestore) return firestore;
  const account = parseServiceAccount();
  if (!account) {
    throw new Error("FIRESTORE_NOT_CONFIGURED");
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(account) });
  }
  firestore = getFirestore();
  return firestore;
}

export function neighborhoodRoot() {
  return getAdminFirestore().collection("neighborhoods").doc(neighborhoodDocId());
}

export function housesCollection() {
  return neighborhoodRoot().collection("houses");
}

export function pushSubscriptionsCollection() {
  return neighborhoodRoot().collection("pushSubscriptions");
}

export function metaDoc(name: "catalog" | "pushSettings" | "vapid") {
  return neighborhoodRoot().collection("meta").doc(name);
}

export function pushEndpointDocId(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 40);
}
