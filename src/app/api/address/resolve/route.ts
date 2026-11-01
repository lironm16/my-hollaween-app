import { NextResponse } from "next/server";
import { prepareAddressHit } from "@/lib/address-fields";
import { enrichAddressHitBilingual } from "@/lib/geocode";
import { locationResolutionFromHit } from "@/lib/location-resolution";
import type { AddressHit } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AddressHit> & { query?: string };
    if (
      typeof body.lat !== "number" ||
      typeof body.lng !== "number" ||
      !Number.isFinite(body.lat) ||
      !Number.isFinite(body.lng) ||
      typeof body.id !== "string"
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const raw: AddressHit = {
      id: body.id,
      label: body.label ?? "",
      lat: body.lat,
      lng: body.lng,
      road: body.road ?? "",
      houseNumber: body.houseNumber,
      suburb: body.suburb,
      city: body.city ?? "רמת גן",
      precise: Boolean(body.precise),
      subtitle: body.subtitle,
    };
    const prepared = prepareAddressHit(raw, body.query ?? "") ?? raw;
    const enriched = await enrichAddressHitBilingual(prepared);
    const resolution = locationResolutionFromHit(enriched);
    return NextResponse.json({ hit: enriched, resolution });
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לאמת את הכתובת עכשיו. נסו שוב." },
      { status: 503 },
    );
  }
}
