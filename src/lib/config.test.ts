import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEIGHBORHOODS,
  neighborhoodFromAddress,
  neighborhoodFromCoords,
  normalizeNeighborhoodId,
  resolveNeighborhood,
} from "@/lib/config";

describe("neighborhood config", () => {
  it("includes שכונת הגפן in the canonical list", () => {
    assert.ok(NEIGHBORHOODS.includes("שכונת הגפן"));
  });

  it("maps legacy הגפן storage to שכונת הגפן", () => {
    assert.equal(normalizeNeighborhoodId("הגפן"), "שכונת הגפן");
  });

  it("detects הגפן in address text", () => {
    assert.equal(neighborhoodFromAddress("ז'בוטינסקי 105, שכונת הגפן"), "שכונת הגפן");
    assert.equal(neighborhoodFromAddress("ז'בוטינסקי 105, הגפן"), "שכונת הגפן");
  });

  it("classifies Jabotinsky-area pins as שכונת הגפן", () => {
    assert.equal(neighborhoodFromCoords(32.08925, 34.81205), "שכונת הגפן");
    assert.equal(
      resolveNeighborhood({ address: "ז'בוטינסקי 105", lat: 32.08925, lng: 34.81205 }),
      "שכונת הגפן",
    );
  });
});
