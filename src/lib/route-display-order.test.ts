import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicHouse } from "@/lib/types";
import type { WalkingRoute } from "@/lib/route";
import { captureRouteDisplayOrders, routeDisplayOrder } from "@/lib/route-display-order";

function route(stops: { id: string; order: number }[]): WalkingRoute {
  return {
    stops: stops.map((s) => ({
      order: s.order,
      fromPreviousMeters: 10,
      cumulativeMeters: 10 * s.order,
      house: { id: s.id, lat: 32, lng: 34 } as PublicHouse,
      houses: [{ id: s.id, lat: 32, lng: 34 } as PublicHouse],
    })),
    totalMeters: 50,
    totalMinutes: 10,
    startedFrom: "neighborhood",
    origin: { lat: 32, lng: 34 },
    accessible: false,
  };
}

describe("route display order session", () => {
  it("captures initial stop numbers", () => {
    const orders = captureRouteDisplayOrders(
      route([
        { id: "a", order: 1 },
        { id: "b", order: 2 },
        { id: "c", order: 3 },
      ]),
    );
    assert.equal(orders.get("b"), 2);
  });

  it("keeps session numbers when rebuild compacts orders", () => {
    const session = captureRouteDisplayOrders(
      route([
        { id: "a", order: 1 },
        { id: "b", order: 2 },
        { id: "c", order: 3 },
      ]),
    );
    const afterVisit = route([
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ]);
    assert.equal(routeDisplayOrder("b", afterVisit.stops[0]!.order, session), 2);
    assert.equal(routeDisplayOrder("c", afterVisit.stops[1]!.order, session), 3);
  });

  it("falls back to rebuild order for houses not in the session snapshot", () => {
    const session = captureRouteDisplayOrders(
      route([
        { id: "a", order: 1 },
        { id: "b", order: 2 },
      ]),
    );
    assert.equal(routeDisplayOrder("c", 3, session), 3);
    assert.equal(routeDisplayOrder("b", 99, session), 2);
  });
});
