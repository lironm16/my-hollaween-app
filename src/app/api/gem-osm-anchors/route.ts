import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { GemOsmAnchorEntry, GemOsmAnchorFile } from "@/lib/gem-osm-anchor-data";
import { sidewalkGemAnchorForHouse } from "@/lib/gem-street-spines";
import { gemHuntMapHouses } from "@/lib/gem-monsters";
import { snapHousesToWalkNetwork } from "@/lib/gem-osrm-snap";
import { getCatalog } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readStaticAnchors(): Record<string, GemOsmAnchorEntry> {
  try {
    const raw = readFileSync(join(process.cwd(), "public/gem-osm-anchors.json"), "utf8");
    const parsed = JSON.parse(raw) as GemOsmAnchorFile;
    if (parsed?.version === 1 && parsed.anchors) return parsed.anchors;
  } catch {
    /* dev */
  }
  return {};
}

/**
 * Fast sidewalk anchors for every gem-eligible house (street spines + static seed file).
 * OSRM refinement runs client-side via /api/gem-snap in small batches.
 */
export async function GET() {
  const catalog = await getCatalog();
  const eligible = gemHuntMapHouses(catalog.houses, "real");
  const staticAnchors = readStaticAnchors();
  const anchors: Record<string, GemOsmAnchorEntry> = {};

  for (const house of eligible) {
    const seeded = staticAnchors[house.id];
    if (seeded) {
      anchors[house.id] = seeded;
      continue;
    }
    const spine = sidewalkGemAnchorForHouse(house);
    if (spine) anchors[house.id] = spine;
  }

  const needOsrm = eligible.filter((house) => !anchors[house.id]);
  if (needOsrm.length > 0) {
    const snaps = await snapHousesToWalkNetwork(needOsrm, { gapMs: 60, concurrency: 4 });
    for (const [houseId, snap] of Object.entries(snaps)) {
      anchors[houseId] = snap;
    }
  }

  const body: GemOsmAnchorFile = {
    version: 1,
    generatedAt: catalog.updatedAt ?? new Date().toISOString(),
    anchors,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
  });
}
