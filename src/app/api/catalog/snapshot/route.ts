import { NextResponse } from "next/server";
import { readSharedCatalogSnapshot } from "@/lib/catalog-cache";
import { nightPassCatalog } from "@/lib/night-pass-catalog";
import { PUBLIC_NIGHT_PASS_SCOPE } from "@/lib/night-pass-scope";
import { readNightPassSettings } from "@/lib/night-pass-store";

export const runtime = "nodejs";

const CACHE = "public, max-age=120, s-maxage=300, stale-while-revalidate=1800";

/** Live catalog snapshot — Blob-backed with static fallback (#4). */
export async function GET() {
  if ((await readNightPassSettings()).enabled) {
    return NextResponse.json(await nightPassCatalog(PUBLIC_NIGHT_PASS_SCOPE), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": CACHE },
    });
  }
  const snap = await readSharedCatalogSnapshot();
  if (!snap?.catalog) {
    return NextResponse.json({ error: "snapshot unavailable" }, { status: 503 });
  }
  return NextResponse.json(snap.catalog, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE,
    },
  });
}
