import { NextResponse } from "next/server";
import { effectiveCatalogPollSeconds } from "@/lib/catalog-poll";
import { config } from "@/lib/config";
import { normalizeCatalogDelta } from "@/lib/catalog-sync";
import { nightPassCatalog } from "@/lib/night-pass-catalog";
import { PUBLIC_NIGHT_PASS_SCOPE } from "@/lib/night-pass-scope";
import { readNightPassSettings } from "@/lib/night-pass-store";
import { getCatalog, getCatalogDelta } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withPollSeconds<T extends object>(body: T) {
  return { ...body, pollSeconds: effectiveCatalogPollSeconds() };
}

/** Shared (CDN-cached) catalog. With night passes on it is always the unregistered-visitor view. */
export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since")?.trim();
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Catalog-Poll-Seconds", String(effectiveCatalogPollSeconds()));
  const nightPasses = (await readNightPassSettings()).enabled;

  if (since) {
    headers.set("Cache-Control", "no-store");
    const delta = nightPasses
      ? await nightPassCatalog(PUBLIC_NIGHT_PASS_SCOPE, since)
      : await getCatalogDelta(since);
    return NextResponse.json(withPollSeconds(normalizeCatalogDelta(delta)), { headers });
  }

  const catalog = normalizeCatalogDelta(
    nightPasses ? await nightPassCatalog(PUBLIC_NIGHT_PASS_SCOPE) : await getCatalog(),
  );
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
