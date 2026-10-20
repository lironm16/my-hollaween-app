import { NextResponse } from "next/server";
import {
  buildGovNeighborhoodCatalog,
  govNeighborhoodDataAvailable,
  loadGovNeighborhoodCatalogFromDisk,
  searchCatalog,
} from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  if (!govNeighborhoodDataAvailable()) {
    const onDisk = loadGovNeighborhoodCatalogFromDisk();
    if (!onDisk) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_data",
          message:
            "Place gov-neighborhoods.geojson.gz in public/data/ and run npm run gov-neighborhoods:index (see public/data/README.md).",
        },
        { status: 503 },
      );
    }
    const entries = searchCatalog(onDisk, { city, q, limit });
    return NextResponse.json({
      ok: true,
      catalogOnly: true,
      featureCount: onDisk.featureCount,
      entries,
    });
  }

  try {
    const catalog = loadGovNeighborhoodCatalogFromDisk() ?? buildGovNeighborhoodCatalog();
    const entries = searchCatalog(catalog, { city, q, limit });
    return NextResponse.json({
      ok: true,
      catalogOnly: true,
      featureCount: catalog.featureCount,
      entries,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "load_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
