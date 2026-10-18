import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  geoCanPromptLocation,
  geoLocationFailureToastHe,
  geoLocationHintHe,
} from "@/lib/geo-location-access";

describe("geo-location-access", () => {
  it("allows prompt unless denied or unavailable", () => {
    assert.equal(geoCanPromptLocation("idle"), true);
    assert.equal(geoCanPromptLocation("pending"), true);
    assert.equal(geoCanPromptLocation("ready"), true);
    assert.equal(geoCanPromptLocation("error"), true);
    assert.equal(geoCanPromptLocation("denied"), false);
    assert.equal(geoCanPromptLocation("unavailable"), false);
  });

  it("hints distinguish timeout from denied", () => {
    assert.match(geoLocationHintHe("denied"), /הגדרות/);
    assert.match(geoLocationHintHe("error"), /נסו שוב/);
    assert.equal(geoLocationHintHe("ready"), "GPS");
  });

  it("toast for error does not blame settings only", () => {
    const msg = geoLocationFailureToastHe("error");
    assert.ok(msg && !/אשרו גישה/.test(msg));
  });
});
