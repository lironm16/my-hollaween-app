import { NextResponse } from "next/server";
import {
  zoneKeyCity,
  zoneKeyNeighborhood,
  zoneKeyStreet,
  type BoundarySearchHit,
  type EventBoundaryKind,
} from "@/lib/event-boundary";
import { searchStreets } from "@/lib/event-boundary-nominatim.server";
import {
  buildGovNeighborhoodCatalog,
  govNeighborhoodDataAvailable,
  loadGovNeighborhoodCatalogFromDisk,
  searchCatalog,
  uniqueCitiesFromCatalog,
} from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "neighborhood") as EventBoundaryKind;
  const city = searchParams.get("city") ?? "";
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "80");

  if (!["city", "neighborhood", "street"].includes(kind)) {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  if (kind === "street") {
    if (!city.trim()) {
      return NextResponse.json({ ok: false, error: "city_required" }, { status: 400 });
    }
    try {
      const streets = await searchStreets(city, q, limit);
      const hits: BoundarySearchHit[] = streets.map((s) => ({
        kind: "street",
        id: zoneKeyStreet(city, s.street),
        label: s.street,
        city,
        subtitle: city,
      }));
      return NextResponse.json({ ok: true, hits });
    } catch {
      return NextResponse.json({ ok: false, error: "nominatim_unavailable" }, { status: 503 });
    }
  }

  const catalog =
    loadGovNeighborhoodCatalogFromDisk() ??
    (govNeighborhoodDataAvailable() ? buildGovNeighborhoodCatalog() : null);

  if (!catalog) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_data",
        message: "Gov neighborhood catalog missing — add gov-neighborhoods.geojson.gz and run npm run gov-neighborhoods:index",
      },
      { status: 503 },
    );
  }

  if (kind === "city") {
    const cities = uniqueCitiesFromCatalog(catalog, q, limit);
    const hits: BoundarySearchHit[] = cities.map((c) => ({
      kind: "city",
      id: zoneKeyCity(c),
      label: c,
      city: c,
    }));
    return NextResponse.json({ ok: true, hits });
  }

  const entries = searchCatalog(catalog, { city: city || undefined, q: q || undefined, limit });
  const hits: BoundarySearchHit[] = entries.map((e) => ({
    kind: "neighborhood",
    id: zoneKeyNeighborhood(e.id),
    label: e.name,
    city: e.city,
    subtitle: e.city,
  }));
  return NextResponse.json({ ok: true, hits });
}
