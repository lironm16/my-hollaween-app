import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAddressRevealContext } from "@/lib/address-reveal";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import { houseGemHuntUiEligible, mainMapGemEligibleHouses } from "@/lib/gem-monsters";
import type { PublicHouse } from "@/lib/types";

function stub(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "רחוב 1",
    lat: 32,
    lng: 34,
    isStub: true,
  } as PublicHouse;
}

function realHome(id: string): PublicHouse {
  return {
    id,
    name: id,
    address: "חרוזים 8",
    lat: 32,
    lng: 34,
    isStub: false,
  } as PublicHouse;
}

describe("mainMapGemEligibleHouses", () => {
  it("includes stub map rows for admin after address reveal", () => {
    const ctx = makeAddressRevealContext({
      now: new Date(2026, 9, 31, 13, 0, 0),
      isAdmin: true,
      addressReveal: mergeAddressRevealSchedule(),
    });
    const rows = mainMapGemEligibleHouses([stub("בית-1847")], "all", ctx);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "בית-1847");
  });

  it("hides residential homes pre-reveal unless owner", () => {
    const schedule = mergeAddressRevealSchedule();
    const before = makeAddressRevealContext({
      now: new Date(2026, 9, 30, 12, 0, 0),
      addressReveal: schedule,
    });
    const owner = makeAddressRevealContext({
      now: new Date(2026, 9, 30, 12, 0, 0),
      addressReveal: schedule,
      ownedHouseIds: ["בית-100"],
    });
    const home = realHome("בית-100");
    assert.equal(mainMapGemEligibleHouses([home], "real", before).length, 0);
    assert.equal(mainMapGemEligibleHouses([home], "real", owner).length, 1);
  });

  it("houseGemHuntUiEligible matches list membership for a single home", () => {
    const schedule = mergeAddressRevealSchedule();
    const before = makeAddressRevealContext({
      now: new Date(2026, 9, 30, 12, 0, 0),
      addressReveal: schedule,
    });
    const home = realHome("בית-200");
    assert.equal(houseGemHuntUiEligible(home, "real", before), false);
    assert.equal(
      houseGemHuntUiEligible(home, "real", before) ===
        mainMapGemEligibleHouses([home], "real", before).some((h) => h.id === home.id),
      true,
    );
  });
});
