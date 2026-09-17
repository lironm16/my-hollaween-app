import assert from "node:assert/strict";
import test from "node:test";
import { clusterPinStatus } from "@/lib/cluster-pin-status";
import type { PublicHouse } from "@/lib/types";

function house(overrides: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id: "h1",
    name: "Test",
    lat: 32,
    lng: 34,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "open",
    ...overrides,
  } as PublicHouse;
}

test("clusterPinStatus marks skipped houses", () => {
  assert.equal(clusterPinStatus(house(), new Date(), { skipped: true }), "skipped");
});

test("clusterPinStatus uses candy stock when open", () => {
  assert.equal(clusterPinStatus(house(), new Date()), "plenty");
  assert.equal(
    clusterPinStatus(house({ treatStock: { candy: "low" } }), new Date()),
    "low",
  );
});

test("clusterPinStatus respects manual closed visit", () => {
  assert.equal(clusterPinStatus(house({ visit: "closed" }), new Date()), "closed");
});
