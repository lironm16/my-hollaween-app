import { NextResponse } from "next/server";
import {
  CARTO_VOYAGER_TEMPLATE,
  cartoTileLooksValid,
  cartoTileUrlWithKey,
} from "@/lib/carto-tiles";

export const runtime = "nodejs";

const CACHE_SECONDS = 3600;

function readCartoKey() {
  return (
    process.env.CARTO_BASEMAP_KEY?.trim() ||
    process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim() ||
    ""
  );
}

async function keyWorks(key: string) {
  const probe = cartoTileUrlWithKey(
    "https://a.basemaps.cartocdn.com/rastertiles/voyager/16/48967/33567.png",
    key,
  );
  try {
    const res = await fetch(probe, { method: "HEAD", next: { revalidate: 3600 } });
    const len = Number(res.headers.get("content-length"));
    return res.ok && cartoTileLooksValid(Number.isFinite(len) ? len : null);
  } catch {
    return false;
  }
}

export async function GET() {
  const key = readCartoKey();
  const useKey = key ? await keyWorks(key) : false;
  const url = cartoTileUrlWithKey(CARTO_VOYAGER_TEMPLATE, useKey ? key : null);

  return NextResponse.json(
    {
      tiles: {
        url,
        subdomains: "abcd",
        invert: true,
        maxNativeZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    },
  );
}
