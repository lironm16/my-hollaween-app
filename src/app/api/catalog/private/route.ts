import { NextResponse } from "next/server";
import { effectiveCatalogPollSeconds } from "@/lib/catalog-poll";
import { normalizeCatalogDelta } from "@/lib/catalog-sync";
import { nightPassCatalog } from "@/lib/night-pass-catalog";
import { readAsUserParam, resolveNightPassViewer } from "@/lib/night-pass-session";
import { getCatalog, getCatalogDelta } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-device catalog for pass holders, owners and admin — never CDN-cached.
 * `scope` in the body tells the client which audience the server saw (pass revoked → `public`).
 */
export async function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since")?.trim() || null;
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Catalog-Poll-Seconds": String(effectiveCatalogPollSeconds()),
  });
  const viewer = await resolveNightPassViewer({ asUser: readAsUserParam(request) });
  const body = viewer.scope
    ? await nightPassCatalog(viewer.scope, since)
    : since
      ? await getCatalogDelta(since)
      : await getCatalog();
  return NextResponse.json(
    { ...normalizeCatalogDelta(body), scope: viewer.viewer, pollSeconds: effectiveCatalogPollSeconds() },
    { headers },
  );
}
