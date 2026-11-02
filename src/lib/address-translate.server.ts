import { createHash } from "node:crypto";
import { googleTranslateApiKey, googleTranslateConfigured, googleTranslateTexts } from "@/lib/google-translate.server";
import { addressTranslationsCollection, firestoreConfigured } from "@/lib/firestore-admin";

export type AddressLanguagePair = {
  he: string;
  en: string;
};

const memCache = new Map<string, AddressLanguagePair>();

function normalizeAddressKey(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function cacheKey(text: string) {
  return createHash("sha256").update(normalizeAddressKey(text)).digest("hex");
}

function hebrewRatio(text: string) {
  const letters = text.match(/[\u0590-\u05FFA-Za-z]/g) ?? [];
  if (letters.length === 0) return 0;
  const he = letters.filter((c) => /[\u0590-\u05FF]/.test(c)).length;
  return he / letters.length;
}

async function readCachedPair(key: string): Promise<AddressLanguagePair | null> {
  const hit = memCache.get(key);
  if (hit) return hit;
  if (!firestoreConfigured()) return null;
  try {
    const snap = await addressTranslationsCollection().doc(key).get();
    if (!snap.exists) return null;
    const data = snap.data() as { he?: string; en?: string };
    if (!data.he?.trim() || !data.en?.trim()) return null;
    const pair = { he: data.he.trim(), en: data.en.trim() };
    memCache.set(key, pair);
    return pair;
  } catch {
    return null;
  }
}

async function writeCachedPair(key: string, pair: AddressLanguagePair, source: string) {
  memCache.set(key, pair);
  if (!firestoreConfigured()) return;
  try {
    await addressTranslationsCollection().doc(key).set(
      {
        he: pair.he,
        en: pair.en,
        source: source.slice(0, 500),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Catalog still works without the mapping row.
  }
}

/** Hebrew ↔ English address pair; cached in Firestore + memory (forward-only writes). */
export async function resolveAddressLanguagePair(input: string): Promise<AddressLanguagePair | null> {
  const source = normalizeAddressKey(input);
  if (source.length < 2) return null;

  const key = cacheKey(source);
  const cached = await readCachedPair(key);
  if (cached) return cached;

  if (!googleTranslateConfigured()) return null;

  const ratio = hebrewRatio(source);
  const primaryHe = ratio >= 0.35;
  try {
    const apiKey = googleTranslateApiKey();
    if (primaryHe) {
      const [en] = await googleTranslateTexts([source], "en", apiKey);
      const pair = { he: source, en: en || source };
      await writeCachedPair(key, pair, source);
      return pair;
    }
    const [he] = await googleTranslateTexts([source], "he", apiKey);
    const pair = { he: he || source, en: source };
    await writeCachedPair(key, pair, source);
    return pair;
  } catch {
    return null;
  }
}
