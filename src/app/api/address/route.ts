import { NextResponse } from "next/server";
import { reverseAddress, searchAddress } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
