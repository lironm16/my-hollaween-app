import { NextResponse } from "next/server";
import { prepareAddressHit, searchPreparedAddresses } from "@/lib/address-fields";
import { reverseAddress } from "@/lib/geocode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  try {
    if (Number.isFinite(lat) && Number.isFinite(lng) && url.searchParams.has("lat")) {
      const raw = await reverseAddress(lat, lng);
      const hit = raw ? prepareAddressHit(raw) : null;
      return NextResponse.json({ hit });
    }
    if (q.length < 2) {
      return NextResponse.json({ hits: [] });
    }
    const hits = await searchPreparedAddresses(q);
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לחפש כתובות עכשיו. נסו שוב." },
      { status: 503 },
    );
  }
}
