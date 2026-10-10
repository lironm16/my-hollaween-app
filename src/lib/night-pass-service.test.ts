import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import * as service from "@/lib/night-pass-service";
import * as store from "@/lib/night-pass-store";

process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "hw-night-pass-"));

function plainCode(formatted: string) {
  return formatted.replace("-", "");
}

describe("night pass service (file store)", () => {
  before(() => store.invalidateNightPassMem());

  it("creates four slots once per house", async () => {
    const first = await service.ensureHouseNightPasses("בית-100");
    assert.deepEqual(
      first.map((row) => row.slot),
      [1, 2, 3, 4],
    );
    const again = await service.ensureHouseNightPasses("בית-100");
    assert.deepEqual(
      again.map((row) => row.id),
      first.map((row) => row.id),
    );
  });

  it("registers, re-registers with the same phone, and only the last device stays valid", async () => {
    const [slot] = await service.ensureHouseNightPasses("בית-200");
    const code = slot!.code;

    const first = await service.redeemNightPass({ code, name: "דנה", phone: "0501234567" });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.reregistered, false);
    assert.ok(await service.validNightPassForToken(first.record.id, first.token));

    const stranger = await service.redeemNightPass({ code, name: "יוסי", phone: "0529999999" });
    assert.deepEqual(stranger, { ok: false, error: "phone_mismatch" });

    const second = await service.redeemNightPass({ code, name: "דנה", phone: "0501234567" });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.reregistered, true);
    store.invalidateNightPassMem();
    assert.equal(await service.validNightPassForToken(first.record.id, first.token), null);
    assert.ok(await service.validNightPassForToken(second.record.id, second.token));
  });

  it("rejects unknown codes", async () => {
    const outcome = await service.redeemNightPass({
      code: "ABCDEFGH",
      name: "דנה",
      phone: "0501234567",
    });
    assert.deepEqual(outcome, { ok: false, error: "invalid" });
  });

  it("reset issues a new code, revokes the device, and is capped for owners", async () => {
    const rows = await service.ensureHouseNightPasses("בית-300");
    const slot = rows[1]!;
    const redeemed = await service.redeemNightPass({
      code: slot.code,
      name: "רון",
      phone: "0541112222",
    });
    assert.equal(redeemed.ok, true);
    if (!redeemed.ok) return;

    const reset = await service.resetNightPassSlot("בית-300", slot.slot, { admin: false });
    assert.equal(reset.ok, true);
    if (!reset.ok) return;
    assert.notEqual(reset.record.code, slot.code);
    assert.equal(reset.record.status, "unused");
    assert.equal(reset.record.resetCount, 1);
    store.invalidateNightPassMem();
    assert.equal(await service.validNightPassForToken(redeemed.record.id, redeemed.token), null);
    const oldCode = await service.redeemNightPass({ code: slot.code, name: "רון", phone: "0541112222" });
    assert.deepEqual(oldCode, { ok: false, error: "invalid" });

    for (let i = 1; i < service.OWNER_RESET_LIMIT; i += 1) {
      const next = await service.resetNightPassSlot("בית-300", slot.slot, { admin: false });
      assert.equal(next.ok, true);
    }
    const blocked = await service.resetNightPassSlot("בית-300", slot.slot, { admin: false });
    assert.deepEqual(blocked, { ok: false, error: "limit" });
    const adminReset = await service.resetNightPassSlot("בית-300", slot.slot, { admin: true });
    assert.equal(adminReset.ok, true);

    const view = service.nightPassSlotView(
      (await service.ensureHouseNightPasses("בית-300"))[1]!,
      false,
    );
    assert.equal(view.resetsLeft, 0);
    assert.match(plainCode(view.code), /^[A-Z2-9]{8}$/);
  });
});
