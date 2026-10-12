import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PUBLIC_NIGHT_PASS_SCOPE,
  hiddenHouseCountForSet,
  isPublicTierHouse,
  scopeHousesForViewer,
  type NightPassScopeContext,
} from "@/lib/night-pass-scope";
import type { PublicHouse } from "@/lib/types";

function row(overrides: Partial<PublicHouse>): PublicHouse {
  return {
    id: "בית-1",
    kind: "house",
    name: "בית",
    theme: "pumpkin",
    address: "יהודית 15",
    arrival: "קומה 2",
    description: "",
    lat: 32.09,
    lng: 34.81,
    treats: ["candy"],
    treatStock: {},
    visit: "come",
    scareLevel: "mild",
    openFrom: "18:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as PublicHouse;
}

const home = row({ id: "בית-1", notes: "דפקו חזק" });
const otherHome = row({ id: "בית-2", address: "הרצל 3", lat: 32.1, lng: 34.82 });
const business = row({
  id: "נק-1",
  kind: "poi",
  poiCategory: "coffee",
  address: "סוקולוב 10",
  arrival: "כניסה מהחצר",
  lat: 32.2,
  lng: 34.9,
});
const homeAboveBusiness = row({
  id: "בית-3",
  address: "סוקולוב 10",
  arrival: "דירה 7",
  notes: "יש כלב",
  lat: 32.2,
  lng: 34.9,
});
const all = [home, otherHome, business, homeAboveBusiness];

function ctx(overrides: Partial<NightPassScopeContext>): NightPassScopeContext {
  return { ...PUBLIC_NIGHT_PASS_SCOPE, ...overrides };
}

describe("night pass scope", () => {
  it("treats POIs as public tier; legacy practice rows are not", () => {
    assert.equal(isPublicTierHouse(business), true);
    assert.equal(isPublicTierHouse(row({ isPractice: true })), false);
    assert.equal(isPublicTierHouse(home), false);
  });

  it("public visitors get businesses only — homes in a business's building are not sent", () => {
    const scoped = scopeHousesForViewer(all, PUBLIC_NIGHT_PASS_SCOPE);
    assert.deepEqual(
      scoped.houses.map((house) => house.id),
      ["נק-1"],
    );
    assert.equal(scoped.hiddenHouseCount, 3);
    const biz = scoped.houses[0]!;
    assert.equal(biz.address, "סוקולוב 10");
    assert.equal(biz.arrival, "כניסה מהחצר");
    assert.equal(biz.locationPublic, true);
  });

  it("pass holders see every home, addresses only after reveal", () => {
    const before = scopeHousesForViewer(all, ctx({ viewer: "pass", revealed: false }));
    assert.equal(before.houses.length, 4);
    assert.equal(before.hiddenHouseCount, 0);
    const homeBefore = before.houses.find((house) => house.id === "בית-1")!;
    assert.equal(homeBefore.address, "");
    assert.equal(homeBefore.arrival, "");
    assert.equal(homeBefore.lat, home.lat);

    const after = scopeHousesForViewer(all, ctx({ viewer: "pass", revealed: true }));
    const homeAfter = after.houses.find((house) => house.id === "בית-1")!;
    assert.equal(homeAfter.address, "יהודית 15");
    assert.equal(homeAfter.arrival, "קומה 2");
    assert.equal(after.houses.find((house) => house.id === "בית-3")!.arrival, "דירה 7");
  });

  it("a home in a business's building stays private until reveal, like any home", () => {
    const before = scopeHousesForViewer(all, ctx({ viewer: "pass", revealed: false }));
    const mate = before.houses.find((house) => house.id === "בית-3")!;
    assert.equal(mate.address, "");
    assert.equal(mate.arrival, "");
    assert.equal(mate.notes, "");
    assert.notEqual(mate.locationPublic, true);
    assert.equal(before.houses.find((house) => house.id === "נק-1")!.address, "סוקולוב 10");

    const after = scopeHousesForViewer(all, ctx({ viewer: "pass", revealed: true }));
    const mateAfter = after.houses.find((house) => house.id === "בית-3")!;
    assert.equal(mateAfter.address, "סוקולוב 10");
    assert.equal(mateAfter.notes, "יש כלב");
  });

  it("strips visitor notes from homes before reveal", () => {
    const before = scopeHousesForViewer(all, ctx({ viewer: "pass", revealed: false }));
    assert.equal(before.houses.find((house) => house.id === "בית-1")!.notes, "");
  });

  it("owners without a pass see their own home plus the public set", () => {
    const scoped = scopeHousesForViewer(
      all,
      ctx({ viewer: "owner", revealed: true, ownedIds: new Set(["בית-2"]) }),
    );
    assert.deepEqual(
      scoped.houses.map((house) => house.id).sort(),
      ["בית-2", "נק-1"].sort(),
    );
    assert.equal(scoped.houses.find((house) => house.id === "בית-2")!.address, "הרצל 3");
    assert.equal(scoped.hiddenHouseCount, 2);
  });

  it("splits the hidden-home teaser by the viewer's house set", () => {
    const stubHome = row({ id: "סטאב-1", address: "הגפן 4", isStub: true });
    const scoped = scopeHousesForViewer([...all, stubHome], PUBLIC_NIGHT_PASS_SCOPE);
    assert.equal(scoped.hiddenHouseCount, 4);
    assert.equal(scoped.hiddenStubHouseCount, 1);
    assert.equal(hiddenHouseCountForSet(scoped, "real"), 3);
    assert.equal(hiddenHouseCountForSet(scoped, "stubs"), 1);
    assert.equal(hiddenHouseCountForSet(scoped, "all"), 4);
    assert.equal(hiddenHouseCountForSet({ hiddenHouseCount: 5 }, "real"), 5);
  });

  it("admin sees everything with details", () => {
    const scoped = scopeHousesForViewer(all, ctx({ viewer: "admin" }));
    assert.equal(scoped.houses.length, 4);
    assert.equal(scoped.houses.find((house) => house.id === "בית-1")!.address, "יהודית 15");
  });
});
