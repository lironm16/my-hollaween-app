import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeHouses, mergePushSubscriptions, syncCatalog } from "@/lib/catalog-sync";
import type { Catalog, PublicHouse, PushSubscriptionRecord } from "@/lib/types";

function publicHouse(id: string, updatedAt: string, patch: Partial<PublicHouse> = {}): PublicHouse {
  return {
    id,
    name: `בית ${id}`,
    theme: "pumpkin",
    address: "חרוזים",
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
    createdAt: updatedAt,
    updatedAt,
    ...patch,
  } as PublicHouse;
}

function catalog(updatedAt: string, houses: PublicHouse[]): Catalog {
  return { updatedAt, neighborhood: "שכונה", houses };
}

describe("mergeHouses", () => {
  it("keeps the newer updatedAt per id", () => {
    const latest = [{ id: "a", updatedAt: "2026-10-31T10:00:00.000Z" }];
    const incoming = [{ id: "a", updatedAt: "2026-10-31T12:00:00.000Z" }];
    const merged = mergeHouses(latest, incoming);
    assert.equal(merged[0]?.updatedAt, "2026-10-31T12:00:00.000Z");
  });

  it("unions ids from both sides", () => {
    const merged = mergeHouses(
      [{ id: "a", updatedAt: "2026-10-31T10:00:00.000Z" }],
      [{ id: "b", updatedAt: "2026-10-31T10:00:00.000Z" }],
    );
    assert.deepEqual(merged.map((house) => house.id).sort(), ["a", "b"]);
  });
});

describe("syncCatalog", () => {
  it("returns incoming when there is no previous catalog", () => {
    const incoming = catalog("2026-10-31T12:00:00.000Z", [publicHouse("a", "2026-10-31T12:00:00.000Z")]);
    assert.deepEqual(syncCatalog(null, incoming), incoming);
  });

  it("keeps a newer local house when incoming catalog is older", () => {
    const prev = catalog("2026-10-31T12:00:00.000Z", [
      publicHouse("a", "2026-10-31T12:00:00.000Z"),
      publicHouse("b", "2026-10-31T12:00:00.000Z"),
    ]);
    const incoming = catalog("2026-10-31T10:00:00.000Z", [publicHouse("a", "2026-10-31T10:00:00.000Z")]);
    const merged = syncCatalog(prev, incoming);
    assert.deepEqual(merged.houses.map((house) => house.id).sort(), ["a", "b"]);
  });
});

describe("mergePushSubscriptions", () => {
  it("keeps the newer createdAt per endpoint", () => {
    const older: PushSubscriptionRecord = {
      endpoint: "https://push.example/a",
      createdAt: "2026-10-31T10:00:00.000Z",
      keys: { p256dh: "a", auth: "b" },
    };
    const newer: PushSubscriptionRecord = {
      endpoint: "https://push.example/a",
      createdAt: "2026-10-31T12:00:00.000Z",
      keys: { p256dh: "c", auth: "d" },
      topics: ["newHouse"],
    };
    const merged = mergePushSubscriptions([older], [newer]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.keys.p256dh, "c");
    assert.deepEqual(merged[0]?.topics, ["newHouse"]);
  });
});
