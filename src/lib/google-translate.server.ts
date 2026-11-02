/** Google Cloud Translation API v2 (shared server helper). */
export async function googleTranslateTexts(
  texts: string[],
  target: "en" | "he",
  apiKey: string,
): Promise<string[]> {
  if (texts.length === 0) return [];
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, target, format: "text" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`translate_http_${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  const out = json.data?.translations?.map((row) => row.translatedText ?? "") ?? [];
  if (out.length !== texts.length) throw new Error("translate_length_mismatch");
  return out.map((value, i) => value.trim() || texts[i]!);
}

export function googleTranslateConfigured() {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY?.trim());
}

export function googleTranslateApiKey() {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!key) throw new Error("missing_google_translate_api_key");
  return key;
}
