/** Minimal shape of the non-standard beforeinstallprompt event. */
export type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function shouldCapturePwaInstallPrompt(isIos: boolean, isStandalone: boolean) {
  return !isIos && !isStandalone;
}

export function pwaInstallPromptEligible(options: {
  isIos: boolean;
  isStandalone: boolean;
  hasDeferredPrompt: boolean;
}) {
  if (options.isIos || options.isStandalone) return false;
  return options.hasDeferredPrompt;
}

/** Toast when help/demo install is tapped without a native prompt (e.g. iOS viewing Android Q&A). */
export const PWA_INSTALL_UNAVAILABLE_TOAST = "פתחו ב-Chrome באנדרואיד כדי להתקין.";

export function shouldShowPwaInstallButton(options: {
  canInstall: boolean;
  isStandalone: boolean;
  /** Help/Q&A demo — show instructional button even without beforeinstallprompt. */
  showAlways?: boolean;
  /** Help accordion — always render the button UI (ignores standalone / prompt state). */
  forceVisible?: boolean;
}) {
  if (options.forceVisible) return true;
  if (options.isStandalone) return false;
  if (options.showAlways) return true;
  return options.canInstall;
}
