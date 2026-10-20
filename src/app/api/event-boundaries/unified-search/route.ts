import { NextResponse } from "next/server";
import { unifiedBoundarySearch } from "@/lib/event-boundary-search.server";
import {
  buildGovNeighborhoodCatalog,
  govNeighborhoodDataAvailable,
  loadGovNeighborhoodCatalogFromDisk,
} from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "28");

  if (!q.trim()) {
    return NextResponse.json({ ok: true, hits: [] });
  }

  const catalog =
    loadGovNeighborhoodCatalogFromDisk() ??
    (govNeighborhoodDataAvailable() ? buildGovNeighborhoodCatalog() : null);

  if (!catalog) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_data",
        message: "Gov neighborhood catalog missing — add public/data/geojson and run gov-neighborhoods:index",
      },
      { status: 503 },
    );
  }

  const hits = await unifiedBoundarySearch(catalog, q, limit);
  return NextResponse.json({ ok: true, hits });
}
