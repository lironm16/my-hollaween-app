import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyHouseAlert,
  fillPushTemplate,
  houseMatchesNotifyKind,
  mergePushTemplates,
  ownerOfferKindFromPatch,
  stockAlertsBlocked,
} from "@/lib/push-templates";
import type { House } from "@/lib/types";

function baseHouse(patch: Partial<House> = {}): House {
  return {
    id: "h1",
    name: "בית הדלעת",
    theme: "pumpkin",
    address: "חרוזים 1",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: { candy: "plenty" },
    visit: "come",
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    status: "approved",
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode: "123456",
    createdAt: "2026-10-31T12:00:00.000Z",
    updatedAt: "2026-10-31T12:00:00.000Z",
    ...patch,
  };
}

describe("mergePushTemplates", () => {
  it("keeps defaults when storage is empty", () => {
    const merged = mergePushTemplates(null);
    assert.equal(merged.candyLow.enabled, true);
    assert.match(merged.candyLow.title, /nickname/);
  });

  it("overlays stored title and enabled flags", () => {
    const merged = mergePushTemplates({
      templates: {
        candyLow: { enabled: false, title: "  מותאם  ", body: "" },
      },
    });
    assert.equal(merged.candyLow.enabled, false);
    assert.equal(merged.candyLow.title, "מותאם");
    assert.match(merged.candyLow.body, /place/);
  });
});

describe("fillPushTemplate", () => {
  it("substitutes nickname, place, and back line", () => {
    const filled = fillPushTemplate(
      { title: "{nickname}", body: "{place}\n{backLine}" },
      {
        name: "בית",
        address: "חרוזים",
        ownerFrozenUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    );
    assert.equal(filled.title, "בית");
    assert.match(filled.body, /חרוזים/);
    assert.match(filled.body, /נחזור ב־/);
  });

  it("omits back line when no return time is set", () => {
    const filled = fillPushTemplate(
      { title: "הפסקה: {nickname}", body: "{backLine}\n{place}" },
      { name: "בית", address: "חרוזים" },
    );
    assert.doesNotMatch(filled.body, /בקרוב/);
    assert.doesNotMatch(filled.body, /נחזור/);
    assert.match(filled.body, /חרוזים/);
  });
});

describe("classifyHouseAlert", () => {
  it("prioritizes freeze over visit changes", () => {
    const prev = baseHouse();
    const next = baseHouse({
      ownerFrozenUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      visit: "closed",
    });
    assert.equal(classifyHouseAlert(prev, next), "onBreak");
  });

  it("detects closing for visits", () => {
    const prev = baseHouse({ visit: "come" });
    const next = baseHouse({ visit: "closed" });
    assert.equal(classifyHouseAlert(prev, next), "closed");
  });

  it("detects candy running out", () => {
    const prev = baseHouse({ treatStock: { candy: "plenty" } });
    const next = baseHouse({ treatStock: { candy: "out" } });
    assert.equal(classifyHouseAlert(prev, next), "candyOut");
  });
});

describe("stockAlertsBlocked", () => {
  it("blocks candy alerts while frozen", () => {
    const frozen = baseHouse({
      ownerFrozenUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    assert.equal(stockAlertsBlocked(frozen), true);
  });
});

describe("houseMatchesNotifyKind", () => {
  it("matches closed houses for closed kind", () => {
    const closed = baseHouse({ visit: "closed" });
    assert.equal(houseMatchesNotifyKind(closed, "closed"), true);
    assert.equal(houseMatchesNotifyKind(closed, "candyLow"), false);
  });
});

describe("ownerOfferKindFromPatch", () => {
  it("offers closed send when visit patch matches", () => {
    const next = baseHouse({ visit: "closed" });
    assert.equal(ownerOfferKindFromPatch({ visit: "closed" }, next), "closed");
  });
});
