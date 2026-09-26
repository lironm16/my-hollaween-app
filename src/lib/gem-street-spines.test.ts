import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMeters } from "@/lib/geo";
import { gemAnchorForHouse } from "@/lib/gem-hunt";
import { nearestSidewalkPoint, streetNameFromAddress } from "@/lib/gem-street-spines";

describe("gem street spines", () => {
  it("parses Hebrew street from address", () => {
    assert.equal(streetNameFromAddress("רוקח 34"), "רוקח");
    assert.equal(streetNameFromAddress("יהודית 15, חרוזים"), "יהודית");
  });

  it("snaps רוקח 34 toward the Rokach sidewalk spine (not a random yard)", () => {
    /** Pin slightly west of the street — common when geocoded to the building. */
    const house = {
      id: "rokach-34-fixture",
      address: "רוקח 34",
      lat: 32.09205,
      lng: 34.81085,
    };
    const hit = nearestSidewalkPoint(house, house.address);
    assert.ok(hit);
    assert.ok(hit!.distanceM < 40);
    const anchor = gemAnchorForHouse(house);
    assert.equal(anchor.calibrated, false);
    assert.ok(anchor.lng > house.lng + 0.00015, "anchor should sit on/east of the street line");
    assert.ok(distanceMeters(house, anchor) < 45);
    assert.ok(distanceMeters(anchor, hit!.point) < 8);
  });

  it("falls back to nearest spine when address street is far (bad geocode)", () => {
    const house = {
      id: "ahimeir-bad-geocode",
      address: "אחימאיר אבא 15",
      lat: 32.09246434232067,
      lng: 34.81078147888184,
    };
    const hit = nearestSidewalkPoint(house, house.address);
    assert.ok(hit);
    assert.ok(hit!.distanceM < 55);
    const anchor = gemAnchorForHouse(house);
    assert.ok(anchor.lng > 34.8109, "snaps toward Rokach sidewalk near the pin");
  });

  it("snaps אחימאיר אבא (trailing אבא) onto Achimeir spine", () => {
    const house = {
      id: "ahimeir-aba-fixture",
      address: "אחימאיר אבא 15",
      lat: 32.09135,
      lng: 34.80958,
    };
    const hit = nearestSidewalkPoint(house, house.address);
    assert.ok(hit);
    assert.ok(hit!.distanceM < 22);
    const anchor = gemAnchorForHouse(house);
    assert.ok(Math.abs(anchor.lng - 34.80944) < 0.00025);
  });

  it("snaps אבא אחימאיר houses onto the Achimeir sidewalk spine", () => {
    /** Pin east of the spine (typical geocode into the building row). */
    const house = {
      id: "ahimeir-fixture",
      address: "אבא אחימאיר 12",
      lat: 32.09135,
      lng: 34.80958,
    };
    const hit = nearestSidewalkPoint(house, house.address);
    assert.ok(hit);
    assert.ok(hit!.distanceM < 22);
    const anchor = gemAnchorForHouse(house);
    assert.ok(Math.abs(anchor.lng - 34.80944) < 0.0002, "anchor stays on Achimeir lng band");
    assert.ok(distanceMeters(anchor, hit!.point) < 8);
  });
});
