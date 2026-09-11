import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyHouseAlert,
  fillPushTemplate,
  filledPushForKind,
  houseMatchesNotifyKind,
  isHouseOffAir,
  mergePushTemplates,
  migratePushSettings,
  ownerOfferKindFromPatch,
  resolveHouseNotifyKind,
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

describe("migratePushSettings", () => {
  it("resets stored title and body while keeping enabled flags", () => {
    const { settings, changed } = migratePushSettings({
      templates: {
        candyLow: { enabled: false, title: "מותאם", body: "גוף מותאם" },
      },
    });
    assert.equal(changed, true);
    assert.equal(settings.templates?.candyLow?.enabled, false);
    assert.equal(settings.templates?.candyLow?.title, "{nickname}");
    assert.match(settings.templates?.candyLow?.body ?? "", /🟠🍬/);
    assert.doesNotMatch(settings.templates?.candyLow?.title ?? "", /מותאם/);
  });
});

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

  it("keeps enabled false when explicitly disabled", () => {
    const merged = mergePushTemplates({
      templates: {
        onBreak: { enabled: false, title: "{nickname}", body: "בהפסקה ⏸️ {backLine}\n{place}" },
      },
    });
    assert.equal(merged.onBreak.enabled, false);
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

  it("detects returning to open from closed as back to activity", () => {
    const prev = baseHouse({ visit: "closed" });
    const next = baseHouse({ visit: "come" });
    assert.equal(classifyHouseAlert(prev, next), "backFromBreak");
  });

  it("detects candy running out", () => {
    const prev = baseHouse({ treatStock: { candy: "plenty" } });
    const next = baseHouse({ treatStock: { candy: "out" } });
    assert.equal(classifyHouseAlert(prev, next), "candyOut");
  });

  it("detects candy running out while house stays closed", () => {
    const prev = baseHouse({ visit: "closed", treatStock: { candy: "plenty" } });
    const next = baseHouse({ visit: "closed", treatStock: { candy: "out" } });
    assert.equal(classifyHouseAlert(prev, next), "candyOutClosed");
  });

  it("skips break push when switching between closed and break", () => {
    const frozenUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const closed = baseHouse({ visit: "closed" });
    const onBreak = baseHouse({ visit: "come", ownerFrozenUntil: frozenUntil });
    assert.equal(classifyHouseAlert(closed, onBreak), null);
    assert.equal(classifyHouseAlert(onBreak, baseHouse({ visit: "closed", ownerFrozenUntil: null })), null);
  });
});

describe("isHouseOffAir", () => {
  it("treats closed and owner pause as off-air", () => {
    assert.equal(isHouseOffAir(baseHouse({ visit: "closed" })), true);
    assert.equal(
      isHouseOffAir(
        baseHouse({
          ownerFrozenUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      ),
      true,
    );
    assert.equal(isHouseOffAir(baseHouse()), false);
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
    const prev = baseHouse({ visit: "come" });
    const next = baseHouse({ visit: "closed" });
    assert.equal(ownerOfferKindFromPatch({ visit: "closed" }, next, prev), "closed");
  });

  it("offers candy-out-closed when stock runs out while house stays closed", () => {
    const prev = baseHouse({ visit: "closed", treatStock: { candy: "plenty" } });
    const next = baseHouse({ visit: "closed", treatStock: { candy: "out" } });
    const patch = { visit: "closed" as const, treatStock: { candy: "out" as const } };
    assert.equal(ownerOfferKindFromPatch(patch, next, prev), "candyOutClosed");
    assert.equal(resolveHouseNotifyKind(prev, next, patch), "candyOutClosed");
  });

  it("skips closed offer when switching from break to closed", () => {
    const frozenUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const prev = baseHouse({ visit: "come", ownerFrozenUntil: frozenUntil });
    const next = baseHouse({ visit: "closed", ownerFrozenUntil: null });
    assert.equal(ownerOfferKindFromPatch({ visit: "closed" }, next, prev), null);
  });
});

describe("resolveHouseNotifyKind", () => {
  it("uses classifyHouseAlert before ownerOfferKindFromPatch", () => {
    const prev = baseHouse({ visit: "come", treatStock: { candy: "plenty" } });
    const next = baseHouse({ visit: "closed", treatStock: { candy: "out" } });
    const patch = { visit: "closed" as const, treatStock: { candy: "out" as const } };
    assert.equal(resolveHouseNotifyKind(prev, next, patch), "closed");
  });
});

describe("filledPushForKind", () => {
  it("fills the default candy-low template", () => {
    const house = baseHouse({ treatStock: { candy: "low" } });
    const filled = filledPushForKind("candyLow", house, null);
    assert.ok(filled);
    assert.equal(filled!.title, "בית הדלעת");
    assert.match(filled!.body, /🟠🍬/);
    assert.match(filled!.body, /חרוזים/);
  });

  it("uses fixed title for house-added alerts", () => {
    const house = baseHouse();
    const filled = filledPushForKind("houseAdded", house, null);
    assert.ok(filled);
    assert.match(filled!.title, /בית אימה נוסף למפה/);
    assert.match(filled!.body, /בית הדלעת/);
    assert.doesNotMatch(filled!.body, /מוזמנים להגיע/);
  });
});
