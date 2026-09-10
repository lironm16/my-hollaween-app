import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWalkingRoute,
  buildWalkingRouteOrdered,
  refreshWalkingRoute,
  routeGeometryPoints,
  routePreviewPoints,
  shouldIncludeOriginInRoute,
  trimWalkingRouteToVisible,
} from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

function stub(id: string, lat: number, lng: number, address: string): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address,
    arrival: "",
    description: "",
    lat,
    lng,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    openHours: [{ from: "17:00", to: "21:00" }],
    openFrom2: "",
    openTo2: "",
    notes: "",
    accessible: true,
    decorLevel: "medium",
    decorated: true,
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildWalkingRouteOrdered", () => {
  it("keeps list order instead of nearest-neighbor shuffle", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const far = stub("far", 32.094, 34.818, "נחלת גנים 1, נחלת גנים");
    const near = stub("near", 32.09195, 34.81125, "חרוזים 8, חרוזים");
    const ordered = buildWalkingRouteOrdered([far, near], origin);
    const shuffled = buildWalkingRoute([far, near], origin);
    assert.ok(ordered);
    assert.ok(shuffled);
    assert.deepEqual(
      ordered!.stops.map((stop) => stop.house.id),
      ["far", "near"],
    );
    assert.deepEqual(
      shuffled!.stops.map((stop) => stop.house.id),
      ["near", "far"],
    );
  });
});

describe("refreshWalkingRoute", () => {
  it("updates origin without reordering stops", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const route = buildWalkingRouteOrdered(
      [
        stub("a", 32.091, 34.803, "חרוזים 8, חרוזים"),
        stub("b", 32.092, 34.804, "חרוזים 10, חרוזים"),
      ],
      origin,
    );
    assert.ok(route);
    const moved = refreshWalkingRoute(route!, { lat: 32.0905, lng: 34.8025 });
    assert.deepEqual(
      moved.stops.map((stop) => stop.house.id),
      route!.stops.map((stop) => stop.house.id),
    );
    assert.equal(moved.origin.lat, 32.0905);
  });
});

describe("trimWalkingRouteToVisible", () => {
  it("drops stops that fall out of the filter", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const route = buildWalkingRouteOrdered(
      [
        stub("a", 32.091, 34.803, "חרוזים 8, חרוזים"),
        stub("b", 32.092, 34.804, "חרוזים 10, חרוזים"),
      ],
      origin,
    );
    assert.ok(route);
    const trimmed = trimWalkingRouteToVisible(route!, new Set(["a"]));
    assert.ok(trimmed);
    assert.deepEqual(trimmed!.stops.map((stop) => stop.house.id), ["a"]);
  });
});

describe("routeGeometryPoints", () => {
  it("prepends GPS origin for street routing", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const near = stub("near", 32.0925, 34.812, "חרוזים 8, חרוזים");
    const route = buildWalkingRoute([near], origin, { startedFrom: "gps" });
    assert.ok(route);
    assert.equal(shouldIncludeOriginInRoute(route!), true);
    const points = routeGeometryPoints(route!);
    assert.deepEqual(points[0], origin);
    assert.equal(points.length, 2);
  });

  it("skips distant neighborhood center spurs", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const far = stub("far", 32.094, 34.818, "נחלת גנים 1, נחלת גנים");
    const route = buildWalkingRoute([far], origin, { startedFrom: "neighborhood" });
    assert.ok(route);
    assert.equal(shouldIncludeOriginInRoute(route!), false);
    assert.deepEqual(routeGeometryPoints(route!), route!.stops.map((stop) => ({
      lat: stop.house.lat,
      lng: stop.house.lng,
    })));
  });

  it("preview line still ties origin to stop 1 for map display", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const far = stub("far", 32.094, 34.818, "נחלת גנים 1, נחלת גנים");
    const route = buildWalkingRoute([far], origin, { startedFrom: "neighborhood" });
    assert.ok(route);
    const preview = routePreviewPoints(route!);
    assert.deepEqual(preview[0], origin);
    assert.equal(preview.length, 2);
  });
});
