import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHighwayLineHit, linesFromStreetGeometry, pickStreetCenterlines } from "@/lib/event-boundary-street-geom";

describe("event-boundary-street-geom", () => {
  it("ignores polygon geojson for streets", () => {
    assert.deepEqual(
      linesFromStreetGeometry({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      }),
      [],
    );
  });

  it("detects highway line hits", () => {
    assert.equal(
      isHighwayLineHit({
        class: "highway",
        type: "tertiary",
        geojson: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      }),
      true,
    );
  });

  it("prefers segments inside zone clip", () => {
    const hits = [
      {
        class: "highway",
        type: "tertiary",
        display_name: "A, Other City",
        geojson: {
          type: "LineString" as const,
          coordinates: [
            [34.8, 32.0],
            [34.81, 32.01],
          ],
        },
      },
      {
        class: "highway",
        type: "tertiary",
        display_name: "A, Ramat Gan",
        geojson: {
          type: "LineString" as const,
          coordinates: [
            [34.82, 32.08],
            [34.83, 32.09],
          ],
        },
      },
    ];
    const zoneClip: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [34.81, 32.07],
          [34.84, 32.07],
          [34.84, 32.1],
          [34.81, 32.1],
          [34.81, 32.07],
        ],
      ],
    };
    const lines = pickStreetCenterlines(hits, "Ramat Gan", { zoneClips: [zoneClip] });
    assert.equal(lines.length, 1);
    assert.equal(lines[0][0][0], 34.82);
  });
});
