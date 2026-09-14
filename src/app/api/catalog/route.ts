import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { touchPresence } from "@/lib/presence-store";
import { getCatalog, getCatalogDelta } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withPollSeconds<T extends object>(body: T) {
  return { ...body, pollSeconds: config.catalogPollSeconds };
}

export async function GET(request: Request) {
  const deviceId = request.headers.get("x-hw-device-id")?.trim() ?? "";
  if (deviceId) touchPresence(deviceId);

  const since = new URL(request.url).searchParams.get("since")?.trim();
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Catalog-Poll-Seconds", String(config.catalogPollSeconds));

  if (since) {
    headers.set("Cache-Control", "no-store");
    const delta = await getCatalogDelta(since);
    return NextResponse.json(withPollSeconds(delta), { headers });
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
  return NextResponse.json(withPollSeconds(catalog), { headers });
}
