import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseLocationAllowed,
  NEIGHBORHOODS,
  neighborhoodAtEventLocation,
  neighborhoodFromAddress,
  neighborhoodFromCoords,
  neighborhoodLabelForPin,
  normalizeNeighborhoodId,
  resolveNeighborhood,
  suburbToNeighborhood,
} from "@/lib/config";

describe("neighborhood config", () => {
  it("includes הגפן in the canonical list", () => {
    assert.ok(NEIGHBORHOODS.includes("הגפן"));
  });

  it("maps legacy שכונת הגפן storage to הגפן", () => {
    assert.equal(normalizeNeighborhoodId("שכונת הגפן"), "הגפן");
  });

  it("maps OSM suburb ותיקים to שיכון ותיקים", () => {
    assert.equal(normalizeNeighborhoodId("ותיקים"), "שיכון ותיקים");
    assert.equal(suburbToNeighborhood("ותיקים"), "שיכון ותיקים");
  });

  it("detects הגפן in address text", () => {
    assert.equal(neighborhoodFromAddress("ז'בוטינסקי 105, הגפן"), "הגפן");
    assert.equal(neighborhoodFromAddress("ז'בוטינסקי 105, שכונת הגפן"), "הגפן");
  });

  it("classifies Jabotinsky-area pins as הגפן", () => {
    assert.equal(neighborhoodFromCoords(32.08925, 34.81205), "הגפן");
    assert.equal(neighborhoodAtEventLocation(32.08925, 34.81205), "הגפן");
    assert.equal(
      resolveNeighborhood({ address: "ז'בוטינסקי 105", lat: 32.08925, lng: 34.81205 }),
      "הגפן",
    );
  });

  it("rejects map-box corners outside the four neighborhoods", () => {
    assert.equal(houseLocationAllowed(32.0994, 34.7972), false);
    assert.equal(neighborhoodAtEventLocation(32.0994, 34.7972), null);
  });

  it("rejects Bialik 37 — Ramat Gan but outside the four event areas", () => {
    assert.equal(houseLocationAllowed(32.0849863, 34.8122928), false);
    assert.equal(neighborhoodAtEventLocation(32.0849863, 34.8122928), null);
  });

  it("does not assign Yohanna 6 to Gefen (outside event zones)", () => {
    const lat = 32.0883058;
    const lng = 34.8163387;
    assert.equal(neighborhoodAtEventLocation(lat, lng), null);
    assert.equal(neighborhoodLabelForPin(lat, lng), null);
    assert.equal(
      resolveNeighborhood({ address: "יוהנה 6", lat, lng }),
      null,
    );
  });

  it("includes Hashkediya 13 in Gefen", () => {
    assert.equal(neighborhoodAtEventLocation(32.088440010365, 34.811503009317), "הגפן");
    assert.equal(houseLocationAllowed(32.088440010365, 34.811503009317), true);
  });

  it("classifies HaZamir 8 in Shikun Vetikim (not Nachlat Ganem)", () => {
    const lat = 32.0945618;
    const lng = 34.816518;
    assert.equal(neighborhoodAtEventLocation(lat, lng), "שיכון ותיקים");
    assert.equal(neighborhoodLabelForPin(lat, lng, "ותיקים"), "שיכון ותיקים");
    assert.equal(resolveNeighborhood({ address: "הזמיר 8", lat, lng }), "שיכון ותיקים");
  });

});
