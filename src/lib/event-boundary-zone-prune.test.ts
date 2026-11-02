import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areaGeometryEntirelyInside, pruneZonesContainedInParents } from "@/lib/event-boundary-zone-prune";
import { zoneKeyCity, zoneKeyNeighborhood, zoneKeyStreet } from "@/lib/event-boundary";

describe("event-boundary-zone-prune", () => {
  it("detects polygon inside polygon", () => {
    const outer: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [34.8, 32.0],
          [34.9, 32.0],
          [34.9, 32.1],
          [34.8, 32.1],
          [34.8, 32.0],
        ],
      ],
    };
    const inner: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [34.82, 32.02],
          [34.84, 32.02],
          [34.84, 32.04],
          [34.82, 32.04],
          [34.82, 32.02],
        ],
      ],
    };
    assert.equal(areaGeometryEntirelyInside(inner, outer), true);
    assert.equal(areaGeometryEntirelyInside(outer, inner), false);
  });

  it("removes street contained in neighborhood", () => {
    const hood = {
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood("h1"),
      label: "שכונה",
      city: "רמת גן",
    };
    const street = {
      kind: "street" as const,
      id: zoneKeyStreet("רמת גן", "רחוב"),
      label: "רחוב",
      city: "רמת גן",
    };
    const geoms = new Map<string, GeoJSON.Polygon>([
      [
        hood.id,
        {
          type: "Polygon",
          coordinates: [
            [
              [34.8, 32.0],
              [34.9, 32.0],
              [34.9, 32.1],
              [34.8, 32.1],
              [34.8, 32.0],
            ],
          ],
        },
      ],
      [
        street.id,
        {
          type: "Polygon",
          coordinates: [
            [
              [34.82, 32.02],
              [34.84, 32.02],
              [34.84, 32.04],
              [34.82, 32.04],
              [34.82, 32.02],
            ],
          ],
        },
      ],
    ]);
    const pruned = pruneZonesContainedInParents([hood, street], geoms);
    assert.equal(pruned.length, 1);
    assert.equal(pruned[0].id, hood.id);
  });

  it("removes hood contained in selected city", () => {
    const city = { kind: "city" as const, id: zoneKeyCity("רמת גן"), label: "רמת גן" };
    const hood = {
      kind: "neighborhood" as const,
      id: zoneKeyNeighborhood("h1"),
      label: "שכונה",
      city: "רמת גן",
    };
    const geoms = new Map<string, GeoJSON.Polygon>([
      [
        city.id,
        {
          type: "Polygon",
          coordinates: [
            [
              [34.7, 31.9],
              [35.0, 31.9],
              [35.0, 32.2],
              [34.7, 32.2],
              [34.7, 31.9],
            ],
          ],
        },
      ],
      [
        hood.id,
        {
          type: "Polygon",
          coordinates: [
            [
              [34.8, 32.0],
              [34.9, 32.0],
              [34.9, 32.1],
              [34.8, 32.1],
              [34.8, 32.0],
            ],
          ],
        },
      ],
    ]);
    const pruned = pruneZonesContainedInParents([city, hood], geoms);
    assert.equal(pruned.length, 1);
    assert.equal(pruned[0].id, city.id);
  });
});
