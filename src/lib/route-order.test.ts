import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyStreetDistances,
  buildWalkingRoute,
  buildWalkingRouteOrdered,
  refreshWalkingRoute,
  routeGeometryPoints,
  routePreviewPoints,
  shouldShowRouteApproach,
  stripApproachFromRouteLine,
  shouldIncludeOriginInRoute,
  streetLegMeters,
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

describe("buildWalkingRoute hill skirt ordering", () => {
  it("visits the southern east-cluster stop before the northern one from the west", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const west = (id: string, lat: number, lng: number) => stub(id, lat, lng, `west ${id}`);
    const east = (id: string, lat: number, lng: number) => stub(id, lat, lng, `east ${id}`);
    const houses = [
      west("1", 32.0940, 34.8075),
      west("2", 32.0943, 34.8078),
      west("3", 32.0946, 34.8080),
      west("4", 32.0949, 34.8083),
      west("5", 32.0952, 34.8085),
      west("6", 32.0955, 34.8088),
      west("7", 32.0958, 34.8090),
      west("8", 32.0961, 34.8093),
      west("9", 32.0964, 34.8095),
      west("10", 32.0967, 34.8098),
      west("11", 32.0970, 34.8100),
      west("12", 32.0973, 34.8103),
      west("13", 32.0976, 34.8105),
      east("14", 32.0985, 34.8140),
      east("15", 32.0978, 34.8145),
      east("16", 32.0988, 34.8155),
      east("17", 32.0992, 34.8162),
    ];
    const route = buildWalkingRoute(houses, origin, { startedFrom: "neighborhood" });
    assert.ok(route);
    const order = route!.stops.map((stop) => stop.house.id);
    assert.ok(order.indexOf("15") < order.indexOf("14"), `expected 15 before 14, got ${order.join(",")}`);
  });
});

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

describe("streetLegMeters", () => {
  it("measures hops along a street line instead of straight-line distance", () => {
    const c10 = { lat: 32.0919, lng: 34.8031 };
    const m28 = { lat: 32.093459, lng: 34.809422 };
    const line = [
      c10,
      { lat: 32.09195, lng: 34.8045 },
      { lat: 32.0922, lng: 34.806 },
      { lat: 32.0928, lng: 34.808 },
      m28,
    ];
    const legs = streetLegMeters([c10, m28], line);
    assert.equal(legs.length, 1);
    assert.ok(legs[0]! > 400);
  });
});

describe("applyStreetDistances", () => {
  it("replaces stop hop distances with street leg meters", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const a = stub("a", 32.0919, 34.8031, "חרוזים 10, חרוזים");
    const b = stub("b", 32.093459, 34.809422, "המרגנית 28, שיכון ותיקים");
    const route = buildWalkingRouteOrdered([a, b], origin);
    assert.ok(route);
    const updated = applyStreetDistances(route!, [900], { includesOrigin: false });
    assert.equal(updated.stops[1]!.fromPreviousMeters, 900);
    assert.equal(updated.totalMeters, route!.stops[0]!.fromPreviousMeters + 900);
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

  it("preview line lists stops only — approach is dashed on the map", () => {
    const origin = { lat: 32.0919, lng: 34.8112 };
    const far = stub("far", 32.094, 34.818, "נחלת גנים 1, נחלת גנים");
    const route = buildWalkingRoute([far], origin, { startedFrom: "gps" });
    assert.ok(route);
    const preview = routePreviewPoints(route!);
    assert.equal(preview.length, 1);
    assert.deepEqual(preview[0], { lat: far.lat, lng: far.lng });
    assert.equal(shouldShowRouteApproach(origin, preview[0]!, "gps"), true);
    const line = stripApproachFromRouteLine([origin, preview[0]!, { lat: 32.093, lng: 34.815 }], preview[0]!, origin);
    assert.equal(line[0], preview[0]);
  });
});
