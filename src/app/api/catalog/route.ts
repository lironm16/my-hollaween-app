import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getCatalog } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const catalog = await getCatalog();
  const seconds = config.catalogCacheSeconds;
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (seconds > 0) {
    const value = `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 10}`;
    headers.set("Cache-Control", value);
    headers.set("CDN-Cache-Control", value);
  } else {
    headers.set("Cache-Control", "no-store");
  }
  return NextResponse.json(catalog, { headers });
}
