import {
  userContentTranslateCacheKey,
  type UserContentTranslatePurpose,
} from "@/lib/user-content-translate-purpose";

const CACHE_KEY = "hw-user-content-translate-cache-v2";
const MAX_ENTRIES = 400;

type CacheMap = Record<string, string>;

function readCache(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap) {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const trimmed: CacheMap = {};
      for (const key of keys.slice(-MAX_ENTRIES)) trimmed[key] = map[key]!;
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function readCachedUserTranslation(
  source: string,
  target: string,
  purpose: UserContentTranslatePurpose = "prose",
): string | null {
  const hit = readCache()[userContentTranslateCacheKey(source, target, purpose)];
  return typeof hit === "string" ? hit : null;
}

export function writeCachedUserTranslation(
  source: string,
  target: string,
  translated: string,
  purpose: UserContentTranslatePurpose = "prose",
) {
  const map = readCache();
  map[userContentTranslateCacheKey(source, target, purpose)] = translated;
  writeCache(map);
}
