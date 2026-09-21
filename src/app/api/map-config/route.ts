import { NextResponse } from "next/server";
import {
  CARTO_VOYAGER_TEMPLATE,
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

function probeReferer() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://my-hollaween-app.vercel.app";
}

/** Real neighborhood tile — empty-ocean probes falsely fail key validation. */
const PROBE_TILE = "https://a.basemaps.cartocdn.com/rastertiles/voyager/16/39105/26593.png";

async function keyProbeOk(key: string) {
  const probe = cartoTileUrlWithKey(PROBE_TILE, key);
  try {
    const res = await fetch(probe, {
      method: "GET",
      headers: {
        Range: "bytes=0-511",
        Referer: `${probeReferer()}/`,
      },
      cache: "no-store",
    });
    const buf = await res.arrayBuffer();
    return res.ok && cartoTileLooksValid(buf.byteLength);
  } catch {
    return false;
  }
}

export async function GET() {
  const key = readCartoKey();
  const keyConfigured = key.length > 0;
  // Domain-restricted keys fail server probes without Referer — always pass key to the browser when configured.
  const keyActive = keyConfigured ? await keyProbeOk(key) : false;
  const activeKey = keyConfigured ? key : null;

  return NextResponse.json(
    {
      tiles: {
        url: cartoTileUrlWithKey(CARTO_VOYAGER_TEMPLATE, activeKey),
        subdomains: "abcd",
        invert: false,
        maxNativeZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      keyConfigured,
      keyActive,
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    },
  );
}
