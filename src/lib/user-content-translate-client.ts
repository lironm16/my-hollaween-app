import {
  readCachedUserTranslation,
  writeCachedUserTranslation,
} from "@/lib/user-content-translate-cache";

const inflight = new Map<string, Promise<string>>();

async function fetchTranslation(source: string, target: string): Promise<string> {
  const res = await fetch("/api/user-content/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: [source], target }),
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
): Promise<string> {
  const trimmed = source.trim();
  if (!trimmed) return source;

  const cached = readCachedUserTranslation(trimmed, target);
  if (cached) return cached;

  const key = `${target}\0${trimmed}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const work = fetchTranslation(trimmed, target)
    .then((translated) => {
      writeCachedUserTranslation(trimmed, target, translated);
      return translated;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, work);
  return work;
}
