import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeSharedRoutePayload,
  encodeSharedRoutePayload,
  housesForSharedRoute,
  routeSharePlainText,
  sharedRoutePayloadFromRoute,
} from "@/lib/route-share";
import type { PublicHouse } from "@/lib/types";

function house(id: string): PublicHouse {
  return {
    id,
    name: id,
    theme: "pumpkin",
    address: "חרוזים 8",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    scareLevel: "mild",
    visit: "come",
  } as PublicHouse;
}

describe("route share", () => {
  it("round-trips stop ids", () => {
    const payload = { v: 1 as const, stopIds: ["a", "b", "c"] };
    const enc = encodeSharedRoutePayload(payload);
    assert.deepEqual(decodeSharedRoutePayload(enc), payload);
  });

  it("builds payload from route stops in order", () => {
    const route = {
      stops: [
        { house: house("h2"), houses: [house("h2")], order: 1 },
        { house: house("h1"), houses: [house("h1")], order: 2 },
      ],
    } as import("@/lib/route").WalkingRoute;
    assert.deepEqual(sharedRoutePayloadFromRoute(route).stopIds, ["h2", "h1"]);
  });

  it("builds share plain text with url", () => {
    const text = routeSharePlainText("https://example.com/?routeShare=x", 3);
    assert.match(text, /3 עצירות/);
    assert.match(text, /https:\/\/example.com/);
  });

  it("resolves houses in shared order", () => {
    const map = new Map([
      ["h1", house("h1")],
      ["h2", house("h2")],
    ]);
    const ordered = housesForSharedRoute(["h2", "h1", "missing"], map);
    assert.deepEqual(
      ordered.map((h) => h.id),
      ["h2", "h1"],
    );
  });
});
