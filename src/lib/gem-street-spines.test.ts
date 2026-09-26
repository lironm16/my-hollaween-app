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
    assert.ok(distanceMeters(house, anchor) <= 28);
    assert.ok(distanceMeters(anchor, hit!.point) < 8);
  });
});
