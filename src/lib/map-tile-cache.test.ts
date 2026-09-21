import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors public/sw-map-tiles.js for unit tests. */
function parseTilePath(pathname: string) {
  const match = /\/(\d{1,2})\/(\d+)\/(\d+)/.exec(pathname);
  if (!match) return null;
  const z = Number(match[1]);
  const x = Number(match[2]);
  const y = Number(match[3]);
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { z, x, y };
}

function tileLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function tileLng(x: number, z: number) {
  return (x / 2 ** z) * 360 - 180;
}

function latLngToTile(lat: number, lng: number, z: number) {
  const x = Math.floor(((lng + 180) / 360) * 2 ** z);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z,
  );
  return { x, y };
}

function tileIntersectsBounds(
  z: number,
  x: number,
  y: number,
  bounds: { north: number; south: number; west: number; east: number },
) {
  const north = tileLat(y, z);
  const south = tileLat(y + 1, z);
  const west = tileLng(x, z);
  const east = tileLng(x + 1, z);
  return !(south > bounds.north || north < bounds.south || east < bounds.west || west > bounds.east);
}

describe("map tile cache helpers", () => {
  it("parses CARTO dark and voyager tile URLs", () => {
    assert.deepEqual(parseTilePath("/dark_all/16/12345/6789@2x.png"), { z: 16, x: 12345, y: 6789 });
    assert.deepEqual(parseTilePath("/rastertiles/voyager/14/9876/5432.png"), {
      z: 14,
      x: 9876,
      y: 5432,
    });
  });

  it("accepts neighborhood tiles at zoom 16 and rejects far-away tiles", () => {
    const bounds = {
      north: 32.0994,
      south: 32.0844,
      west: 34.7972,
      east: 34.8252,
    };
    const center = latLngToTile(32.0919, 34.8112, 16);
    assert.equal(tileIntersectsBounds(16, center.x, center.y, bounds), true);
    assert.equal(tileIntersectsBounds(10, 100, 100, bounds), false);
  });
});
