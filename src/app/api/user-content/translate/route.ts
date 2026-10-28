import { NextResponse } from "next/server";
import { transliterateHebrewPersonName } from "@/lib/transliterate-hebrew-person-name";
import type { UserContentTranslatePurpose } from "@/lib/user-content-translate-purpose";

export const runtime = "nodejs";

type Body = {
  texts?: unknown;
  target?: unknown;
  purpose?: unknown;
};

async function googleTranslate(texts: string[], target: string, apiKey: string): Promise<string[]> {
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, target, format: "text" }),
  });
  if (!res.ok) {
    throw new Error(`translate HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  const out = json.data?.translations?.map((row) => row.translatedText ?? "") ?? [];
  if (out.length !== texts.length) throw new Error("translate length mismatch");
  return out.map((value, i) => value.trim() || texts[i]!);
}

function parsePurpose(value: unknown): UserContentTranslatePurpose {
  return value === "proper_name" ? "proper_name" : "prose";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const texts = Array.isArray(body.texts)
    ? body.texts.filter((item): item is string => typeof item === "string").slice(0, 32)
    : [];
  const target = body.target === "en" ? "en" : "en";
  const purpose = parsePurpose(body.purpose);

  if (texts.length === 0) {
    return NextResponse.json({ translations: [] });
  }

  if (purpose === "proper_name") {
    return NextResponse.json({
      translations: texts.map((text) => transliterateHebrewPersonName(text)),
    });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ translations: texts, stub: true });
  }

  try {
    const translations = await googleTranslate(texts, target, apiKey);
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ translations: texts, stub: true });
  }
}
