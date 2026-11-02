import { NextResponse } from "next/server";
import { searchPreparedAddresses } from "@/lib/address-fields";
import { googlePlacesConfigured, googlePlacesTrySearch } from "@/lib/google-places.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ ok: true, q, google: null, current: [] });
  }

  let current: Awaited<ReturnType<typeof searchPreparedAddresses>> = [];
  try {
    current = await searchPreparedAddresses(q);
  } catch {
    current = [];
  }

  if (!googlePlacesConfigured()) {
    return NextResponse.json({
      ok: true,
      q,
      google: { configured: false as const, message: "Set GOOGLE_MAPS_API_KEY on the server (Places API + Geocoding enabled)." },
      current: current.map((h) => ({
        id: h.id,
        label: h.label,
        subtitle: h.subtitle,
        lat: h.lat,
        lng: h.lng,
        precise: h.precise,
      })),
    });
  }

  try {
    const google = await googlePlacesTrySearch(q);
    return NextResponse.json({
      ok: true,
      q,
      google,
      current: current.map((h) => ({
        id: h.id,
        label: h.label,
        subtitle: h.subtitle,
        lat: h.lat,
        lng: h.lng,
        precise: h.precise,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "google_error";
    return NextResponse.json(
      {
        ok: false,
        q,
        error: message,
        current: current.map((h) => ({
          id: h.id,
          label: h.label,
          subtitle: h.subtitle,
          lat: h.lat,
          lng: h.lng,
          precise: h.precise,
        })),
      },
      { status: 502 },
    );
  }
}
