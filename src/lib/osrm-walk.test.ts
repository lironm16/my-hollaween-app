import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchWalkingGeometry } from "@/lib/osrm-walk";

describe("fetchWalkingGeometry north-cluster guard", () => {
  it("does not loop through the farm belt for north-east cluster legs", async () => {
    const northCluster = [
      { lat: 32.0952, lng: 34.8085 },
      { lat: 32.0955, lng: 34.8088 },
      { lat: 32.0958, lng: 34.809 },
      { lat: 32.0961, lng: 34.8093 },
      { lat: 32.0964, lng: 34.8095 },
      { lat: 32.0967, lng: 34.8098 },
      { lat: 32.097, lng: 34.81 },
      { lat: 32.0985, lng: 34.814 },
      { lat: 32.0988, lng: 34.8155 },
    ];
    const line = await fetchWalkingGeometry(northCluster);
    assert.ok(line && line.length >= 2, "expected a walking line");
    const maxLat = Math.max(...line.map((point) => point.lat));
    const northernStop = Math.max(...northCluster.map((point) => point.lat));
    assert.ok(maxLat <= northernStop + 0.0015, `route climbed too far north: ${maxLat}`);
    assert.ok(maxLat < 32.0995, `route entered the forest belt: ${maxLat}`);
  });
});
