const CACHE_KEY = "hw-user-content-translate-cache-v1";
const MAX_ENTRIES = 400;

type CacheMap = Record<string, string>;

function cacheKey(source: string, target: string) {
  return `${target}\0${source}`;
}

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

export function readCachedUserTranslation(source: string, target: string): string | null {
  const hit = readCache()[cacheKey(source, target)];
  return typeof hit === "string" ? hit : null;
}

export function writeCachedUserTranslation(source: string, target: string, translated: string) {
  const map = readCache();
  map[cacheKey(source, target)] = translated;
  writeCache(map);
}
