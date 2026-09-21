/**
 * Map tile cache helpers — loaded by /sw.js via importScripts.
 * Validates real PNG tiles (not CARTO watermark stubs) and bounds-checks zoom 14–18.
 */
var MapTileCache = (function () {
  var TILE_CACHE = "hw-map-tiles-v1";
  var TILE_MIN_BYTES = 400;
  /** One event weekend + buffer; stale entries are refetched. */
  var TILE_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

  var MAP_TILE_HOSTS = [
    "basemaps.cartocdn.com",
    "tile.openstreetmap.org",
    "openstreetmap.fr",
    "israelhiking.osm.org.il",
    "arcgisonline.com",
  ];

  /** Defaults match src/lib/config.ts — overridden via MAP_TILE_BOUNDS postMessage. */
  var state = {
    bounds: {
      north: 32.0994,
      south: 32.0844,
      west: 34.7972,
      east: 34.8252,
    },
    minZoom: 14,
    maxZoom: 18,
  };

  function isMapTileHost(hostname) {
    return MAP_TILE_HOSTS.some(function (host) {
      return hostname.includes(host);
    });
  }

  function parseTilePath(pathname) {
    var match = /\/(\d{1,2})\/(\d+)\/(\d+)/.exec(pathname);
    if (!match) return null;
    var z = Number(match[1]);
    var x = Number(match[2]);
    var y = Number(match[3]);
    if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { z: z, x: x, y: y };
  }

  function tileLat(y, z) {
    var n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  function tileLng(x, z) {
    return (x / Math.pow(2, z)) * 360 - 180;
  }

  function tileIntersectsBounds(z, x, y, bounds) {
    if (!bounds) return true;
    var north = tileLat(y, z);
    var south = tileLat(y + 1, z);
    var west = tileLng(x, z);
    var east = tileLng(x + 1, z);
    return !(south > bounds.north || north < bounds.south || east < bounds.west || west > bounds.east);
  }

  function shouldCacheUrl(url) {
    if (!isMapTileHost(url.hostname)) return false;
    var coords = parseTilePath(url.pathname);
    if (!coords) return false;
    if (coords.z < state.minZoom || coords.z > state.maxZoom) return false;
    return tileIntersectsBounds(coords.z, coords.x, coords.y, state.bounds);
  }

  function setConfig(next) {
    if (next && next.bounds) {
      state.bounds = {
        north: Number(next.bounds.north),
        south: Number(next.bounds.south),
        west: Number(next.bounds.west),
        east: Number(next.bounds.east),
      };
    }
    if (next && Number.isFinite(Number(next.minZoom))) state.minZoom = Number(next.minZoom);
    if (next && Number.isFinite(Number(next.maxZoom))) state.maxZoom = Number(next.maxZoom);
  }

  function validateTileBuffer(buffer) {
    return Boolean(buffer && buffer.byteLength > TILE_MIN_BYTES);
  }

  async function validateTileResponse(response) {
    if (!response || !response.ok) return false;
    var ct = (response.headers.get("content-type") || "").toLowerCase();
    if (ct && !ct.includes("image")) return false;
    var body = await response.clone().arrayBuffer();
    return validateTileBuffer(body);
  }

  function cacheFresh(cached) {
    var at = Number(cached.headers.get("x-hw-cached-at") || 0);
    return at > 0 && Date.now() - at < TILE_MAX_AGE_MS;
  }

  async function respondWithCachedTile(request) {
    var cache = await caches.open(TILE_CACHE);
    var cached = await cache.match(request);
    if (cached && cacheFresh(cached)) return cached;
    if (cached) await cache.delete(request);

    try {
      var res = await fetch(request);
      if (!(await validateTileResponse(res))) return res;
      var body = await res.arrayBuffer();
      var headers = new Headers(res.headers);
      headers.set("x-hw-cached-at", String(Date.now()));
      var stored = new Response(body, {
        status: res.status,
        statusText: res.statusText,
        headers: headers,
      });
      await cache.put(request, stored.clone());
      return stored;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  }

  return {
    TILE_CACHE: TILE_CACHE,
    TILE_MIN_BYTES: TILE_MIN_BYTES,
    TILE_MAX_AGE_MS: TILE_MAX_AGE_MS,
    isMapTileHost: isMapTileHost,
    parseTilePath: parseTilePath,
    tileIntersectsBounds: tileIntersectsBounds,
    shouldCacheUrl: shouldCacheUrl,
    setConfig: setConfig,
    validateTileBuffer: validateTileBuffer,
    respondWithCachedTile: respondWithCachedTile,
  };
})();
