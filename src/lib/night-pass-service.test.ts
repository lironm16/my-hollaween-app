import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import { HOUSE_ACCESS_CODE_LENGTH } from "@/lib/night-pass-codes";
import * as service from "@/lib/night-pass-service";
import * as store from "@/lib/night-pass-store";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "hw-night-pass-"));

describe("house access service (file store)", () => {
  before(() => store.invalidateNightPassMem());

  it("creates one unified access record per house", async () => {
    const first = await service.ensureHouseAccess("בית-100");
    assert.equal(first.model, "unified");
    assert.equal(first.code.length, HOUSE_ACCESS_CODE_LENGTH);
    const again = await service.ensureHouseAccess("בית-100");
    assert.equal(again.id, first.id);
  });

  it("LRU evicts oldest on fifth device", async () => {
    const access = await service.ensureHouseAccess("בית-lru");
    const code = access.code;
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
    assert.equal(fifth.ok, true);
    if (!fifth.ok) return;
    assert.equal(fifth.evicted, true);
    store.invalidateNightPassMem();
    assert.equal(await service.validNightPassForToken(access.id, tokens[0]!), null);
    assert.ok(await service.validNightPassForToken(access.id, fifth.token));
  });

  it("reset issues a new family code and revokes devices", async () => {
    const access = await service.ensureHouseAccess("בית-reset");
    const redeemed = await service.redeemNightPass({
      code: access.code,
      name: "רון",
      phone: "0541112222",
    });
    assert.equal(redeemed.ok, true);
    if (!redeemed.ok) return;

    const reset = await service.resetHouseAccess("בית-reset");
    assert.equal(reset.ok, true);
    if (!reset.ok) return;
    assert.notEqual(reset.record.code, access.code);
    store.invalidateNightPassMem();
    assert.equal(await service.validNightPassForToken(redeemed.record.id, redeemed.token), null);
  });
});
