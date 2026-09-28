import { NextResponse } from "next/server";
import {
  CARTO_VOYAGER_TEMPLATE,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_TEMPLATE,
  cartoTileLooksValid,
  cartoTileUrlWithKey,
} from "@/lib/carto-tiles";

export const runtime = "nodejs";

/** Short cache — key can change in Vercel without redeploy. */
const CACHE_SECONDS = 60;

function readCartoKey() {
  return (
    process.env.CARTO_BASEMAP_KEY?.trim() ||
    process.env.CARTO_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim() ||
    ""
  );
}

/** CARTO Referer allowlists usually name the public app host, not each Vercel deploy URL. */
function probeReferers() {
  const origins: string[] = [];
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) origins.push(explicit.replace(/\/$/, ""));
  origins.push("https://my-hollaween-app.vercel.app");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const deploy = `https://${vercel.replace(/^https?:\/\//, "")}`;
    if (!origins.includes(deploy)) origins.push(deploy);
  }
  return origins;
}

/** Real neighborhood tile — empty-ocean probes falsely fail key validation. */
const PROBE_TILE = "https://a.basemaps.cartocdn.com/rastertiles/voyager/16/39105/26593.png";

async function keyProbeOk(key: string) {
  const probe = cartoTileUrlWithKey(PROBE_TILE, key);
  for (const origin of probeReferers()) {
    try {
      const res = await fetch(probe, {
        method: "GET",
        headers: {
          Range: "bytes=0-511",
          Referer: `${origin}/`,
        },
        cache: "no-store",
      });
      const buf = await res.arrayBuffer();
      if (res.ok && cartoTileLooksValid(buf.byteLength)) return true;
    } catch {
      /* try next referer */
    }
  }
  return false;
}

export async function GET() {
  const key = readCartoKey();
  const keyConfigured = key.length > 0;
  const keyActive = keyConfigured ? await keyProbeOk(key) : false;
  const cartoAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Phones load tiles with the page Referer (my-hollaween-app…). Use CARTO whenever a key is set;
  // OSM is only when no key. keyActive is diagnostic (server probe may fail on deploy URLs).
  const tiles = keyConfigured
    ? {
        url: cartoTileUrlWithKey(CARTO_VOYAGER_TEMPLATE, key),
        subdomains: "abcd",
        invert: false as const,
        maxNativeZoom: 18,
        attribution: cartoAttribution,
      }
    : {
        url: OSM_TILE_TEMPLATE,
        subdomains: "abc",
        invert: false as const,
        maxNativeZoom: 19,
        attribution: OSM_TILE_ATTRIBUTION,
      };

  return NextResponse.json(
    {
      tiles,
      keyConfigured,
      keyActive,
      basemap: keyConfigured ? ("carto" as const) : ("osm" as const),
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    },
  );
}
