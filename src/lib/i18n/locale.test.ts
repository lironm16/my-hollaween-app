import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAppLocale, localeDirection } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

describe("i18n locale", () => {
  it("defaults to Hebrew in production-like env", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
    assert.equal(defaultAppLocale(), "he");
    process.env.NODE_ENV = prev;
  });

  it("defaults to English in development", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    assert.equal(defaultAppLocale(), "en");
    process.env.NODE_ENV = prev;
  });

  it("maps locale to document direction", () => {
    assert.equal(localeDirection("he"), "rtl");
    assert.equal(localeDirection("en"), "ltr");
  });

  it("translates settings title", () => {
    assert.equal(translate("en", "settings.title"), "Settings");
    assert.equal(translate("he", "settings.title"), "הגדרות");
  });
});
