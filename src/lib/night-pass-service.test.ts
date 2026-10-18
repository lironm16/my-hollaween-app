import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import { passIdForHouse } from "@/lib/night-pass-codes";
import { newEditCode } from "@/lib/ids";
import * as service from "@/lib/night-pass-service";
import * as store from "@/lib/night-pass-store";
import { normalizeHouse, setMem } from "@/lib/store/core";
import type { DbFile, House } from "@/lib/types";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "hw-night-pass-"));

function testHouse(id: string, editCode: string): House {
  return normalizeHouse({
    id,
    storeId: id,
    name: "test",
    theme: "pumpkin",
    address: "street",
    arrival: "",
    description: "",
    lat: 32.09,
    lng: 34.81,
    updatedAt: "2026-10-31T12:00:00.000Z",
    createdAt: "2026-10-31T12:00:00.000Z",
    visit: "come",
    treatStock: { candy: "plenty" },
    treats: ["candy"],
    scareLevel: "mild",
    openFrom: "17:00",
    openTo: "21:00",
    notes: "",
    accessible: false,
    soldOut: false,
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    editCode,
    kind: "house",
  });
}

function seedHouses(houses: House[]) {
  const db: DbFile = {
    updatedAt: "2026-10-31T12:00:00.000Z",
    houses,
    pushSubscriptions: [],
  };
  setMem(db);
}

describe("house access service (file store)", () => {
  before(() => store.invalidateNightPassMem());
  beforeEach(() => {
    store.invalidateNightPassMem();
    seedHouses([]);
  });

  it("creates one house-scoped access record per house", async () => {
    const id = "בית-100";
    const code = newEditCode();
    seedHouses([testHouse(id, code)]);
    const first = await service.ensureHouseAccess(id);
    assert.equal(first.id, passIdForHouse(id));
    assert.deepEqual(first.sessions, []);
    const again = await service.ensureHouseAccess(id);
    assert.equal(again.id, first.id);
  });

  it("rejects fifth device when four slots are full", async () => {
    const id = "בית-lru";
    const code = newEditCode();
    seedHouses([testHouse(id, code)]);
    const access = await service.ensureHouseAccess(id);
    const tokens: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const r = await service.redeemNightPass({
        code,
        name: `user-${i}`,
        phone: `050123456${i}`,
      });
      assert.equal(r.ok, true);
      if (!r.ok) return;
      tokens.push(r.token);
    }
    store.invalidateNightPassMem();
    for (const t of tokens) {
      assert.ok(await service.validNightPassForToken(access.id, t));
    }
    const fifth = await service.redeemNightPass({
      code,
      name: "fifth",
      phone: "0509999999",
    });
    assert.equal(fifth.ok, false);
    if (fifth.ok) return;
    assert.equal(fifth.error, "full");
    store.invalidateNightPassMem();
    assert.ok(await service.validNightPassForToken(access.id, tokens[0]!));
  });

  it("reset clears devices and returns a new code for the house row", async () => {
    const id = "בית-reset";
    const code = newEditCode();
    seedHouses([testHouse(id, code)]);
    const access = await service.ensureHouseAccess(id);
    const redeemed = await service.redeemNightPass({
      code,
      name: "רון",
      phone: "0541112222",
    });
    assert.equal(redeemed.ok, true);
    if (!redeemed.ok) return;

    const reset = await service.resetHouseAccess(id);
    assert.equal(reset.ok, true);
    if (!reset.ok) return;
    assert.notEqual(reset.newCode, code);
    store.invalidateNightPassMem();
    assert.equal(await service.validNightPassForToken(redeemed.record.id, redeemed.token), null);
    assert.equal(reset.record.id, access.id);
  });
});
