import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeCatalogDelta,
  mergeHouses,
  mergePushSubscriptions,
  normalizeCatalogDelta,
  syncCatalog,
} from "@/lib/catalog-sync";
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
    assert.deepEqual(syncCatalog(null, incoming), normalizeCatalogDelta(incoming));
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

  it("drops stale local-only houses when incoming catalog is authoritative", () => {
    const prev = catalog("2026-09-06T19:50:00.000Z", [
      ...Array.from({ length: 97 }, (_, index) =>
        publicHouse(`house-${index}`, "2026-09-03T13:15:00.000Z"),
      ),
    ]);
    const incoming: Catalog = {
      updatedAt: "2026-10-31T12:00:00.000Z",
      neighborhood: "שכונה",
      houseCount: 75,
      houses: Array.from({ length: 75 }, (_, index) =>
        publicHouse(`live-${index}`, "2026-10-31T12:00:00.000Z"),
      ),
    };
    const merged = syncCatalog(prev, incoming, { trustedCompleteList: true });
    assert.equal(merged.houses.length, 75);
    assert.equal(merged.houseCount, 75);
  });

  it("keeps local rows when a stale authoritative snapshot is shorter", () => {
    const prev = catalog("2026-10-31T10:00:00.000Z", [
      ...Array.from({ length: 90 }, (_, index) =>
        publicHouse(`keep-${index}`, "2026-10-31T10:00:00.000Z"),
      ),
    ]);
    const incoming: Catalog = {
      updatedAt: "2026-10-31T12:00:00.000Z",
      neighborhood: "שכונה",
      houseCount: 85,
      houses: Array.from({ length: 85 }, (_, index) =>
        publicHouse(`snap-${index}`, "2026-10-31T12:00:00.000Z"),
      ),
    };
    const merged = syncCatalog(prev, incoming);
    assert.equal(merged.houses.length, 175);
  });

  it("preserves isStub when a newer live row omits stub flags", () => {
    const prev = catalog("2026-09-06T19:50:00.000Z", [
      publicHouse("בית-9310", "2026-09-06T19:50:00.000Z", { isStub: true }),
    ]);
    const incoming = catalog("2026-10-31T12:00:00.000Z", [
      publicHouse("בית-9310", "2026-10-31T12:00:00.000Z", { address: "חרוזים 8" }),
    ]);
    const merged = syncCatalog(prev, incoming);
    assert.equal(merged.houses.find((h) => h.id === "בית-9310")?.isStub, true);
  });

  it("keeps cached houses when incoming catalog is newer but omits them", () => {
    const prev = catalog("2026-09-03T13:15:00.000Z", [
      publicHouse("real-1", "2026-09-03T13:15:00.000Z"),
      publicHouse("real-2", "2026-09-03T13:15:00.000Z"),
    ]);
    const incoming = catalog("2026-09-06T19:50:00.000Z", [
      publicHouse("stub-1", "2026-09-05T05:50:00.000Z", {
        isStub: true,
        description: "נפתח בקרוב.",
      }),
    ]);
    const merged = syncCatalog(prev, incoming);
    assert.deepEqual(merged.houses.map((house) => house.id).sort(), ["real-1", "real-2", "stub-1"]);
  });
});

describe("mergeCatalogDelta", () => {
  it("applies explicit removed ids from delta polls", () => {
    const prev: Catalog = {
      updatedAt: "2026-10-31T10:00:00.000Z",
      neighborhood: "שכונה",
      houseCount: 3,
      houses: [
        publicHouse("a", "2026-10-31T10:00:00.000Z"),
        publicHouse("b", "2026-10-31T10:00:00.000Z"),
        publicHouse("c", "2026-10-31T10:00:00.000Z"),
      ],
    };
    const merged = mergeCatalogDelta(prev, {
      updatedAt: "2026-10-31T12:00:00.000Z",
      neighborhood: "שכונה",
      houses: [],
      removed: ["b"],
      houseCount: 2,
    });
    assert.deepEqual(merged.houses.map((house) => house.id).sort(), ["a", "c"]);
    assert.equal(merged.houseCount, 2);
  });
});

describe("normalizeCatalogDelta", () => {
  it("defaults missing houses to an empty array", () => {
    const delta = normalizeCatalogDelta({
      updatedAt: "2026-10-31T12:00:00.000Z",
      pollSeconds: 45,
    });
    assert.deepEqual(delta.houses, []);
    assert.equal(delta.updatedAt, "2026-10-31T12:00:00.000Z");
    assert.equal(delta.pollSeconds, 45);
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
