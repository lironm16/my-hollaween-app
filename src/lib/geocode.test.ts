import assert from "node:assert/strict";
import test from "node:test";
import { isOsmMapFootprintHit, searchAddress } from "@/lib/geocode";

test("isOsmMapFootprintHit recognizes Nominatim ids", () => {
  assert.equal(isOsmMapFootprintHit({ id: "way-123" }), true);
  assert.equal(isOsmMapFootprintHit({ id: "node-9" }), true);
  assert.equal(isOsmMapFootprintHit({ id: "p-יהודית 7, חרוזים" }), false);
});

test("searchAddress prefers OSM building coords over Esri for numbered streets", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("arcgis.com")) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              location: { x: 34.804781980256, y: 32.090241993819 },
              attributes: {
                AddNum: "7",
                StName: "יהודית",
                City: "רמת גן",
                Addr_type: "PointAddress",
                Nbrhd: "חרוזים",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({
          candidates: [
            {
              location: { x: 34.809167978731, y: 32.092732005796 },
              attributes: {
                AddNum: "58",
                StName: "רוקח",
                City: "רמת גן",
                Addr_type: "PointAddress",
              },
            },
            {
              location: { x: 34.812711699349, y: 32.095108387331 },
              attributes: {
                AddNum: "58",
                StName: "רוקח",
                City: "רמת גן",
                Addr_type: "StreetAddressExt",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("nominatim.openstreetmap.org")) {
      return new Response(
        JSON.stringify([
          {
            lat: "32.0951225",
            lon: "34.8123290",
            osm_type: "way",
            osm_id: 157360076,
            addresstype: "road",
            address: {
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
    assert.ok(Math.abs(hits[0]!.lat - 32.092732005796) < 0.000_01);
    assert.ok(Math.abs(hits[0]!.lng - 34.809167978731) < 0.000_01);
    assert.ok(!hits.some((h) => h.label.includes("58") && !h.precise));
  } finally {
    globalThis.fetch = origFetch;
  }
});
