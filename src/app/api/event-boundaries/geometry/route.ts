import { NextResponse } from "next/server";
import { parseZoneKey, type EventBoundaryZone } from "@/lib/event-boundary";
import { cityBoundaryPolygon, streetBoundaryPolygon } from "@/lib/event-boundary-nominatim.server";
import { loadGovNeighborhoodById } from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

type Body = { zones?: EventBoundaryZone[] };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const zones = body.zones?.slice(0, 100) ?? [];
  if (zones.length === 0) {
    return NextResponse.json({ ok: true, type: "FeatureCollection", features: [] });
  }

  const features: GeoJSON.Feature[] = [];

  for (const zone of zones) {
    const parsed = parseZoneKey(zone.id);
    const kind = parsed?.kind ?? zone.kind;

    try {
      if (kind === "neighborhood") {
        const govId = parsed?.rest ?? zone.id.replace(/^n:/, "");
        const f = loadGovNeighborhoodById(govId);
        if (!f) continue;
        features.push({
          type: "Feature",
          properties: {
            id: zone.id,
            kind: zone.kind,
            label: zone.label,
            city: zone.city,
            source: "govmap-shchunot",
          },
          geometry: f.geometry,
        });
        continue;
      }

      if (kind === "city") {
        const city = zone.city ?? parsed?.rest ?? zone.label;
        const geom = await cityBoundaryPolygon(city);
        if (!geom) continue;
        features.push({
          type: "Feature",
          properties: {
            id: zone.id,
            kind: zone.kind,
            label: zone.label,
            city: zone.city,
            source: "osm-nominatim",
          },
          geometry: geom,
        });
        continue;
      }

      if (kind === "street") {
        const rest = parsed?.rest ?? "";
        const [cityPart, streetPart] = rest.includes("|") ? rest.split("|") : [zone.city ?? "", zone.label];
        const geom = await streetBoundaryPolygon(cityPart, streetPart);
        if (!geom) continue;
        features.push({
          type: "Feature",
          properties: {
            id: zone.id,
            kind: zone.kind,
            label: zone.label,
            city: zone.city,
            source: "osm-nominatim-buffer",
          },
          geometry: geom,
        });
      }
    } catch {
      // skip zone on nominatim errors
    }
  }

  return NextResponse.json({
    ok: true,
    type: "FeatureCollection",
    features,
  });
}
