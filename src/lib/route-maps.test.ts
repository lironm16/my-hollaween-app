import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GOOGLE_MAPS_MAX_STOPS,
  googleMapsRouteSegment,
  googleMapsWalkingUrl,
  type WalkingRoute,
} from "@/lib/route";
import type { PublicHouse } from "@/lib/types";

function stub(id: string, lat: number, lng: number): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: `${id} st`,
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
    photoUrl: "",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function routeWithStops(count: number): WalkingRoute {
  const stops = Array.from({ length: count }, (_, index) => ({
    house: stub(`house-${index + 1}`, 32.08 + index * 0.001, 34.81 + index * 0.001),
    houses: [stub(`house-${index + 1}`, 32.08 + index * 0.001, 34.81 + index * 0.001)],
    order: index + 1,
    fromPreviousMeters: index === 0 ? 0 : 120,
    cumulativeMeters: index * 120,
  }));
  return {
    stops,
    totalMeters: count * 120,
    totalMinutes: count * 3,
    startedFrom: "gps",
    origin: { lat: 32.08, lng: 34.81 },
    accessible: false,
  };
}

describe("googleMapsRouteSegment", () => {
  it("caps a single handoff at GOOGLE_MAPS_MAX_STOPS houses", () => {
    const route = routeWithStops(12);
    const first = googleMapsRouteSegment(route, 0);
    assert.ok(first);
    assert.equal(first.includedStops, GOOGLE_MAPS_MAX_STOPS);
    assert.equal(first.hasMore, true);
    assert.equal(first.nextStartIndex, GOOGLE_MAPS_MAX_STOPS);

    const second = googleMapsRouteSegment(route, first.nextStartIndex!);
    assert.ok(second);
    assert.equal(second.includedStops, 3);
    assert.equal(second.hasMore, false);
    assert.equal(second.nextStartIndex, null);
  });

  it("uses the previous stop as origin for later segments", () => {
    const route = routeWithStops(10);
    const second = googleMapsRouteSegment(route, GOOGLE_MAPS_MAX_STOPS);
    assert.ok(second);
    const url = new URL(second.url);
    assert.equal(
      url.searchParams.get("origin"),
      `${route.stops[GOOGLE_MAPS_MAX_STOPS - 1]!.house.lat.toFixed(6)},${route.stops[GOOGLE_MAPS_MAX_STOPS - 1]!.house.lng.toFixed(6)}`,
    );
  });

  it("builds walking URLs with api=1 and travelmode=walking", () => {
    const route = routeWithStops(3);
    const url = googleMapsWalkingUrl(route);
    assert.ok(url);
    const parsed = new URL(url!);
    assert.equal(parsed.searchParams.get("api"), "1");
    assert.equal(parsed.searchParams.get("travelmode"), "walking");
    assert.ok(parsed.searchParams.get("waypoints"));
  });
});
