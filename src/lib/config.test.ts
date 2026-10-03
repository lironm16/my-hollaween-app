import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  houseLocationAllowed,
  NEIGHBORHOODS,
  neighborhoodAtEventLocation,
  neighborhoodFromAddress,
  neighborhoodFromCoords,
  neighborhoodInferredFromPin,
  neighborhoodLabelForPin,
  normalizeNeighborhoodId,
  houseInNeighborhoods,
  houseNeighborhoodChoiceToStored,
  NEIGHBORHOOD_FILTER_OTHER,
  resolveNeighborhood,
  storedToHouseNeighborhoodChoice,
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

  it("classifies Jabotinsky-area pins in הגפן zone (map bounds only)", () => {
    assert.equal(neighborhoodFromCoords(32.08925, 34.81205), "הגפן");
    assert.equal(neighborhoodAtEventLocation(32.08925, 34.81205), "הגפן");
    assert.equal(
      resolveNeighborhood({
        address: "ז'בוטינסקי 105",
        neighborhood: "הגפן",
        lat: 32.08925,
        lng: 34.81205,
      }),
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

  it("Yohanna 6 is אחר when stored null — not inferred from pin", () => {
    const lat = 32.0883058;
    const lng = 34.8163387;
    assert.equal(neighborhoodAtEventLocation(lat, lng), null);
    assert.equal(resolveNeighborhood({ address: "יוהנה 6", lat, lng, neighborhood: null }), null);
    assert.equal(
      resolveNeighborhood({ address: "יוהנה 6", lat, lng, neighborhood: "הגפן" }),
      "הגפן",
    );
  });

  it("keeps stored neighborhood when pin is outside zone polygons", () => {
    assert.equal(
      resolveNeighborhood({
        address: "איתמר 2",
        neighborhood: "חרוזים",
        lat: 32.09090420608,
        lng: 34.806805706959,
      }),
      "חרוזים",
    );
  });

  it("houseInNeighborhoods returns false when no hoods selected", () => {
    assert.equal(
      houseInNeighborhoods({ address: "חרוזים 1", neighborhood: "חרוזים" }, []),
      false,
    );
  });

  it("houseInNeighborhoods matches אחר for null resolveNeighborhood", () => {
    assert.equal(
      houseInNeighborhoods(
        { address: "הדר 11", lat: 32.08793, lng: 34.8123 },
        ["אחר"],
      ),
      true,
    );
    assert.equal(
      houseInNeighborhoods(
        { address: "הדר 11", lat: 32.08793, lng: 34.8123 },
        ["חרוזים"],
      ),
      false,
    );
  });

  it("includes Hashkediya 13 in Gefen", () => {
    assert.equal(neighborhoodAtEventLocation(32.088440010365, 34.811503009317), "הגפן");
    assert.equal(houseLocationAllowed(32.088440010365, 34.811503009317), true);
  });

  it("resolveNeighborhood uses stored hood, not zone at pin", () => {
    const lat = 32.0945618;
    const lng = 34.816518;
    assert.equal(neighborhoodAtEventLocation(lat, lng), "שיכון ותיקים");
    assert.equal(
      resolveNeighborhood({ address: "הזמיר 8", lat, lng, neighborhood: "נחלת גנים" }),
      "נחלת גנים",
    );
    assert.equal(neighborhoodLabelForPin(lat, lng, "ותיקים"), "שיכון ותיקים");
  });

  it("Hadar 11 uses stored hood only", () => {
    const lat = 32.087930013467;
    const lng = 34.812298032833;
    assert.equal(
      resolveNeighborhood({
        address: "הדר 11",
        lat,
        lng,
        neighborhood: "שיכון ותיקים",
      }),
      "שיכון ותיקים",
    );
    assert.equal(
      resolveNeighborhood({ address: "הדר 11", lat, lng, neighborhood: null }),
      null,
    );
  });

  it("houseNeighborhoodChoice round-trip", () => {
    assert.equal(houseNeighborhoodChoiceToStored("חרוזים"), "חרוזים");
    assert.equal(houseNeighborhoodChoiceToStored(NEIGHBORHOOD_FILTER_OTHER), null);
    assert.equal(storedToHouseNeighborhoodChoice(null), NEIGHBORHOOD_FILTER_OTHER);
    assert.equal(storedToHouseNeighborhoodChoice("הגפן"), "הגפן");
  });

});
