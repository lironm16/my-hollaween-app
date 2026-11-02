import { NextResponse } from "next/server";
import { parseZoneKey, type EventBoundaryZone } from "@/lib/event-boundary";
import { cityBoundaryPolygon, streetBoundaryPolygon } from "@/lib/event-boundary-nominatim.server";
import { loadGovNeighborhoodById } from "@/lib/gov-neighborhoods/load.server";

export const runtime = "nodejs";

type Body = { zones?: EventBoundaryZone[] };

type ResolvedGeom = GeoJSON.Polygon | GeoJSON.MultiPolygon;

function isAreaGeom(g: GeoJSON.Geometry | undefined): g is ResolvedGeom {
  return g?.type === "Polygon" || g?.type === "MultiPolygon";
}

async function resolveZoneGeometry(
  zone: EventBoundaryZone,
): Promise<{ geometry: ResolvedGeom; source: string } | null> {
  const parsed = parseZoneKey(zone.id);
  const kind = parsed?.kind ?? zone.kind;

  if (kind === "neighborhood") {
    const govId = parsed?.rest ?? zone.id.replace(/^n:/, "");
    const f = loadGovNeighborhoodById(govId);
    if (!f?.geometry || !isAreaGeom(f.geometry)) return null;
    return { geometry: f.geometry, source: "govmap-shchunot" };
  }

  if (kind === "city") {
    const city = zone.city ?? parsed?.rest ?? zone.label;
    const geom = await cityBoundaryPolygon(city);
    if (!geom || !isAreaGeom(geom)) return null;
    return { geometry: geom, source: "osm-nominatim" };
  }

  return null;
}

function zoneClipCandidates(
  streetZone: EventBoundaryZone,
  zones: EventBoundaryZone[],
  resolved: Map<string, ResolvedGeom>,
): ResolvedGeom[] {
  const clips: ResolvedGeom[] = [];
  const streetCity = (streetZone.city ?? "").trim();
  for (const z of zones) {
    if (z.id === streetZone.id || z.kind === "street") continue;
    const geom = resolved.get(z.id);
    if (!geom) continue;
    if (z.kind === "neighborhood") {
      if (!streetCity || !z.city || z.city.includes(streetCity) || streetCity.includes(z.city)) {
        clips.push(geom);
      }
      continue;
    }
    if (z.kind === "city") {
      const cityLabel = (z.city ?? z.label).trim();
      if (!streetCity || cityLabel.includes(streetCity) || streetCity.includes(cityLabel)) {
        clips.push(geom);
      }
    }
  }
  return clips;
}

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

  const resolved = new Map<string, ResolvedGeom>();
  const features: GeoJSON.Feature[] = [];

  for (const zone of zones) {
    const parsed = parseZoneKey(zone.id);
    const kind = parsed?.kind ?? zone.kind;
    if (kind === "street") continue;

    try {
      const row = await resolveZoneGeometry(zone);
      if (!row) continue;
      resolved.set(zone.id, row.geometry);
      features.push({
        type: "Feature",
        properties: {
          id: zone.id,
          kind: zone.kind,
          label: zone.label,
          city: zone.city,
          source: row.source,
        },
        geometry: row.geometry,
      });
    } catch {
      // skip zone on errors
    }
  }

  for (const zone of zones) {
    const parsed = parseZoneKey(zone.id);
    const kind = parsed?.kind ?? zone.kind;
    if (kind !== "street") continue;

    try {
      const rest = parsed?.rest ?? "";
      const [cityPart, streetPart] = rest.includes("|") ? rest.split("|") : [zone.city ?? "", zone.label];
      const zoneClips = zoneClipCandidates(zone, zones, resolved);
      const geom = await streetBoundaryPolygon(cityPart, streetPart, {
        zoneClips: zoneClips.length ? zoneClips : undefined,
        cityClip: zoneClips.length ? null : undefined,
      });
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
