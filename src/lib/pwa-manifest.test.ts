import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAndroidUserAgent, pwaManifestForUserAgent } from "@/lib/pwa-manifest";

describe("pwaManifestForUserAgent", () => {
  it("uses browser display on Android to avoid WebAPK install", () => {
    const manifest = pwaManifestForUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    assert.equal(manifest.display, "browser");
    assert.equal((manifest as { handle_links?: string }).handle_links, undefined);
  });

  it("keeps standalone display on iPhone for add-to-home-screen", () => {
    const manifest = pwaManifestForUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    );
    assert.equal(manifest.display, "standalone");
    assert.equal((manifest as { handle_links?: string }).handle_links, "preferred");
  });

  it("detects Android user agents", () => {
    assert.equal(isAndroidUserAgent("Android 14"), true);
    assert.equal(isAndroidUserAgent("iPhone"), false);
  });
});
