import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getCatalog, getCatalogDelta } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since")?.trim();
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");

  if (since) {
    headers.set("Cache-Control", "no-store");
    const delta = await getCatalogDelta(since);
    return NextResponse.json(delta, { headers });
  }

  const catalog = await getCatalog();
  const seconds = config.catalogCacheSeconds;
  if (seconds > 0) {
    const value = `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 10}`;
    headers.set("Cache-Control", value);
    headers.set("CDN-Cache-Control", value);
  } else {
    headers.set("Cache-Control", "no-store");
  }
  return NextResponse.json(catalog, { headers });
}
