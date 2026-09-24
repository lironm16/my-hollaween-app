import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pwaInstallPromptEligible,
  shouldCapturePwaInstallPrompt,
  shouldShowPwaInstallButton,
} from "@/lib/pwa-install";

describe("shouldCapturePwaInstallPrompt", () => {
  it("skips iOS and already-installed standalone sessions", () => {
    assert.equal(shouldCapturePwaInstallPrompt(true, false), false);
    assert.equal(shouldCapturePwaInstallPrompt(false, true), false);
    assert.equal(shouldCapturePwaInstallPrompt(true, true), false);
  });

  it("captures on Android and desktop browsers when not installed", () => {
    assert.equal(shouldCapturePwaInstallPrompt(false, false), true);
  });
});

describe("pwaInstallPromptEligible", () => {
  it("shows install UI only when prompt is available and app is not installed", () => {
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isStandalone: false, hasDeferredPrompt: true }),
      true,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: true, isStandalone: false, hasDeferredPrompt: true }),
      false,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isStandalone: true, hasDeferredPrompt: true }),
      false,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isStandalone: false, hasDeferredPrompt: false }),
      false,
    );
  });
});

describe("shouldShowPwaInstallButton", () => {
  it("hides when already installed standalone", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: true, isStandalone: true, showAlways: true }),
      false,
    );
  });

  it("shows header button only when native prompt is available", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: true, isStandalone: false }),
      true,
    );
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: false, isStandalone: false }),
      false,
    );
  });

  it("shows help demo button even without native prompt (e.g. iOS viewing Android Q&A)", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: false, isStandalone: false, showAlways: true }),
      true,
    );
  });

  it("forceVisible always renders in help accordion (even standalone PWA)", () => {
    assert.equal(
      shouldShowPwaInstallButton({
        canInstall: false,
        isStandalone: true,
        showAlways: false,
        forceVisible: true,
      }),
      true,
    );
  });
});
