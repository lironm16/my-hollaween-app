import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { GemOsmAnchorFile } from "@/lib/gem-osm-anchor-data";
import { snapHousesToWalkNetwork } from "@/lib/gem-osrm-snap";
import { getCatalog } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = {
  catalogUpdatedAt: string;
  body: GemOsmAnchorFile;
};

let memoryCache: CacheEntry | null = null;

function readStaticAnchors(): GemOsmAnchorFile {
  try {
    const raw = readFileSync(join(process.cwd(), "public/gem-osm-anchors.json"), "utf8");
    const parsed = JSON.parse(raw) as GemOsmAnchorFile;
    if (parsed?.version === 1 && parsed.anchors) return parsed;
  } catch {
    /* missing on dev */
  }
  return { version: 1, generatedAt: "", anchors: {} };
}

/** Live catalog houses + OSRM snap (static file only has seed ids). */
export async function GET() {
  const catalog = await getCatalog();
  const catalogUpdatedAt = catalog.updatedAt ?? "";
  if (memoryCache && memoryCache.catalogUpdatedAt === catalogUpdatedAt) {
    return NextResponse.json(memoryCache.body, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
    });
  }

  const staticFile = readStaticAnchors();
  const merged: GemOsmAnchorFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    anchors: { ...staticFile.anchors },
  };

  const missing = catalog.houses.filter(
    (h) =>
      h?.id &&
      Number.isFinite(h.lat) &&
      Number.isFinite(h.lng) &&
      !merged.anchors[h.id],
  );

  if (missing.length > 0) {
    const snapped = await snapHousesToWalkNetwork(
      missing.map((h) => ({ id: h.id, lat: h.lat, lng: h.lng })),
    );
    Object.assign(merged.anchors, snapped);
  }

  memoryCache = { catalogUpdatedAt, body: merged };
  return NextResponse.json(merged, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
  });
}
