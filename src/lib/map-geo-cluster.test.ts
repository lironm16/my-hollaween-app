import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterHousesByAddress } from "@/lib/house-clusters";
import type { PublicHouse } from "@/lib/types";
import {
  addressClusterKeyFromFeature,
  buildAddressClusterGeoIndex,
  geoClustersInView,
  isGeoClusterFeature,
} from "@/lib/map-geo-cluster";

function house(id: string, lat: number, lng: number): PublicHouse {
  return {
    id,
    name: id,
    address: `רחוב ${id} 1`,
    lat,
    lng,
    createdAt: "2020-01-01T00:00:00.000Z",
  } as PublicHouse;
}

describe("map-geo-cluster", () => {
  it("merges nearby address clusters at low zoom and expands at high zoom", () => {
    const rows = [
      house("a", 32.08, 34.78),
      house("b", 32.0801, 34.7801),
      house("c", 32.12, 34.82),
    ];
    const addressClusters = clusterHousesByAddress(rows);
    const index = buildAddressClusterGeoIndex(addressClusters);
    const bbox: [number, number, number, number] = [34.7, 32.0, 34.9, 32.2];

    const low = geoClustersInView(index, bbox, 14);
    const high = geoClustersInView(index, bbox, 18);

    assert.ok(low.length <= addressClusters.length);
    assert.equal(high.length, addressClusters.length);
    const leaf = high[0]!;
    assert.equal(isGeoClusterFeature(leaf), false);
    if (isGeoClusterFeature(leaf)) throw new Error("expected leaf");
    assert.equal(addressClusterKeyFromFeature(leaf), addressClusters[0]!.key);
  });
});
