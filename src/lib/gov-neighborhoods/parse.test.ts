import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bboxCenter,
  catalogEntryFromFeature,
  geometryBbox,
  govNeighborhoodStableId,
} from "@/lib/gov-neighborhoods/parse";

describe("gov-neighborhoods parse", () => {
  it("builds catalog entry from shem_shchu + ישוב", () => {
    const feature = {
      type: "Feature" as const,
      properties: { shem_shchu: "הגפן", ישוב: "רמת גן", UniqueId: "511-99" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [34.81, 32.088],
            [34.814, 32.088],
            [34.814, 32.091],
            [34.81, 32.091],
            [34.81, 32.088],
          ],
        ],
      },
    };
    const entry = catalogEntryFromFeature(feature);
    assert.ok(entry);
    assert.equal(entry.name, "הגפן");
    assert.equal(entry.city, "רמת גן");
    assert.equal(entry.id, govNeighborhoodStableId(feature.properties, entry.name, entry.city));
    const c = bboxCenter(entry.bbox);
    assert.ok(c[0] > 34.81 && c[0] < 34.814);
  });

  it("computes bbox for multipolygon", () => {
    const bbox = geometryBbox({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [34, 32],
            [34.1, 32],
            [34.1, 32.1],
            [34, 32.1],
            [34, 32],
          ],
        ],
      ],
    });
    assert.deepEqual(bbox, [34, 32, 34.1, 32.1]);
  });
});
