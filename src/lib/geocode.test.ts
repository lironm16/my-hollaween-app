import assert from "node:assert/strict";
import test from "node:test";
import { isOsmMapFootprintHit, searchAddress } from "@/lib/geocode";

test("isOsmMapFootprintHit recognizes Nominatim ids", () => {
  assert.equal(isOsmMapFootprintHit({ id: "way-123" }), true);
  assert.equal(isOsmMapFootprintHit({ id: "node-9" }), true);
  assert.equal(isOsmMapFootprintHit({ id: "p-יהודית 7, חרוזים" }), false);
});

test("searchAddress uses Nominatim OSM building coords for numbered streets", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("arcgis.com")) {
      throw new Error("Esri must not be called");
    }
    if (url.includes("nominatim.openstreetmap.org")) {
      return new Response(
        JSON.stringify([
          {
            lat: "32.0899146",
            lon: "34.8047034",
            osm_type: "way",
            osm_id: 5250608,
            addresstype: "building",
            address: {
              house_number: "7",
              road: "יהודית",
              suburb: "חרוזים",
              city: "רמת גן",
            },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const hits = await searchAddress("יהודית 7");
    assert.ok(hits.length > 0);
    assert.equal(hits[0]!.houseNumber, "7");
    assert.ok(isOsmMapFootprintHit(hits[0]!));
    assert.ok(Math.abs(hits[0]!.lat - 32.0899146) < 0.000_01);
    assert.ok(Math.abs(hits[0]!.lng - 34.8047034) < 0.000_01);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("searchAddress does not label street segments with a typed house number", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("arcgis.com")) {
      throw new Error("Esri must not be called");
    }
    if (url.includes("nominatim.openstreetmap.org")) {
      return new Response(
        JSON.stringify([
          {
            lat: "32.0951225",
            lon: "34.8123290",
            osm_type: "way",
            osm_id: 157360076,
            addresstype: "building",
            address: {
              house_number: "58",
              road: "רוקח",
              suburb: "ותיקים",
              city: "רמת גן",
            },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const hits = await searchAddress("רוקח 58");
    assert.ok(hits.length > 0);
    assert.equal(hits[0]!.houseNumber, "58");
    assert.equal(hits[0]!.precise, true);
    assert.ok(Math.abs(hits[0]!.lat - 32.0951225) < 0.000_01);
    assert.ok(Math.abs(hits[0]!.lng - 34.812329) < 0.000_01);
    assert.ok(!hits.some((h) => h.label.includes("58") && !h.precise));
  } finally {
    globalThis.fetch = origFetch;
  }
});
