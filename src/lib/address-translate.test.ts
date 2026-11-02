import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAddressLanguagePair } from "@/lib/address-translate.server";

describe("resolveAddressLanguagePair", () => {
  it("returns null without translate API key", async () => {
    const prev = process.env.GOOGLE_TRANSLATE_API_KEY;
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
    try {
      assert.equal(await resolveAddressLanguagePair("יהודית 15"), null);
    } finally {
      if (prev !== undefined) process.env.GOOGLE_TRANSLATE_API_KEY = prev;
    }
  });
});
