import { cartoBasemapKey, cartoRasterTileUrl, parseTileCoord } from "@/lib/carto-basemap";

export const runtime = "edge";

const TILE_CACHE = "public, max-age=86400, s-maxage=15552000, stale-while-revalidate=86400";

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  if (!cartoBasemapKey()) {
    return new Response("Map tiles not configured", { status: 503 });
  }

  const zi = parseTileCoord(z);
  const xi = parseTileCoord(x);
  const yi = parseTileCoord(y);
  if (zi === null || xi === null || yi === null || zi > 20) {
    return new Response("Invalid tile coordinates", { status: 400 });
  }

  const themeParam = new URL(request.url).searchParams.get("theme");
  const theme = themeParam === "light" ? "light" : "dark";
  const upstream = cartoRasterTileUrl(String(zi), String(xi), String(yi), theme);
  if (!upstream) {
    return new Response("Map tiles not configured", { status: 503 });
  }

  const res = await fetch(upstream);
  if (!res.ok) {
    return new Response(null, { status: res.status });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": TILE_CACHE,
    },
  });
}
