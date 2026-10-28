import {
  readCachedUserTranslation,
  writeCachedUserTranslation,
} from "@/lib/user-content-translate-cache";
import type { UserContentTranslatePurpose } from "@/lib/user-content-translate-purpose";
import { userContentTranslateCacheKey } from "@/lib/user-content-translate-purpose";

const inflight = new Map<string, Promise<string>>();

async function fetchTranslation(
  source: string,
  target: string,
  purpose: UserContentTranslatePurpose,
): Promise<string> {
  const res = await fetch("/api/user-content/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: [source], target, purpose }),
  });
  if (!res.ok) return source;
  const data = (await res.json()) as { translations?: string[] };
  const translated = data.translations?.[0];
  return typeof translated === "string" && translated.trim() ? translated : source;
}

/** Translate neighbor-submitted text (cached on device). Falls back to source on error. */
export async function requestUserContentTranslation(
  source: string,
  target: "en",
  purpose: UserContentTranslatePurpose = "prose",
): Promise<string> {
  const trimmed = source.trim();
  if (!trimmed) return source;

  const cached = readCachedUserTranslation(trimmed, target, purpose);
  if (cached) return cached;

  const key = userContentTranslateCacheKey(trimmed, target, purpose);
  const pending = inflight.get(key);
  if (pending) return pending;

  const work = fetchTranslation(trimmed, target, purpose)
    .then((translated) => {
      writeCachedUserTranslation(trimmed, target, translated, purpose);
      return translated;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, work);
  return work;
}
