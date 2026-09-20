import { NextResponse } from "next/server";
import { readSharedCatalogSnapshot } from "@/lib/catalog-cache";

export const runtime = "nodejs";

/** Live catalog snapshot — Blob-backed with static fallback (#4). */
export async function GET() {
  const snap = await readSharedCatalogSnapshot();
  if (!snap?.catalog) {
    return NextResponse.json({ error: "snapshot unavailable" }, { status: 503 });
  }
  return NextResponse.json(snap.catalog, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=1800",
    },
  });
}
