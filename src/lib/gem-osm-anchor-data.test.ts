import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attachGemAnchorPin,
  isGemOsmAnchorStale,
  type GemOsmAnchorEntry,
} from "@/lib/gem-osm-anchor-data";
import { __resetGemOsmAnchorsForTests } from "@/lib/gem-osm-anchor-cache";
import { gemAnchorForHouse } from "@/lib/gem-hunt";

describe("gem osm anchor staleness", () => {
  const snap: GemOsmAnchorEntry = {
    lat: 32.092,
    lng: 34.811,
    distanceM: 12,
    source: "osrm",
    pinLat: 32.0919,
    pinLng: 34.8112,
  };

  it("treats legacy anchors without pin coords as stale", () => {
    const legacy: GemOsmAnchorEntry = {
      lat: 32.092,
      lng: 34.811,
      distanceM: 12,
      source: "osrm",
    };
    assert.equal(
      isGemOsmAnchorStale({ lat: 32.0919, lng: 34.8112 }, legacy),
      true,
    );
  });

  it("keeps anchor when house pin barely moved", () => {
    assert.equal(
      isGemOsmAnchorStale({ lat: 32.09192, lng: 34.81122 }, snap),
      false,
    );
  });

  it("invalidates anchor when house pin moved on edit", () => {
    assert.equal(
      isGemOsmAnchorStale({ lat: 32.0935, lng: 34.8125 }, snap),
      true,
    );
  });

  it("gemAnchorForHouse ignores stale cached snap and follows the house pin", () => {
    __resetGemOsmAnchorsForTests({
      version: 1,
      generatedAt: "test",
      anchors: {
        moved: {
          lat: 32.092,
          lng: 34.811,
          distanceM: 10,
          source: "osrm",
          pinLat: 32.0919,
          pinLng: 34.8112,
        },
      },
    });
    const house = {
      id: "moved",
      lat: 32.0942,
      lng: 34.8134,
      address: "רוקח 58",
    };
    const anchor = gemAnchorForHouse(house);
    assert.ok(Math.abs(anchor.lat - 32.092) > 0.0005 || Math.abs(anchor.lng - 34.811) > 0.0005);
    assert.equal(anchor.calibrated, false);
  });

  it("attachGemAnchorPin records the house pin on snap", () => {
    const withPin = attachGemAnchorPin({ lat: 1.1, lng: 2.2 }, snap);
    assert.equal(withPin.pinLat, 1.1);
    assert.equal(withPin.pinLng, 2.2);
  });
});
