import { NextResponse } from "next/server";
import {
  govNeighborhoodDataAvailable,
  loadGovNeighborhoodById,
} from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!govNeighborhoodDataAvailable()) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_data",
        message: "public/data/geojson (or .gz) is required for neighborhood map polygons.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ids_required" }, { status: 400 });
  }

  const features = ids
    .map((id) => {
      const feature = loadGovNeighborhoodById(id);
      if (!feature) return null;
      return {
        type: "Feature" as const,
        properties: {
          ...(feature.properties ?? {}),
          id,
          source: "govmap-shchunot",
        },
        geometry: feature.geometry,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    ok: true,
    type: "FeatureCollection",
    features,
  });
}
