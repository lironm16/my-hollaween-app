import { NextResponse } from "next/server";
import { googleTranslateApiKey, googleTranslateTexts } from "@/lib/google-translate.server";
import { transliterateHebrewPersonName } from "@/lib/transliterate-hebrew-person-name";
import type { UserContentTranslatePurpose } from "@/lib/user-content-translate-purpose";

export const runtime = "nodejs";

type Body = {
  texts?: unknown;
  target?: unknown;
  purpose?: unknown;
};

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

  if (!process.env.GOOGLE_TRANSLATE_API_KEY?.trim()) {
    return NextResponse.json({ translations: texts, stub: true });
  }

  try {
    const translations = await googleTranslateTexts(texts, target, googleTranslateApiKey());
    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ translations: texts, stub: true });
  }
}
