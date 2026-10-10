import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mainMapGemEligibleHouses } from "@/lib/gem-monsters";
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

describe("mainMapGemEligibleHouses", () => {
  it("includes stub map rows for admin gem tools (pin rings)", () => {
    const rows = mainMapGemEligibleHouses([stub("בית-1847")], "all", { adminGemTools: true });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "בית-1847");
  });

  it("excludes residential stubs in תצוגת משתמש (practice-only pre-event)", () => {
    const rows = mainMapGemEligibleHouses([stub("בית-1847")], "real", { adminGemTools: false });
    assert.equal(rows.length, 0);
  });
});
