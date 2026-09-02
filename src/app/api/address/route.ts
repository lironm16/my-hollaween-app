import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { reverseAddress, searchAddress } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!rateLimit(`geo:${clientKey(request.headers)}`, 40, 60 * 1000)) {
    return NextResponse.json({ error: "יותר מדי חיפושי כתובת. נסו שוב בעוד רגע." }, { status: 429 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  try {
    if (Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has("lat")) {
      const hit = await reverseAddress(lat, lng);
      return NextResponse.json({ hit });
    }
    if (q.length < 2) {
      return NextResponse.json({ hits: [] });
    }
    const hits = await searchAddress(q);
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לחפש כתובות עכשיו. נסו שוב." },
      { status: 503 },
    );
  }
}
