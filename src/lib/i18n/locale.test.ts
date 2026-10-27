import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAppLocale, localeDirection, resolveDefaultAppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

describe("i18n locale", () => {
  it("defaults to Hebrew in production-like env", () => {
    assert.equal(resolveDefaultAppLocale({ nodeEnv: "production" }), "he");
  });

  it("defaults to English in development", () => {
    assert.equal(resolveDefaultAppLocale({ nodeEnv: "development" }), "en");
  });

  it("honors NEXT_PUBLIC_DEFAULT_LOCALE when not in development", () => {
    assert.equal(
      resolveDefaultAppLocale({ nodeEnv: "production", defaultLocaleEnv: "en" }),
      "en",
    );
  });

  it("defaultAppLocale matches runtime env", () => {
    assert.equal(defaultAppLocale(), resolveDefaultAppLocale());
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
