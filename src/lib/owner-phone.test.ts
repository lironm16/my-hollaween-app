import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertOwnerPhoneForFullPatch,
  isQuickUpdatePatch,
  isValidOwnerPhone,
  normalizeOwnerPhone,
  ownerPhoneValidationError,
  OwnerPhoneInvalidError,
  OwnerPhoneRequiredError,
} from "@/lib/owner-phone";

describe("owner-phone", () => {
  it("normalizes Israeli mobile numbers", () => {
    assert.equal(normalizeOwnerPhone("050-123-4567"), "0501234567");
    assert.equal(normalizeOwnerPhone("+972 50 123 4567"), "+972501234567");
  });

  it("validates common formats", () => {
    assert.equal(isValidOwnerPhone("0501234567"), true);
    assert.equal(isValidOwnerPhone("050-123-4567"), true);
    assert.equal(isValidOwnerPhone("+972501234567"), true);
    assert.equal(isValidOwnerPhone("+972 50 123 4567"), true);
    assert.equal(isValidOwnerPhone("03-1234567"), true);
    assert.equal(isValidOwnerPhone("123"), false);
    assert.equal(isValidOwnerPhone("123456789"), false);
    assert.equal(isValidOwnerPhone("501234567"), false);
    assert.equal(isValidOwnerPhone("abc"), false);
    assert.equal(isValidOwnerPhone("051234567"), false);
  });

  it("returns Hebrew validation messages", () => {
    assert.equal(ownerPhoneValidationError("", true), "נא למלא מספר טלפון.");
    assert.equal(ownerPhoneValidationError("", false), null);
    assert.match(ownerPhoneValidationError("12345", true)!, /לא תקין/);
  });

  it("detects quick-update patches", () => {
    assert.equal(
      isQuickUpdatePatch({ treats: ["candy"], treatStock: { candy: "low" }, visit: "come" }),
      true,
    );
    assert.equal(isQuickUpdatePatch({ name: "בית" }), false);
  });

  it("requires phone on full patch when missing", () => {
    assert.throws(
      () => assertOwnerPhoneForFullPatch({ ownerPhone: null }, { name: "בית" }),
      OwnerPhoneRequiredError,
    );
    assert.doesNotThrow(() =>
      assertOwnerPhoneForFullPatch({ ownerPhone: null }, { treatStock: { candy: "out" } }),
    );
    assert.doesNotThrow(() =>
      assertOwnerPhoneForFullPatch({ ownerPhone: null }, {
        name: "בית",
        ownerPhone: "0501234567",
      }),
    );
    assert.throws(
      () =>
        assertOwnerPhoneForFullPatch({ ownerPhone: null }, {
          name: "בית",
          ownerPhone: "123456789",
        }),
      OwnerPhoneInvalidError,
    );
  });
});
