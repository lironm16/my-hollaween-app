import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPwaInstalledOnDevice,
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

  it("skips capture when Android web app is already on device (browser tab)", () => {
    assert.equal(shouldCapturePwaInstallPrompt(false, false, true), false);
  });
});

describe("isPwaInstalledOnDevice", () => {
  it("treats standalone or probed Android install as installed", () => {
    assert.equal(isPwaInstalledOnDevice({ isStandalone: true, androidWebAppInstalled: false }), true);
    assert.equal(isPwaInstalledOnDevice({ isStandalone: false, androidWebAppInstalled: true }), true);
    assert.equal(isPwaInstalledOnDevice({ isStandalone: false, androidWebAppInstalled: false }), false);
  });
});

describe("pwaInstallPromptEligible", () => {
  it("shows install UI only when prompt is available and app is not installed", () => {
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isPwaInstalled: false, hasDeferredPrompt: true }),
      true,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: true, isPwaInstalled: false, hasDeferredPrompt: true }),
      false,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isPwaInstalled: true, hasDeferredPrompt: true }),
      false,
    );
    assert.equal(
      pwaInstallPromptEligible({ isIos: false, isPwaInstalled: false, hasDeferredPrompt: false }),
      false,
    );
  });
});

describe("shouldShowPwaInstallButton", () => {
  it("hides when already installed standalone", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: true, isPwaInstalled: true, showAlways: true }),
      false,
    );
  });

  it("shows header button only when native prompt is available", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: true, isPwaInstalled: false }),
      true,
    );
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: false, isPwaInstalled: false }),
      false,
    );
  });

  it("hides header button when PWA is already installed on Android", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: true, isPwaInstalled: true }),
      false,
    );
  });

  it("shows help demo button even without native prompt (e.g. iOS viewing Android Q&A)", () => {
    assert.equal(
      shouldShowPwaInstallButton({ canInstall: false, isPwaInstalled: false, showAlways: true }),
      true,
    );
  });

  it("forceVisible always renders in help accordion (even standalone PWA)", () => {
    assert.equal(
      shouldShowPwaInstallButton({
        canInstall: false,
        isPwaInstalled: true,
        showAlways: false,
        forceVisible: true,
      }),
      true,
    );
  });
});
