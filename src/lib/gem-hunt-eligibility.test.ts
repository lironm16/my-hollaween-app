import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAddressRevealContext } from "@/lib/address-reveal";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import { gemCapableMapHouses, gemVisibleMapHouses } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

function home(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "חרוזים 8",
    lat: 32.09,
    lng: 34.81,
    kind: "house",
    isStub: false,
  } as PublicHouse;
}

function poi(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "סוקולוב 10",
    lat: 32.09,
    lng: 34.81,
    kind: "poi",
    isStub: false,
    locationPublic: true,
  } as PublicHouse;
}

describe("gem hunt eligibility", () => {
  it("assigns gems to every in-set house", () => {
    assert.equal(gemCapableMapHouses([home("בית-1")], "real").length, 1);
  });

  it("shows gem only when viewer can see address", () => {
    const schedule = mergeAddressRevealSchedule();
    const beforeReveal = makeAddressRevealContext({
      now: new Date(2026, 9, 30, 12, 0, 0),
      addressReveal: schedule,
      ownedHouseIds: [],
      publicLocationIds: [poi("נק-1").id],
    });
    const afterReveal = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 13, 0, 0),
      addressReveal: schedule,
      ownedHouseIds: [],
    });
    const ownerCtx = makeAddressRevealContext({
      now: new Date(2026, 9, 30, 12, 0, 0),
      addressReveal: schedule,
      ownedHouseIds: ["בית-1"],
    });

    assert.equal(gemVisibleMapHouses([home("בית-1")], "real", beforeReveal).length, 0);
    assert.equal(gemVisibleMapHouses([home("בית-1")], "real", ownerCtx).length, 1);
    assert.equal(gemVisibleMapHouses([home("בית-1")], "real", afterReveal).length, 1);
    assert.equal(gemVisibleMapHouses([poi("נק-1")], "real", beforeReveal).length, 1);
  });
});
